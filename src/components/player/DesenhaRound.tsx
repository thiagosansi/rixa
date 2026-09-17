'use client';

import { DrawPad } from './DrawPad';
import { GuessPanel } from './GuessPanel';
import { WaitingCard } from './WaitingCard';
import { playerName, type RoundProps } from './shared';
import type { DesenhaState } from '@/game/types';
import { POINTS } from '@/game/rounds';

export function DesenhaRound({ game, me, team, secret, act, send, round }: RoundProps & { round: DesenhaState }) {
  const isDrawer = round.drawerId === me.id;
  const myTeamPlays = round.activeTeam === team;
  const drawerName = playerName(game, round.drawerId);

  if (isDrawer) {
    const word = secret.kind === 'desenha-word' ? secret.word : null;
    return (
      <section className="flex flex-col gap-3">
        <div className="rounded-2xl border-2 border-gold/60 bg-surface-2 px-4 py-3 text-center">
          <div className="display text-xs tracking-[0.2em] text-gold">você desenha · palavra secreta</div>
          <div className="display mt-1 text-3xl leading-none text-ink" data-testid="secret-word">
            {word ?? 'carregando…'}
          </div>
        </div>

        <DrawPad
          playerId={me.id}
          send={send}
          resetKey={`${round.turnIndex}:${round.wordIndex}`}
        />

        <p className="rounded-xl bg-team-red/10 px-3 py-2 text-center text-base text-team-red">
          Não vale escrever letras ou números, nem falar.
        </p>
        <p className="text-center text-base text-muted">
          Quando seu time acertar, vem outra palavra na hora. Acertos do seu time:{' '}
          <span className="text-ink" data-testid="team-solved">{round.byTeam[team].scored}</span>
        </p>
      </section>
    );
  }

  if (myTeamPlays) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="display text-center text-2xl text-gold">
          {drawerName} está desenhando — adivinhe!
        </h2>
        <GuessPanel
          game={game}
          meId={me.id}
          guesses={round.guesses}
          onGuess={(text) => act({ type: 'guess', text })}
          hint={`Olhe o desenho na TV e chute quantas vezes quiser. Cada acerto vale ${POINTS.desenhaCorrect}.`}
        />
      </section>
    );
  }

  return (
    <WaitingCard emoji="🙈" title="Vez deles">
      Eles estão desenhando ({drawerName} no lápis) — torça contra.
      <br />
      {round.turnIndex === 0 ? 'Depois é a vez do seu time.' : 'Seu time já jogou esta rodada.'}
    </WaitingCard>
  );
}

export default DesenhaRound;
