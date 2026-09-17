'use client';

import type { GameState } from '@/game/types';
import {
  ROUND_INFO,
  TOTAL_ROUNDS,
  pickRotating,
  playersOfTeam,
  roundKindAt,
  startingTeam,
} from '@/game/rounds';
import { Button, TeamBadge } from '@/components/ui';
import { TEAM_TEXT, teamLabel } from './shared';

export function RoundIntro({ game, onNext }: { game: GameState; onNext: () => void }) {
  const kind = roundKindAt(game.roundIndex);
  const info = ROUND_INFO[kind];
  const isFinal = game.multiplier > 1;

  const first = startingTeam(game.roundIndex);
  const performer = pickRotating(playersOfTeam(game.players, first), game.roundIndex);
  const turnBased = kind === 'desenha' || kind === 'tabu';
  const verb = kind === 'desenha' ? 'desenha' : 'dá as dicas';

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-7 text-center">
      <div className="display animate-slide-up text-4xl tracking-[0.2em] text-muted md:text-5xl">
        Rodada <span className="text-ink">{game.roundIndex + 1}</span>/{TOTAL_ROUNDS}
      </div>

      <h2 className="display stroke-title tv-title-in tv-lh text-balance text-8xl text-gold md:text-[10rem]">
        {info.title}
      </h2>
      <p className="animate-slide-up text-3xl text-muted md:text-4xl">{info.tagline}</p>

      {isFinal && (
        <div
          data-tv="triple-stamp"
          className="tv-stamp-big display tv-glow-gold rotate-[-6deg] rounded-3xl border-8 border-gold bg-gold px-10 py-4 text-8xl text-[#170d02] md:text-[9rem]"
        >
          Vale {game.multiplier}x
        </div>
      )}

      <ul className="flex max-w-5xl flex-col gap-3 text-left">
        {info.rules.map((rule, i) => (
          <li
            key={rule}
            className="tv-rule flex items-start gap-4 text-3xl text-ink md:text-4xl"
            style={{ animationDelay: `${300 + i * 180}ms` }}
          >
            <span className="display mt-1 text-gold">{i + 1}</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-4 text-3xl">
        {turnBased ? (
          <>
            <span className="display text-muted">começa</span>
            <TeamBadge team={first} size="lg" label={teamLabel(first)} />
            {performer && (
              <span className={`display ${TEAM_TEXT[first]}`}>
                {performer.name} {verb}
              </span>
            )}
          </>
        ) : (
          <span className="display text-muted">
            {kind === 'leilao' ? 'os dois times dão lance ao mesmo tempo' : 'todo mundo joga ao mesmo tempo'}
          </span>
        )}
      </div>

      <Button size="xl" onClick={onNext} data-tv="primary-action">
        Bora
      </Button>
    </div>
  );
}

export default RoundIntro;
