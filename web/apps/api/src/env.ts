export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  /** Origines autorisées pour le CORS, séparées par des virgules. */
  ALLOWED_ORIGINS: string;
  /** Clé de signature des jetons de siège. À passer en secret hors dev. */
  SEAT_SECRET: string;
  ENVIRONMENT?: string;
}
