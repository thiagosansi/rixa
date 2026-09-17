'use client';

import { useEffect, useState } from 'react';
import type { GameState, Scores, TeamId } from '@/game/types';
import { ROUND_INFO, TEAMS, TOTAL_ROUNDS } from '@/game/rounds';
import { Button } from '@/components/ui';
import { TEAM_PANEL, TEAM_TEXT, signed, teamLabel } from './shared';

/** Conta de `from` até `to`. Com prefers-reduced-motion, pula direto. */
export function useCountUp(from: number, to: number, durationMs = 1600, delayMs = 700): number {
  const [value, setValue] = useState(from);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || from === to) {
      setValue(to);
      return;
    }
    setValue(from);
    let raf = 0;
    let startAt = 0;
    const timer = setTimeout(() => {
      const frame = (t: number) => {
        if (!startAt) startAt = t;
        const p = Math.min(1, (t - startAt) / durationMs);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(from + (to - from) * eased));
        if (p < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }, delayMs);
    // rede de segurança: aba em segundo plano pausa o rAF
    const settle = setTimeout(() => setValue(to), delayMs + durationMs + 400);
    return () => {
      clearTimeout(timer);
      clearTimeout(settle);
      cancelAnimationFrame(raf);
    };
  }, [from, to, durationMs, delayMs]);

  return value;
}

function TeamResult({ team, total, delta }: { team: TeamId; total: number; delta: number }) {
  const shown = useCountUp(total - delta, total);
  return (
    <div
      data-tv="result-team"
      data-team={team}
      data-total={total}
      className={`flex flex-col items-center gap-2 rounded-3xl border-2 px-8 py-6 ${TEAM_PANEL[team]}`}
    >
      <div className={`display text-4xl ${TEAM_TEXT[team]}`}>{teamLabel(team)}</div>
      <div
        data-tv="result-delta"
        className={`display tv-stamp text-6xl tabular-nums md:text-7xl ${
          delta > 0 ? 'text-gold' : delta < 0 ? 'text-team-red' : 'text-muted'
        }`}
      >
        {signed(delta)}
      </div>
      <div className={`display text-8xl tabular-nums md:text-[9rem] ${TEAM_TEXT[team]}`}>{shown}</div>
    </div>
  );
}

export function leaderLine(scores: Scores): { team: TeamId | null; text: string } {
  const diff = Math.abs(scores.red - scores.blue);
  if (diff === 0) return { team: null, text: 'Tudo empatado' };
  const team: TeamId = scores.red > scores.blue ? 'red' : 'blue';
  return { team, text: `${teamLabel(team)} na frente por ${diff}` };
}

export function RoundResult({ game, onNext }: { game: GameState; onNext: () => void }) {
  const entry = game.roundLog[game.roundLog.length - 1];
  const delta: Scores = entry?.delta ?? { red: 0, blue: 0 };
  const info = entry ? ROUND_INFO[entry.kind] : null;
  const isLast = game.roundIndex >= TOTAL_ROUNDS - 1;
  const leader = leaderLine(game.scores);
  const roundWinner: TeamId | null =
    delta.red === delta.blue ? null : delta.red > delta.blue ? 'red' : 'blue';

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <div className="animate-slide-up">
        <div className="display text-3xl tracking-[0.2em] text-muted">
          Fim da rodada {game.roundIndex + 1}/{TOTAL_ROUNDS}
        </div>
        <h2 className="display stroke-title text-6xl text-gold md:text-8xl">{info?.title ?? 'Resultado'}</h2>
        <div className={`display mt-2 text-3xl ${roundWinner ? TEAM_TEXT[roundWinner] : 'text-muted'}`}>
          {roundWinner ? `${teamLabel(roundWinner)} levou a rodada` : 'Rodada empatada'}
        </div>
      </div>

      <div className="grid w-full max-w-6xl grid-cols-2 gap-8">
        {TEAMS.map((team) => (
          <TeamResult key={team} team={team} total={game.scores[team]} delta={delta[team]} />
        ))}
      </div>

      <div
        data-tv="leader-line"
        className={`display tv-rule text-5xl md:text-6xl ${leader.team ? TEAM_TEXT[leader.team] : 'text-ink'}`}
        style={{ animationDelay: '2400ms' }}
      >
        {leader.text}
      </div>

      <Button size="xl" onClick={onNext} data-tv="primary-action">
        {isLast ? 'Ver o campeão' : 'Próxima rodada'}
      </Button>
    </div>
  );
}

export default RoundResult;
