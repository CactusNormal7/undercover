import type { Env } from './env.js';

/**
 * Qui parle au serveur, et à quoi il a droit.
 *
 * Deux natures d'identité coexistent, par décision produit :
 *  - un **compte**, qui peut porter un abonnement ;
 *  - un **invité**, arrivé par lien d'invitation, sans compte ni inscription.
 *
 * Un invité ne peut pas créer de partie premium, mais peut en rejoindre une :
 * un seul abonné à la table suffit.
 */
export interface Identity {
  /** `null` pour un invité. */
  accountId: string | null;
  displayName: string | null;
  isSubscribed: boolean;
}

export const GUEST: Identity = { accountId: null, displayName: null, isSubscribed: false };

/**
 * Résout l'appelant à partir de son en-tête `Authorization`.
 *
 * TODO (branchement réel, dans cet ordre) :
 *  1. vérifier le JWT du fournisseur d'auth (Supabase Auth ou Clerk, non tranché) ;
 *  2. lire l'entitlement dans Postgres — table unique alimentée par le webhook
 *     Stripe (web) **et** par les App Store Server Notifications V2 (iOS), afin
 *     qu'un abonnement pris sur une plateforme vaille sur l'autre ;
 *  3. mettre en cache le résultat (l'appel est sur le chemin de création de partie).
 *
 * En attendant, un jeton de développement `dev:<accountId>:<sub|free>` permet de
 * jouer les deux cas de bout en bout.
 */
export async function resolveIdentity(request: Request, env: Env): Promise<Identity> {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return GUEST;

  const token = header.slice('Bearer '.length).trim();

  if (env.ENVIRONMENT !== 'production' && token.startsWith('dev:')) {
    const [, accountId, plan] = token.split(':');
    if (!accountId) return GUEST;
    return { accountId, displayName: null, isSubscribed: plan === 'sub' };
  }

  // Aucun fournisseur d'auth branché pour l'instant : tout jeton inconnu est
  // traité comme un invité, jamais comme un abonné.
  return GUEST;
}
