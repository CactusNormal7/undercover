import type { ClientMessage, RoomView } from '@undercover/protocol';
import { ROLE_LABELS, type PlayerView, type PublicPlayer } from '@undercover/rules';
import { useState } from 'react';

/**
 * Déroulé d'une partie. Le client n'a que sa projection (`PlayerView`) : il ne
 * peut afficher que ce que le serveur a bien voulu lui donner, et ne décide de
 * rien — il envoie des intentions.
 */
export function GameScreen({
  room,
  game,
  send,
  tiedIds,
}: {
  room: RoomView;
  game: PlayerView;
  send: (message: ClientMessage) => void;
  tiedIds: string[] | null;
}) {
  const isHost = room.youId === room.hostId;
  const nameOf = (id: string) => game.players.find((player) => player.id === id)?.name ?? '?';

  return (
    <main className="game">
      <header className="game__header">
        <span className="label">Manche {game.currentRound}</span>
        <span className="label">{room.code}</span>
      </header>

      {game.phase === 'wordReveal' && (
        <WordReveal game={game} room={room} onReady={() => send({ type: 'ready' })} />
      )}

      {game.phase === 'discussion' && (
        <section className="panel">
          <h2 className="section-title">Ordre de parole</h2>
          <ol className="speakers">
            {game.speakingOrder.map((id, index) => (
              <li key={id} className={id === game.you.id ? 'speakers__me' : ''}>
                <span className="speakers__index">{index + 1}</span>
                {nameOf(id)}
              </li>
            ))}
          </ol>
          <p className="note">Chacun décrit son mot, sans le prononcer.</p>
          {isHost ? (
            <button className="button button--primary" onClick={() => send({ type: 'beginVoting' })}>
              Passer au vote
            </button>
          ) : (
            <p className="waiting">L’hôte ouvre le vote quand tout le monde a parlé.</p>
          )}
        </section>
      )}

      {game.phase === 'voting' && (
        <Voting room={room} game={game} tiedIds={tiedIds} send={send} nameOf={nameOf} />
      )}

      {game.phase === 'roundResult' && (
        <section className="panel">
          <h2 className="section-title">Éliminé</h2>
          {game.lastEliminated && (
            <p className="reveal">
              <strong>{game.lastEliminated.name}</strong> était{' '}
              <em>{ROLE_LABELS[game.lastEliminated.role ?? 'civilian']}</em>.
            </p>
          )}
          {game.lastGuessWasCorrect === false && (
            <p className="note">Mr. White s’est trompé de mot.</p>
          )}
          {isHost ? (
            <button className="button button--primary" onClick={() => send({ type: 'nextRound' })}>
              Manche suivante
            </button>
          ) : (
            <p className="waiting">En attente de l’hôte…</p>
          )}
        </section>
      )}

      {game.phase === 'mrWhiteGuess' && <MrWhiteGuess game={game} send={send} nameOf={nameOf} />}

      {game.phase === 'gameOver' && <GameOver room={room} game={game} send={send} isHost={isHost} />}

      <PlayerStrip players={game.players} youId={game.you.id} />
    </main>
  );
}

/**
 * Révélation du mot.
 *
 * Deux points repris de l'app iOS et à ne pas perdre : le mot reste couvert
 * jusqu'à un geste explicite, et l'écran de Mr. White garde exactement la même
 * silhouette que celui des autres — un coup d'œil de loin ne doit rien trahir.
 */
