'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { GameState, TeamId } from '@/game/types';
import { TEAM_LABELS } from '@/game/rounds';
import { TeamBadge, Timer } from '@/components/ui';

/* ------------------------------------------------------------------ */
/* tons por time (strings estáticas: o Tailwind precisa enxergar)      */
/* ------------------------------------------------------------------ */

export const TEAM_TEXT: Record<TeamId, string> = {
  red: 'text-team-red',
  blue: 'text-team-blue',
};
export const TEAM_BORDER: Record<TeamId, string> = {
  red: 'border-team-red/60',
  blue: 'border-team-blue/60',
};
export const TEAM_PANEL: Record<TeamId, string> = {
  red: 'border-team-red/50 bg-team-red/10',
  blue: 'border-team-blue/50 bg-team-blue/10',
};
export const TEAM_SOLID: Record<TeamId, string> = {
  red: 'bg-team-red text-white',
  blue: 'bg-team-blue text-[#04203a]',
};

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function teamLabel(team: TeamId): string {
  return `Time ${TEAM_LABELS[team]}`;
}

export function playerName(game: GameState, id: string | null | undefined): string {
  if (!id) return '—';
  return game.players.find((p) => p.id === id)?.name ?? '???';
}

export function playerTeam(game: GameState, id: string | null | undefined): TeamId | null {
  if (!id) return null;
  return game.players.find((p) => p.id === id)?.team ?? null;
}

/** Mesmo acesso circular que o engine usa para ler o baralho. */
export function pickAt<T>(arr: T[], index: number): T | null {
  if (arr.length === 0) return null;
  return arr[((index % arr.length) + arr.length) % arr.length];
}

export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '0';
}

/* ------------------------------------------------------------------ */
/* hooks                                                               */
/* ------------------------------------------------------------------ */

/** Relógio local para telas que derivam animação do deadline do estado. */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Devolve um contador (>0) enquanto o "flash" está ativo, ou null.
 * Dispara quando `value` muda e `when(prev, next)` aprova. Nunca dispara no mount.
 */
export function useFlashOnChange<T>(
  value: T,
  ms: number,
  when?: (prev: T, next: T) => boolean,
): number | null {
  const prevRef = useRef(value);
  const whenRef = useRef(when);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    whenRef.current = when;
  });

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (Object.is(prev, value)) return;
    if (whenRef.current && !whenRef.current(prev, value)) return;
    setCount((c) => c + 1);
    setActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActive(false), ms);
  }, [value, ms]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return active ? count : null;
}

/** Primeiro valor visto (para numerar cartas/palavras sem expor o índice real). */
export function useFirstValue<T>(value: T): T {
  const ref = useRef(value);
  return ref.current;
}

/* ------------------------------------------------------------------ */
/* peças de layout                                                     */
/* ------------------------------------------------------------------ */

export function PlayHeader({
  eyebrow,
  team,
  deadline,
  totalMs,
  children,
}: {
  eyebrow: string;
  team?: TeamId | null;
  deadline: number;
  totalMs: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-8">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        <span className="display text-2xl text-muted md:text-3xl">{eyebrow}</span>
        {team && <TeamBadge team={team} size="lg" label={`Vez do ${teamLabel(team)}`} />}
        {children}
      </div>
      <div data-tv="timer" className="shrink-0">
        <Timer deadline={deadline} totalMs={totalMs} size="lg" className="w-56 md:w-72" />
      </div>
    </div>
  );
}

export type Guess = { playerId: string; text: string; correct: boolean; at: number };

export function GuessFeed({
  game,
  guesses,
  max = 7,
  className = '',
}: {
  game: GameState;
  guesses: Guess[];
  max?: number;
  className?: string;
}) {
  const recent = guesses.slice(-max).reverse();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="display text-xl text-muted">palpites</span>
      {recent.length === 0 && <span className="text-2xl text-muted">ninguém chutou ainda…</span>}
      <ul className="flex flex-col gap-2">
        {recent.map((g) => (
          <li
            key={`${g.playerId}-${g.at}-${g.text}`}
            className={
              g.correct
                ? 'tv-burst rounded-2xl border-2 border-gold bg-gold/15 px-4 py-2'
                : 'animate-slide-up rounded-2xl border-2 border-line bg-surface px-4 py-2'
            }
          >
            <span className="text-base text-muted">{playerName(game, g.playerId)}</span>
            <div
              className={
                g.correct
                  ? 'display text-3xl text-gold md:text-4xl'
                  : 'display text-2xl text-muted line-through decoration-team-red decoration-4 md:text-3xl'
              }
            >
              {g.text}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatBox({
  label,
  value,
  tone = 'ink',
  pulseKey,
  fluid = false,
}: {
  label: string;
  value: ReactNode;
  tone?: 'ink' | 'gold' | 'red';
  pulseKey?: string | number;
  /** número escala com a ALTURA da tela (TV 720p não tem sobra vertical) */
  fluid?: boolean;
}) {
  const color = tone === 'gold' ? 'text-gold' : tone === 'red' ? 'text-team-red' : 'text-ink';
  return (
    <div
      className={`flex flex-1 flex-col justify-center rounded-2xl border-2 border-line bg-surface px-5 text-center ${fluid ? 'py-2' : 'py-3'}`}
    >
      <div className="display text-base text-muted md:text-lg">{label}</div>
      <div
        key={pulseKey}
        className={`display animate-pop tabular-nums ${fluid ? 'text-[clamp(2.75rem,7vh,4.5rem)] leading-none' : 'text-6xl md:text-7xl'} ${color}`}
      >
        {value}
      </div>
    </div>
  );
}

/** Faixa de tela inteira para troca de turno / anúncios curtos. */
export function Banner({ team, title, subtitle }: { team?: TeamId | null; title: string; subtitle?: string }) {
  const tone = team ? TEAM_SOLID[team] : 'bg-gold text-[#170d02]';
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-bg/70">
      <div className={`tv-stamp w-full py-10 text-center ${tone}`}>
        <div className="display text-7xl md:text-9xl">{title}</div>
        {subtitle && <div className="display mt-3 text-3xl opacity-80 md:text-5xl">{subtitle}</div>}
      </div>
    </div>
  );
}

export function NameChip({
  name,
  team,
  done,
}: {
  name: string;
  team: TeamId | null;
  done: boolean;
}) {
  const tone = team ? TEAM_PANEL[team] : 'border-line bg-surface';
  const text = team ? TEAM_TEXT[team] : 'text-ink';
  return (
    <span
      className={`display inline-flex items-center gap-2 rounded-2xl border-2 px-4 py-2 text-2xl transition-opacity duration-300 md:text-3xl ${tone} ${text} ${
        done ? 'animate-pop opacity-100' : 'opacity-35'
      }`}
    >
      <span aria-hidden>{done ? '✓' : '…'}</span>
      {name}
    </span>
  );
}
