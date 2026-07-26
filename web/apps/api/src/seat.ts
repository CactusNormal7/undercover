import type { Env } from './env.js';

/**
 * Jeton de siège : ce qui rattache une connexion à une place dans une partie.
 *
 * Un invité n'a pas de compte, il faut donc autre chose qu'une session pour le
 * reconnaître à la reconnexion — et surtout pour empêcher un tiers de se
 * brancher sur le siège d'un autre et lire son mot. D'où une signature HMAC :
 * le contenu est public, mais non forgeable.
 *
 * Le jeton porte aussi le compte, quand il y en a un. Un navigateur ne peut pas
 * poser d'en-tête `Authorization` sur une connexion WebSocket : sans ça,
 * l'identité vérifiée au moment de prendre le siège serait perdue au moment de
 * s'y asseoir. Elle est donc scellée ici, avec le reste.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface Seat {
  seatId: string;
  /** `null` pour un invité. */
  accountId: string | null;
}

function base64urlFromBytes(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...view))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function bytesFromBase64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
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
  return base64urlFromBytes(
    await crypto.subtle.sign('HMAC', await key(env), encoder.encode(payload)),
  );
}

export async function issueSeatToken(env: Env, roomCode: string, seat: Seat): Promise<string> {
  const payload = base64urlFromBytes(encoder.encode(JSON.stringify(seat)));
  // Le code de la partie entre dans la signature : un jeton ne vaut que là où
  // il a été émis.
  return `${payload}.${await sign(env, `${roomCode}:${payload}`)}`;
}

/** Renvoie le siège scellé, ou `null` si le jeton ne tient pas. */
export async function verifySeatToken(
  env: Env,
  roomCode: string,
  token: string | null,
): Promise<Seat | null> {
  if (!token) return null;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = await sign(env, `${roomCode}:${payload}`);

  // Comparaison à temps constant.
  if (signature.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) return null;

  try {
    const seat = JSON.parse(decoder.decode(bytesFromBase64url(payload))) as Seat;
    return typeof seat.seatId === 'string' ? seat : null;
  } catch {
    return null;
  }
}
