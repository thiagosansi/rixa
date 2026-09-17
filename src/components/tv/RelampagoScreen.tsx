'use client';

import { useRef } from 'react';
import type { GameState, RelampagoState, Scores } from '@/game/types';
import type { Deck } from '@/game/content';
import { DURATIONS, TEAMS, playersOfTeam } from '@/game/rounds';
import { LETTERS, PlayHeader, TEAM_PANEL, TEAM_TEXT, pickAt, teamLabel } from './shared';

const OPTION_TONES = [
  'bg-[#ff8a3d] text-[#2a1200]',
  'bg-[#b06cff] text-[#1b0633]',
  'bg-[#3ddc97] text-[#03251a]',
  'bg-[#ff5fb7] text-[#33041f]',
];

export function RelampagoScreen({
  game,
  round,
  content,
}: {
  game: GameState;
  round: RelampagoState;
  content: Deck;
}) {
  const question = pickAt(content.relampago, round.questionIndex);

  // placar no instante da pergunta: o delta do reveal sai exatamente do que o engine somou
  const baseRef = useRef<Scores>(game.scores);
  if (!round.revealed) baseRef.current = game.scores;
  const gained: Scores = {
    red: game.scores.red - baseRef.current.red,
    blue: game.scores.blue - baseRef.current.blue,
  };

  const correctIds = question
    ? Object.entries(round.answers)
        .filter(([, a]) => a.choice === question.answerIndex)
        .sort((a, b) => a[1].at - b[1].at)
        .map(([id]) => id)
    : [];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <PlayHeader
        eyebrow={`Pergunta ${round.questionNumber}/${round.totalQuestions}`}
        deadline={round.deadline}
        totalMs={round.revealed ? DURATIONS.relampago.reveal : DURATIONS.relampago.question}
      >
        <span
          data-tv="triple-seal"
          className="display tv-glow-gold rotate-[-4deg] rounded-2xl border-4 border-gold bg-gold/15 px-5 py-2 text-4xl text-gold md:text-5xl"
        >
          Vale {game.multiplier}x
        </span>
      </PlayHeader>

      <div key={round.questionNumber} className="animate-slide-up flex flex-1 flex-col gap-6">
        <h2 className="display tv-lh text-balance text-center text-5xl text-ink md:text-7xl">
          {question?.text ?? '…'}
        </h2>

        <div className="grid flex-1 grid-cols-2 content-center gap-5">
          {(question?.options ?? []).map((text, i) => {
            const isRight = round.revealed && question?.answerIndex === i;
            const isWrong = round.revealed && !isRight;
            return (
              <div
                key={i}
                data-tv="relampago-option"
                data-right={isRight ? '1' : '0'}
                className={`flex items-center gap-5 rounded-3xl border-4 px-6 py-5 transition-[opacity,filter] duration-500 ${
                  OPTION_TONES[i % OPTION_TONES.length]
                } ${isRight ? 'tv-right border-gold' : 'border-transparent'} ${
                  isWrong ? 'opacity-25 grayscale' : ''
                }`}
              >
                <span className="display flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-black/25 text-5xl text-white">
                  {LETTERS[i]}
                </span>
                <span className="display text-4xl md:text-5xl">{text}</span>
                {isRight && <span className="display ml-auto text-6xl">✓</span>}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-5">
          {TEAMS.map((team) => {
            const members = playersOfTeam(game.players, team);
            const answered = members.filter((p) => round.answers[p.id]).length;
            const winners = members.filter((p) => correctIds.includes(p.id));
            return (
              <div
                key={team}
                data-tv="relampago-team"
                className={`flex min-h-[6.5rem] items-center justify-between gap-4 rounded-3xl border-2 px-6 py-3 ${TEAM_PANEL[team]}`}
              >
                <div className="min-w-0">
                  <div className={`display text-2xl ${TEAM_TEXT[team]}`}>{teamLabel(team)}</div>
                  {round.revealed ? (
                    <div className={`display truncate text-3xl ${TEAM_TEXT[team]}`}>
                      {winners.length > 0 ? winners.map((p) => p.name).join(', ') : 'ninguém acertou'}
                    </div>
                  ) : (
                    <div className="text-2xl text-muted">responderam</div>
                  )}
                </div>
                {round.revealed ? (
                  <span key="gain" className={`display animate-pop text-6xl tabular-nums ${TEAM_TEXT[team]}`}>
                    +{gained[team]}
                  </span>
                ) : (
                  <span key={answered} className={`display animate-pop text-6xl tabular-nums ${TEAM_TEXT[team]}`}>
                    {answered}/{members.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RelampagoScreen;
