import { describe, expect, it } from 'vitest';

import { SeededRng } from '../rng.js';
import { findPlayer, startGame } from '../rules.js';
import type { GameSetup, Profile } from '../types.js';
import { PAIR, makeProfiles } from './helpers.js';

/** Port de `UndercoverTests/GameDistributionTests.swift`. */

function makeSetup(
  profiles: Profile[],
  civilians: number,
  undercovers: number,
  mrWhites: number,
): GameSetup {
  return {
    selectedProfileIds: profiles.map((profile) => profile.id),
    civilians,
    undercovers,
    mrWhites,
  };
}

const countRole = (game: ReturnType<typeof startGame>, role: string) =>
  game.players.filter((player) => player.role === role).length;

describe('distribution', () => {
  it('respecte les effectifs demandés', () => {
    const profiles = makeProfiles(6);
    const game = startGame({
      profiles,
      setup: makeSetup(profiles, 4, 1, 1),
      pair: PAIR,
      rng: new SeededRng(42),
    });

    expect(game.players).toHaveLength(6);
    expect(countRole(game, 'civilian')).toBe(4);
    expect(countRole(game, 'undercover')).toBe(1);
    expect(countRole(game, 'mrWhite')).toBe(1);
  });

  it('donne à chaque rôle le mot attendu', () => {
    const profiles = makeProfiles(6);
    const game = startGame({
      profiles,
      setup: makeSetup(profiles, 4, 1, 1),
      pair: PAIR,
      rng: new SeededRng(7),
    });

    for (const player of game.players) {
      if (player.role === 'civilian') expect(player.word).toBe(game.civilianWord);
      if (player.role === 'undercover') expect(player.word).toBe(game.undercoverWord);
      if (player.role === 'mrWhite') expect(player.word).toBeNull();
    }

    expect(game.civilianWord).not.toBe(game.undercoverWord);
    expect(new Set([game.civilianWord, game.undercoverWord])).toEqual(
      new Set([PAIR.word1, PAIR.word2]),
    );
    expect(game.theme).toBe('Animal');
  });

  /**
   * Le côté attribué aux civils doit varier : sinon `word1` serait toujours le
   * mot des civils, et l'undercover serait devinable par habitude.
   */
  it('ne fige pas le côté de la paire donné aux civils', () => {
    const profiles = makeProfiles(5);
    const setup = makeSetup(profiles, 3, 1, 1);

    const sides = new Set<string>();
    for (let seed = 0; seed < 50; seed += 1) {
      sides.add(startGame({ profiles, setup, pair: PAIR, rng: new SeededRng(seed) }).civilianWord);
    }

    expect(sides).toEqual(new Set([PAIR.word1, PAIR.word2]));
  });

  it('conserve l’identité des profils', () => {
    const profiles: Profile[] = [
      { id: crypto.randomUUID(), name: 'Alice', avatarUrl: 'https://cdn/alice.png' },
      { id: crypto.randomUUID(), name: 'Bob' },
      { id: crypto.randomUUID(), name: 'Chloé' },
      { id: crypto.randomUUID(), name: 'Dan' },
    ];
    const game = startGame({
      profiles,
      setup: makeSetup(profiles, 3, 1, 0),
      pair: PAIR,
      rng: new SeededRng(3),
    });

    expect(new Set(game.players.map((p) => p.id))).toEqual(new Set(profiles.map((p) => p.id)));
    const alice = findPlayer(game, profiles[0]!.id);
    expect(alice?.name).toBe('Alice');
    expect(alice?.avatarUrl).toBe('https://cdn/alice.png');
  });

  it('est reproductible à graine égale', () => {
    const profiles = makeProfiles(6);
    const setup = makeSetup(profiles, 4, 1, 1);

    const a = startGame({ profiles, setup, pair: PAIR, rng: new SeededRng(99), id: 'fixed' });
    const b = startGame({ profiles, setup, pair: PAIR, rng: new SeededRng(99), id: 'fixed' });

    expect(a).toEqual(b);
  });

  it('ignore un profil sélectionné deux fois', () => {
    const profiles = makeProfiles(4);
    const setup = makeSetup(profiles, 3, 1, 0);
    setup.selectedProfileIds.push(profiles[0]!.id); // doublon volontaire

    const game = startGame({ profiles, setup, pair: PAIR, rng: new SeededRng(11) });

    expect(game.players).toHaveLength(4);
    expect(new Set(game.players.map((p) => p.id)).size).toBe(4);
  });

  /** Un setup déséquilibré ne doit jamais casser — juste dégrader. */
  it('rattrape un setup déséquilibré', () => {
    const profiles = makeProfiles(5);
    const rng = new SeededRng(5);

    const tooFew = startGame({ profiles, setup: makeSetup(profiles, 1, 1, 0), pair: PAIR, rng });
    const tooMany = startGame({ profiles, setup: makeSetup(profiles, 40, 3, 2), pair: PAIR, rng });

    expect(tooFew.players).toHaveLength(5);
    expect(tooMany.players).toHaveLength(5);
  });

  it('démarre en révélation, à la manche 1', () => {
    const profiles = makeProfiles(5);
    const game = startGame({
      profiles,
      setup: makeSetup(profiles, 3, 1, 1),
      pair: PAIR,
      rng: new SeededRng(1),
    });

    expect(game.phase).toBe('wordReveal');
    expect(game.currentRound).toBe(1);
    expect(game.revealIndex).toBe(0);
    expect(new Set(game.revealOrder)).toEqual(new Set(profiles.map((p) => p.id)));
    expect(game.outcome).toBeNull();
  });
});
