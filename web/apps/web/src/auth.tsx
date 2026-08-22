import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from '@clerk/clerk-react';
import { useEffect, type ReactNode } from 'react';

import { setTokenProvider } from './api.js';

/**
 * Clerk, avec une porte de sortie.
 *
 * Un compte ne sert qu'à **porter l'abonnement** : rejoindre une partie n'en
 * demande aucun, c'est tout l'intérêt du modèle « un abonné suffit ». Le reste
 * de l'interface ne doit donc jamais dépendre d'un utilisateur connecté.
 *
 * Sans `VITE_CLERK_PUBLISHABLE_KEY`, l'application tourne quand même, sans
 * compte : on peut développer et jouer en local sans monter Clerk (le jeton de
 * dev `undercover.devToken` prend alors le relais pour simuler un abonné).
 */

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export const authConfigured = Boolean(publishableKey);

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!publishableKey) return <>{children}</>;
  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <TokenBridge />
      {children}
    </ClerkProvider>
  );
}

/**
 * Relie la session Clerk aux appels REST. `api.ts` reste sans dépendance à
 * React : il demande un jeton à qui sait en fournir un.
 */
function TokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => setTokenProvider(() => getToken()), [getToken]);
  return null;
}

/** Contrôles de compte, à droite du bandeau. Rien à afficher sans Clerk. */
export function AccountControls() {
  if (!authConfigured) return null;

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="button button--link">Se connecter</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </>
  );
}

/**
 * Rappel du mode dégradé, sur l'accueil uniquement : sans clé Clerk on peut
 * jouer, mais personne ne peut être abonné.
 */
export function DevTokenHint() {
  if (authConfigured) return null;

  return (
    <p className="note">
      Comptes désactivés (pas de clé Clerk). Pour simuler un hôte abonné :{' '}
      <code>localStorage.setItem('undercover.devToken', 'dev:moi:sub')</code>
    </p>
  );
}
