const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8787';

/**
 * Appels REST et mémorisation du siège.
 *
 * Le jeton de siège est ce qui permet de revenir dans une partie après un
 * rafraîchissement — un invité n'ayant pas de compte, il n'y a rien d'autre
 * pour le reconnaître.
 */

export interface Seat {
  code: string;
  seatToken: string;
  name: string;
}

const seatKey = (code: string) => `undercover.seat.${code}`;

export function rememberSeat(seat: Seat): void {
  localStorage.setItem(seatKey(seat.code), JSON.stringify(seat));
}

export function recallSeat(code: string): Seat | null {
  const raw = localStorage.getItem(seatKey(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Seat;
  } catch {
    return null;
  }
}

export const rememberName = (name: string) => localStorage.setItem('undercover.name', name);
export const recallName = () => localStorage.getItem('undercover.name') ?? '';

/** Jeton d'abonnement de développement, en attendant le vrai fournisseur d'auth. */
export const devToken = () => localStorage.getItem('undercover.devToken');

function authHeaders(): HeadersInit {
  const token = devToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export interface CreatedRoom {
  code: string;
  seatToken: string;
  isSubscribed: boolean;
}

export const createRoom = (name: string) => post<CreatedRoom>('/api/rooms', { name });

export const joinRoom = (code: string, name: string) =>
  post<{ code: string; seatToken: string }>(`/api/rooms/${code}/join`, { name });

export interface RoomInfo {
  exists: boolean;
  status: 'lobby' | 'playing';
  memberCount: number;
  hostName: string | null;
}

export async function roomInfo(code: string): Promise<RoomInfo | null> {
  const response = await fetch(`${API_URL}/api/rooms/${code}`);
  if (!response.ok) return null;
  return (await response.json()) as RoomInfo;
}

export function socketUrl(seat: Seat): string {
  const base = API_URL.replace(/^http/, 'ws');
  const params = new URLSearchParams({ token: seat.seatToken, name: seat.name });
  return `${base}/api/rooms/${seat.code}/ws?${params.toString()}`;
}

export const inviteLink = (code: string) => `${window.location.origin}/r/${code}`;
