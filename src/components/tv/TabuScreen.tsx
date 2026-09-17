'use client';

import type { GameState, TabuState } from '@/game/types';
import { DURATIONS, POINTS, TEAM_LABELS, otherTeam } from '@/game/rounds';
import {
  Banner,
  GuessFeed,
  PlayHeader,
  StatBox,
  TEAM_TEXT,
  playerName,
  signed,
  teamLabel,
  useFirstValue,
  useFlashOnChange,
} from './shared';

export function TabuScreen({ game, round }: { game: GameState; round: TabuState }) {
  const firstCard = useFirstValue(round.cardIndex);

  // contadores por time vêm do engine
  const turnScored = round.byTeam[round.activeTeam].scored;
  const turnPenalties = round.byTeam[round.activeTeam].penalties;
  const cardNumber = round.cardIndex - firstCard + 1;

  const penaltyFlash = useFlashOnChange(round.penalties, 1500, (prev, next) => next > prev);
  const hitFlash = useFlashOnChange(round.scored, 2000, (prev, next) => next > prev);
  const turnFlash = useFlashOnChange(round.turnIndex, 2600);

  const giver = playerName(game, round.clueGiverId);
  const lastCorrect = [...round.guesses].reverse().find((g) => g.correct);
  const penaltyPoints = POINTS.tabuPenalty * game.multiplier;
  const referee = otherTeam(round.activeTeam);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <PlayHeader
        eyebrow={`Turno ${round.turnIndex + 1}/2`}
        team={round.activeTeam}
        deadline={round.deadline}
        totalMs={DURATIONS.tabu.turn}
      />

      <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(320px,28%)] items-start gap-6">
        {/*
          Tudo aqui é dimensionado pela ALTURA da tela (vh/dvh): a carta encolhe em 720p e os
          contadores ficam ao lado dela, não embaixo — senão o rodapé corta em 1280x720/1600x900.
        */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex max-w-full flex-wrap items-baseline justify-center gap-x-5 text-center">
            <span className="display text-2xl text-muted">dando as dicas</span>
            <span
              className={`display truncate text-[clamp(3rem,9vh,6rem)] leading-none ${TEAM_TEXT[round.activeTeam]}`}
            >
              {giver}
            </span>
          </div>

          <div className="flex w-full items-stretch justify-center gap-4">
            <div className="relative aspect-[16/9] h-[clamp(180px,calc(91dvh-440px),440px)] shrink-0">
              <div
                key={round.cardIndex}
                data-tv="tabu-card"
                className="tv-flip flex h-full w-full flex-col items-center justify-center rounded-3xl border-4 border-gold/70 bg-surface-2 tv-card-pattern"
              >
                <div className="display text-[clamp(1.25rem,3.4vh,1.875rem)] leading-tight text-muted">carta</div>
                <div className="display stroke-title text-[clamp(4rem,13vh,8rem)] leading-none text-gold">
                  #{cardNumber}
                </div>
                <div className="display mt-2 text-[clamp(1rem,2.6vh,1.5rem)] tracking-[0.4em] text-muted">
                  ● ● ● ● ●
                </div>
              </div>
              {hitFlash !== null && lastCorrect && (
                <div
                  key={hitFlash}
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                >
                  <div className="tv-burst rounded-3xl border-4 border-gold bg-bg/95 px-10 py-4 text-center shadow-[0_0_80px_rgba(255,197,61,0.6)]">
                    <div className="display text-[clamp(1.5rem,4vh,2.25rem)] text-ink">Acertou!</div>
                    <div className="display stroke-title text-[clamp(2.5rem,7.5vh,4.5rem)] leading-none text-gold">
                      {lastCorrect.text}
                    </div>
                    <div className="display mt-1 text-[clamp(1.25rem,3.4vh,1.875rem)] text-gold">
                      +{POINTS.tabuCorrect * game.multiplier}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div data-tv="tabu-stats" className="flex w-56 shrink-0 flex-col gap-3">
              <StatBox
                fluid
                label="acertos do turno"
                value={turnScored}
                tone="gold"
                pulseKey={`s${turnScored}`}
              />
              <StatBox
                fluid
                label="penalidades"
                value={turnPenalties}
                tone={turnPenalties > 0 ? 'red' : 'ink'}
                pulseKey={`p${turnPenalties}`}
              />
            </div>
          </div>
          <p className="text-center text-xl text-muted xl:text-2xl">
            <span className={TEAM_TEXT[referee]}>{teamLabel(referee)}</span> fiscaliza: falou palavra
            proibida, aperta o botão.
          </p>
        </div>

        <aside className="flex flex-col gap-4">
          {round.turnIndex === 1 && (
            <div className="flex gap-3">
              <StatBox
                label={`turno do ${TEAM_LABELS[referee]}`}
                value={`${round.byTeam[referee].scored}✓ ${round.byTeam[referee].penalties}✗`}
              />
            </div>
          )}
          <GuessFeed game={game} guesses={round.guesses} max={7} />
        </aside>
      </div>

      {penaltyFlash !== null && (
        <div
          key={penaltyFlash}
          data-tv="penalty-flash"
          className="tv-flash-red pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-team-red"
        >
          <div className="tv-shake display text-[9rem] leading-none text-white md:text-[14rem]">Pegou!</div>
          <div className="display text-7xl text-white/90 md:text-9xl">{signed(penaltyPoints)}</div>
        </div>
      )}

      {turnFlash !== null && (
        <Banner
          key={turnFlash}
          team={round.activeTeam}
          title="Troca!"
          subtitle={`${teamLabel(round.activeTeam)} · ${giver} dá as dicas`}
        />
      )}
    </div>
  );
}

export default TabuScreen;
