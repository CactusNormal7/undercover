export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  /** Origines autorisées pour le CORS, séparées par des virgules. */
  ALLOWED_ORIGINS: string;
  /** Clé de signature des jetons de siège. À passer en secret hors dev. */
  SEAT_SECRET: string;
  /** Clé serveur Clerk (`sk_…`). Secret. Absente = auth désactivée en local. */
  CLERK_SECRET_KEY?: string;
  /** Origines acceptées comme émettrices du jeton Clerk (`azp`). */
  CLERK_AUTHORIZED_PARTIES?: string;
  /** Postgres. Secret. Absente = pas de lecture des droits d'accès. */
  DATABASE_URL?: string;
  ENVIRONMENT?: string;
}
