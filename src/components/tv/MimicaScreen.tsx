'use client';

import type { GameState, MimicaState } from '@/game/types';
import { DURATIONS, POINTS, TEAM_LABELS, otherTeam } from '@/game/rounds';
import {
  Banner,
  GuessFeed,
  PlayHeader,
  StatBox,
  TEAM_PANEL,
  TEAM_TEXT,
  playerName,
  teamLabel,
  useFlashOnChange,
} from './shared';

const RULES = ['sem falar', 'sem fazer som', 'sem apontar objetos', 'sem soletrar no ar'];

/**
 * Arena da mímica. A palavra atual fica SÓ no celular de quem faz a mímica:
 * nada aqui lê `game.secrets` — só as palavras JÁ acertadas (`solvedWords`).
 */
export function MimicaScreen({ game, round }: { game: GameState; round: MimicaState }) {
  const solved = round.solvedWords.length;
  const tally = round.byTeam[round.activeTeam];
  const previousTeam = otherTeam(round.activeTeam);
  const lastWord = round.solvedWords[solved - 1] ?? '';

  const hitFlash = useFlashOnChange(solved, 2200, (prev, next) => next > prev);
  const skipFlash = useFlashOnChange(tally.skipped, 1400, (prev, next) => next > prev);
  const turnFlash = useFlashOnChange(round.turnIndex, 2600);
  const performer = playerName(game, round.performerId);
  const longName = performer.length > 10;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PlayHeader
        eyebrow={`Turno ${round.turnIndex + 1}/2`}
        team={round.activeTeam}
        deadline={round.deadline}
        totalMs={DURATIONS.mimica.turn}
      />

      {/*
        Altura fixa pela tela (e não pelo conteúdo): o feed de palpites nunca empurra o palco
        pra fora de 1280x720. Dentro, tudo escala com vh.
      */}
      <div className="grid h-[calc(100dvh-356px)] min-h-[300px] grid-cols-[minmax(0,1fr)_minmax(320px,28%)] items-stretch gap-6">
        <section
          data-tv="mimica-stage"
          className={`relative flex min-h-0 flex-col justify-between gap-2 rounded-3xl border-4 px-8 py-4 ${TEAM_PANEL[round.activeTeam]}`}
        >
          <div className="flex flex-col items-center text-center">
            <div className="display text-[clamp(1.25rem,3vh,1.75rem)] tracking-[0.2em] text-muted">
              <span aria-hidden>🎭 </span>fazendo mímica
            </div>
            <div
              data-tv="performer"
              className={`display tv-lh w-full truncate text-center ${
                longName ? 'text-[clamp(3rem,10vh,7rem)]' : 'text-[clamp(4rem,13vh,9rem)]'
              } ${TEAM_TEXT[round.activeTeam]}`}
            >
              {performer}
            </div>
            <div className="display text-[clamp(1.5rem,3.6vh,2.25rem)] text-ink">
              {teamLabel(round.activeTeam)}
            </div>
            <div className="mt-1 text-[clamp(1.125rem,2.8vh,1.75rem)] text-muted">
              o resto do time chuta pelo celular · cada acerto vale{' '}
              <span className="text-gold">{POINTS.mimicaCorrect * game.multiplier}</span>
            </div>
          </div>

          <div data-tv="mimica-stats" className="flex items-stretch justify-center gap-4">
            <StatBox fluid label="acertos do turno" value={tally.scored} tone="gold" pulseKey={`s${tally.scored}`} />
            <StatBox fluid label="pulos" value={tally.skipped} pulseKey={`k${tally.skipped}`} />
            {round.turnIndex === 1 && (
              <StatBox
                fluid
                label={`turno do ${TEAM_LABELS[previousTeam]}`}
                value={`${round.byTeam[previousTeam].scored}✓ ${round.byTeam[previousTeam].skipped}↷`}
              />
            )}
          </div>

          <div data-tv="solved-words" className="flex min-h-[clamp(3rem,9vh,5rem)] flex-col gap-2">
            <span className="display text-[clamp(1rem,2.4vh,1.25rem)] text-muted">
              já acertaram {solved > 0 && <span className="text-ink">({solved})</span>}
            </span>
            {solved === 0 ? (
              <span className="text-[clamp(1.125rem,2.6vh,1.5rem)] text-muted">
                nenhuma ainda — a primeira palavra está no celular de {performer}
              </span>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {round.solvedWords
                  .slice(-8)
                  .reverse()
                  .map((w, i) => (
                    <li
                      key={`${solved - i}-${w}`}
                      className="display animate-pop rounded-xl border-2 border-gold/50 bg-gold/10 px-3 py-1 text-[clamp(1.125rem,2.8vh,1.75rem)] text-gold"
                    >
                      {w}
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {hitFlash !== null && (
            <div
              key={hitFlash}
              data-tv="hit-flash"
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            >
              <div className="tv-burst max-w-[94%] rounded-3xl border-4 border-gold bg-bg/95 px-10 py-6 text-center shadow-[0_0_80px_rgba(255,197,61,0.6)]">
                <div className="display text-[clamp(1.75rem,5vh,3rem)] text-ink">Acertou!</div>
                <div
                  className={`display stroke-title tv-lh text-balance text-gold ${
                    lastWord.length > 16 ? 'text-[clamp(2.5rem,7vh,4.5rem)]' : 'text-[clamp(4rem,11vh,7rem)]'
                  }`}
                >
                  {lastWord}
                </div>
                <div className="display mt-1 text-[clamp(1.5rem,4vh,2.25rem)] text-gold">
                  +{POINTS.mimicaCorrect * game.multiplier}
                </div>
              </div>
            </div>
          )}

          {skipFlash !== null && hitFlash === null && (
            <div
              key={skipFlash}
              data-tv="skip-flash"
              className="pointer-events-none absolute inset-x-0 top-[38%] z-10 flex justify-center"
            >
              <div className="tv-stamp display rounded-2xl border-4 border-line bg-surface/95 px-8 py-3 text-[clamp(2rem,6vh,4rem)] text-muted">
                Pulou ↷
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col gap-3">
          <p
            data-tv="mimica-rules"
            className="display flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-2xl border border-line bg-surface/60 px-4 py-2 text-[clamp(0.95rem,2.2vh,1.25rem)] text-muted"
          >
            <span className="text-team-red">🤫 regras</span>
            {RULES.map((r) => (
              <span key={r}>{r}</span>
            ))}
          </p>
          <GuessFeed game={game} guesses={round.guesses} max={7} className="min-h-0 flex-1 overflow-hidden" />
        </aside>
      </div>

      {turnFlash !== null && (
        <Banner
          key={turnFlash}
          team={round.activeTeam}
          title="Troca!"
          subtitle={`${teamLabel(round.activeTeam)} · ${performer} faz a mímica`}
        />
      )}
    </div>
  );
}

export default MimicaScreen;
