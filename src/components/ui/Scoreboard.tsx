'use client';

import type { Scores } from '@/game/types';
import { TEAM_NAME } from './TeamBadge';

export type ScoreboardProps = {
  scores: Scores;
  multiplier?: number;
  compact?: boolean;
  className?: string;
};

export function Scoreboard({ scores, multiplier = 1, compact = false, className = '' }: ScoreboardProps) {
  const cell = compact
    ? 'px-3 py-2 text-2xl'
    : 'px-6 py-4 text-6xl md:text-8xl';
  const label = compact ? 'text-[10px]' : 'text-sm md:text-base';

  return (
    <div className={`flex items-stretch gap-3 ${className}`}>
      <div className={`flex-1 rounded-2xl border-2 border-team-red/50 bg-team-red/10 ${cell}`}>
        <div className={`display text-team-red/80 ${label}`}>{TEAM_NAME.red}</div>
        <div className="display tabular-nums text-team-red">{scores.red}</div>
      </div>

      {multiplier > 1 && (
        <div className="flex items-center">
          <span className="display animate-pulse-soft rounded-xl border-2 border-gold bg-gold/15 px-3 py-2 text-xl text-gold md:text-3xl">
            {multiplier}x
          </span>
        </div>
      )}

      <div className={`flex-1 rounded-2xl border-2 border-team-blue/50 bg-team-blue/10 text-right ${cell}`}>
        <div className={`display text-team-blue/80 ${label}`}>{TEAM_NAME.blue}</div>
        <div className="display tabular-nums text-team-blue">{scores.blue}</div>
      </div>
    </div>
  );
}

export default Scoreboard;
