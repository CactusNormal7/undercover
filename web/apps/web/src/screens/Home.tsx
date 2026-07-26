import { useState } from 'react';

import { createRoom, joinRoom, recallName, rememberName, rememberSeat } from '../api.js';
import { AccountBar } from '../auth.js';

/**
 * Accueil : créer une partie (il faut un compte pour porter l'abonnement) ou en
 * rejoindre une par code — sans compte, c'est le point du modèle « un abonné
 * suffit ».
 */
export function Home({ onEnterRoom }: { onEnterRoom: (code: string) => void }) {
  const [name, setName] = useState(recallName());
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  };

  const onCreate = () =>
    run(async () => {
      rememberName(name);
      const room = await createRoom(name);
      rememberSeat({ code: room.code, seatToken: room.seatToken, name });
      onEnterRoom(room.code);
    });

  const onJoin = () =>
    run(async () => {
      rememberName(name);
      const target = code.trim().toUpperCase();
      const seat = await joinRoom(target, name);
      rememberSeat({ code: target, seatToken: seat.seatToken, name });
      onEnterRoom(target);
    });

  const nameMissing = name.trim().length === 0;

  return (
    <main className="screen screen--centered">
      <AccountBar />
      <h1 className="title">Undercover</h1>
      <p className="subtitle">Le même jeu, chacun sur son écran.</p>

      <label className="field">
        <span>Votre pseudo</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={24}
          placeholder="Alex"
          autoComplete="nickname"
        />
      </label>

      <button className="button button--primary" onClick={onCreate} disabled={busy || nameMissing}>
        Créer une partie
      </button>

      <div className="divider">ou</div>

      <label className="field">
        <span>Code d’invitation</span>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABC123"
          className="input--code"
        />
      </label>

      <button
        className="button button--ghost"
        onClick={onJoin}
        disabled={busy || nameMissing || code.trim().length !== 6}
      >
        Rejoindre
      </button>

      {error && <p className="error">{error}</p>}

      <p className="note">
        Rejoindre ne demande aucun compte. Seul l’hôte a besoin d’un compte et d’un abonnement pour
        ouvrir les catégories premium — il vaut alors pour toute la table.
      </p>
    </main>
  );
}
