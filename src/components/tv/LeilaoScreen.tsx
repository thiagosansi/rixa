'use client';

import type { GameState, LeilaoState, TeamId } from '@/game/types';
import type { Deck } from '@/game/content';
import { DURATIONS, POINTS, TEAMS, otherTeam } from '@/game/rounds';
import { Button } from '@/components/ui';
import { PlayHeader, TEAM_PANEL, TEAM_SOLID, TEAM_TEXT, pickAt, teamLabel, useNow } from './shared';

const BID_REVEAL_MS = 4500;

export function LeilaoScreen({
  game,
  round,
  content,
  onNext,
}: {
  game: GameState;
  round: LeilaoState;
  content: Deck;
  onNext: () => void;
}) {
  const category = pickAt(content.leilao, round.categoryIndex);
  const title = category?.category ?? '…';

  const totalMs =
    round.stage === 'bidding'
      ? DURATIONS.leilao.bidding
      : round.stage === 'challenge'
        ? DURATIONS.leilao.challenge
        : DURATIONS.leilao.judging;
  const stageLabel =
    round.stage === 'bidding' ? 'Lances abertos' : round.stage === 'challenge' ? 'Desafio' : 'Julgamento';
  const eyebrow = `Categoria ${round.categoryNumber}/${round.totalCategories} · ${stageLabel}`;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <PlayHeader
        eyebrow={eyebrow}
        team={round.stage === 'challenge' ? round.winner : null}
        deadline={round.deadline}
        totalMs={totalMs}
      />

      {round.stage === 'bidding' && (
        <div key={`bidding-${round.categoryNumber}`} className="animate-slide-up flex flex-1 flex-col items-center justify-center gap-8">
          <div className="text-center">
            <div className="display text-3xl text-muted">quantos você garante de…</div>
            <h2 className="display stroke-title tv-lh text-balance text-7xl text-gold md:text-9xl">{title}</h2>
            {category?.hint && <p className="mt-3 text-3xl text-muted">{category.hint}</p>}
          </div>
          <div className="display animate-pulse-soft text-4xl text-ink">lances secretos…</div>
          <div className="grid w-full max-w-5xl grid-cols-2 gap-6">
            {TEAMS.map((team) => {
              const placed = round.hasBid[team];
              return (
                <div
                  key={team}
                  data-tv="bid-status"
                  className={`rounded-3xl border-2 px-6 py-6 text-center ${TEAM_PANEL[team]} ${
                    placed ? '' : 'opacity-60'
                  }`}
                >
                  <div className={`display text-3xl ${TEAM_TEXT[team]}`}>{teamLabel(team)}</div>
                  <div
                    key={placed ? 'in' : 'out'}
                    className={`display mt-2 text-5xl md:text-6xl ${
                      placed ? 'animate-pop text-gold' : 'animate-pulse-soft text-muted'
                    }`}
                  >
                    {placed ? 'Apostou ✓' : 'Pensando…'}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-2xl text-muted">
            dá pra subir ou baixar o lance até o tempo acabar · maior lance encara o desafio · empatou,
            leva quem apostou primeiro
          </p>
        </div>
      )}

      {round.stage === 'challenge' && <Challenge round={round} title={title} />}

      {round.stage === 'judging' && (
        <Judging game={game} round={round} title={title} onNext={onNext} />
      )}
    </div>
  );
}

function BidPair({ round, size }: { round: LeilaoState; size: 'sm' | 'lg' }) {
  const big = size === 'lg';
  return (
    <div className={`grid grid-cols-2 ${big ? 'w-full max-w-5xl gap-8' : 'gap-3'}`}>
      {TEAMS.map((team) => {
        const won = round.winner === team;
        return (
          <div
            key={team}
            data-tv="bid-value"
            className={`rounded-3xl border-2 text-center ${TEAM_PANEL[team]} ${
              big ? 'px-8 py-8' : 'px-5 py-2'
            } ${won ? (big ? 'tv-glow-gold border-gold' : 'border-gold') : 'opacity-60'}`}
          >
            <div className={`display ${big ? 'text-4xl' : 'text-base'} ${TEAM_TEXT[team]}`}>
              {teamLabel(team)}
            </div>
            <div
              className={`display tabular-nums ${big ? 'text-[10rem] leading-none' : 'text-4xl'} ${
                won ? 'text-gold' : 'text-ink'
              }`}
            >
              {round.bids[team] ?? '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Challenge({ round, title }: { round: LeilaoState; title: string }) {
  const now = useNow(200);
  const start = round.deadline - DURATIONS.leilao.challenge;
  const showingBids = now - start < BID_REVEAL_MS;
  const winner = round.winner;
  const reached = round.answers.length >= round.target;

  return (
    <div key="challenge" className="animate-slide-up flex flex-1 flex-col gap-5">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="display text-2xl text-muted">categoria</div>
          <h2 className="display truncate text-5xl text-gold md:text-6xl">{title}</h2>
        </div>
        <BidPair round={round} size="sm" />
      </div>

      <div className="grid flex-1 grid-cols-[minmax(260px,30%)_minmax(0,1fr)] gap-6">
        <div
          className={`flex flex-col items-center justify-center rounded-3xl border-2 px-4 py-6 text-center ${
            reached ? 'tv-glow-gold border-gold bg-gold/10' : 'border-line bg-surface'
          }`}
        >
          <div className="display text-2xl text-muted">meta</div>
          <div data-tv="leilao-meta" className="display tabular-nums text-[8rem] leading-none text-ink md:text-[11rem]">
            <span key={round.answers.length} className="animate-pop inline-block text-gold">
              {round.answers.length}
            </span>
            <span className="text-5xl text-muted md:text-6xl"> de </span>
            {round.target}
          </div>
          {winner && (
            <div className={`display mt-3 text-3xl ${TEAM_TEXT[winner]}`}>{teamLabel(winner)} lista</div>
          )}
        </div>
        <AnswerList round={round} />
      </div>

      {showingBids && (
        <div
          data-tv="bid-reveal"
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-bg/95 px-8"
        >
          <div className="display tv-stamp text-6xl text-ink md:text-7xl">Os lances</div>
          <BidPair round={round} size="lg" />
          {winner && (
            <div className={`tv-stamp display rounded-2xl px-8 py-3 text-5xl ${TEAM_SOLID[winner]}`}>
              {teamLabel(winner)} encara: {round.target}!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnswerList({ round }: { round: LeilaoState }) {
  const judging = round.stage === 'judging';
  return (
    <ol
      className={`grid content-start gap-2 ${round.answers.length > 8 ? 'grid-cols-3' : 'grid-cols-2'}`}
    >
      {round.answers.map((answer, i) => {
        const verdict = round.accepted[i] ?? null;
        const frame =
          !judging || verdict === null
            ? 'border-line bg-surface'
            : verdict
              ? 'border-gold bg-gold/15'
              : 'border-team-red/60 bg-team-red/10 opacity-60';
        return (
          <li
            key={`${i}-${answer}`}
            data-tv="leilao-answer"
            className={`animate-slide-up flex items-center gap-3 rounded-2xl border-2 px-4 py-2 ${frame}`}
          >
            <span className="display w-10 shrink-0 text-3xl tabular-nums text-muted">{i + 1}</span>
            <span
              className={`display min-w-0 flex-1 truncate text-2xl md:text-3xl ${
                judging && verdict === false ? 'text-muted line-through' : 'text-ink'
              }`}
            >
              {answer}
            </span>
            {judging && (
              <span
                key={String(verdict)}
                className={`display animate-pop shrink-0 text-4xl ${
                  verdict === null ? 'text-muted' : verdict ? 'text-gold' : 'text-team-red'
                }`}
              >
                {verdict === null ? '?' : verdict ? '✓' : '✗'}
              </span>
            )}
          </li>
        );
      })}
      {round.answers.length === 0 && (
        <li className="col-span-full text-3xl text-muted">
          {judging ? 'nenhuma resposta enviada.' : 'as respostas aparecem aqui…'}
        </li>
      )}
    </ol>
  );
}

function Judging({
  game,
  round,
  title,
  onNext,
}: {
  game: GameState;
  round: LeilaoState;
  title: string;
  onNext: () => void;
}) {
  const winner = round.winner;
  const judge: TeamId | null = winner ? otherTeam(winner) : null;
  const ok = round.accepted.filter((a) => a === true).length;
  const pending = round.accepted.filter((a) => a === null).length;
  const decided = pending === 0;
  const success = ok >= round.target;
  const prize = round.target * POINTS.leilaoPerTarget * game.multiplier;
  const prizeTeam: TeamId | null = winner ? (success ? winner : otherTeam(winner)) : null;

  return (
    <div key="judging" className="animate-slide-up flex flex-1 flex-col gap-5">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="display text-2xl text-muted">categoria</div>
          <h2 className="display truncate text-5xl text-gold md:text-6xl">{title}</h2>
        </div>
        {judge && (
          <div className={`display text-3xl ${TEAM_TEXT[judge]}`}>{teamLabel(judge)} julga no celular</div>
        )}
      </div>

      <div className="grid flex-1 grid-cols-[minmax(260px,30%)_minmax(0,1fr)] gap-6">
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-line bg-surface px-4 py-6 text-center">
          <div className="display text-2xl text-muted">válidas</div>
          <div className="display tabular-nums text-[8rem] leading-none text-ink md:text-[11rem]">
            <span key={ok} className="animate-pop inline-block text-gold">
              {ok}
            </span>
            <span className="text-5xl text-muted md:text-6xl"> de </span>
            {round.target}
          </div>
          {!decided && <div className="display mt-3 text-2xl text-muted">faltam julgar {pending}</div>}
        </div>
        <AnswerList round={round} />
      </div>

      {decided && winner && prizeTeam && (
        <div
          data-tv="leilao-verdict"
          className={`tv-stamp flex items-center justify-center gap-8 rounded-3xl border-4 px-8 py-4 ${
            success ? 'tv-glow-gold border-gold bg-gold/15' : 'border-team-red bg-team-red/15'
          }`}
        >
          <span className={`display text-7xl md:text-8xl ${success ? 'text-gold' : 'text-team-red'}`}>
            {success ? 'Cumpriu!' : 'Falhou!'}
          </span>
          <span className={`display text-4xl md:text-5xl ${TEAM_TEXT[prizeTeam]}`}>
            +{prize} {teamLabel(prizeTeam)}
          </span>
          <Button size="md" variant="ghost" onClick={onNext}>
            Confirmar
          </Button>
        </div>
      )}
    </div>
  );
}

export default LeilaoScreen;
