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
      className={`rounded-3xl border-4 px-8 py-3 text-center ${TEAM_PANEL[team]} ${
        winner ? 'tv-glow-gold border-gold' : ''
      }`}
    >
      <div className={`display text-3xl ${TEAM_TEXT[team]}`}>{teamLabel(team)}</div>
      <div className={`display text-7xl tabular-nums md:text-8xl ${TEAM_TEXT[team]}`}>{shown}</div>
    </div>
  );
}

export function GameOver({ game, onRestart }: { game: GameState; onRestart: () => void }) {
  const { red, blue } = game.scores;
  const winner: TeamId | null = red === blue ? null : red > blue ? 'red' : 'blue';
  const diff = Math.abs(red - blue);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <div className="display animate-slide-up text-3xl tracking-[0.3em] text-muted">Fim de jogo</div>

      {winner ? (
        <div className="tv-stamp-big flex flex-col items-center gap-2">
          <div className={`display rounded-3xl px-10 py-4 text-6xl md:text-8xl ${TEAM_SOLID[winner]}`}>
            {teamLabel(winner)}
          </div>
          <div className="display stroke-title tv-lh text-5xl text-gold md:text-7xl">campeão da rixa</div>
          <div className="text-3xl text-muted">venceu por {diff} pontos</div>
        </div>
      ) : (
        <div className="tv-stamp-big display stroke-title text-8xl text-gold md:text-[10rem]">Empate!</div>
      )}

      <div className="grid w-full max-w-5xl grid-cols-2 gap-8">
        {TEAMS.map((team) => (
          <FinalScore key={team} team={team} total={game.scores[team]} winner={winner === team} />
        ))}
      </div>

      <table data-tv="round-summary" className="w-full max-w-4xl border-separate border-spacing-y-1 text-2xl">
        <tbody>
          {game.roundLog.map((entry) => {
            const lead: TeamId | null =
              entry.delta.red === entry.delta.blue
                ? null
                : entry.delta.red > entry.delta.blue
                  ? 'red'
                  : 'blue';
            return (
              <tr key={entry.roundIndex} className="tv-rule" style={{ animationDelay: `${600 + entry.roundIndex * 150}ms` }}>
                <td className={`display w-40 rounded-l-xl bg-surface px-4 py-1.5 text-right tabular-nums text-team-red ${lead === 'red' ? '' : 'opacity-60'}`}>
                  {signed(entry.delta.red)}
                </td>
                <td className="bg-surface px-4 py-1.5 text-center text-muted">
                  <span className="display text-ink">{entry.roundIndex + 1}</span> · {ROUND_INFO[entry.kind].title}
                </td>
                <td className={`display w-40 rounded-r-xl bg-surface px-4 py-1.5 text-left tabular-nums text-team-blue ${lead === 'blue' ? '' : 'opacity-60'}`}>
                  {signed(entry.delta.blue)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Button size="xl" onClick={onRestart} data-tv="primary-action">
        Jogar de novo
      </Button>
    </div>
  );
}

export default GameOver;
