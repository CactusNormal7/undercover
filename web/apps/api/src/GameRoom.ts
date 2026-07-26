import type {
  ClientMessage,
  ErrorCode,
  MemberView,
  RoomCapabilities,
  RoomSettings,
  RoomView,
  ServerMessage,
  VoteView,
} from '@undercover/protocol';
import { PROTOCOL_VERSION } from '@undercover/protocol';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  SystemRng,
  advanceReveal,
  alivePlayers,
  beginVoting,
  defaultSplit,
  eliminate,
  startGame,
  startNextRound,
  submitMrWhiteGuess,
  viewFor,
  type Game,
  type Profile,
} from '@undercover/rules';

import type { Env } from './env.js';
import { categorySummaries, isCategoryAvailable, pairsFor } from './words.js';

/**
 * Une partie = un Durable Object, nommé d'après son code d'invitation.
 *
 * C'est **l'autorité** : il détient le seul `Game` complet et n'en envoie jamais
 * que des projections par joueur (`viewFor`). Aucun mot, aucun rôle ne transite
 * autrement — c'est la différence de nature avec la version pass-the-phone, où
 * un unique téléphone pouvait tout connaître sans risque.
 *
 * Ce qui n'est *pas* une règle du jeu vit ici et non dans `@undercover/rules` :
 * le dépouillement du vote, la présence des joueurs, les droits de la table.
 * Le moteur, lui, reste le port exact du Swift.
 */

interface Member {
  seatId: string;
  name: string;
  accountId: string | null;
  isReady: boolean;
}

interface RoomState {
  code: string;
  hostSeatId: string;
  capabilities: RoomCapabilities;
  settings: RoomSettings;
  members: Member[];
  status: 'lobby' | 'playing';
  game: Game | null;
  /** siège du votant → siège désigné. */
  votes: Record<string, string>;
}

export interface InitPayload {
  code: string;
  hostSeatId: string;
  hostName: string;
  accountId: string | null;
  isSubscribed: boolean;
}

export class GameRoom implements DurableObject {
  #state: RoomState | null = null;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {}

  // MARK: Routage interne (appelé par le Worker, jamais exposé tel quel)

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/init':
        return this.#init((await request.json()) as InitPayload);
      case '/info':
        return this.#info();
      case '/ws':
        return this.#openSocket(request, url);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  async #init(payload: InitPayload): Promise<Response> {
    const existing = await this.#load();
    if (existing) return Response.json({ ok: false, code: 'room_exists' }, { status: 409 });

    const capabilities: RoomCapabilities = {
      // Figé à la création, d'après les droits de l'hôte : un abonnement qui
      // expire en pleine partie ne doit pas la casser.
      unlocked: payload.isSubscribed,
      advancedRules: payload.isSubscribed,
    };

