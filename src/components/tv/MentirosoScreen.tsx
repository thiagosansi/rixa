'use client';

import type { ReactNode } from 'react';
import type { GameState, MentirosoState, Scores, TeamId } from '@/game/types';
import type { Deck } from '@/game/content';
import {
  DURATIONS,
  MENTIROSO_REVEAL_STEP_MS,
  POINTS,
  TEAMS,
  mentirosoRevealMs,
} from '@/game/rounds';
import {
  LETTERS,
  NameChip,
  PlayHeader,
  TEAM_PANEL,
  TEAM_TEXT,
  pickAt,
  playerName,
  playerTeam,
  teamLabel,
  useNow,
} from './shared';

function QuestionText({ text, fill, size }: { text: string; fill?: string | null; size: string }) {
  const parts = text.split(/_{2,}/);
  const nodes: ReactNode[] = [];
  parts.forEach((part, i) => {
    nodes.push(<span key={`t${i}`}>{part}</span>);
    if (i < parts.length - 1) {
      nodes.push(
        fill ? (
          <span key={`b${i}`} className="tv-burst mx-2 inline-block rounded-xl bg-gold px-4 text-[#170d02]">
            {fill}
          </span>
        ) : (
          <span
            key={`b${i}`}
            className="mx-2 inline-block w-[3.2em] translate-y-[0.12em] border-b-8 border-gold align-baseline"
          >
            &nbsp;
          </span>
        ),
      );
    }
  });
  return <h2 className={`display tv-lh text-balance text-center text-ink ${size}`}>{nodes}</h2>;
}

