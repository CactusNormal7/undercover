import type { Env } from './env.js';
import { checkDatabase, resolveHostAccess, resolveIdentity } from './entitlements.js';
import { issueSeatToken, verifySeatToken } from './seat.js';

export { GameRoom } from './GameRoom.js';

/**
 * Façade HTTP. Elle ne connaît rien du jeu : elle authentifie, attribue les
 * sièges, puis passe la main au Durable Object de la partie.
 *
 * Parcours d'une partie :
 *   POST /api/rooms            → l'hôte crée la partie (droits vérifiés ici)
 *   POST /api/rooms/:code/join → un invité prend un siège (aucun compte requis)
 *   GET  /api/rooms/:code/ws   → la connexion temps réel, jeton de siège à l'appui
 */

// Alphabet sans caractères confondables : un code se dicte à voix haute.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function makeRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((entry) => entry.trim());
  if (!allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (data: unknown, init: ResponseInit & { cors: Record<string, string> }) =>
  Response.json(data, { ...init, headers: { ...init.cors, ...init.headers } });

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().slice(0, 24);
  return name.length > 0 ? name : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    // POST /api/rooms — création par l'hôte.
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as { name?: unknown };
      const name = cleanName(body.name);
      if (!name) return json({ error: 'name_required' }, { status: 400, cors });

      // Ce que l'hôte a payé décide de ce que **toute la table** pourra jouer.
      // Seul endroit où les droits sont lus en base.
      const identity = await resolveHostAccess(request, env);
      const hostSeatId = crypto.randomUUID();

      // Collision de code : on retente sur un autre. Six caractères sur cet
      // alphabet laissent ~10⁹ combinaisons, c'est un cas de bord.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = makeRoomCode();
        const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
        const created = await stub.fetch('https://room/init', {
          method: 'POST',
          body: JSON.stringify({
            code,
            hostSeatId,
            hostName: identity.displayName ?? name,
            accountId: identity.accountId,
            isSubscribed: identity.isSubscribed,
          }),
        });
        if (created.ok) {
          return json(
            {
              code,
              seatToken: await issueSeatToken(env, code, {
                seatId: hostSeatId,
                accountId: identity.accountId,
              }),
              isSubscribed: identity.isSubscribed,
            },
            { status: 201, cors },
          );
        }
      }
      return json({ error: 'code_unavailable' }, { status: 503, cors });
    }

    const roomMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})(\/join|\/ws)?$/);
    if (roomMatch) {
      const code = roomMatch[1]!;
      const action = roomMatch[2];
      const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));

      // GET /api/rooms/:code — l'écran « rejoindre » avant toute connexion.
      if (!action && request.method === 'GET') {
        const info = await stub.fetch('https://room/info');
        return json(await info.json(), { status: info.status, cors });
      }

      // POST /api/rooms/:code/join — un siège, sans compte ni inscription.
      if (action === '/join' && request.method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as { name?: unknown };
        const name = cleanName(body.name);
        if (!name) return json({ error: 'name_required' }, { status: 400, cors });

        const info = await stub.fetch('https://room/info');
        if (!info.ok) return json({ error: 'room_not_found' }, { status: 404, cors });

        // Rejoindre n'exige aucun compte, mais si l'on est connecté on scelle
        // l'identité dans le siège — c'est le seul moment où l'en-tête
        // `Authorization` est disponible sur ce parcours.
        const identity = await resolveIdentity(request, env);
        const seat = { seatId: crypto.randomUUID(), accountId: identity.accountId };
        return json(
          { code, seatToken: await issueSeatToken(env, code, seat) },
          { status: 201, cors },
        );
      }

      // GET /api/rooms/:code/ws — connexion temps réel.
      if (action === '/ws' && request.method === 'GET') {
        const seat = await verifySeatToken(env, code, url.searchParams.get('token'));
        if (!seat) return new Response('Invalid seat token', { status: 401, headers: cors });

        const target = new URL('https://room/ws');
        target.searchParams.set('seat', seat.seatId);
        target.searchParams.set('name', url.searchParams.get('name') ?? '');
        if (seat.accountId) target.searchParams.set('account', seat.accountId);

        return stub.fetch(target, request);
      }
    }

    // `?deep=1` teste aussi la base : utile au déploiement, mais volontairement
    // pas fait par défaut — un contrôle de santé ne doit pas coûter une requête
    // Postgres à chaque appel.
    if (url.pathname === '/api/health') {
      if (url.searchParams.get('deep') !== '1') return json({ ok: true }, { status: 200, cors });
      const database = await checkDatabase(env);
      return json(
        { ok: database?.ok !== false, database: database ?? 'non configurée' },
        { status: database?.ok === false ? 503 : 200, cors },
      );
    }

    return json({ error: 'not_found' }, { status: 404, cors });
  },
} satisfies ExportedHandler<Env>;
