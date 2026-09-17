'use client';

import type { GameState, Player } from '@/game/types';
import { DURATIONS, mentirosoRevealMs } from '@/game/rounds';
import { Timer } from '@/components/ui';

function totalMsFor(game: GameState): number | undefined {
  const r = game.round;
  if (!r) return undefined;
  switch (r.kind) {
    case 'mimica':
      return DURATIONS.mimica.turn;
    case 'tabu':
      return DURATIONS.tabu.turn;
    case 'mentiroso':
      return r.stage === 'reveal' ? mentirosoRevealMs(r.options.length) : DURATIONS.mentiroso[r.stage];
    case 'leilao':
      return DURATIONS.leilao[r.stage];
    case 'relampago':
      return r.revealed ? DURATIONS.relampago.reveal : DURATIONS.relampago.question;
  }
}

/** Cabeçalho fixo e compacto: quem sou, meu time, placar e o relógio da vez. */
export function PlayerHeader({
  room,
  name,
  me,
  game,
  connected,
  clockOffset = 0,
}: {
  room: string;
  name: string;
  me: Player | null;
  game: GameState | null;
  connected: boolean;
  /** relógio do host − relógio local, em ms */
  clockOffset?: number;
}) {
  const team = me?.team ?? null;
  const stripe = team === 'red' ? 'bg-team-red' : team === 'blue' ? 'bg-team-blue' : 'bg-line';
  const nameTone = team === 'red' ? 'text-team-red' : team === 'blue' ? 'text-team-blue' : 'text-ink';
  const showTimer = game?.phase === 'round-play' && game.round;
  const showScore = game && game.phase !== 'lobby';

  return (
    <header className="player-header sticky top-0 z-20 border-b-2 border-line bg-bg/95 backdrop-blur">
      <div className={`h-1.5 w-full ${stripe}`} />
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-2">
        <div className="min-w-0 flex-1">
          <div className={`display truncate text-xl ${nameTone}`} data-testid="my-name">
            {me?.name ?? name}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${connected ? 'bg-[#3ddc97]' : 'animate-pulse-soft bg-team-red'}`}
              aria-label={connected ? 'conectado' : 'sem conexão'}
            />
            <span className="truncate">
              {room}
              {team ? ` · ${team === 'red' ? 'Vermelho' : 'Azul'}` : ' · sem time'}
            </span>
          </div>
        </div>

        {showScore && (
          <div className="display flex shrink-0 items-center gap-1 text-2xl tabular-nums" aria-label="placar">
            <span className={`text-team-red ${team === 'red' ? 'underline decoration-2 underline-offset-4' : ''}`}>
              {game.scores.red}
            </span>
            <span className="text-base text-muted">×</span>
            <span className={`text-team-blue ${team === 'blue' ? 'underline decoration-2 underline-offset-4' : ''}`}>
              {game.scores.blue}
            </span>
            {game.multiplier > 1 && <span className="ml-1 text-sm text-gold">{game.multiplier}x</span>}
          </div>
        )}

        {showTimer && game.round && (
          <Timer
            deadline={game.round.deadline}
            totalMs={totalMsFor(game)}
            offsetMs={clockOffset}
            size="sm"
            className="w-24 shrink-0"
          />
        )}
      </div>
    </header>
  );
}

export default PlayerHeader;