    await this.#save({
      code: payload.code,
      hostSeatId: payload.hostSeatId,
      capabilities,
      settings: { categoryId: null, undercovers: 1, mrWhites: 1 },
      members: [
        {
          seatId: payload.hostSeatId,
          name: payload.hostName,
          accountId: payload.accountId,
          isReady: false,
        },
      ],
      status: 'lobby',
      game: null,
      votes: {},
    });

    return Response.json({ ok: true });
  }

  async #info(): Promise<Response> {
    const state = await this.#load();
    if (!state) return Response.json({ exists: false }, { status: 404 });
    return Response.json({
      exists: true,
      status: state.status,
      memberCount: state.members.length,
      hostName: state.members.find((m) => m.seatId === state.hostSeatId)?.name ?? null,
    });
  }

  async #openSocket(request: Request, url: URL): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const state = await this.#load();
    if (!state) return new Response('Room not found', { status: 404 });

    const seatId = url.searchParams.get('seat');
    const name = (url.searchParams.get('name') ?? '').trim().slice(0, 24);
    const accountId = url.searchParams.get('account');
    if (!seatId) return new Response('Missing seat', { status: 400 });

    const known = state.members.find((member) => member.seatId === seatId);
    if (!known) {
      // Une partie lancée n'accueille plus personne : les rôles sont distribués.
      if (state.status !== 'lobby') return new Response('Game in progress', { status: 409 });
      if (state.members.length >= MAX_PLAYERS) return new Response('Room full', { status: 409 });
      if (!name) return new Response('Missing name', { status: 400 });

      state.members.push({ seatId, name, accountId, isReady: false });
      await this.#save(state);
    } else if (name && name !== known.name && state.status === 'lobby') {
      known.name = name;
      await this.#save(state);
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    // Hibernation : le DO peut être évincé de la mémoire entre deux messages
    // sans fermer les sockets — c'est ce qui rend une partie inactive gratuite.
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ seatId });

    const view = this.#viewFor(state, seatId);
    server.send(
      JSON.stringify({
        type: 'welcome',
        protocolVersion: PROTOCOL_VERSION,
        room: view,
      } satisfies ServerMessage),
    );
    this.#broadcast(state, server);

    return new Response(null, { status: 101, webSocket: client });
  }

  // MARK: Messages

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const state = await this.#load();
    if (!state) return;

    const seatId = this.#seatOf(ws);
    if (!seatId) return;

    let message: ClientMessage;
    try {
      message = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      this.#fail(ws, 'invalid_action', 'Message illisible.');
      return;
    }

    const failure = await this.#apply(state, seatId, message, ws);
    if (failure) return;

    await this.#save(state);
    this.#broadcast(state);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const state = await this.#load();
    if (!state) return;

    const seatId = this.#seatOf(ws);
    // En salon, une déconnexion libère la place ; en partie, le siège est
    // conservé pour permettre une reconnexion (les rôles sont déjà distribués).
    if (seatId && state.status === 'lobby' && seatId !== state.hostSeatId) {
      state.members = state.members.filter((member) => member.seatId !== seatId);
      await this.#save(state);
    }
    this.#broadcast(state, ws);
  }

  /** Renvoie `true` si l'action a été rejetée (rien à diffuser). */
  async #apply(
    state: RoomState,
    seatId: string,
    message: ClientMessage,
    ws: WebSocket,
  ): Promise<boolean> {
    const isHost = seatId === state.hostSeatId;

    switch (message.type) {
      case 'ready': {
        const member = state.members.find((candidate) => candidate.seatId === seatId);
        if (!member) return this.#fail(ws, 'invalid_action', 'Siège inconnu.');
        member.isReady = true;

        // Tout le monde a vu son mot : on solde la phase de révélation. Le
        // moteur avance joueur par joueur (héritage du pass-the-phone), ici
        // c'est la table entière qui franchit l'étape d'un coup.
        if (state.game?.phase === 'wordReveal' && state.members.every((m) => m.isReady)) {
          let game = state.game;
          while (game.phase === 'wordReveal') game = advanceReveal(game);
          state.game = game;
        }
        return false;
      }

      case 'updateSettings': {
        if (!isHost) return this.#fail(ws, 'not_host', "Seul l'hôte règle la partie.");
        if (state.status !== 'lobby') {
          return this.#fail(ws, 'game_in_progress', 'Partie déjà lancée.');
        }

        const next: RoomSettings = { ...state.settings, ...message.settings };
        if (
          next.categoryId !== null &&
          !isCategoryAvailable(next.categoryId, state.capabilities.unlocked)
        ) {
          return this.#fail(ws, 'premium_required', 'Cette catégorie demande un abonnement.');
        }
        next.undercovers = clamp(next.undercovers, 0, MAX_PLAYERS);
        next.mrWhites = clamp(next.mrWhites, 0, MAX_PLAYERS);
        state.settings = next;
        return false;
      }

      case 'startGame': {
        if (!isHost) return this.#fail(ws, 'not_host', "Seul l'hôte lance la partie.");
        if (state.members.length < MIN_PLAYERS) {
          return this.#fail(ws, 'not_enough_players', `Il faut ${MIN_PLAYERS} joueurs minimum.`);
        }
        if (state.members.length > MAX_PLAYERS) {
          return this.#fail(ws, 'too_many_players', `${MAX_PLAYERS} joueurs au maximum.`);
        }
        this.#deal(state);
        return false;
      }

      case 'beginVoting': {
        if (!isHost) return this.#fail(ws, 'not_host', "Seul l'hôte ouvre le vote.");
        if (!state.game) return this.#fail(ws, 'invalid_action', 'Aucune partie en cours.');
        state.votes = {};
        state.game = beginVoting(state.game);
        return false;
      }

      case 'vote': {
        if (!state.game || state.game.phase !== 'voting') {
          return this.#fail(ws, 'invalid_action', "Le vote n'est pas ouvert.");
        }
        const alive = new Set(alivePlayers(state.game).map((player) => player.id));
        if (!alive.has(seatId)) {
          return this.#fail(ws, 'invalid_action', 'Un joueur éliminé ne vote pas.');
        }
        if (!alive.has(message.targetId)) {
          return this.#fail(ws, 'invalid_action', 'Cible invalide.');
        }

        state.votes[seatId] = message.targetId;
        this.#tally(state, alive);
        return false;
      }

      case 'mrWhiteGuess': {
        if (!state.game || state.game.phase !== 'mrWhiteGuess') {
          return this.#fail(ws, 'invalid_action', 'Aucune devinette attendue.');
        }
        if (state.game.pendingGuesserId !== seatId) {
          return this.#fail(ws, 'invalid_action', "Ce n'est pas votre devinette.");
        }
        state.game = submitMrWhiteGuess(state.game, message.text).game;
        return false;
      }

      case 'nextRound': {
        if (!isHost) return this.#fail(ws, 'not_host', "Seul l'hôte enchaîne les manches.");
        if (!state.game) return this.#fail(ws, 'invalid_action', 'Aucune partie en cours.');
        state.votes = {};
        state.game = startNextRound(state.game, new SystemRng());
        return false;
      }

      case 'replay': {
        if (!isHost) return this.#fail(ws, 'not_host', "Seul l'hôte relance.");
        if (state.game?.phase !== 'gameOver') {
          return this.#fail(ws, 'invalid_action', 'La partie est encore en cours.');
        }
        this.#deal(state);
        return false;
      }

      case 'backToLobby': {
        if (!isHost) return this.#fail(ws, 'not_host', "Seul l'hôte referme la partie.");
        state.status = 'lobby';
        state.game = null;
        state.votes = {};
        for (const member of state.members) member.isReady = false;
        return false;
      }

      default:
        return this.#fail(ws, 'invalid_action', 'Message inconnu.');
    }
  }

  /** Distribution : la seule frontière avec le moteur de règles. */
  #deal(state: RoomState): void {
    const pool = pairsFor(state.settings.categoryId, state.capabilities.unlocked);
    const pair = pool[Math.floor(Math.random() * pool.length)];
    if (!pair) return;

    const profiles: Profile[] = state.members.map((member) => ({
      id: member.seatId,
      name: member.name,
    }));

    const count = profiles.length;
    const undercovers = Math.min(state.settings.undercovers, count);
    const mrWhites = Math.min(state.settings.mrWhites, count - undercovers);

    state.game = startGame({
      profiles,
      setup: {
        selectedProfileIds: profiles.map((profile) => profile.id),
        civilians: Math.max(0, count - undercovers - mrWhites),
        undercovers,
        mrWhites,
      },
      pair,
      rng: new SystemRng(),
    });
    state.status = 'playing';
    state.votes = {};
    for (const member of state.members) member.isReady = false;
  }

  /**
   * Dépouillement — coordination, pas règle du jeu : le moteur ne connaît que
   * « le groupe élimine untel ». Une égalité efface les votes et fait revoter.
   * (Départage définitif : question produit encore ouverte.)
   */
  #tally(state: RoomState, alive: ReadonlySet<string>): void {
    const voters = [...alive];
    if (!voters.every((id) => state.votes[id])) return;

    const counts = new Map<string, number>();
    for (const target of Object.values(state.votes)) {
      counts.set(target, (counts.get(target) ?? 0) + 1);
    }

    const best = Math.max(...counts.values());
    const leaders = [...counts.entries()].filter(([, n]) => n === best).map(([id]) => id);

    state.votes = {};

    if (leaders.length > 1) {
      this.#broadcastRaw({ type: 'voteTied', tiedIds: leaders });
      return;
    }
    if (state.game) state.game = eliminate(state.game, leaders[0]!);
  }

  // MARK: Diffusion

  #viewFor(state: RoomState, seatId: string): RoomView {
    const connected = new Set(
      this.ctx.getWebSockets().map((socket) => this.#seatOf(socket) ?? ''),
    );

    const members: MemberView[] = state.members.map((member) => ({
      id: member.seatId,
      name: member.name,
      isHost: member.seatId === state.hostSeatId,
      isConnected: connected.has(member.seatId),
      isGuest: member.accountId === null,
      isReady: member.isReady,
    }));

    const votes: VoteView[] = Object.entries(state.votes).map(([voterId, targetId]) => ({
      voterId,
      targetId,
    }));

    return {
      code: state.code,
      hostId: state.hostSeatId,
      youId: seatId,
      status: state.status,
      members,
      capabilities: state.capabilities,
      settings: state.settings,
      categories: categorySummaries(state.capabilities.unlocked),
      votes,
      // Le seul état de jeu qui sort d'ici, et il est expurgé pour ce siège.
      game: state.game ? viewFor(state.game, seatId) : null,
    };
  }

  #broadcast(state: RoomState, except?: WebSocket): void {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === except) continue;
      const seatId = this.#seatOf(socket);
      if (!seatId) continue;
      socket.send(
        JSON.stringify({ type: 'room', room: this.#viewFor(state, seatId) } satisfies ServerMessage),
      );
    }
  }

  #broadcastRaw(message: ServerMessage): void {
    const payload = JSON.stringify(message);
    for (const socket of this.ctx.getWebSockets()) socket.send(payload);
  }

  #fail(ws: WebSocket, code: ErrorCode, message: string): true {
    ws.send(JSON.stringify({ type: 'error', code, message } satisfies ServerMessage));
    return true;
  }

  #seatOf(ws: WebSocket): string | null {
    const attachment = ws.deserializeAttachment() as { seatId?: string } | null;
    return attachment?.seatId ?? null;
  }

  // MARK: Persistance

  async #load(): Promise<RoomState | null> {
    this.#state ??= (await this.ctx.storage.get<RoomState>('room')) ?? null;
    return this.#state;
  }

  async #save(state: RoomState): Promise<void> {
    this.#state = state;
    await this.ctx.storage.put('room', state);
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.trunc(value) || 0));

/** Répartition conseillée, réutilisée telle quelle par le client. */
export { defaultSplit };
