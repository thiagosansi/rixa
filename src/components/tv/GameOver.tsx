'use client';

import type { GameState, TeamId } from '@/game/types';
import { ROUND_INFO, TEAMS } from '@/game/rounds';
import { Button } from '@/components/ui';
import { TEAM_PANEL, TEAM_SOLID, TEAM_TEXT, signed, teamLabel } from './shared';
import { useCountUp } from './RoundResult';

function FinalScore({ team, total, winner }: { team: TeamId; total: number; winner: boolean }) {
  const shown = useCountUp(0, total, 2200, 400);
  return (
    <div
      data-tv="final-score"
      data-team={team}
      data-total={total}
      className={`rounded-3xl border-4 px-8 py-[1vh] text-center ${TEAM_PANEL[team]} ${
        winner ? 'tv-glow-gold border-gold' : ''
      }`}
    >
      <div className={`display text-[clamp(1.25rem,3vh,1.875rem)] ${TEAM_TEXT[team]}`}>{teamLabel(team)}</div>
      <div className={`display text-[clamp(3.5rem,10vh,6rem)] tabular-nums ${TEAM_TEXT[team]}`}>{shown}</div>
    </div>
  );
}

/* Dimensionado pela altura (vh + clamp): campeão, placar e as 6 rodadas em 2 colunas cabem sem rolagem em 720p. */
export function GameOver({ game, onRestart }: { game: GameState; onRestart: () => void }) {
  const { red, blue } = game.scores;
  const winner: TeamId | null = red === blue ? null : red > blue ? 'red' : 'blue';
  const diff = Math.abs(red - blue);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[clamp(0.5rem,2.4vh,1.5rem)] text-center">
      <div className="display animate-slide-up text-[clamp(1.25rem,3vh,1.875rem)] tracking-[0.3em] text-muted">Fim de jogo</div>

      {winner ? (
        <div className="tv-stamp-big flex flex-col items-center gap-[0.6vh]">
          <div className={`display rounded-3xl px-10 py-[1vh] text-[clamp(2.5rem,7vh,6rem)] ${TEAM_SOLID[winner]}`}>
            {teamLabel(winner)}
          </div>
          <div className="display stroke-title tv-lh text-[clamp(2rem,6vh,4.5rem)] text-gold">campeão da rixa</div>
          <div className="text-[clamp(1.125rem,2.6vh,1.875rem)] text-muted">venceu por {diff} pontos</div>
        </div>
      ) : (
        <div className="tv-stamp-big display stroke-title text-[clamp(4rem,11vh,10rem)] text-gold">Empate!</div>
      )}

      <div className="grid w-full max-w-5xl grid-cols-2 gap-8">
        {TEAMS.map((team) => (
          <FinalScore key={team} team={team} total={game.scores[team]} winner={winner === team} />
        ))}
      </div>

      <ul
        data-tv="round-summary"
        className="grid w-full max-w-6xl grid-cols-2 gap-x-6 gap-y-[0.6vh] text-[clamp(1rem,2.5vh,1.5rem)]"
      >
        {game.roundLog.map((entry) => {
          const lead: TeamId | null =
            entry.delta.red === entry.delta.blue
              ? null
              : entry.delta.red > entry.delta.blue
                ? 'red'
                : 'blue';
          return (
            <li
              key={entry.roundIndex}
              data-tv="round-row"
              className="tv-rule flex items-center rounded-xl bg-surface px-4 py-[0.5vh]"
              style={{ animationDelay: `${600 + entry.roundIndex * 150}ms` }}
            >
              <span className={`display w-24 text-right tabular-nums text-team-red ${lead === 'red' ? '' : 'opacity-60'}`}>
                {signed(entry.delta.red)}
              </span>
              <span className="flex-1 px-4 text-center text-muted">
                <span className="display text-ink">{entry.roundIndex + 1}</span> · {ROUND_INFO[entry.kind].title}
              </span>
              <span className={`display w-24 text-left tabular-nums text-team-blue ${lead === 'blue' ? '' : 'opacity-60'}`}>
                {signed(entry.delta.blue)}
              </span>
            </li>
          );
        })}
      </ul>

      <Button size="xl" onClick={onRestart} data-tv="primary-action" className="tv-button-fit">
        Jogar de novo
      </Button>
    </div>
  );
}

export default GameOver;
