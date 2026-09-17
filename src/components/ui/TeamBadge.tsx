'use client';

import type { TeamId } from '@/game/types';

export const TEAM_NAME: Record<TeamId, string> = { red: 'Vermelho', blue: 'Azul' };

export type TeamBadgeProps = {
  team: TeamId;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
};

const SIZES = {
  sm: 'text-sm px-2.5 py-1 rounded-lg',
  md: 'text-xl px-4 py-1.5 rounded-xl',
  lg: 'text-4xl md:text-5xl px-6 py-2 rounded-2xl',
};

export function TeamBadge({ team, size = 'md', label, className = '' }: TeamBadgeProps) {
  const tone =
    team === 'red'
      ? 'bg-team-red/15 text-team-red border-team-red/50'
      : 'bg-team-blue/15 text-team-blue border-team-blue/50';
  return (
    <span
      className={`display inline-flex items-center border-2 ${tone} ${SIZES[size]} ${className}`}
    >
      {label ?? TEAM_NAME[team]}
    </span>
  );
}

export default TeamBadge;
