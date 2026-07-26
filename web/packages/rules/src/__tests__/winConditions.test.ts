import { describe, expect, it } from 'vitest';

import { SeededRng } from '../rng.js';
import {
  beginVoting,
  currentOutcome,
  eliminate,
  startNextRound,
  submitMrWhiteGuess,
  winnerIds,
} from '../rules.js';
import type { Game } from '../types.js';
import { aliveIdOf, idOf, makeGame } from './helpers.js';

/** Port de `UndercoverTests/GameWinConditionTests.swift`. */

const advanceToVoting = (game: Game, seed = 1): Game =>
  beginVoting(startNextRound(game, new SeededRng(seed)));

describe('conditions de victoire', () => {
  it('ne conclut rien sur une partie fraîche', () => {
    const game = makeGame(['civilian', 'civilian', 'civilian', 'civilian', 'undercover', 'mrWhite']);
    expect(currentOutcome(game)).toBeNull();
  });

  it('donne la victoire aux civils quand tous les infiltrés sont sortis', () => {
    let game = makeGame(['civilian', 'civilian', 'civilian', 'undercover']);

    game = eliminate(game, idOf(game, 'undercover'));

    expect(game.phase).toBe('gameOver');
    expect(game.outcome).toEqual({ kind: 'civilians' });
  });

  it('donne la victoire aux infiltrés à la parité', () => {
    // 3 civils + 2 undercovers : éliminer un civil amène 2 contre 2.
    let game = makeGame(['civilian', 'civilian', 'civilian', 'undercover', 'undercover']);

    game = eliminate(game, idOf(game, 'civilian'));

    expect(game.phase).toBe('gameOver');
    expect(game.outcome).toEqual({ kind: 'infiltrators' });
  });

  it('continue après l’élimination d’un civil en milieu de partie', () => {
    let game = makeGame(['civilian', 'civilian', 'civilian', 'civilian', 'undercover']);

    game = eliminate(game, idOf(game, 'civilian'));

    expect(game.phase).toBe('roundResult');
    expect(game.outcome).toBeNull();
    expect(game.lastEliminated?.role).toBe('civilian');
  });
});

