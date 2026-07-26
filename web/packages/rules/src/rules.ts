import { normalizeForGuess } from './normalize.js';
import { randomBool, shuffled, type Rng } from './rng.js';
import type { Game, GameSetup, Outcome, Player, Profile, Role, WordPair } from './types.js';

/**
 * Port TypeScript de `GameRules.swift`.
 *
 * Deux différences assumées avec la version Swift :
 *  - les transitions sont **pures** (elles renvoient un nouvel état) au lieu
 *    d'être `mutating` : le serveur diffuse l'état après chaque action, et un
 *    état non partagé évite les mutations concurrentes dans le Durable Object ;
 *  - un appel invalide renvoie l'état inchangé, exactement comme les `guard`
 *    Swift qui sortent sans rien faire.
 *
 * Tout le reste — ordre des tests, arbitrages — doit rester identique au Swift.
 * Les tests de `__tests__/` sont le port de `UndercoverTests/` et sont la
 * spécification commune aux deux implémentations.
 */

const clone = <T>(value: T): T => structuredClone(value);

// MARK: - Construction

export interface StartGameArgs {
  profiles: readonly Profile[];
  setup: GameSetup;
  pair: WordPair;
  rng: Rng;
  id?: string;
}

/**
 * Construit une partie prête à jouer : rôles mélangés, mots distribués.
 *
 * Ne lève jamais. Si `setup` est déséquilibré, la liste de rôles est complétée
 * en civils ou tronquée pour couvrir exactement les profils retenus — l'UI
 * garantit déjà l'équilibre, ceci n'est qu'un filet.
 */
export function startGame({ profiles, setup, pair, rng, id }: StartGameArgs): Game {
  // Résout les profils dans l'ordre de sélection, en dédoublonnant.
  const seen = new Set<string>();
  const roster: Profile[] = [];
  for (const profileId of setup.selectedProfileIds) {
    if (seen.has(profileId)) continue;
    seen.add(profileId);
    const profile = profiles.find((candidate) => candidate.id === profileId);
    if (profile) roster.push(profile);
  }

  // Second tirage : quel côté de la paire revient aux civils. Sans lui,
  // `word1` serait systématiquement le mot des civils.
  const civiliansTakeWord1 = randomBool(rng);
  const civilianWord = civiliansTakeWord1 ? pair.word1 : pair.word2;
  const undercoverWord = civiliansTakeWord1 ? pair.word2 : pair.word1;

  // Infiltrés en tête : une éventuelle troncature retire des civils.
  let roles: Role[] = [
    ...Array<Role>(Math.max(0, setup.undercovers)).fill('undercover'),
    ...Array<Role>(Math.max(0, setup.mrWhites)).fill('mrWhite'),
    ...Array<Role>(Math.max(0, setup.civilians)).fill('civilian'),
  ];

  if (roles.length > roster.length) {
    roles = roles.slice(0, roster.length);
  } else if (roles.length < roster.length) {
    roles = roles.concat(Array<Role>(roster.length - roles.length).fill('civilian'));
  }
  roles = shuffled(roles, rng);

  const players: Player[] = roster.map((profile, index) => ({
    id: profile.id,
    name: profile.name,
    role: roles[index]!,
    word: wordFor(roles[index]!, civilianWord, undercoverWord),
    isEliminated: false,
    avatarUrl: profile.avatarUrl ?? null,
  }));

  return {
    id: id ?? crypto.randomUUID(),
    players,
    civilianWord,
    undercoverWord,
    theme: pair.theme,
    phase: 'wordReveal',
    currentRound: 1,
    revealOrder: players.map((player) => player.id),
    revealIndex: 0,
    speakingOrder: makeSpeakingOrder(players, rng),
    lastEliminated: null,
    pendingGuesserId: null,
    lastGuessWasCorrect: null,
    outcome: null,
  };
}

function wordFor(role: Role, civilian: string, undercover: string): string | null {
  switch (role) {
    case 'civilian':
      return civilian;
    case 'undercover':
      return undercover;
    case 'mrWhite':
      return null;
  }
}

// MARK: - État dérivé

export const alivePlayers = (game: Game): Player[] => game.players.filter((p) => !p.isEliminated);

export const aliveCivilians = (game: Game): Player[] =>
  alivePlayers(game).filter((p) => p.role === 'civilian');

/** Undercovers et Mr. White : le camp qui gagne à la parité. */
export const aliveInfiltrators = (game: Game): Player[] =>
  alivePlayers(game).filter((p) => p.role !== 'civilian');

export const findPlayer = (game: Game, id: string): Player | undefined =>
  game.players.find((p) => p.id === id);

