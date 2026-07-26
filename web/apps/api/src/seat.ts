import type { Env } from './env.js';

/**
 * Jeton de siège : ce qui rattache une connexion à une place dans une partie.
 *
 * Un invité n'a pas de compte, il faut donc autre chose qu'une session pour le
 * reconnaître à la reconnexion — et surtout pour empêcher un tiers de se
 * brancher sur le siège d'un autre et lire son mot. D'où une signature HMAC :
 * l'identifiant de siège est public, mais non forgeable.
 */

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function key(env: Env): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(env.SEAT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function sign(env: Env, payload: string): Promise<string> {
  return base64url(await crypto.subtle.sign('HMAC', await key(env), encoder.encode(payload)));
}

export async function issueSeatToken(env: Env, roomCode: string, seatId: string): Promise<string> {
  return `${seatId}.${await sign(env, `${roomCode}:${seatId}`)}`;
}

/** Renvoie l'identifiant de siège, ou `null` si le jeton ne tient pas. */
export async function verifySeatToken(
  env: Env,
  roomCode: string,
  token: string | null,
): Promise<string | null> {
  if (!token) return null;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const seatId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = await sign(env, `${roomCode}:${seatId}`);

  // Comparaison à temps constant : les deux chaînes ont la même longueur.
  if (signature.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0 ? seatId : null;
}
