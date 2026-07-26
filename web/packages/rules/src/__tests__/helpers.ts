import type { Game, Player, Profile, Role, WordPair } from '../types.js';

export const PAIR: WordPair = { word1: 'Chat', word2: 'Chien', theme: 'Animal' };

export function makeProfiles(count: number): Profile[] {
  return Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(),
    name: `J${index}`,
  }));
}

export function makePlayers(roles: Role[], eliminated: ReadonlySet<number> = new Set()): Player[] {
  return roles.map((role, index) => ({
    id: crypto.randomUUID(),
    name: `J${index}`,
    role,
    word: null,
    isEliminated: eliminated.has(index),
    avatarUrl: null,
  }));
}

/**
 * Partie déterministe avec des rôles imposés, pour piloter précisément les
 * scénarios de fin. Port de `makeGame` dans `GameWinConditionTests.swift`.
 */
export function makeGame(roles: Role[], civilianWord = 'Chat'): Game {
  const players: Player[] = roles.map((role, index) => ({
    id: crypto.randomUUID(),
    name: `J${index}`,
    role,
    word: role === 'mrWhite' ? null : role === 'civilian' ? civilianWord : 'Chien',
    isEliminated: false,
    avatarUrl: null,
  }));

  return {
    id: crypto.randomUUID(),
    players,
    civilianWord,
    undercoverWord: 'Chien',
    theme: 'Animal',
    phase: 'voting',
    currentRound: 1,
    revealOrder: players.map((player) => player.id),
    revealIndex: players.length,
    speakingOrder: players.map((player) => player.id),
    lastEliminated: null,
    pendingGuesserId: null,
    lastGuessWasCorrect: null,
    outcome: null,
  };
}

/** Identifiant du n-ième joueur du rôle demandé, éliminés compris. */
export function idOf(game: Game, role: Role, offset = 0): string {
  return game.players.filter((player) => player.role === role)[offset]!.id;
}

/**
 * Premier joueur **encore en vie** du rôle demandé : indispensable dès qu'un
 * scénario enchaîne plusieurs éliminations du même camp.
 */
export function aliveIdOf(game: Game, role: Role): string {
  return game.players.find((player) => !player.isEliminated && player.role === role)!.id;
}