export const orderedSpeakers = (game: Game): Player[] =>
  game.speakingOrder
    .map((id) => findPlayer(game, id))
    .filter((player): player is Player => player !== undefined);

/**
 * `null` tant que la partie continue. Ne tient pas compte d'une devinette de
 * Mr. White en attente : celle-ci est arbitrée avant ce test.
 */
export function currentOutcome(game: Game): Outcome | null {
  if (aliveInfiltrators(game).length === 0) return { kind: 'civilians' };
  if (aliveInfiltrators(game).length >= aliveCivilians(game).length) {
    return { kind: 'infiltrators' };
  }
  return null;
}

/** Profils crédités d'une victoire, coéquipiers éliminés compris. */
export function winnerIds(game: Game, outcome: Outcome): Set<string> {
  switch (outcome.kind) {
    case 'civilians':
      return new Set(game.players.filter((p) => p.role === 'civilian').map((p) => p.id));
    case 'infiltrators':
      return new Set(game.players.filter((p) => p.role !== 'civilian').map((p) => p.id));
    case 'mrWhiteGuessedWord':
      // Règle du jeu commercial : le Mr. White l'emporte seul.
      return new Set([outcome.playerId]);
  }
}

// MARK: - Ordre de parole

/**
 * Permutation des joueurs vivants. Mr. White ne parle jamais en premier :
 * ouvrir le tour sans aucun mot serait intenable.
 */
export function makeSpeakingOrder(players: readonly Player[], rng: Rng): string[] {
  const order = shuffled(
    players.filter((player) => !player.isEliminated),
    rng,
  );

  const first = order[0];
  if (first && first.role === 'mrWhite') {
    const other = order.findIndex((player) => player.role !== 'mrWhite');
    if (other !== -1) {
      [order[0], order[other]] = [order[other]!, order[0]!];
    }
  }
  return order.map((player) => player.id);
}

// MARK: - Transitions

export function advanceReveal(game: Game): Game {
  if (game.phase !== 'wordReveal') return game;

  const next = clone(game);
  next.revealIndex += 1;
  if (next.revealIndex >= next.revealOrder.length) {
    next.phase = 'discussion';
  }
  return next;
}

export function beginVoting(game: Game): Game {
  if (game.phase !== 'discussion') return game;
  return { ...clone(game), phase: 'voting' };
}

/**
 * Élimine le joueur désigné par le groupe.
 *
 * L'ordre des tests est déterminant : si la victime est un Mr. White, sa
 * devinette est arbitrée **avant** la condition de victoire, pour qu'une bonne
 * réponse batte une victoire civile survenant au même instant.
 */
export function eliminate(game: Game, playerId: string): Game {
  if (game.phase !== 'voting') return game;

  const index = game.players.findIndex((player) => player.id === playerId);
  if (index === -1 || game.players[index]!.isEliminated) return game;

  const next = clone(game);
  const victim = next.players[index]!;
  victim.isEliminated = true;
  next.lastEliminated = clone(victim);

  if (victim.role === 'mrWhite') {
    next.pendingGuesserId = playerId;
    next.lastGuessWasCorrect = null;
    next.phase = 'mrWhiteGuess';
    return next;
  }

  return concludeRoundOrFinish(next);
}

export interface GuessResult {
  game: Game;
  isCorrect: boolean;
}

/** Unique tentative du Mr. White démasqué. */
export function submitMrWhiteGuess(game: Game, text: string): GuessResult {
  if (game.phase !== 'mrWhiteGuess' || game.pendingGuesserId === null) {
    return { game, isCorrect: false };
  }

  const next = clone(game);
  const guesserId = next.pendingGuesserId!;
  const isCorrect = normalizeForGuess(text) === normalizeForGuess(next.civilianWord);
  next.lastGuessWasCorrect = isCorrect;
  next.pendingGuesserId = null;

  if (isCorrect) {
    next.outcome = { kind: 'mrWhiteGuessedWord', playerId: guesserId };
    next.phase = 'gameOver';
    return { game: next, isCorrect: true };
  }
  return { game: concludeRoundOrFinish(next), isCorrect: false };
}

export function startNextRound(game: Game, rng: Rng): Game {
  if (game.phase !== 'roundResult') return game;

  const next = clone(game);
  next.currentRound += 1;
  next.lastEliminated = null;
  next.lastGuessWasCorrect = null;
  next.speakingOrder = makeSpeakingOrder(next.players, rng);
  next.phase = 'discussion';
  return next;
}

function concludeRoundOrFinish(game: Game): Game {
  const result = currentOutcome(game);
  if (result) {
    game.outcome = result;
    game.phase = 'gameOver';
  } else {
    game.phase = 'roundResult';
  }
  return game;
}
