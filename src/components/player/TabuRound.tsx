'use client';

import { useEffect, useRef, useState } from 'react';
import type { TabuState } from '@/game/types';
import { GuessPanel } from './GuessPanel';
import { WaitingCard } from './WaitingCard';
import { buzz, playerName, type RoundProps } from './shared';

const PENALTY_LOCK_MS = 1500;

function TabuCard({ word, forbidden }: { word: string; forbidden: string[] }) {
  return (
    <div className="rounded-3xl border-2 border-gold/60 bg-surface-2 px-4 py-4 text-center" data-testid="tabu-card">
      <div className="display text-xs tracking-[0.2em] text-gold">a palavra é</div>
      <div className="display mt-1 break-words text-5xl leading-none text-ink">{word}</div>
      <div className="display mt-4 text-xs tracking-[0.2em] text-team-red">proibido falar</div>
      <ul className="mt-2 flex flex-col gap-1">
        {forbidden.map((f) => (
          <li
            key={f}
            className="display rounded-xl border-2 border-team-red/50 bg-team-red/10 px-3 py-2 text-2xl text-team-red"
          >
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TabuRound({ game, me, team, secret, act, round }: RoundProps & { round: TabuState }) {
  const isGiver = round.clueGiverId === me.id;
  const myTeamPlays = round.activeTeam === team;
  const giverName = playerName(game, round.clueGiverId);
  const card = secret.kind === 'tabu-card' ? secret : null;

  const [locked, setLocked] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
  }, []);

  // outro árbitro acabou de marcar: trava o meu botão também (evita multa dupla pela mesma infração)
  const seenPenalties = useRef(round.penalties);
  useEffect(() => {
    if (round.penalties === seenPenalties.current) return;
    seenPenalties.current = round.penalties;
    setLocked(true);
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => setLocked(false), PENALTY_LOCK_MS);
  }, [round.penalties]);

  function penalize() {
    if (locked) return; // proteção contra toque duplo
    setLocked(true);
    act({ type: 'tabu-penalty' });
    buzz([80, 40, 120]);
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => setLocked(false), PENALTY_LOCK_MS);
  }

  const active = round.byTeam[round.activeTeam];
  const tally = (
    <p className="text-center text-base text-muted" data-testid="tabu-tally">
      {myTeamPlays ? 'seu time neste turno' : 'eles neste turno'}: acertos{' '}
      <span className="text-ink">{active.scored}</span> · infrações{' '}
      <span className="text-team-red">{active.penalties}</span>
    </p>
  );

  if (isGiver) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="display text-center text-xl text-gold">você dá as dicas</h2>
        {card ? <TabuCard word={card.word} forbidden={card.forbidden} /> : <WaitingCard emoji="🃏" title="Pegando a carta…" />}
        <p className="rounded-xl bg-surface px-3 py-2 text-center text-base text-muted">
          Fale em voz alta — não pode gesto nem as palavras proibidas.
        </p>
        <button
          type="button"
          onClick={() => act({ type: 'tabu-skip' })}
          className="display min-h-16 w-full rounded-2xl border-2 border-line bg-surface-2 text-2xl text-ink active:translate-y-[2px]"
        >
          Pular carta
        </button>
        {tally}
      </section>
    );
  }

  if (myTeamPlays) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="display text-center text-2xl text-gold">{giverName} dá as dicas — adivinhe!</h2>
        <GuessPanel
          game={game}
          meId={me.id}
          guesses={round.guesses}
          onGuess={(text) => act({ type: 'guess', text })}
          hint="Escute as dicas e digite a palavra. Acerto = 100 pontos."
        />
        {tally}
      </section>
    );
  }

  // time adversário = árbitro
  return (
    <section className="flex flex-col gap-3">
      <h2 className="display text-center text-xl text-gold">
        você é árbitro — vigie {giverName}
      </h2>
      {card ? <TabuCard word={card.word} forbidden={card.forbidden} /> : <WaitingCard emoji="🃏" title="Pegando a carta…" />}
      <button
        type="button"
        onClick={penalize}
        disabled={locked}
        data-testid="tabu-penalty"
        className="display min-h-28 w-full rounded-3xl border-4 border-team-red bg-team-red text-5xl text-white shadow-[0_8px_0_#9c1128] transition-transform active:translate-y-[4px] disabled:translate-y-[4px] disabled:opacity-60 disabled:shadow-none"
      >
        {locked ? 'Marcado! −50' : 'PEGOU!'}
      </button>
      <p className="text-center text-base text-muted">
        Aperte se falarem palavra proibida ou fizerem gesto: −50 pra eles e a carta troca.
      </p>
      {tally}
    </section>
  );
}

export default TabuRound;
