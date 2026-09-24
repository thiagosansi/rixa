'use client';

import { useState } from 'react';
import type { DetetiveState } from '@/game/types';
import { pickDeck } from '@/game/content';
import { POINTS } from '@/game/rounds';
import { WaitingCard } from './WaitingCard';
import { buzz, playerName, type RoundProps } from './shared';

export function DetetiveRound({ game, me, secret, act, round }: RoundProps & { round: DetetiveState }) {
  const dossier = pickDeck(game.deck).detetive[round.caseIndex % Math.max(1, pickDeck(game.deck).detetive.length)];
  const role = secret.kind === 'detetive-role' ? secret : null;
  const [pendingVote, setPendingVote] = useState<string | null>(null);
  const myVote = round.votes[me.id] ?? null;
  const selected = myVote ?? pendingVote;
  const candidates = round.order.filter((id) => id !== me.id);
  const culpritName = round.culpritId ? playerName(game, round.culpritId) : null;
  const voteCount = Object.keys(round.votes).length;

  const caseCard = (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-line bg-surface px-4 py-4">
      <div className="display text-xs tracking-[0.2em] text-gold">o caso</div>
      <h2 className="display text-2xl text-ink">{dossier?.title ?? 'Mistério da casa'}</h2>
      <p className="text-lg leading-snug text-ink">{dossier?.setting ?? 'A investigação vai começar.'}</p>
      <p className="text-base leading-snug text-muted">{dossier?.incident ?? 'Conversem e procurem as pistas.'}</p>
    </div>
  );

  const clueCard = (
    <div className="rounded-2xl border-2 border-gold/50 bg-gold/10 px-4 py-3">
      <div className="display text-xs tracking-[0.2em] text-gold">pistas públicas</div>
      <ul className="mt-2 flex flex-col gap-2 text-lg text-ink">
        {(dossier?.publicClues ?? []).slice(0, round.revealedClues).map((clue, i) => (
          <li key={clue} className="flex gap-2">
            <span className="display text-gold">{i + 1}</span>
            <span>{clue}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const secretCard = role ? (
    <div className={`rounded-2xl border-2 px-4 py-4 ${role.guilty ? 'border-team-red/70 bg-team-red/10' : 'border-team-blue/60 bg-team-blue/10'}`}>
      <div className="display text-xs tracking-[0.2em] text-gold">seu personagem</div>
      <div className="display mt-1 text-3xl text-ink">{role.role}</div>
      <p className="mt-2 text-lg leading-snug text-ink">{role.clue}</p>
      <p className="mt-2 text-sm text-muted">
        {role.guilty ? 'Você é o responsável. Misture verdade e blefe sem ser descoberto.' : 'Compartilhe sua pista quando achar que é a hora certa.'}
      </p>
    </div>
  ) : (
    <WaitingCard emoji="🔒" title="Recebendo seu personagem">
      Olhe a tela só você. Sua pista chega em um envelope privado.
    </WaitingCard>
  );

  if (round.stage === 'investigation' || round.stage === 'discussion') {
    return (
      <section className="flex flex-col gap-3">
        {caseCard}
        {secretCard}
        {clueCard}
        <WaitingCard emoji={round.stage === 'investigation' ? '🔎' : '🗣️'} title={round.stage === 'investigation' ? 'Investiguem' : 'Conversem e cruzem as pistas'}>
          {round.stage === 'investigation'
            ? 'Leiam suas pistas em silêncio e comecem a perguntar uns aos outros.'
            : 'A segunda pista já está na mesa. Quem parece estar escondendo alguma coisa?'}
        </WaitingCard>
      </section>
    );
  }

  if (round.stage === 'voting') {
    return (
      <section className="flex flex-col gap-3">
        {caseCard}
        {clueCard}
        <h2 className="display text-center text-2xl text-gold">
          {myVote ? 'voto registrado' : 'quem foi o responsável?'}
        </h2>
        <ul className="flex flex-col gap-2">
          {candidates.map((id) => {
            const isSelected = selected === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={selected !== null}
                  onClick={() => {
                    setPendingVote(id);
                    buzz(30);
                    act({ type: 'detetive-vote', accusedId: id });
                  }}
                  className={`flex min-h-16 w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left text-xl transition-colors ${
                    isSelected ? 'border-gold bg-gold/15 text-ink' : 'border-line bg-surface text-ink disabled:opacity-50'
                  }`}
                >
                  <span>{playerName(game, id)}</span>
                  {isSelected && <span className="display text-sm text-gold">seu voto</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-center text-base text-muted">{voteCount} de {round.order.length} votaram</p>
      </section>
    );
  }

  const gotIt = myVote !== null && myVote === round.culpritId;
  return (
    <section className="flex flex-col gap-3">
      {caseCard}
      {clueCard}
      <div className="rounded-2xl border-2 border-gold/60 bg-gold/10 px-4 py-4 text-center">
        <div className="display text-xs tracking-[0.2em] text-gold">solução</div>
        <div className="display mt-1 text-2xl text-ink">{culpritName ?? 'ninguém foi identificado'}</div>
        <p className="mt-2 text-lg leading-snug text-ink">{dossier?.solution ?? 'O caso foi encerrado.'}</p>
      </div>
      <WaitingCard emoji={gotIt ? '🎯' : role?.guilty ? '😈' : '🕵️'} title={gotIt ? 'Você acertou!' : role?.guilty ? 'Você escapou?' : 'Caso encerrado'} tone={gotIt ? 'good' : 'neutral'}>
        {gotIt ? `Seu time ganhou ${POINTS.detetiveFound} pontos.` : role?.guilty ? `Se ninguém apontou você, seu time ganhou ${POINTS.detetiveSurvived} pontos.` : `O responsável era ${culpritName ?? 'desconhecido'}.`}
      </WaitingCard>
      <p className="text-center text-base text-muted">A rodada termina quando o anfitrião avançar.</p>
    </section>
  );
}

export default DetetiveRound;
