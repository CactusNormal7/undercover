import type { ClientMessage, RoomView, ServerMessage } from '@undercover/protocol';
import { useCallback, useEffect, useRef, useState } from 'react';

import { socketUrl, type Seat } from './api.js';

export interface RoomConnection {
  room: RoomView | null;
  status: 'connecting' | 'open' | 'closed';
  error: string | null;
  /** Égalité au dépouillement, effacée au vote suivant. */
  tiedIds: string[] | null;
  send: (message: ClientMessage) => void;
}

/**
 * Connexion WebSocket à une partie.
 *
 * Le client ne calcule rien : il affiche la projection que le serveur lui
 * envoie et lui renvoie des intentions. Toute la logique reste côté autorité —
 * c'est ce qui empêche un joueur curieux de lire l'état des autres.
 */
export function useRoom(seat: Seat | null): RoomConnection {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [status, setStatus] = useState<RoomConnection['status']>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [tiedIds, setTiedIds] = useState<string[] | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!seat) return;

    const socket = new WebSocket(socketUrl(seat));
    socketRef.current = socket;
    setStatus('connecting');

    socket.onopen = () => setStatus('open');
    socket.onclose = () => setStatus('closed');
    socket.onerror = () => setError('Connexion interrompue.');
    socket.onmessage = (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data) as ServerMessage;
      switch (message.type) {
        case 'welcome':
        case 'room':
          setRoom(message.room);
          setError(null);
          if (message.room.game?.phase !== 'voting') setTiedIds(null);
          break;
        case 'voteTied':
          setTiedIds(message.tiedIds);
          break;
        case 'error':
          setError(message.message);
          break;
      }
    };

    return () => {
      socket.onclose = null;
      socket.close();
      socketRef.current = null;
    };
  }, [seat?.code, seat?.seatToken]);

  const send = useCallback((message: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(message));
  }, []);

  return { room, status, error, tiedIds, send };
}
