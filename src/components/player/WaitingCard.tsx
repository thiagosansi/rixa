'use client';

import type { ReactNode } from 'react';

export type WaitingCardProps = {
  /** manchete: padrão "Olha pra TV" */
  title?: string;
  emoji?: string;
  /** o que está acontecendo agora */
  children?: ReactNode;
  tone?: 'neutral' | 'good' | 'bad' | 'gold';
};

const TONES = {
  neutral: 'border-line bg-surface',
  good: 'border-team-blue/60 bg-team-blue/10',
  bad: 'border-team-red/60 bg-team-red/10',
  gold: 'border-gold/60 bg-gold/10',
};

/** Tela de espera: nunca deixa o celular vazio quando não é a vez da pessoa. */
export function WaitingCard({
  title = 'Olha pra TV',
  emoji = '👀',
  children,
  tone = 'neutral',
}: WaitingCardProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center gap-3 rounded-3xl border-2 px-5 py-8 text-center ${TONES[tone]}`}
    >
      <span className="text-6xl" aria-hidden>
        {emoji}
      </span>
      <span className="display text-3xl text-ink">{title}</span>
      {children && <div className="text-lg leading-snug text-muted">{children}</div>}
    </div>
  );
}

export default WaitingCard;