describe('Mr. White', () => {
  /**
   * Point le plus délicat : Mr. White éliminé doit passer par la devinette,
   * jamais directement par la fin de partie.
   */
  it('passe toujours par la devinette, même en dernier infiltré', () => {
    let game = makeGame(['civilian', 'civilian', 'civilian', 'mrWhite']);

    game = eliminate(game, idOf(game, 'mrWhite'));

    expect(game.phase).toBe('mrWhiteGuess');
    expect(game.outcome).toBeNull();
    expect(game.pendingGuesserId).not.toBeNull();
  });

  it('fait gagner Mr. White contre une victoire civile simultanée', () => {
    let game = makeGame(['civilian', 'civilian', 'civilian', 'mrWhite']);
    const mrWhiteId = idOf(game, 'mrWhite');
    game = eliminate(game, mrWhiteId);

    const { game: after, isCorrect } = submitMrWhiteGuess(game, 'Chat');

    expect(isCorrect).toBe(true);
    expect(after.phase).toBe('gameOver');
    expect(after.outcome).toEqual({ kind: 'mrWhiteGuessedWord', playerId: mrWhiteId });
    expect(winnerIds(after, after.outcome!)).toEqual(new Set([mrWhiteId]));
  });

  it('donne la partie aux civils sur une mauvaise réponse du dernier infiltré', () => {
    let game = makeGame(['civilian', 'civilian', 'civilian', 'mrWhite']);
    game = eliminate(game, idOf(game, 'mrWhite'));

    const { game: after, isCorrect } = submitMrWhiteGuess(game, 'Éléphant');

    expect(isCorrect).toBe(false);
    expect(after.phase).toBe('gameOver');
    expect(after.outcome).toEqual({ kind: 'civilians' });
  });

  it('continue sur une mauvaise réponse en milieu de partie', () => {
    let game = makeGame([
      'civilian',
      'civilian',
      'civilian',
      'civilian',
      'undercover',
      'mrWhite',
    ]);
    game = eliminate(game, idOf(game, 'mrWhite'));

    const { game: after } = submitMrWhiteGuess(game, 'Éléphant');

    expect(after.phase).toBe('roundResult');
    expect(after.outcome).toBeNull();
    expect(after.lastGuessWasCorrect).toBe(false);
  });

  /**
   * `GameSetup.mrWhites` est un entier : plusieurs Mr. White sont atteignables,
   * chacun doit obtenir sa propre devinette.
   */
  it('accorde sa devinette à chaque Mr. White', () => {
    let game = makeGame(['civilian', 'civilian', 'civilian', 'civilian', 'mrWhite', 'mrWhite']);

    game = eliminate(game, idOf(game, 'mrWhite', 0));
    expect(game.phase).toBe('mrWhiteGuess');
    game = submitMrWhiteGuess(game, 'faux').game;
    expect(game.phase).toBe('roundResult');

    game = advanceToVoting(game);

    game = eliminate(game, idOf(game, 'mrWhite', 1));
    expect(game.phase).toBe('mrWhiteGuess');
  });

  it('ignore accents, casse et espaces dans la devinette', () => {
    for (const guess of ['crème', 'Crème', 'creme', 'CREME', '  crème  ']) {
      let game = makeGame(['civilian', 'civilian', 'civilian', 'mrWhite'], 'Crème');
      game = eliminate(game, idOf(game, 'mrWhite'));
      expect(submitMrWhiteGuess(game, guess).isCorrect, `« ${guess} » devrait être accepté`).toBe(
        true,
      );
    }
  });

  it('rejette un mot seulement proche', () => {
    let game = makeGame(['civilian', 'civilian', 'civilian', 'mrWhite'], 'Crème');
    game = eliminate(game, idOf(game, 'mrWhite'));
    expect(submitMrWhiteGuess(game, 'crémier').isCorrect).toBe(false);
  });
});

describe('gagnants', () => {
  it('crédite aussi les coéquipiers éliminés', () => {
    let game = makeGame(['civilian', 'civilian', 'civilian', 'undercover', 'undercover']);
    const firstUndercover = aliveIdOf(game, 'undercover');

    game = eliminate(game, firstUndercover); // 3 civils · 1 infiltré
    expect(game.outcome).toBeNull();

    game = advanceToVoting(game);
    game = eliminate(game, aliveIdOf(game, 'civilian')); // 2 civils · 1 infiltré
    expect(game.outcome, '1 contre 2 : la partie continue').toBeNull();

    game = advanceToVoting(game);
    game = eliminate(game, aliveIdOf(game, 'civilian')); // 1 · 1 → parité

    expect(game.outcome).toEqual({ kind: 'infiltrators' });
    const winners = winnerIds(game, { kind: 'infiltrators' });
    expect(winners.size).toBe(2);
    expect(winners.has(firstUndercover), 'l’undercover éliminé gagne aussi').toBe(true);
  });
});

describe('enchaînement des manches', () => {
  it('avance la manche et rebat l’ordre de parole', () => {
    let game = makeGame(['civilian', 'civilian', 'civilian', 'civilian', 'undercover']);
    game = eliminate(game, idOf(game, 'civilian'));
    expect(game.phase).toBe('roundResult');

    game = startNextRound(game, new SeededRng(8));

    expect(game.phase).toBe('discussion');
    expect(game.currentRound).toBe(2);
    expect(game.lastEliminated).toBeNull();
    expect(game.speakingOrder, 'seuls les vivants parlent').toHaveLength(4);
  });

  it('ignore les transitions appelées dans la mauvaise phase', () => {
    const base = makeGame(['civilian', 'civilian', 'undercover']);
    const game: Game = { ...base, phase: 'discussion' };

    const after = eliminate(game, game.players[0]!.id); // pas en phase de vote
    expect(after.players[0]!.isEliminated).toBe(false);

    expect(submitMrWhiteGuess(after, 'Chat').isCorrect).toBe(false); // aucune devinette due
  });
});
