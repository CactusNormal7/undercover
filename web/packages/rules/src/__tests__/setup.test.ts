import { describe, expect, it } from 'vitest';

import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  defaultSplit,
  isBalanced,
  totalRoles,
  withDefaultRoles,
} from '../setup.js';
import type { GameSetup } from '../types.js';

/** Port de `UndercoverTests/GameSetupTests.swift`. */

const setupWith = (count: number): GameSetup => ({
  selectedProfileIds: Array.from({ length: count }, () => crypto.randomUUID()),
  civilians: 0,
  undercovers: 0,
  mrWhites: 0,
});

describe('répartition par défaut', () => {
  it('reste cohérente à tous les effectifs jouables', () => {
    for (let count = MIN_PLAYERS; count <= MAX_PLAYERS; count += 1) {
      const split = defaultSplit(count);

      expect(
        split.civilians + split.undercovers + split.mrWhites,
        `la somme doit couvrir les ${count} joueurs`,
      ).toBe(count);
      expect(split.civilians).toBeGreaterThan(0); // une partie sans civil n'a pas de sens
      expect(split.undercovers, 'il faut toujours au moins un undercover').toBeGreaterThanOrEqual(1);
      expect(split.mrWhites).toBeGreaterThanOrEqual(0);
    }
  });

  it('produit toujours un setup équilibré', () => {
    for (let count = MIN_PLAYERS; count <= MAX_PLAYERS; count += 1) {
      const setup = withDefaultRoles(setupWith(count));
      expect(isBalanced(setup), `${count} joueurs devrait donner une répartition valide`).toBe(true);
    }
  });

  it('introduit Mr. White à partir de cinq joueurs', () => {
    expect(defaultSplit(4).mrWhites).toBe(0);
    expect(defaultSplit(5).mrWhites).toBe(1);
  });

  it('rétablit l’équilibre après une modification manuelle', () => {
    const edited: GameSetup = { ...setupWith(6), civilians: 99, undercovers: 0, mrWhites: 0 };
    expect(isBalanced(edited)).toBe(false);

    const reset = withDefaultRoles(edited);

    expect(isBalanced(reset)).toBe(true);
    expect(totalRoles(reset)).toBe(6);
  });

  it('n’équilibre jamais en dessous du minimum', () => {
    for (let count = 0; count < MIN_PLAYERS; count += 1) {
      const setup = withDefaultRoles(setupWith(count));
      expect(isBalanced(setup), `${count} joueurs ne suffit pas pour jouer`).toBe(false);
    }
  });
});
