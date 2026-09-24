'use client';

import { useState } from 'react';
import type { LeilaoState } from '@/game/types';
import { pickDeck } from '@/game/content';
import { LEILAO_MAX_BID, LEILAO_MIN_BID, POINTS, otherTeam } from '@/game/rounds';
import { QuickInput } from './QuickInput';
import { WaitingCard } from './WaitingCard';
import { TEAM_LABEL, TEAM_TEXT, normalizeText, pickAt, type RoundProps } from './shared';

export function LeilaoRound({ game, team, secret, act, round }: RoundProps & { round: LeilaoState }) {
  const cat = pickAt(pickDeck(game.deck).leilao, round.categoryIndex);
  const rival = otherTeam(team);

  const categoryCard = (
    <div className="rounded-2xl border-2 border-line bg-surface px-4 py-3 text-center">
      <div className="display text-xs tracking-[0.2em] text-gold" data-testid="leilao-progress">
        categoria {round.categoryNumber}/{round.totalCategories}
      </div>
      <p className="display mt-1 text-3xl leading-none text-ink">{cat?.category ?? 'aguarde a mesa'}</p>
      {cat?.hint && <p className="mt-2 text-base text-muted">{cat.hint}</p>}
    </div>
  );

  if (round.stage === 'bidding') {
    return (
      <section className="flex flex-col gap-3">
        {categoryCard}
        <BiddingPanel
          // durante o bidding o state público não traz valores: o do meu time vem no segredo
          myBid={secret.kind === 'leilao-bid' ? secret.amount : round.bids[team]}
          team={team}
          rivalHasBid={round.hasBid[rival]}
          onBid={(amount) => act({ type: 'bid', amount })}
        />
      </section>
    );
  }

  const iAmChallenger = round.winner === team;
  const okCount = round.accepted.filter((a) => a === true).length;
  const prize = round.target * POINTS.leilaoPerTarget * game.multiplier;

  if (round.stage === 'challenge') {
    return (
      <section className="flex flex-col gap-3">
        {categoryCard}
        <div className="flex items-end justify-between px-1">
          <span className="display text-lg text-muted">
            {iAmChallenger ? 'seu time prometeu' : 'eles prometeram'} {round.target}
          </span>
          <span className="display text-4xl text-gold" data-testid="leilao-counter">
            {Math.min(round.answers.length, round.target)} de {round.target}
          </span>
        </div>

        {iAmChallenger ? (
          <ChallengeInput answers={round.answers} onAnswer={(text) => act({ type: 'submit-answer', text })} />
        ) : (
          <WaitingCard emoji="🍿" title="Eles que se virem">
            O time {TEAM_LABEL[rival]} precisa listar {round.target}. Fique de olho: depois é o SEU time
            que julga cada resposta.
          </WaitingCard>
        )}

        <AnswerList answers={round.answers} accepted={round.accepted} />
        {iAmChallenger && (
          <p className="text-center text-base text-muted">
            Todo mundo do time pode mandar. Vale {prize} pontos — se falhar, vão pro adversário.
          </p>
        )}
      </section>
    );
  }

  /* ---------- julgamento ---------- */
  const iAmJudge = round.winner !== null && round.winner !== team;
  return (
    <section className="flex flex-col gap-3">
      {categoryCard}
      <div className="flex items-end justify-between px-1">
        <span className="display text-lg text-muted">{iAmJudge ? 'você julga' : 'eles julgam'}</span>
        <span className={`display text-4xl ${okCount >= round.target ? 'text-team-blue' : 'text-gold'}`}>
          {okCount} de {round.target} aceitas
        </span>
      </div>

      {round.answers.length === 0 && (
        <WaitingCard emoji="🦗" title="Nenhuma resposta">
          Não mandaram nada. Os {prize} pontos vão pro time {TEAM_LABEL[otherTeam(round.winner ?? team)]}.
        </WaitingCard>
      )}

      {iAmJudge ? (
        <ul className="flex flex-col gap-2">
          {round.answers.map((answer, i) => {
            const verdict = round.accepted[i];
            return (
              <li
                key={`${i}-${answer}`}
                className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface px-3 py-2"
              >
                <span className="min-w-0 flex-1 break-words text-xl text-ink">{answer}</span>
                <button
                  type="button"
                  aria-label={`aceitar ${answer}`}
                  aria-pressed={verdict === true}
                  onClick={() => act({ type: 'judge', index: i, accepted: true })}
                  className={`h-14 w-14 shrink-0 rounded-xl border-2 text-3xl ${
                    verdict === true
                      ? 'border-team-blue bg-team-blue text-[#04203a]'
                      : 'border-team-blue/50 text-team-blue'
                  }`}
                >
                  ✓
                </button>
                <button
                  type="button"
                  aria-label={`recusar ${answer}`}
                  aria-pressed={verdict === false}
                  onClick={() => act({ type: 'judge', index: i, accepted: false })}
                  className={`h-14 w-14 shrink-0 rounded-xl border-2 text-3xl ${
                    verdict === false
                      ? 'border-team-red bg-team-red text-white'
                      : 'border-team-red/50 text-team-red'
                  }`}
                >
                  ✗
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <WaitingCard emoji="⚖️" title="Em julgamento">
            O time {TEAM_LABEL[rival]} está aprovando ou recusando cada resposta. Pode reclamar em voz alta.
          </WaitingCard>
          <AnswerList answers={round.answers} accepted={round.accepted} />
        </>
      )}

      {iAmJudge && round.answers.length > 0 && (
        <p className="text-center text-base text-muted">
          Seja justo (ou não). Resposta sem julgamento conta como recusada. Qualquer pessoa do seu time
          pode mudar o veredito até o tempo acabar.
        </p>
      )}
    </section>
  );

}

function BiddingPanel({
  myBid,
  team,
  rivalHasBid,
  onBid,
}: {
  myBid: number | null;
  team: 'red' | 'blue';
  rivalHasBid: boolean;
  onBid: (amount: number) => void;
}) {
  // o lance é do time e pode subir OU descer até o prazo: o stepper anda livre de 1 a 10
  const [amount, setAmount] = useState(myBid ?? LEILAO_MIN_BID);
  const value = Math.max(LEILAO_MIN_BID, Math.min(LEILAO_MAX_BID, amount));
  const unchanged = myBid !== null && value === myBid;

  const stepBtn =
    'display h-20 w-20 shrink-0 rounded-2xl border-2 border-line bg-surface-2 text-5xl text-ink active:translate-y-[2px] disabled:opacity-30';

  return (
    <>
      <div className="rounded-2xl border-2 border-line bg-surface px-3 py-2 text-center">
        <div className="display text-xs text-muted">lance atual do seu time</div>
        <div className={`display text-5xl ${TEAM_TEXT[team]}`} data-testid="my-team-bid">
          {myBid ?? '—'}
        </div>
        <div className="mt-1 text-sm text-muted" data-testid="rival-bid-status">
          {rivalHasBid ? 'o outro time já apostou' : 'o outro time ainda não apostou'} · o valor é segredo
          até o martelo bater
        </div>
      </div>

      <p className="text-center text-lg text-muted">Quantos itens seu time garante listar?</p>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="diminuir"
          className={stepBtn}
          disabled={value <= LEILAO_MIN_BID}
          onClick={() => setAmount(value - 1)}
        >
          −
        </button>
        <span className="display w-24 text-center text-8xl tabular-nums text-gold" data-testid="bid-value">
          {value}
        </span>
        <button
          type="button"
          aria-label="aumentar"
          className={stepBtn}
          disabled={value >= LEILAO_MAX_BID}
          onClick={() => setAmount(value + 1)}
        >
          +
        </button>
      </div>
      <button
        type="button"
        disabled={unchanged}
        onClick={() => onBid(value)}
        data-testid="bid-confirm"
        className="display min-h-16 w-full rounded-2xl border-2 border-gold bg-gold text-2xl text-[#170d02] shadow-[0_6px_0_#a8781f] active:translate-y-[3px] disabled:opacity-50 disabled:shadow-none"
      >
        {myBid === null
          ? `Confirmar lance: ${value}`
          : unchanged
            ? `Lance do time: ${value}`
            : `Mudar lance para ${value}`}
      </button>

      <p className="text-center text-base text-muted">
        O lance é do TIME: qualquer pessoa pode subir ou baixar até o tempo acabar. Maior lance encara o
        desafio; no empate, leva quem deu o lance primeiro.
      </p>
    </>
  );
}

function ChallengeInput({ answers, onAnswer }: { answers: string[]; onAnswer: (text: string) => void }) {
  const [warning, setWarning] = useState<string | null>(null);
  return (
    <>
      <QuickInput
        label="resposta"
        placeholder="manda uma resposta"
        buttonLabel="Mandar"
        autoFocus
        onSubmit={(text) => {
          const dup = answers.some((a) => normalizeText(a) === normalizeText(text));
          setWarning(dup ? `“${text}” já foi. Manda outra!` : null);
          if (!dup) onAnswer(text);
        }}
      />
      {warning && (
        <p role="alert" className="rounded-xl border-2 border-team-red/60 bg-team-red/10 px-3 py-2 text-lg text-ink">
          {warning}
        </p>
      )}
    </>
  );
}

function AnswerList({ answers, accepted }: { answers: string[]; accepted: (boolean | null)[] }) {
  if (answers.length === 0) {
    return <p className="px-1 text-center text-lg text-muted">Nenhuma resposta ainda…</p>;
  }
  return (
    <ol className="flex flex-col gap-1">
      {answers.map((a, i) => {
        const v = accepted[i];
        return (
          <li
            key={`${i}-${a}`}
            className="animate-slide-up flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-lg text-ink"
          >
            <span className="display w-7 shrink-0 text-base text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 break-words">{a}</span>
            {v === true && <span className="text-team-blue">✓</span>}
            {v === false && <span className="text-team-red">✗</span>}
          </li>
        );
      })}
    </ol>
  );
}

export default LeilaoRound;
