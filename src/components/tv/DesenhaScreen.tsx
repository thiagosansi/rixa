'use client';

import type { DesenhaState, GameState } from '@/game/types';
import { DURATIONS, POINTS, TEAM_LABELS, otherTeam } from '@/game/rounds';
import { DrawCanvas, type StrokeBus } from './DrawCanvas';
import {
  Banner,
  GuessFeed,
  PlayHeader,
  StatBox,
  TEAM_TEXT,
  playerName,
  teamLabel,
  useFlashOnChange,
} from './shared';

export function DesenhaScreen({
  game,
  round,
  bus,
}: {
  game: GameState;
  round: DesenhaState;
  bus: StrokeBus;
}) {
  const solved = round.solvedWords.length;
  // contadores por time vêm do engine (antes a TV deduzia do total acumulado)
  const turnSolved = round.byTeam[round.activeTeam].scored;
  const previousTeam = otherTeam(round.activeTeam);
  const lastWord = round.solvedWords[solved - 1] ?? '';

  const hitFlash = useFlashOnChange(solved, 2200, (prev, next) => next > prev);
  const turnFlash = useFlashOnChange(round.turnIndex, 2600);
  const drawer = playerName(game, round.drawerId);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <PlayHeader
        eyebrow={`Turno ${round.turnIndex + 1}/2`}
        team={round.activeTeam}
        deadline={round.deadline}
        totalMs={DURATIONS.desenha.turn}
      />

      <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(320px,28%)] items-start gap-6">
        <div className="relative flex justify-center">
          <DrawCanvas
            bus={bus}
            drawerId={round.drawerId}
            clearKey={`${round.turnIndex}:${round.wordIndex}`}
            className="w-[min(100%,calc((100dvh-290px)*4/3))]"
          />
          {hitFlash !== null && (
            <div
              key={hitFlash}
              data-tv="hit-flash"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="tv-burst max-w-[94%] rounded-3xl border-4 border-gold bg-bg/90 px-10 py-6 text-center shadow-[0_0_80px_rgba(255,197,61,0.6)]">
                <div className="display text-4xl text-ink md:text-5xl">Acertou!</div>
                <div
                  className={`display stroke-title tv-lh text-balance text-gold ${
                    lastWord.length > 16 ? 'text-5xl md:text-6xl' : 'text-7xl md:text-8xl'
                  }`}
                >
                  {lastWord}
                </div>
                <div className="display mt-1 text-3xl text-gold">
                  +{POINTS.desenhaCorrect * game.multiplier}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border-2 border-line bg-surface px-5 py-4">
            <div className="display text-lg text-muted">desenhando</div>
            <div className={`display truncate text-5xl md:text-6xl ${TEAM_TEXT[round.activeTeam]}`}>
              {drawer}
            </div>
            <div className="mt-1 text-xl text-muted">o resto do time chuta pelo celular</div>
          </div>

          <div className="flex gap-3">
            <StatBox label="acertos do turno" value={turnSolved} tone="gold" pulseKey={turnSolved} />
            {round.turnIndex === 1 && (
              <StatBox label={`acertos do ${TEAM_LABELS[previousTeam]}`} value={round.byTeam[previousTeam].scored} />
            )}
          </div>

          <GuessFeed game={game} guesses={round.guesses} max={6} />
        </aside>
      </div>

      {turnFlash !== null && (
        <Banner
          key={turnFlash}
          team={round.activeTeam}
          title="Troca!"
          subtitle={`${teamLabel(round.activeTeam)} · ${drawer} desenha`}
        />
      )}
    </div>
  );
}

export default DesenhaScreen;
