'use client';

import { useState } from 'react';
import type { MentirosoState } from '@/game/types';
import { pickDeck } from '@/game/content';
import { POINTS } from '@/game/rounds';
import { QuickInput } from './QuickInput';
import { WaitingCard } from './WaitingCard';
import { normalizeText, pickAt, playerName, type RoundProps } from './shared';

export function MentirosoRound({ game, me, team, act, round }: RoundProps & { round: MentirosoState }) {
  const q = pickAt(pickDeck(game.deck).mentiroso, round.questionIndex);
  const question = q?.question ?? 'A pergunta será carregada';
  const [warning, setWarning] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<string | null>(null);

  const myLie = round.lies.find((l) => l.playerId === me.id)?.text ?? null;
  const playing = game.players.filter((p) => p.team !== null);

  const questionCard = (
    <div className="rounded-2xl border-2 border-line bg-surface px-4 py-4">
      <div className="display text-xs tracking-[0.2em] text-gold" data-testid="mentiroso-progress">
        pergunta {round.questionNumber}/{round.totalQuestions}
      </div>
      <p className="mt-1 text-xl leading-snug text-ink">{question}</p>
    </div>
  );

  /* ---------- escrevendo ---------- */
  if (round.stage === 'writing') {
    function submit(text: string) {
      // o engine também barra; aqui é só pra explicar o motivo na hora
      if (q && normalizeText(text) === normalizeText(q.truth)) {
        setWarning('Opa, isso é perto demais da resposta de verdade. Escreva outra mentira!');
        return;
      }
      const clash = round.lies.some(
        (l) => l.playerId !== me.id && normalizeText(l.text) === normalizeText(text),
      );
      if (clash) {
        setWarning('Alguém já mandou exatamente isso. Invente outra!');
        return;
      }
      setWarning(null);
      act({ type: 'submit-lie', text });
    }

    return (
      <section className="flex flex-col gap-3">
        {questionCard}
        <QuickInput
          label="sua mentira"
          placeholder="invente uma resposta convincente"
          buttonLabel={myLie ? 'Trocar' : 'Enviar'}
          maxLength={80}
          onSubmit={submit}
          keepText
          autoFocus
        />
        {warning && (
          <p role="alert" className="rounded-xl border-2 border-team-red/60 bg-team-red/10 px-3 py-2 text-lg text-ink">
            {warning}
          </p>
        )}
        {myLie ? (
          <div className="animate-pop rounded-2xl border-2 border-team-blue/60 bg-team-blue/10 px-4 py-3" data-testid="lie-sent">
            <div className="display text-sm text-team-blue">enviado — aguardando os outros</div>
            <p className="mt-1 text-lg text-ink">“{myLie}”</p>
            <p className="mt-1 text-sm text-muted">Dá pra trocar até o tempo acabar.</p>
          </div>
        ) : (
          <p className="px-1 text-lg text-muted">
            Escreva algo que pareça verdade. Cada ADVERSÁRIO que cair vale {POINTS.mentirosoVoteReceived} pro seu
            time (colega de time caindo não vale nada).
          </p>
        )}
        <p className="text-center text-base text-muted">
          {round.lies.length} de {playing.length} já mentiram
        </p>
      </section>
    );
  }

  /* ---------- votando ---------- */
  if (round.stage === 'voting') {
    const myVote = round.votes[me.id] ?? null;
    const chosen = myVote ?? pendingVote;
    return (
      <section className="flex flex-col gap-3">
        {questionCard}
        <h2 className="display text-center text-2xl text-gold">
          {myVote ? 'votado — aguarde a revelação' : 'qual é a verdade?'}
        </h2>
        <ul className="flex flex-col gap-2">
          {round.options.map((o) => {
            const mine = o.ownerId === me.id;
            const selected = chosen === o.id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={mine || chosen !== null}
                  onClick={() => {
                    setPendingVote(o.id);
                    act({ type: 'vote', optionId: o.id });
                  }}
                  className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left text-xl transition-colors ${
                    selected
                      ? 'border-gold bg-gold/15 text-ink'
                      : mine
                        ? 'border-dashed border-line bg-transparent text-muted'
                        : 'border-line bg-surface-2 text-ink active:border-gold disabled:opacity-50'
                  }`}
                >
                  <span className="min-w-0 break-words">{o.text}</span>
                  {mine && <span className="display shrink-0 text-sm">essa é sua</span>}
                  {selected && <span className="display shrink-0 text-sm text-gold">seu voto</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-center text-base text-muted">
          {Object.keys(round.votes).length} de {playing.length} votaram · voto é único
        </p>
      </section>
    );
  }

  /* ---------- revelação ---------- */
  const truth = round.options.find((o) => o.ownerId === null);
  const myVoteId = round.votes[me.id];
  const myVoteOption = round.options.find((o) => o.id === myVoteId) ?? null;
  const foundTruth = myVoteOption?.ownerId === null;
  const myOption = round.options.find((o) => o.ownerId === me.id) ?? null;
  const fooledIds = myOption
    ? Object.entries(round.votes)
        .filter(([, optionId]) => optionId === myOption.id)
        .map(([voterId]) => voterId)
    : [];
  const fooled = fooledIds.map((id) => playerName(game, id));
  // só adversário enganado pontua
  const fooledRivals = fooledIds.filter(
    (id) => game.players.find((p) => p.id === id)?.team !== team,
  ).length;

  return (
    <section className="flex flex-col gap-3">
      {questionCard}
      <div className="rounded-2xl border-2 border-gold/60 bg-gold/10 px-4 py-3">
        <div className="display text-xs tracking-[0.2em] text-gold">a verdade</div>
        <p className="mt-1 text-2xl text-ink">{truth?.text ?? q?.truth ?? '—'}</p>
      </div>

      <WaitingCard
        emoji={foundTruth ? '🎯' : myVoteOption ? '🤡' : '🤷'}
        title={foundTruth ? 'Você achou a verdade!' : myVoteOption ? 'Caiu na mentira' : 'Você não votou'}
        tone={foundTruth ? 'good' : myVoteOption ? 'bad' : 'neutral'}
      >
        {foundTruth && <>+{POINTS.mentirosoFoundTruth} pro seu time.</>}
        {!foundTruth && myVoteOption && (
          <>
            Você votou em “{myVoteOption.text}” — mentira de {playerName(game, myVoteOption.ownerId)}.
          </>
        )}
        {!myVoteOption && <>Sem voto, sem ponto.</>}
      </WaitingCard>

      <div className="rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg">
        {myOption ? (
          fooled.length > 0 ? (
            <p className="text-ink">
              Sua mentira “{myOption.text}” enganou <span className="text-gold">{fooled.join(', ')}</span>: +
              {fooledRivals * POINTS.mentirosoVoteReceived}
              {fooledRivals < fooled.length ? ' (colega de time não conta)' : ''}.
            </p>
          ) : (
            <p className="text-muted">Ninguém caiu na sua mentira “{myOption.text}”.</p>
          )
        ) : (
          <p className="text-muted">Você não mandou mentira nesta pergunta.</p>
        )}
      </div>
    </section>
  );
}

export default MentirosoRound;