function WordReveal({
  game,
  room,
  onReady,
}: {
  game: PlayerView;
  room: RoomView;
  onReady: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const me = room.members.find((member) => member.id === room.youId);

  if (me?.isReady) {
    const waiting = room.members.filter((member) => !member.isReady).length;
    return (
      <section className="panel panel--centered">
        <p className="waiting">
          En attente de {waiting} joueur{waiting > 1 ? 's' : ''}…
        </p>
      </section>
    );
  }

  return (
    <section className="panel panel--centered">
      <p className="label">Votre mot</p>
      <button className="card" onClick={() => setRevealed(true)} disabled={revealed}>
        {revealed ? (
          <span className="card__word">{game.you.word ?? 'Aucun mot'}</span>
        ) : (
          <span className="card__cover">Toucher pour révéler</span>
        )}
      </button>
      <p className="note">
        {revealed && game.you.word === null
          ? 'À vous d’improviser à partir de ce que disent les autres.'
          : 'Gardez-le pour vous.'}
      </p>
      <button className="button button--primary" onClick={onReady} disabled={!revealed}>
        J’ai vu mon mot
      </button>
    </section>
  );
}

function Voting({
  room,
  game,
  tiedIds,
  send,
  nameOf,
}: {
  room: RoomView;
  game: PlayerView;
  tiedIds: string[] | null;
  send: (message: ClientMessage) => void;
  nameOf: (id: string) => string;
}) {
  const myVote = room.votes.find((vote) => vote.voterId === game.you.id)?.targetId;
  const alive = game.players.filter((player) => !player.isEliminated);

  return (
    <section className="panel">
      <h2 className="section-title">Qui éliminer ?</h2>
      {tiedIds && (
        <p className="note note--premium">
          Égalité entre {tiedIds.map(nameOf).join(', ')} : on revote.
        </p>
      )}
      {game.you.isEliminated ? (
        <p className="waiting">Vous êtes éliminé, vous ne votez plus.</p>
      ) : (
        <ul className="vote-list">
          {alive.map((player) => {
            const votes = room.votes.filter((vote) => vote.targetId === player.id);
            return (
              <li key={player.id}>
                <button
                  className={`vote ${myVote === player.id ? 'vote--mine' : ''}`}
                  onClick={() => send({ type: 'vote', targetId: player.id })}
                  disabled={player.id === game.you.id}
                >
                  <span>{player.name}</span>
                  {votes.length > 0 && <span className="vote__count">{votes.length}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="note">
        {room.votes.length} vote{room.votes.length > 1 ? 's' : ''} sur {alive.length}.
      </p>
    </section>
  );
}

function MrWhiteGuess({
  game,
  send,
  nameOf,
}: {
  game: PlayerView;
  send: (message: ClientMessage) => void;
  nameOf: (id: string) => string;
}) {
  const [guess, setGuess] = useState('');
  const isMine = game.pendingGuesserId === game.you.id;

  if (!isMine) {
    return (
      <section className="panel panel--centered">
        <p className="waiting">
          {nameOf(game.pendingGuesserId ?? '')} était Mr. White. Il tente de deviner le mot des
          civils…
        </p>
      </section>
    );
  }

  return (
    <section className="panel panel--centered">
      <h2 className="section-title">Dernière chance</h2>
      <p className="note">Quel était le mot des civils ?</p>
      <input value={guess} onChange={(event) => setGuess(event.target.value)} maxLength={40} />
      <button
        className="button button--primary"
        onClick={() => send({ type: 'mrWhiteGuess', text: guess })}
        disabled={guess.trim().length === 0}
      >
        Proposer
      </button>
    </section>
  );
}

function GameOver({
  room,
  game,
  send,
  isHost,
}: {
  room: RoomView;
  game: PlayerView;
  send: (message: ClientMessage) => void;
  isHost: boolean;
}) {
  const outcome = game.outcome;
  const winners = new Set(game.summary?.winnerIds ?? []);

  const headline =
    outcome?.kind === 'civilians'
      ? 'Les civils l’emportent'
      : outcome?.kind === 'infiltrators'
        ? 'Les infiltrés l’emportent'
        : 'Mr. White a trouvé le mot';

  return (
    <section className="panel">
      <h2 className="title">{headline}</h2>
      {game.summary && (
        <p className="reveal">
          Civils : <strong>{game.summary.civilianWord}</strong> · Undercover :{' '}
          <strong>{game.summary.undercoverWord}</strong>
          <span className="muted"> ({game.summary.theme})</span>
        </p>
      )}
      <ul className="players">
        {game.players.map((player) => (
          <li key={player.id} className={winners.has(player.id) ? 'player--winner' : ''}>
            <span className="player__name">{player.name}</span>
            <span className="tag">{ROLE_LABELS[player.role ?? 'civilian']}</span>
            {winners.has(player.id) && <span className="tag">gagne</span>}
          </li>
        ))}
      </ul>
      {isHost ? (
        <>
          <button className="button button--primary" onClick={() => send({ type: 'replay' })}>
            Rejouer avec les mêmes joueurs
          </button>
          <button className="button button--ghost" onClick={() => send({ type: 'backToLobby' })}>
            Retour au salon
          </button>
        </>
      ) : (
        <p className="waiting">L’hôte décide de la suite. Code : {room.code}</p>
      )}
    </section>
  );
}

function PlayerStrip({ players, youId }: { players: PublicPlayer[]; youId: string }) {
  return (
    <footer className="strip">
      {players.map((player) => (
        <span
          key={player.id}
          className={`strip__player ${player.isEliminated ? 'strip__player--out' : ''}`}
        >
          {player.name}
          {player.id === youId ? ' (vous)' : ''}
        </span>
      ))}
    </footer>
  );
}
