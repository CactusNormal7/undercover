import type { PlayerView } from '@undercover/rules';

/**
 * Contrat WebSocket entre le client et le Durable Object qui héberge une partie.
 *
 * Partagé par les deux côtés pour qu'un changement de message casse à la
 * compilation plutôt qu'à l'exécution. Rien ici ne doit contenir de secret : le
 * seul état de jeu transporté est `PlayerView`, déjà expurgé côté serveur.
 */

export const PROTOCOL_VERSION = 1;

/** Catégorie de mots proposée à l'hôte. */
export interface CategorySummary {
  id: string;
  label: string;
  pairCount: number;
  /** Une catégorie non gratuite exige un hôte abonné. */
  isPremium: boolean;
  /** Sélectionnable ici et maintenant, compte tenu des droits de l'hôte. */
  isAvailable: boolean;
}

/**
 * Ce que la table a le droit de faire, figé à la création de la partie d'après
 * les droits de l'**hôte** : un seul abonné suffit pour tout le monde.
 */
export interface RoomCapabilities {
  /** `true` si l'hôte était abonné au moment de créer la partie. */
  unlocked: boolean;
  advancedRules: boolean;
}

export interface RoomSettings {
  /** `null` = toutes les catégories accessibles à la table. */
  categoryId: string | null;
  undercovers: number;
  mrWhites: number;
}

export interface MemberView {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  /** Compte authentifié, par opposition à un invité arrivé par lien. */
  isGuest: boolean;
  /** A confirmé avoir lu son mot (phase de révélation). */
  isReady: boolean;
}

/** Vote à main levée : qui a désigné qui, visible de tous. */
export interface VoteView {
  voterId: string;
  targetId: string;
}

export interface RoomView {
  code: string;
  hostId: string;
  youId: string;
  status: 'lobby' | 'playing';
  members: MemberView[];
  capabilities: RoomCapabilities;
  settings: RoomSettings;
  categories: CategorySummary[];
  votes: VoteView[];
  /** État de la partie **expurgé pour le destinataire**, `null` en salon. */
  game: PlayerView | null;
}

// MARK: - Client → serveur

export type ClientMessage =
  /** Confirme avoir lu son mot ; la partie avance quand tous ont confirmé. */
  | { type: 'ready' }
  | { type: 'updateSettings'; settings: Partial<RoomSettings> }
  | { type: 'startGame' }
  | { type: 'beginVoting' }
  | { type: 'vote'; targetId: string }
  | { type: 'mrWhiteGuess'; text: string }
  | { type: 'nextRound' }
  /** Rejoue avec les mêmes joueurs : nouvelle paire, rôles rebattus. */
  | { type: 'replay' }
  | { type: 'backToLobby' };

// MARK: - Serveur → client

export type ErrorCode =
  | 'not_host'
  | 'not_enough_players'
  | 'too_many_players'
  | 'premium_required'
  | 'room_full'
  | 'room_not_found'
  | 'game_in_progress'
  | 'invalid_action';

export type ServerMessage =
  | { type: 'welcome'; protocolVersion: number; room: RoomView }
  /** Diffusé après chaque action : chaque joueur reçoit *sa* projection. */
  | { type: 'room'; room: RoomView }
  /** Égalité au dépouillement : les votes sont effacés, on revote. */
  | { type: 'voteTied'; tiedIds: string[] }
  | { type: 'error'; code: ErrorCode; message: string };
