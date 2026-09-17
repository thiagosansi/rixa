'use client';

import { useState } from 'react';
import type { RelampagoState } from '@/game/types';
import { pickDeck } from '@/game/content';
import { WaitingCard } from './WaitingCard';
import { buzz, pickAt, type RoundProps } from './shared';

const LETTERS = ['A', 'B', 'C', 'D'];
const CHOICE_TONES = [
  'border-team-red bg-team-red/15',
  'border-team-blue bg-team-blue/15',
  'border-gold bg-gold/15',
  'border-[#3ddc97] bg-[#3ddc97]/15',
];

/** Uma pergunta do relâmpago. O pai usa key={questionIndex} para zerar o estado local. */
export function RelampagoRound({ game, me, act, round }: RoundProps & { round: RelampagoState }) {
  const q = pickAt(pickDeck(game.deck).relampago, round.questionIndex);
  const [pending, setPending] = useState<number | null>(null);

  const confirmed = round.answers[me.id]?.choice;
  const myChoice = confirmed ?? pending;
  const answered = myChoice !== null && myChoice !== undefined;
  const options = q?.options ?? LETTERS;
  const answeredCount = Object.keys(round.answers).length;
  const playing = game.players.filter((p) => p.team !== null).length;

  function choose(i: number) {
    if (answered || round.revealed) return;
    setPending(i);
    buzz(30);
    act({ type: 'answer-choice', choice: i });
  }

  const correctIndex = q?.answerIndex ?? -1;
  const gotIt = round.revealed && confirmed !== undefined && confirmed === correctIndex;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="display text-lg text-muted">
          pergunta {round.questionNumber} de {round.totalQuestions}
        </span>
        {game.multiplier > 1 && (
          <span className="display animate-pulse-soft rounded-xl border-2 border-gold bg-gold/15 px-3 py-1 text-xl text-gold">
            VALE {game.multiplier}x
          </span>
        )}
      </div>

      <div className="rounded-2xl border-2 border-line bg-surface px-4 py-3">
        <p className="text-xl leading-snug text-ink">{q?.text ?? 'Leia a pergunta na TV'}</p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {options.slice(0, 4).map((opt, i) => {
          const isMine = myChoice === i;
          const isCorrect = round.revealed && i === correctIndex;
          const isWrongMine = round.revealed && isMine && i !== correctIndex;
          let tone = CHOICE_TONES[i];
          if (round.revealed) {
            tone = isCorrect
              ? 'border-[#3ddc97] bg-[#3ddc97]/25'
              : isWrongMine
                ? 'border-team-red bg-team-red/25'
                : 'border-line bg-surface opacity-50';
          } else if (answered) {
            tone = isMine ? 'border-gold bg-gold/25' : 'border-line bg-surface opacity-40';
          }
          return (
            <button
              key={i}
              type="button"
              disabled={answered || round.revealed}
              onClick={() => choose(i)}
              data-testid={`choice-${i}`}
              className={`flex min-h-[72px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-2 text-left transition-transform active:translate-y-[2px] ${tone}`}
            >
              <span className="display w-9 shrink-0 text-4xl text-ink">{LETTERS[i]}</span>
              <span className="min-w-0 flex-1 break-words text-xl leading-tight text-ink">{opt}</span>
              {isCorrect && <span className="text-2xl" aria-label="certa">✅</span>}
              {isWrongMine && <span className="text-2xl" aria-label="errada">❌</span>}
              {!round.revealed && isMine && <span className="display text-sm text-gold">sua</span>}
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {round.revealed ? (
          <WaitingCard
            emoji={gotIt ? '⚡' : confirmed === undefined ? '🐢' : '💥'}
            title={gotIt ? 'Acertou!' : confirmed === undefined ? 'Não respondeu' : 'Errou'}
            tone={gotIt ? 'good' : 'bad'}
          >
            A certa era {LETTERS[correctIndex] ?? '?'}
            {q ? `: ${q.options[correctIndex]}` : ''}.
          </WaitingCard>
        ) : answered ? (
          <p className="rounded-2xl border-2 border-gold/60 bg-gold/10 px-4 py-3 text-center text-xl text-ink">
            Respondido ({LETTERS[myChoice]}) — aguarde. {answeredCount} de {playing} já foram.
          </p>
        ) : (
          <p className="text-center text-lg text-muted">
            Primeira resposta é a que vale. Quanto mais rápido, mais bônus.
          </p>
        )}
      </div>
    </section>
  );
}

export default RelampagoRound;
