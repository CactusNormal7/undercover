/**
 * Types de données du jeu — port de `Models/` (Swift).
 *
 * Volontairement des objets nus, sérialisables tels quels : ce paquet est
 * partagé entre le serveur (autorité) et le client, et ne dépend de rien.
 */

export type Role = 'civilian' | 'undercover' | 'mrWhite';

export const ROLE_LABELS: Record<Role, string> = {
  civilian: 'Civil',
  undercover: 'Undercover',
  mrWhite: 'Mr. White',
};

export type Phase =
  | 'setup'
  | 'wordReveal'
  | 'discussion'
  | 'voting'
  | 'roundResult'
  | 'mrWhiteGuess'
  | 'gameOver';

/** Issue d'une partie terminée. */
export type Outcome =
  /** Tous les undercovers et Mr. White ont été éliminés. */
  | { kind: 'civilians' }
  /** Les infiltrés ont atteint la parité avec les civils. */
  | { kind: 'infiltrators' }
  /** Un Mr. White démasqué a deviné le mot des civils : il gagne seul. */
  | { kind: 'mrWhiteGuessedWord'; playerId: string };

/** Paire de mots proches : l'un va aux civils, l'autre aux undercovers. */
export interface WordPair {
  word1: string;
  word2: string;
  theme: string;
}

/**
 * Identité retenue pour une partie. En ligne, ce peut être un compte
 * (`accountId` renseigné côté serveur) ou un invité arrivé par lien
 * d'invitation — le moteur ne fait pas la différence.
 */
export interface Profile {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

/** Joueur d'une partie en cours. `id` reprend l'identifiant du `Profile`. */
export interface Player {
  id: string;
  name: string;
  role: Role;
  /** `null` pour Mr. White, qui ne reçoit aucun mot. */
  word: string | null;
  isEliminated: boolean;
  avatarUrl?: string | null;
}

/** Configuration d'une partie avant la distribution des rôles. */
export interface GameSetup {
  selectedProfileIds: string[];
  civilians: number;
  undercovers: number;
  mrWhites: number;
}

/**
 * État complet d'une partie. **Ne doit jamais être envoyé à un client** : il
 * contient les mots et les rôles de tout le monde. Voir `redact.ts`.
 */
export interface Game {
  id: string;
  players: Player[];
  civilianWord: string;
  undercoverWord: string;
  theme: string;
  phase: Phase;
  currentRound: number;
  /** Ordre de la révélation et curseur associé. */
  revealOrder: string[];
  revealIndex: number;
  /** Ordre de parole de la manche en cours, retiré à chaque nouvelle manche. */
  speakingOrder: string[];
  /** Dernier joueur éliminé, montré à l'écran de résultat de manche. */
  lastEliminated: Player | null;
  /** Mr. White démasqué à qui l'on doit encore une devinette. */
  pendingGuesserId: string | null;
  lastGuessWasCorrect: boolean | null;
  /** Non nul si et seulement si `phase === 'gameOver'`. */
  outcome: Outcome | null;
}
