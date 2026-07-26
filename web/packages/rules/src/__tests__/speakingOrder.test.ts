import { describe, expect, it } from 'vitest';

import { SeededRng } from '../rng.js';
import { makeSpeakingOrder } from '../rules.js';
import { makePlayers } from './helpers.js';

/** Port de `UndercoverTests/SpeakingOrderTests.swift`. */

describe('ordre de parole', () => {
  it('est exactement une permutation des joueurs vivants', () => {
    const roster = makePlayers(['civilian', 'civilian', 'undercover', 'mrWhite'], new Set([1]));

    const order = makeSpeakingOrder(roster, new SeededRng(4));

    const aliveIds = new Set(roster.filter((p) => !p.isEliminated).map((p) => p.id));
    expect(order).toHaveLength(3);
    expect(new Set(order)).toEqual(aliveIds);
    expect(new Set(order).size, 'aucun doublon').toBe(order.length);
  });

  /** Mr. White n'a aucun mot : le faire ouvrir le tour serait intenable. */
  it('ne fait jamais parler Mr. White en premier', () => {
    const roster = makePlayers(['civilian', 'civilian', 'undercover', 'mrWhite']);

    for (let seed = 0; seed < 200; seed += 1) {
      const order = makeSpeakingOrder(roster, new SeededRng(seed));
      const first = roster.find((player) => player.id === order[0]);
      expect(first?.role, `graine ${seed} fait parler Mr. White en premier`).not.toBe('mrWhite');
    }
  });

  it('ne boucle pas quand seuls des Mr. White sont vivants', () => {
    const roster = makePlayers(['mrWhite', 'mrWhite']);

    expect(makeSpeakingOrder(roster, new SeededRng(1))).toHaveLength(2);
  });

  it('renvoie un ordre vide sans joueur vivant', () => {
    const roster = makePlayers(['civilian', 'undercover'], new Set([0, 1]));

    expect(makeSpeakingOrder(roster, new SeededRng(1))).toEqual([]);
  });

  it('varie réellement d’une graine à l’autre', () => {
    const roster = makePlayers(['civilian', 'civilian', 'civilian', 'undercover']);

    const seen = new Set<string>();
    for (let seed = 0; seed < 50; seed += 1) {
      seen.add(makeSpeakingOrder(roster, new SeededRng(seed)).join('|'));
    }

    expect(seen.size, 'l’ordre doit être rebattu').toBeGreaterThan(1);
  });
});
