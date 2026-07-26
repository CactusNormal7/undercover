import { describe, expect, it } from 'vitest';

import { viewFor } from '../redact.js';
import { SeededRng } from '../rng.js';
import { eliminate, startGame } from '../rules.js';
import { PAIR, idOf, makeGame, makeProfiles } from './helpers.js';

/**
 * Tests propres à la version en ligne : ils tiennent l'invariant qui n'existait
 * pas en pass-the-phone — rien de ce qui est secret ne doit sortir du serveur.
 */

function startedGame(seed: number) {
  const profiles = makeProfiles(6);
  return startGame({
    profiles,
    setup: {
      selectedProfileIds: profiles.map((p) => p.id),
      civilians: 4,
      undercovers: 1,
      mrWhites: 1,
    },
    pair: PAIR,
    rng: new SeededRng(seed),
  });
}

describe('projection par joueur', () => {
  it('ne révèle à personne son propre rôle en cours de partie', () => {
    const game = startedGame(21);

    for (const player of game.players) {
      expect(viewFor(game, player.id).you.role, `${player.role} apprend son rôle`).toBeUndefined();
    }
  });

  it('ne laisse pas fuiter le mot des civils vers un undercover', () => {
    const game = startedGame(21);
    const undercover = game.players.find((player) => player.role === 'undercover')!;

    const serialized = JSON.stringify(viewFor(game, undercover.id));

    expect(serialized).not.toContain(game.civilianWord);
    expect(serialized).toContain(game.undercoverWord);
  });

  it('donne à chacun son mot, et rien qu’à lui', () => {
    const game = startedGame(4);

    for (const player of game.players) {
      const view = viewFor(game, player.id);
      expect(view.you.word).toBe(player.word);
      // Aucune autre entrée ne porte de mot.
      expect(JSON.stringify(view.players)).not.toContain(game.civilianWord);
    }
  });

  it('ne révèle le rôle d’un joueur qu’une fois éliminé', () => {
    let game = makeGame(['civilian', 'civilian', 'civilian', 'civilian', 'undercover']);
    const victimId = idOf(game, 'civilian');
    const viewerId = idOf(game, 'undercover');

    expect(viewFor(game, viewerId).players.find((p) => p.id === victimId)?.role).toBeUndefined();

    game = eliminate(game, victimId);

    const after = viewFor(game, viewerId);
    expect(after.players.find((p) => p.id === victimId)?.role).toBe('civilian');
    expect(after.lastEliminated?.role).toBe('civilian');
    // Les autres restent couverts.
    expect(after.players.filter((p) => p.role !== undefined)).toHaveLength(1);
  });

  it('n’ouvre le récapitulatif qu’en fin de partie', () => {
    let game = makeGame(['civilian', 'civilian', 'civilian', 'undercover']);
    const viewerId = idOf(game, 'civilian');

    expect(viewFor(game, viewerId).summary).toBeUndefined();

    game = eliminate(game, idOf(game, 'undercover'));

    const summary = viewFor(game, viewerId).summary;
    expect(summary?.civilianWord).toBe('Chat');
    expect(summary?.undercoverWord).toBe('Chien');
    expect(summary?.winnerIds).toHaveLength(3);
    // Tous les rôles tombent en même temps que la partie.
    expect(viewFor(game, viewerId).players.every((p) => p.role !== undefined)).toBe(true);
  });

  it('traite un identifiant inconnu comme un spectateur sans mot', () => {
    const game = startedGame(9);

    const view = viewFor(game, crypto.randomUUID());

    expect(view.you.word).toBeNull();
    expect(JSON.stringify(view)).not.toContain(game.civilianWord);
  });
});
