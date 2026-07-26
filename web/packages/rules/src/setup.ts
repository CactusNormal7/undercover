import type { GameSetup } from './types.js';

/** Port de `GameSetup.swift`. */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;

export function emptySetup(): GameSetup {
  return { selectedProfileIds: [], civilians: 0, undercovers: 0, mrWhites: 0 };
}

export function playerCount(setup: GameSetup): number {
  return setup.selectedProfileIds.length;
}

export function totalRoles(setup: GameSetup): number {
  return setup.civilians + setup.undercovers + setup.mrWhites;
}

export function isBalanced(setup: GameSetup): boolean {
  return totalRoles(setup) === playerCount(setup) && playerCount(setup) >= MIN_PLAYERS;
}

export interface RoleSplit {
  civilians: number;
  undercovers: number;
  mrWhites: number;
}

/**
 * Répartition par défaut : au moins un undercover, Mr. White à partir de 5
 * joueurs, le reste en civils. Ex. 6 joueurs → 4 civils · 1 undercover · 1 Mr. White.
 */
export function defaultSplit(count: number): RoleSplit {
  if (count < MIN_PLAYERS) {
    return { civilians: Math.max(0, count), undercovers: 0, mrWhites: 0 };
  }
  const undercovers = Math.max(1, Math.floor(count / 4));
  const mrWhites = count >= 5 ? 1 : 0;
  const civilians = Math.max(0, count - undercovers - mrWhites);
  return { civilians, undercovers, mrWhites };
}

/** Recalcule la répartition par défaut à partir du nombre de joueurs actuel. */
export function withDefaultRoles(setup: GameSetup): GameSetup {
  return { ...setup, ...defaultSplit(playerCount(setup)) };
}
