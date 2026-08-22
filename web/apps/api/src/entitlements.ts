import { verifyToken } from '@clerk/backend';
import { createDb, type UndercoverDb } from '@undercover/db';

import type { Env } from './env.js';

/**
 * Qui parle au serveur, et à quoi il a droit.
 *
 * Deux natures d'identité coexistent, par décision produit :
 *  - un **compte** Clerk, qui peut porter un abonnement ;
 *  - un **invité**, arrivé par lien d'invitation, sans compte ni inscription.
 *
 * Un invité ne peut pas ouvrir une partie premium, mais peut en rejoindre une :
 * un seul abonné à la table suffit.
 *
 * Les deux étapes sont séparées à dessein. Vérifier le jeton ne coûte rien
 * (signature, en mémoire) ; lire les droits touche la base. La seconde n'a lieu
 * qu'à la **création** d'une partie, jamais sur le chemin des connexions
 * WebSocket ni des actions de jeu.
 */

export interface Identity {
  /** `null` pour un invité. */
  accountId: string | null;
  displayName: string | null;
}

export interface HostAccess extends Identity {
  isSubscribed: boolean;
}

export const GUEST: Identity = { accountId: null, displayName: null };

/** Un client Prisma par isolat, pas par requête : les connexions coûtent cher. */
let cachedDb: UndercoverDb | null = null;

function db(env: Env): UndercoverDb | null {
  if (!env.DATABASE_URL) return null;
  cachedDb ??= createDb(env.DATABASE_URL);
  return cachedDb;
}

interface ClerkUser {
  clerkUserId: string;
  displayName: string | null;
}

/**
 * Jeton de développement `dev:<clerkUserId>:<sub|free>`, accepté hors production
 * uniquement. Il permet de jouer les deux cas (abonné / gratuit) sans monter
 * Clerk ni Postgres en local.
 */
function devIdentity(env: Env, token: string): { user: ClerkUser; isSubscribed: boolean } | null {
  if (env.ENVIRONMENT === 'production' || !token.startsWith('dev:')) return null;
  const [, userId, plan] = token.split(':');
  if (!userId) return null;
  return { user: { clerkUserId: userId, displayName: null }, isSubscribed: plan === 'sub' };
}

function bearer(request: Request): string | null {
  const header = request.headers.get('Authorization');
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
}

/**
 * Vérifie le jeton de session Clerk. Ne touche pas la base : à utiliser partout
 * où l'on veut seulement savoir *qui* parle.
 */
async function verifyClerkUser(request: Request, env: Env): Promise<ClerkUser | null> {
  const token = bearer(request);
  if (!token) return null;

  const dev = devIdentity(env, token);
  if (dev) return dev.user;

  if (!env.CLERK_SECRET_KEY) return null;

  try {
    const claims = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      // Empêche qu'un jeton émis pour un autre front soit rejoué ici.
      authorizedParties: env.CLERK_AUTHORIZED_PARTIES?.split(',').map((entry) => entry.trim()),
    });
    const name = [claims['first_name'], claims['last_name']].filter(Boolean).join(' ').trim();
    return { clerkUserId: claims.sub, displayName: name.length > 0 ? name : null };
  } catch {
    // Jeton expiré, mal signé, ou émis par une autre instance Clerk.
    return null;
  }
}

/**
 * Contrôle de santé de la base. `null` quand aucune base n'est configurée —
 * ce n'est pas une panne, c'est le mode dégradé assumé (jouer sans comptes).
 */
export async function checkDatabase(env: Env): Promise<{ ok: boolean; error?: string } | null> {
  const store = db(env);
  if (!store) return null;
  try {
    await store.ping();
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : String(cause) };
  }
}

/** Identité seule, sans lecture des droits. */
export async function resolveIdentity(request: Request, env: Env): Promise<Identity> {
  const user = await verifyClerkUser(request, env);
  if (!user) return GUEST;

  const store = db(env);
  if (!store) {
    // Sans base, le compte reste identifié par sa clé Clerk : suffisant pour
    // attribuer un siège, insuffisant pour lui reconnaître un abonnement.
    return { accountId: user.clerkUserId, displayName: user.displayName };
  }
  const account = await store.accountForClerkUser(user.clerkUserId, user.displayName);
  return { accountId: account.id, displayName: account.displayName };
}

/**
 * Identité **et** droits — le chemin de la création de partie.
 *
 * Ce que cet appel renvoie décide de ce que toute la table pourra jouer, et est
 * figé dans la partie : un abonnement qui expire en pleine manche ne la casse pas.
 */
export async function resolveHostAccess(request: Request, env: Env): Promise<HostAccess> {
  const token = bearer(request);
  const dev = token ? devIdentity(env, token) : null;
  if (dev) {
    return {
      accountId: dev.user.clerkUserId,
      displayName: dev.user.displayName,
      isSubscribed: dev.isSubscribed,
    };
  }

  const user = await verifyClerkUser(request, env);
  if (!user) return { ...GUEST, isSubscribed: false };

  const store = db(env);
  if (!store) {
    return { accountId: user.clerkUserId, displayName: user.displayName, isSubscribed: false };
  }

  const account = await store.accountForClerkUser(user.clerkUserId, user.displayName);
  const entitlement = await store.entitlementFor(account.id);

  return {
    accountId: account.id,
    displayName: account.displayName,
    isSubscribed: entitlement?.isActive ?? false,
  };
}
