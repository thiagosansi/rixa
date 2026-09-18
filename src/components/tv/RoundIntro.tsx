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

/* Tudo aqui escala com a ALTURA da tela (vh + clamp) pra caber sem rolagem de 720p a 1080p,
   inclusive na rodada final, que traz o carimbo "Vale 3x" ao lado do título. */
export function RoundIntro({ game, onNext }: { game: GameState; onNext: () => void }) {
  const kind = roundKindAt(game.roundIndex);
  const info = ROUND_INFO[kind];
  const isFinal = game.multiplier > 1;

  const first = startingTeam(game.roundIndex);
  const performer = pickRotating(playersOfTeam(game.players, first), game.roundIndex);
  const turnBased = kind === 'mimica' || kind === 'tabu';
  const verb = kind === 'mimica' ? 'faz a mímica' : 'dá as dicas';

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-[clamp(0.5rem,2.2vh,1.75rem)] text-center">
      <div className="display animate-slide-up text-[clamp(1.5rem,3.4vh,3rem)] tracking-[0.2em] text-muted">
        Rodada <span className="text-ink">{game.roundIndex + 1}</span>/{TOTAL_ROUNDS}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-[clamp(1rem,3vh,2.5rem)] gap-y-2">
        <h2 className="display stroke-title tv-title-in tv-lh text-balance text-[clamp(3.5rem,13vh,10rem)] text-gold">
          {info.title}
        </h2>
        {isFinal && (
          <div
            data-tv="triple-stamp"
            className="tv-stamp-big display tv-glow-gold rotate-[-6deg] rounded-[1.5vh] border-[0.7vh] border-gold bg-gold px-[2.5vh] py-[0.8vh] text-[clamp(2.25rem,8.5vh,9rem)] text-[#170d02]"
          >
            Vale {game.multiplier}x
          </div>
        )}
      </div>
      <p className="animate-slide-up text-[clamp(1.125rem,3.2vh,2.25rem)] leading-snug text-muted">{info.tagline}</p>

      <ul className="flex max-w-6xl flex-col gap-[clamp(0.25rem,1vh,0.75rem)] text-left">
        {info.rules.map((rule, i) => (
          <li
            key={rule}
            className="tv-rule flex items-start gap-4 text-[clamp(1.125rem,3vh,2.25rem)] leading-snug text-ink"
            style={{ animationDelay: `${300 + i * 180}ms` }}
          >
            <span className="display mt-[0.15em] text-gold">{i + 1}</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-4 text-[clamp(1.25rem,3vh,1.875rem)]">
        {turnBased ? (
          <>
            <span className="display text-muted">começa</span>
            <TeamBadge team={first} size="lg" label={teamLabel(first)} className="tv-badge-fit" />
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

      <Button size="xl" onClick={onNext} data-tv="primary-action" className="tv-button-fit">
        Bora
      </Button>
    </div>
  );
}

export default RoundIntro;