export function MentirosoScreen({
  game,
  round,
  content,
}: {
  game: GameState;
  round: MentirosoState;
  content: Deck;
}) {
  const question = pickAt(content.mentiroso, round.questionIndex)?.question ?? '…';
  const table = game.players.filter((p) => p.team !== null);

  const totalMs =
    round.stage === 'writing'
      ? DURATIONS.mentiroso.writing
      : round.stage === 'voting'
        ? DURATIONS.mentiroso.voting
        : mentirosoRevealMs(round.options.length);

  const stageLabel =
    round.stage === 'writing'
      ? 'Escrevam a mentira'
      : round.stage === 'voting'
        ? 'Qual é a verdade?'
        : 'A hora da verdade';
  const eyebrow = `Pergunta ${round.questionNumber}/${round.totalQuestions} · ${stageLabel}`;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <PlayHeader eyebrow={eyebrow} deadline={round.deadline} totalMs={totalMs} />

      {round.stage === 'writing' && (
        <div key="writing" className="animate-slide-up flex flex-1 flex-col items-center justify-center gap-10">
          <QuestionText text={question} size="text-5xl md:text-7xl" />
          <div className="text-center">
            <div className="display mb-3 text-2xl text-muted">
              quem já mandou · {round.lies.length}/{table.length}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {table.map((p) => (
                <NameChip
                  key={p.id}
                  name={p.name}
                  team={p.team}
                  done={round.lies.some((l) => l.playerId === p.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {round.stage === 'voting' && (
        <div key="voting" className="animate-slide-up flex flex-1 flex-col gap-6">
          <QuestionText text={question} size="text-4xl md:text-5xl" />
          <div className="grid flex-1 grid-cols-2 content-center gap-4">
            {round.options.map((o, i) => (
              <div
                key={o.id}
                data-tv="vote-option"
                className="flex items-center gap-5 rounded-3xl border-2 border-line bg-surface px-6 py-4"
              >
                <span className="display flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gold text-5xl text-[#170d02]">
                  {LETTERS[i]}
                </span>
                <span className="display text-3xl text-ink md:text-4xl">{o.text}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <div className="display mb-3 text-2xl text-muted">
              votos · {Object.keys(round.votes).length}/{table.length}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {table.map((p) => (
                <NameChip key={p.id} name={p.name} team={p.team} done={Boolean(round.votes[p.id])} />
              ))}
            </div>
          </div>
        </div>
      )}

      {round.stage === 'reveal' && <Reveal game={game} round={round} question={question} />}
    </div>
  );
}

function Reveal({
  game,
  round,
  question,
}: {
  game: GameState;
  round: MentirosoState;
  question: string;
}) {
  const now = useNow(200);
  const options = round.options;
  const lies = options.filter((o) => o.ownerId !== null);
  const truth = options.find((o) => o.ownerId === null) ?? null;

  const start = round.deadline - mentirosoRevealMs(options.length);
  const step = Math.max(0, Math.min(lies.length, Math.floor((now - start) / MENTIROSO_REVEAL_STEP_MS)));
  const truthShown = step >= lies.length;
  // ordem de revelação: mentiras na ordem da tela, verdade por último
  const revealOrder = new Map<string, number>();
  lies.forEach((o, i) => revealOrder.set(o.id, i));

  const votersOf = (optionId: string) =>
    Object.entries(round.votes)
      .filter(([, v]) => v === optionId)
      .map(([voterId]) => voterId);

  const deltas: Scores = { red: 0, blue: 0 };
  for (const [voterId, optionId] of Object.entries(round.votes)) {
    const option = options.find((o) => o.id === optionId);
    if (!option) continue;
    const team: TeamId | null =
      option.ownerId === null ? playerTeam(game, voterId) : playerTeam(game, option.ownerId);
    if (!team) continue;
    // mesmo critério do engine: voto de colega de time na mentira não pontua
    if (option.ownerId !== null && playerTeam(game, voterId) === team) continue;
    deltas[team] +=
      (option.ownerId === null ? POINTS.mentirosoFoundTruth : POINTS.mentirosoVoteReceived) *
      game.multiplier;
  }

  return (
    <div key="reveal" className="animate-slide-up flex flex-1 flex-col gap-5">
      <QuestionText
        text={question}
        fill={truthShown ? truth?.text : null}
        size="text-3xl md:text-5xl"
      />

      <div className="grid flex-1 grid-cols-2 content-center gap-4">
        {options.map((o, i) => {
          const isTruth = o.ownerId === null;
          const order = isTruth ? lies.length : (revealOrder.get(o.id) ?? 0);
          const revealed = step >= order && (!isTruth || truthShown);
          const current = step === order;
          const voters = votersOf(o.id);
          const ownerTeam = playerTeam(game, o.ownerId);
          // só adversário enganado vale ponto
          const paying = isTruth ? voters : voters.filter((id) => playerTeam(game, id) !== ownerTeam);

          let frame = 'border-line bg-surface';
          if (revealed && isTruth) frame = 'border-gold bg-gold/15 tv-glow-gold';
          else if (revealed && ownerTeam) frame = TEAM_PANEL[ownerTeam];
          const dim = revealed && !current && !isTruth ? 'opacity-45' : '';

          return (
            <div
              key={o.id}
              data-tv="reveal-option"
              data-revealed={revealed ? '1' : '0'}
              className={`flex items-center gap-5 rounded-3xl border-2 px-6 py-3 transition-opacity duration-500 ${frame} ${dim} ${
                current ? 'tv-reveal-pop' : ''
              }`}
            >
              <span
                className={`display flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-4xl ${
                  revealed && isTruth ? 'bg-gold text-[#170d02]' : 'bg-surface-2 text-ink'
                }`}
              >
                {LETTERS[i]}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={`display text-2xl md:text-3xl ${
                    revealed && isTruth
                      ? 'text-gold'
                      : revealed
                        ? 'text-ink line-through decoration-team-red decoration-4'
                        : 'text-ink'
                  }`}
                >
                  {o.text}
                </div>
                {revealed && !isTruth && (
                  <div className="mt-1 text-xl md:text-2xl">
                    <span className="text-muted">mentira de </span>
                    <span className={`display ${ownerTeam ? TEAM_TEXT[ownerTeam] : 'text-ink'}`}>
                      {playerName(game, o.ownerId)}
                    </span>
                    <span className="text-muted">
                      {voters.length > 0 ? ' · caíram: ' : ' · ninguém caiu'}
                    </span>
                    <Names game={game} ids={voters} />
                  </div>
                )}
                {revealed && isTruth && (
                  <div className="mt-1 text-xl md:text-2xl">
                    <span className="display text-gold">a verdade</span>
                    <span className="text-muted">
                      {voters.length > 0 ? ' · acertaram: ' : ' · ninguém acertou'}
                    </span>
                    <Names game={game} ids={voters} />
                  </div>
                )}
              </div>
              {revealed && paying.length > 0 && (
                <span className={`display shrink-0 text-4xl ${isTruth ? 'text-gold' : 'text-ink'}`}>
                  +
                  {paying.length *
                    (isTruth ? POINTS.mentirosoFoundTruth : POINTS.mentirosoVoteReceived) *
                    game.multiplier}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex min-h-[5.5rem] justify-center gap-6">
        {truthShown &&
          TEAMS.map((team) => (
            <div
              key={team}
              data-tv="mentiroso-delta"
              className={`animate-pop rounded-2xl border-2 px-8 py-3 text-center ${TEAM_PANEL[team]}`}
            >
              <div className={`display text-lg ${TEAM_TEXT[team]}`}>{teamLabel(team)}</div>
              <div className={`display text-5xl tabular-nums ${TEAM_TEXT[team]}`}>+{deltas[team]}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

function Names({ game, ids }: { game: GameState; ids: string[] }) {
  return (
    <>
      {ids.map((id, i) => {
        const team = playerTeam(game, id);
        return (
          <span key={id} className={`display ${team ? TEAM_TEXT[team] : 'text-ink'}`}>
            {i > 0 ? ', ' : ''}
            {playerName(game, id)}
          </span>
        );
      })}
    </>
  );
}

export default MentirosoScreen;
