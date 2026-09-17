'use client';

import type { GameState } from '@/game/types';
import { QuickInput } from './QuickInput';
import { playerName } from './shared';

type Guess = { playerId: string; text: string; correct: boolean; at: number };

/** Input de palpite + feedback imediato do MEU último palpite + feed do time. */
export function GuessPanel({
  game,
  meId,
  guesses,
  onGuess,
  hint,
}: {
  game: GameState;
  meId: string;
  guesses: Guess[];
  onGuess: (text: string) => void;
  hint: string;
}) {
  const mine = guesses.filter((g) => g.playerId === meId);
  const last = mine[mine.length - 1];
  const recent = guesses.slice(-5).reverse();

  return (
    <div className="flex flex-col gap-3">
      <QuickInput
        label="seu palpite"
        placeholder="chuta aqui…"
        buttonLabel="Chutar"
        onSubmit={onGuess}
        autoFocus
      />

      <div aria-live="polite" className="min-h-14">
        {last ? (
          <div
            key={last.at}
            className={`animate-pop flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-xl ${
              last.correct
                ? 'border-team-blue/60 bg-team-blue/10 text-ink'
                : 'border-team-red/60 bg-team-red/10 text-ink'
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {last.correct ? '✅' : '❌'}
            </span>
            <span className="min-w-0 flex-1 truncate">“{last.text}”</span>
            <span className="display shrink-0 text-base">
              {last.correct ? 'acertou!' : 'não é'}
            </span>
          </div>
        ) : (
          <p className="px-1 text-lg text-muted">{hint}</p>
        )}
      </div>

      {recent.length > 0 && (
        <ul className="flex flex-col gap-1 text-base text-muted">
          {recent.map((g) => (
            <li key={`${g.playerId}-${g.at}`} className="flex gap-2">
              <span className="shrink-0">{g.correct ? '✅' : '·'}</span>
              <span className="shrink-0 text-ink/80">{playerName(game, g.playerId)}:</span>
              <span className="min-w-0 truncate">{g.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default GuessPanel;
