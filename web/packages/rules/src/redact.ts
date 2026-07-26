import { winnerIds } from './rules.js';
import type { Game, Outcome, Phase, Role } from './types.js';

/**
 * Projection de `Game` destinée à **un seul** joueur.
 *
 * C'est la pièce centrale de la version en ligne : `Game` porte les mots et les
 * rôles de tout le monde, ce qui est sans danger quand un unique téléphone fait
 * office de table, mais inacceptable dès que chacun a son écran. Rien ne sort
 * du serveur sans passer par ici.
 *
 * Deux invariants à ne jamais assouplir :
 *  - un joueur ne connaît **jamais son propre rôle** en cours de partie. Un
 *    undercover reçoit un mot, point : c'est exactement ce qui le rend jouable.
 *    (Mr. White le devine forcément, puisqu'il n'a pas de mot — c'est le jeu.)
 *  - le rôle d'autrui n'apparaît qu'une fois le joueur éliminé, et les deux mots
 *    de la paire seulement à la fin de la partie.
 */

export interface PublicPlayer {
  id: string;
  name: string;
  avatarUrl?: string | null;
  isEliminated: boolean;
  /** Renseigné uniquement si le joueur est éliminé, ou en fin de partie. */
  role?: Role;
}

export interface SelfView {
  id: string;
  name: string;
  /** `null` pour Mr. White. Aucun rôle n'est joint : voir l'invariant ci-dessus. */
  word: string | null;
  isEliminated: boolean;
  /** Révélé seulement quand le joueur est éliminé, ou en fin de partie. */
  role?: Role;
}

export interface PlayerView {
  gameId: string;
  phase: Phase;
  currentRound: number;
  you: SelfView;
  players: PublicPlayer[];
  speakingOrder: string[];
  /** Joueur éliminé à la manche précédente, rôle compris. */
  lastEliminated: PublicPlayer | null;
  pendingGuesserId: string | null;
  lastGuessWasCorrect: boolean | null;
  outcome: Outcome | null;
  /** Récapitulatif de fin de partie, absent tant qu'elle n'est pas terminée. */
  summary?: {
    civilianWord: string;
    undercoverWord: string;
    theme: string;
    winnerIds: string[];
  };
}

export function viewFor(game: Game, viewerId: string): PlayerView {
  const isOver = game.phase === 'gameOver';
  const self = game.players.find((player) => player.id === viewerId);

  const toPublic = (player: Game['players'][number]): PublicPlayer => ({
    id: player.id,
    name: player.name,
    avatarUrl: player.avatarUrl ?? null,
    isEliminated: player.isEliminated,
    ...(isOver || player.isEliminated ? { role: player.role } : {}),
  });

  const view: PlayerView = {
    gameId: game.id,
    phase: game.phase,
    currentRound: game.currentRound,
    you: self
      ? {
          id: self.id,
          name: self.name,
          word: self.word,
          isEliminated: self.isEliminated,
          ...(isOver || self.isEliminated ? { role: self.role } : {}),
        }
      : // Spectateur : quelqu'un qui suit la partie sans y jouer.
        { id: viewerId, name: '', word: null, isEliminated: true },
    players: game.players.map(toPublic),
    speakingOrder: game.speakingOrder,
    lastEliminated: game.lastEliminated ? toPublic(game.lastEliminated) : null,
    pendingGuesserId: game.pendingGuesserId,
    lastGuessWasCorrect: game.lastGuessWasCorrect,
    outcome: game.outcome,
  };

  if (isOver && game.outcome) {
    view.summary = {
      civilianWord: game.civilianWord,
      undercoverWord: game.undercoverWord,
      theme: game.theme,
      winnerIds: [...winnerIds(game, game.outcome)],
    };
  }
  return view;
}
