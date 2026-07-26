import type { ClientMessage, RoomView } from '@undercover/protocol';
import { MIN_PLAYERS, defaultSplit } from '@undercover/rules';
import { useState } from 'react';

import { inviteLink } from '../api.js';

/** Salon d'attente : inviter, régler la partie, lancer. */
export function Lobby({
  room,
  send,
  onLeave,
}: {
  room: RoomView;
  send: (message: ClientMessage) => void;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isHost = room.youId === room.hostId;
  const count = room.members.length;
  const suggested = defaultSplit(count);

  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteLink(room.code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="lobby">
      <header className="lobby__header">
        <div>
          <p className="label">Code d’invitation</p>
          <p className="code">{room.code}</p>
        </div>
        <button className="button button--ghost" onClick={copyInvite}>
          {copied ? 'Lien copié' : 'Copier le lien'}
        </button>
      </header>

      <section>
        <h2 className="section-title">
          Joueurs <span className="muted">{count}</span>
        </h2>
        <ul className="players">
          {room.members.map((member) => (
            <li key={member.id} className={member.isConnected ? '' : 'player--away'}>
              <span className="player__name">{member.name}</span>
              {member.isHost && <span className="tag">hôte</span>}
              {member.isGuest && <span className="tag tag--muted">invité</span>}
              {!member.isConnected && <span className="tag tag--muted">déconnecté</span>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="section-title">Réglages</h2>
        {isHost ? (
          <>
            <label className="field">
              <span>Catégorie de mots</span>
              <select
                value={room.settings.categoryId ?? ''}
                onChange={(event) =>
                  send({
                    type: 'updateSettings',
                    settings: { categoryId: event.target.value || null },
                  })
                }
              >
                <option value="">Toutes celles disponibles</option>
                {room.categories.map((category) => (
                  <option key={category.id} value={category.id} disabled={!category.isAvailable}>
                    {category.label} ({category.pairCount})
                    {category.isAvailable ? '' : ' — abonnement'}
                  </option>
                ))}
              </select>
            </label>

            <div className="row">
              <Stepper
                label="Undercovers"
                value={room.settings.undercovers}
                onChange={(undercovers) => send({ type: 'updateSettings', settings: { undercovers } })}
              />
              <Stepper
                label="Mr. White"
                value={room.settings.mrWhites}
                onChange={(mrWhites) => send({ type: 'updateSettings', settings: { mrWhites } })}
              />
            </div>

            <p className="note">
              Conseillé à {count} joueurs : {suggested.civilians} civils · {suggested.undercovers}{' '}
              undercover · {suggested.mrWhites} Mr. White.
            </p>
          </>
        ) : (
          <p className="note">L’hôte règle la partie.</p>
        )}

        {!room.capabilities.unlocked && (
          <p className="note note--premium">
            Table en version gratuite. Si l’hôte est abonné, toutes les catégories et les règles
            avancées s’ouvrent pour tout le monde — les autres joueurs n’ont rien à payer.
          </p>
        )}
      </section>

      {isHost ? (
        <button
          className="button button--primary"
          onClick={() => send({ type: 'startGame' })}
          disabled={count < MIN_PLAYERS}
        >
          {count < MIN_PLAYERS ? `Il faut ${MIN_PLAYERS} joueurs` : 'Lancer la partie'}
        </button>
      ) : (
        <p className="waiting">En attente de l’hôte…</p>
      )}

      <button className="button button--link" onClick={onLeave}>
        Quitter
      </button>
    </main>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="stepper">
      <span className="label">{label}</span>
      <div className="stepper__controls">
        <button onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
          −
        </button>
        <span className="stepper__value">{value}</span>
        <button onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}
