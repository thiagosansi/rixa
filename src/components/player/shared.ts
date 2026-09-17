import type { Envelope, GameState, Player, PlayerAction, PlayerSecret, TeamId } from '@/game/types';

/** Props comuns a todas as telas de rodada no celular. */
export type RoundProps = {
  game: GameState;
  me: Player;
  team: TeamId;
  secret: PlayerSecret;
  act: (action: PlayerAction) => void;
  send: (env: Envelope) => void;
};

/** Mesmo critério do engine: índice circular no baralho. */
export function pickAt<T>(arr: readonly T[], index: number): T | null {
  if (arr.length === 0) return null;
  return arr[((index % arr.length) + arr.length) % arr.length];
}

/** Cópia local de engine.normalize (minúsculo, sem acento, sem pontuação). */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function playerName(game: GameState, id: string | null | undefined): string {
  if (!id) return 'alguém';
  return game.players.find((p) => p.id === id)?.name ?? 'alguém';
}

export function buzz(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    /* sem háptico: segue o jogo */
  }
}

export const TEAM_TEXT: Record<TeamId, string> = { red: 'text-team-red', blue: 'text-team-blue' };
export const TEAM_LABEL: Record<TeamId, string> = { red: 'Vermelho', blue: 'Azul' };
