'use client';

import type { DetetiveState, GameState } from '@/game/types';
import type { DetectiveCase, Deck } from '@/game/content';
import { DURATIONS, POINTS } from '@/game/rounds';
import { Timer } from '@/components/ui';
import { TEAM_TEXT } from './shared';

function dossierFor(content: Deck, index: number): DetectiveCase | null {
  if (content.detetive.length === 0) return null;
  return content.detetive[((index % content.detetive.length) + content.detetive.length) % content.detetive.length];
}

export function DetectiveScreen({ game, round, content }: { game: GameState; round: DetetiveState; content: Deck }) {
  const dossier = dossierFor(content, round.caseIndex);
  const stageLabel =
    round.stage === 'investigation'
      ? 'Leiam seus personagens'
      : round.stage === 'discussion'
        ? 'Conversem e cruzem as pistas'
        : round.stage === 'voting'
          ? 'Hora do voto'
          : 'A solução';
  const timerTotal = DURATIONS.detetive[round.stage];
  const voteCounts = new Map<string, number>();
  for (const accusedId of Object.values(round.votes)) {
    voteCounts.set(accusedId, (voteCounts.get(accusedId) ?? 0) + 1);
  }

  return (
    <section className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="display text-sm tracking-[0.2em] text-gold">detetive da casa</div>
          <h2 className="display mt-1 text-4xl text-ink md:text-6xl">{dossier?.title ?? 'Mistério'}</h2>
        </div>
        <Timer deadline={round.deadline} totalMs={timerTotal} size="lg" />
      </div>

      <div className="rounded-3xl border-2 border-line bg-surface px-5 py-4">
        <div className="display text-xl text-gold">{stageLabel}</div>
        <p className="mt-2 text-2xl leading-snug text-ink">{dossier?.setting ?? 'A investigação vai começar.'}</p>
        <p className="mt-2 text-lg leading-snug text-muted">{dossier?.incident ?? 'Conversem e observem as pistas.'}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border-2 border-gold/50 bg-gold/10 px-5 py-4">
          <div className="display text-sm tracking-[0.2em] text-gold">pistas públicas</div>
          <ul className="mt-3 flex flex-col gap-3 text-xl text-ink">
            {(dossier?.publicClues ?? []).slice(0, round.revealedClues).map((clue, i) => (
              <li key={clue} className="flex gap-3">
                <span className="display text-gold">{i + 1}</span>
                <span>{clue}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border-2 border-line bg-surface px-5 py-4">
          <div className="display text-sm tracking-[0.2em] text-muted">progresso</div>
          <div className="display mt-2 text-5xl text-ink">{Object.keys(round.votes).length}/{round.order.length}</div>
          <p className="mt-2 text-lg text-muted">Cada jogador vota no próprio celular. A conversa acontece na sala.</p>
          {round.stage === 'reveal' && round.culpritId && (
            <p className="mt-3 text-xl text-gold">
              Responsável: <span className="text-ink">{game.players.find((p) => p.id === round.culpritId)?.name ?? '—'}</span>
            </p>
          )}
        </div>
      </div>

      {round.stage === 'reveal' && dossier && (
        <div className="rounded-3xl border-2 border-gold bg-gold/10 px-5 py-4 text-center">
          <div className="display text-sm tracking-[0.2em] text-gold">solução do caso</div>
          <p className="mt-2 text-2xl text-ink">{dossier.solution}</p>
          <p className="mt-3 text-lg text-muted">Acerto: {POINTS.detetiveFound} pontos · escapar: {POINTS.detetiveSurvived} pontos</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {round.order.map((id) => {
              const player = game.players.find((p) => p.id === id);
              const votes = voteCounts.get(id) ?? 0;
              return (
                <span key={id} className={`rounded-xl border-2 px-3 py-2 text-lg ${player?.team ? TEAM_TEXT[player.team] : 'text-ink'}`}>
                  {player?.name ?? id}: {votes} voto{votes === 1 ? '' : 's'}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default DetectiveScreen;
