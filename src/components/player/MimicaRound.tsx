'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MimicaState } from '@/game/types';
import { MIMICA_SKIP_DEBOUNCE_MS, POINTS } from '@/game/rounds';
import { GuessPanel } from './GuessPanel';
import { WaitingCard } from './WaitingCard';
import { buzz, playerName, type RoundProps } from './shared';

const FIT_MAX_PX = 72;
const FIT_MIN_PX = 22;

/**
 * Palavra/expressão no maior tamanho que cabe na caixa (largura E altura), sem scroll.
 * Mede de verdade (scrollWidth/scrollHeight) em vez de chutar pelo tamanho do texto:
 * "Mandar nudes sem querer pro grupo errado" tem que caber em 390px.
 */
function FitText({ text }: { text: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState(FIT_MAX_PX);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const el = textRef.current;
    if (!box || !el) return;
    let size = FIT_MAX_PX;
    el.style.fontSize = `${size}px`;
    while (size > FIT_MIN_PX && (el.scrollWidth > box.clientWidth || el.scrollHeight > box.clientHeight)) {
      size -= 2;
      el.style.fontSize = `${size}px`;
    }
    setPx(size);
  }, [text]);

  return (
    <div ref={boxRef} className="flex h-[30dvh] min-h-[160px] w-full items-center justify-center overflow-hidden">
      <div
        ref={textRef}
        data-testid="secret-word"
        className="display w-full max-w-full text-balance break-words text-center leading-[1.05] text-ink"
        style={{ fontSize: `${px}px` }}
      >
        {text}
      </div>
    </div>
  );
}

export function MimicaRound({ game, me, team, secret, act, round }: RoundProps & { round: MimicaState }) {
  const isPerformer = round.performerId === me.id;
  const myTeamPlays = round.activeTeam === team;
  const performerName = playerName(game, round.performerId);

  // trava local espelha o debounce do engine: toque duplo não vira dois pulos
  const [skipLocked, setSkipLocked] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
  }, []);

  if (isPerformer) {
    const word = secret.kind === 'mimica-word' ? secret.word : null;
    const tally = round.byTeam[team];
    const skip = () => {
      if (skipLocked) return;
      setSkipLocked(true);
      act({ type: 'mimica-skip' });
      buzz(40);
      if (lockTimer.current) clearTimeout(lockTimer.current);
      lockTimer.current = setTimeout(() => setSkipLocked(false), MIMICA_SKIP_DEBOUNCE_MS);
    };
    return (
      <section className="flex flex-col gap-3" data-testid="mimica-performer">
        <p className="display rounded-xl bg-team-red/15 px-3 py-2 text-center text-sm tracking-[0.1em] text-team-red">
          🙈 vire a tela pra você — ninguém pode ver
        </p>

        <div className="rounded-3xl border-2 border-gold/60 bg-surface-2 px-4 py-3 text-center">
          <div className="display text-xs tracking-[0.2em] text-gold">você faz a mímica de</div>
          {word ? (
            <FitText key={word} text={word} />
          ) : (
            <div className="display flex h-[30dvh] min-h-[160px] items-center justify-center text-2xl text-muted">
              carregando…
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={skip}
          disabled={skipLocked}
          data-testid="mimica-skip"
          className="display min-h-20 w-full rounded-3xl border-4 border-line bg-surface-2 text-4xl text-ink shadow-[0_6px_0_#3a2a52] transition-transform active:translate-y-[4px] disabled:translate-y-[4px] disabled:opacity-60 disabled:shadow-none"
        >
          {skipLocked ? 'Pulou ↷' : 'Pular palavra'}
        </button>

        <p className="text-center text-base text-muted">
          Acertos do seu time:{' '}
          <span className="display text-2xl text-gold" data-testid="team-solved">
            {tally.scored}
          </span>{' '}
          · pulos: <span className="text-ink">{tally.skipped}</span>
        </p>

        <p className="rounded-xl bg-surface px-3 py-2 text-center text-base leading-snug text-muted">
          Sem falar, sem fazer som, sem apontar objetos, sem soletrar no ar. Quando seu time acertar,
          vem outra palavra na hora.
        </p>
      </section>
    );
  }

  if (myTeamPlays) {
    return (
      <section className="flex flex-col gap-3" data-testid="mimica-guesser">
        <h2 className="display text-center text-2xl text-gold">
          {performerName} está fazendo mímica — adivinhe!
        </h2>
        <GuessPanel
          game={game}
          meId={me.id}
          guesses={round.guesses}
          onGuess={(text) => act({ type: 'guess', text })}
          hint={`Olhe pra ${performerName} e chute quantas vezes quiser. Cada acerto vale ${POINTS.mimicaCorrect}.`}
        />
        <p className="text-center text-base text-muted" data-testid="mimica-tally">
          seu time neste turno: acertos <span className="text-ink">{round.byTeam[team].scored}</span> · pulos{' '}
          <span className="text-ink">{round.byTeam[team].skipped}</span>
        </p>
      </section>
    );
  }

  return (
    <div data-testid="mimica-rival">
      <WaitingCard emoji="🙈" title="Vez deles">
        Eles estão fazendo mímica ({performerName} no palco) — torça contra.
        <br />
        {round.turnIndex === 0 ? 'Depois é a vez do seu time.' : 'Seu time já jogou esta rodada.'}
      </WaitingCard>
    </div>
  );
}

export default MimicaRound;
