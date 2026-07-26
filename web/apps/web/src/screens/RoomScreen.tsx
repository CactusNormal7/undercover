import { useEffect, useState } from 'react';

import { joinRoom, recallName, recallSeat, rememberName, rememberSeat, type Seat } from '../api.js';
import { useRoom } from '../useRoom.js';
import { GameScreen } from './GameScreen.js';
import { Lobby } from './Lobby.js';

/**
 * Une partie, du salon à la fin. Le siège est retrouvé en local si l'on revient
 * après un rafraîchissement ; sinon on demande un pseudo et on en prend un.
 */
export function RoomScreen({ code, onLeave }: { code: string; onLeave: () => void }) {
  const [seat, setSeat] = useState<Seat | null>(() => recallSeat(code));
  const [name, setName] = useState(recallName());
  const [error, setError] = useState<string | null>(null);
  const connection = useRoom(seat);

  useEffect(() => {
    setSeat(recallSeat(code));
  }, [code]);

  if (!seat) {
    const takeSeat = async () => {
      try {
        rememberName(name);
        const joined = await joinRoom(code, name);
        const next: Seat = { code, seatToken: joined.seatToken, name };
        rememberSeat(next);
        setSeat(next);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Erreur inconnue');
      }
    };

    return (
      <main className="screen screen--centered">
        <h1 className="title">Partie {code}</h1>
        <p className="subtitle">Aucun compte nécessaire pour rejoindre.</p>
        <label className="field">
          <span>Votre pseudo</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} />
        </label>
        <button
          className="button button--primary"
          onClick={takeSeat}
          disabled={name.trim().length === 0}
        >
          Rejoindre
        </button>
        {error && <p className="error">{error}</p>}
        <button className="button button--link" onClick={onLeave}>
          Retour
        </button>
      </main>
    );
  }

  const { room, status, error: liveError, tiedIds, send } = connection;

  if (!room) {
    return (
      <main className="screen screen--centered">
        <p className="subtitle">
          {status === 'closed' ? 'Connexion perdue.' : 'Connexion à la partie…'}
        </p>
        <button className="button button--link" onClick={onLeave}>
          Retour
        </button>
      </main>
    );
  }

  return (
    <div className="screen">
      {liveError && <p className="error error--banner">{liveError}</p>}
      {room.status === 'lobby' || !room.game ? (
        <Lobby room={room} send={send} onLeave={onLeave} />
      ) : (
        <GameScreen room={room} game={room.game} send={send} tiedIds={tiedIds} />
      )}
    </div>
  );
}
