import type { GameState } from '@/game/types';
import { telefoneAllSubmitted, telefoneAllVoted } from '@/game/engine';

export type AutoAdvance = { key: string; delayMs: number };

/**
 * Quando todo mundo já fez a sua parte, não faz sentido esperar o relógio.
 * Devolve uma chave estável enquanto a condição vale; a TV agenda um `next-phase`
 * e só dispara se, na hora H, a chave ainda for a mesma.
 */
export function autoAdvanceFor(game: GameState): AutoAdvance | null {
  if (game.phase !== 'round-play' || !game.round) return null;
  const r = game.round;
  const table = game.players.filter((p) => p.team !== null);
  if (table.length === 0) return null;
  const tag = `${game.roundIndex}`;

  if (r.kind === 'mentiroso') {
    if (r.stage === 'writing' && table.every((p) => r.lies.some((l) => l.playerId === p.id))) {
      return { key: `${tag}:m:${r.questionNumber}:writing`, delayMs: 1500 };
    }
    if (r.stage === 'voting' && table.every((p) => Boolean(r.votes[p.id]))) {
      return { key: `${tag}:m:${r.questionNumber}:voting`, delayMs: 1500 };
    }
    return null;
  }

  if (r.kind === 'relampago') {
    if (!r.revealed && table.every((p) => Boolean(r.answers[p.id]))) {
      return { key: `${tag}:r:${r.questionNumber}`, delayMs: 900 };
    }
    return null;
  }

  if (r.kind === 'telefone') {
    if (telefoneAllSubmitted(r)) return { key: `${tag}:t:writing:${r.step}`, delayMs: 1500 };
    if (telefoneAllVoted(r)) return { key: `${tag}:t:voting`, delayMs: 1500 };
    return null;
  }

  if (r.kind === 'leilao' && r.stage === 'judging' && r.accepted.every((a) => a !== null)) {
    // deixa o veredito na tela e dá tempo do juiz mudar de ideia
    return { key: `${tag}:l:${r.categoryNumber}:${r.accepted.map((a) => (a ? 1 : 0)).join('')}`, delayMs: 8000 };
  }

  return null;
}
