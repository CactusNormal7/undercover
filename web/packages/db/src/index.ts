import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client.js';

/**
 * Accès aux données — **la seule porte** vers la base.
 *
 * Le reste du code ne connaît que `UndercoverDb`. Prisma, le pilote Postgres et
 * le schéma restent enfermés ici : changer d'hébergeur (Supabase, Neon,
 * Postgres auto-hébergé) ne doit toucher que `DATABASE_URL`, et changer de
 * moteur ne toucherait que ce fichier. C'est ce qui permet de ne pas s'engager
 * maintenant sur un fournisseur.
 */

export type EntitlementSource = 'STRIPE' | 'APP_STORE' | 'MANUAL';
export type EntitlementStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'REFUNDED';

export interface AccountRecord {
  id: string;
  clerkUserId: string;
  displayName: string | null;
}

export interface EntitlementSnapshot {
  /** Seule chose que l'application a besoin de savoir pour ouvrir le contenu. */
  isActive: boolean;
  status: EntitlementStatus;
  source: EntitlementSource;
  productId: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface GrantEntitlementInput {
  accountId: string;
  status: EntitlementStatus;
  source: EntitlementSource;
  productId: string;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  externalRef?: string | null;
}

export interface UndercoverDb {
  /** Retrouve ou crée le compte applicatif adossé à un utilisateur Clerk. */
  accountForClerkUser(clerkUserId: string, displayName?: string | null): Promise<AccountRecord>;
  entitlementFor(accountId: string): Promise<EntitlementSnapshot | null>;
  /** Écrit le droit d'accès — appelé par le webhook Stripe **et** par Apple. */
  grantEntitlement(input: GrantEntitlementInput): Promise<void>;
  /** `false` si l'événement a déjà été traité : les webhooks sont rejoués. */
  claimWebhookEvent(provider: EntitlementSource, eventId: string): Promise<boolean>;
  close(): Promise<void>;
}

/**
 * Un abonnement ouvre l'accès tant qu'il est actif, ou en période de grâce non
 * expirée : un échec de paiement passager ne doit pas fermer la porte au milieu
 * d'une soirée de jeu.
 */
function isActive(status: EntitlementStatus, currentPeriodEnd: Date | null): boolean {
  if (status === 'EXPIRED' || status === 'REFUNDED') return false;
  if (currentPeriodEnd === null) return true;
  return currentPeriodEnd.getTime() > Date.now();
}

export function createDb(databaseUrl: string): UndercoverDb {
  // Adaptateur de pilote : Prisma 7 n'embarque plus de moteur natif, ce qui est
  // précisément ce qui le rend exécutable dans un Worker.
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  return {
    async accountForClerkUser(clerkUserId, displayName = null) {
      const account = await prisma.account.upsert({
        where: { clerkUserId },
        // Le nom affiché suit Clerk, qui reste la source de vérité de l'identité.
        update: displayName === null ? {} : { displayName },
        create: { clerkUserId, displayName },
        select: { id: true, clerkUserId: true, displayName: true },
      });
      return account;
    },

    async entitlementFor(accountId) {
      const row = await prisma.entitlement.findUnique({ where: { accountId } });
      if (!row) return null;
      return {
        isActive: isActive(row.status, row.currentPeriodEnd),
        status: row.status,
        source: row.source,
        productId: row.productId,
        currentPeriodEnd: row.currentPeriodEnd,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      };
    },

    async grantEntitlement(input) {
      const data = {
        status: input.status,
        source: input.source,
        productId: input.productId,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
        externalRef: input.externalRef ?? null,
      };
      await prisma.entitlement.upsert({
        where: { accountId: input.accountId },
        update: data,
        create: { accountId: input.accountId, ...data },
      });
    },

    async claimWebhookEvent(provider, eventId) {
      try {
        await prisma.processedWebhookEvent.create({ data: { provider, eventId } });
        return true;
      } catch {
        // Violation de l'unicité (provider, eventId) : déjà traité.
        return false;
      }
    },

    close: () => prisma.$disconnect(),
  };
}
