import type { GameState, Player, RoundKind, RoundState, TeamId, TurnTally } from './types';

/** Ordem fixa do torneio: roundIndex 0..4 */
export const ROUND_ORDER: readonly RoundKind[] = [
  'desenha',
  'tabu',
  'mentiroso',
  'leilao',
  'relampago',
] as const;

export const TOTAL_ROUNDS = ROUND_ORDER.length;

export type RoundInfo = {
  kind: RoundKind;
  title: string;
  tagline: string;
  rules: string[];
};

export const ROUND_INFO: Record<RoundKind, RoundInfo> = {
  desenha: {
    kind: 'desenha',
    title: 'Desenha ou Cala a Boca',
    tagline: 'Uma pessoa desenha no celular. O time chuta na TV.',
    rules: [
      'Um jogador de cada time desenha, o resto do time adivinha.',
      'Cada acerto vale 150 pontos.',
      'Sem falar, sem letras, sem número.',
    ],
  },
  tabu: {
    kind: 'tabu',
    title: 'Tabu de Boteco',
    tagline: 'Explique a palavra sem dizer o que é proibido.',
    rules: [
      'Quem dá a dica vê a palavra e a lista proibida no celular.',
      'Acerto = 100 pontos. Falar palavra proibida = -50.',
      'O time adversário é o juiz.',
    ],
  },
  mentiroso: {
    kind: 'mentiroso',
    title: 'Mentiroso',
    tagline: 'Invente uma resposta falsa e engane a mesa.',
    rules: [
      'São 3 perguntas: todo mundo escreve uma mentira e depois vota.',
      'Cada adversário que cair na sua mentira vale 75 pontos.',
      'Acertar a verdade vale 100 pontos.',
    ],
  },
  leilao: {
    kind: 'leilao',
    title: 'Leilão',
    tagline: 'Quantas você garante que consegue listar?',
    rules: [
      'São 2 categorias. Lance secreto de 1 a 10: quantos itens seu time lista?',
      'Maior lance encara o desafio. Empatou, leva quem apostou primeiro.',
      'Conseguiu: lance x50 pontos. Falhou: o adversário leva.',
    ],
  },
  relampago: {
    kind: 'relampago',
    title: 'Relâmpago',
    tagline: 'Rodada final. Tudo vale TRIPLO.',
    rules: [
      'Perguntas rápidas de múltipla escolha, todo mundo responde.',
      'Acerto = 100 + até 50 de bônus por velocidade.',
      'O time pontua a MÉDIA dos seus jogadores — e nesta rodada vale 3x.',
    ],
  },
};

/** Todas as durações em milissegundos. */
export const DURATIONS = {
  desenha: { turn: 60_000 },
  tabu: { turn: 60_000 },
  mentiroso: { writing: 45_000, voting: 30_000, reveal: 12_000 },
  leilao: { bidding: 30_000, challenge: 90_000, judging: 60_000 },
  relampago: { question: 12_000, reveal: 5_000 },
} as const;

export const RELAMPAGO_TOTAL_QUESTIONS = 6;
export const MENTIROSO_TOTAL_QUESTIONS = 3;
export const LEILAO_TOTAL_CATEGORIES = 2;
export const LEILAO_MIN_BID = 1;
export const LEILAO_MAX_BID = 10;
/** Dois árbitros apertando juntos contam como UMA infração. */
export const TABU_PENALTY_DEBOUNCE_MS = 1500;

/** Reveal do Mentiroso: um passo por opção + folga final para a verdade e os pontos. */
export const MENTIROSO_REVEAL_STEP_MS = 3_500;
export function mentirosoRevealMs(optionCount: number): number {
  return Math.max(0, optionCount) * MENTIROSO_REVEAL_STEP_MS + DURATIONS.mentiroso.reveal;
}

/**
 * Índice inicial do conteúdo da rodada. Varia com o relógio para que "Jogar de novo"
 * (ou outra noite) não repita as mesmas palavras/perguntas. O engine sempre lê o
 * conteúdo com módulo no tamanho do baralho, então qualquer inteiro >= 0 serve.
 */
export function contentSeed(now: number, salt: number): number {
  return (Math.floor(now / 1000) * 7 + salt * 131) % 100_000;
}

/**
 * Pontuações base (o multiplicador da rodada é aplicado pelo engine).
 *
 * Balanceamento — meta: rodadas 1–4 somam ~1500–2000 por time; a final vale
 * ~1000–1800 (teto 2700): dá pra virar, mas não anula o resto.
 *  - desenha:   1 turno de 60s, ~3 palavras x 150            ≈ 300–600
 *  - tabu:      1 turno de 60s, ~4–5 cartas x 100, -50/infração ≈ 300–500
 *  - mentiroso: 3 perguntas; verdade 100, enganar ADVERSÁRIO 75  ≈ 400–750
 *  - leilão:    2 categorias; lance (1..10) x 50 pra quem cumpre
 *               (ou pro rival se falhar)                        ≈ 0–700, típico 300
 *  - relâmpago: 6 perguntas x MÉDIA do time (0..150) x 3        ≤ 2700, típico 1000–1800
 * Relâmpago usa média (e não soma) para o placar não depender do tamanho do time.
 */
export const POINTS = {
  desenhaCorrect: 150,
  tabuCorrect: 100,
  tabuPenalty: -50,
  mentirosoVoteReceived: 75,
  mentirosoFoundTruth: 100,
  leilaoPerTarget: 50,
  relampagoCorrect: 100,
  relampagoSpeedBonusMax: 50,
} as const;

export const TEAMS: readonly TeamId[] = ['red', 'blue'] as const;

export const TEAM_LABELS: Record<TeamId, string> = {
  red: 'Vermelho',
  blue: 'Azul',
};

export function roundKindAt(roundIndex: number): RoundKind {
  return ROUND_ORDER[Math.min(Math.max(roundIndex, 0), TOTAL_ROUNDS - 1)];
}

/** Rodada final (index 4) vale triplo. */
export function multiplierFor(roundIndex: number): number {
  return roundIndex === TOTAL_ROUNDS - 1 ? 3 : 1;
}

export function otherTeam(team: TeamId): TeamId {
  return team === 'red' ? 'blue' : 'red';
}

export function playersOfTeam(players: Player[], team: TeamId): Player[] {
  return players.filter((p) => p.team === team);
}

/** Escolha determinística e rotativa (sem Math.random, para manter o engine previsível). */
export function pickRotating<T>(items: T[], seed: number): T | null {
  if (items.length === 0) return null;
  const i = ((seed % items.length) + items.length) % items.length;
  return items[i];
}

/** Time que começa a rodada: alterna a cada rodada para não dar vantagem fixa. */
export function startingTeam(roundIndex: number): TeamId {
  return roundIndex % 2 === 0 ? 'red' : 'blue';
}

export function emptyTally(): Record<TeamId, TurnTally> {
  return { red: { scored: 0, penalties: 0 }, blue: { scored: 0, penalties: 0 } };
}

/** Estado inicial da rodada `kind`, derivado do estado atual do jogo. */
export function initialRoundState(kind: RoundKind, state: GameState, now: number): RoundState {
  const first = startingTeam(state.roundIndex);
  switch (kind) {
    case 'desenha': {
      const drawer = pickRotating(playersOfTeam(state.players, first), state.roundIndex);
      return {
        kind: 'desenha',
        activeTeam: first,
        drawerId: drawer?.id ?? null,
        wordIndex: contentSeed(now, 1),
        deadline: now + DURATIONS.desenha.turn,
        solvedWords: [],
        guesses: [],
        turnIndex: 0,
        byTeam: emptyTally(),
      };
    }
    case 'tabu': {
      const giver = pickRotating(playersOfTeam(state.players, first), state.roundIndex);
      return {
        kind: 'tabu',
        activeTeam: first,
        clueGiverId: giver?.id ?? null,
        cardIndex: contentSeed(now, 2),
        deadline: now + DURATIONS.tabu.turn,
        scored: 0,
        penalties: 0,
        guesses: [],
        turnIndex: 0,
        byTeam: emptyTally(),
        lastPenaltyAt: null,
      };
    }
    case 'mentiroso':
      return {
        kind: 'mentiroso',
        stage: 'writing',
        questionIndex: contentSeed(now, 3),
        questionNumber: 1,
        totalQuestions: MENTIROSO_TOTAL_QUESTIONS,
        lies: [],
        options: [],
        votes: {},
        deadline: now + DURATIONS.mentiroso.writing,
      };
    case 'leilao':
      return {
        kind: 'leilao',
        stage: 'bidding',
        categoryIndex: contentSeed(now, 4),
        categoryNumber: 1,
        totalCategories: LEILAO_TOTAL_CATEGORIES,
        bids: { red: null, blue: null },
        hasBid: { red: false, blue: false },
        bidAt: { red: null, blue: null },
        winner: null,
        target: 0,
        deadline: now + DURATIONS.leilao.bidding,
        answers: [],
        accepted: [],
      };
    case 'relampago':
      return {
        kind: 'relampago',
        questionIndex: contentSeed(now, 5),
        questionNumber: 1,
        totalQuestions: RELAMPAGO_TOTAL_QUESTIONS,
        answers: {},
        deadline: now + DURATIONS.relampago.question,
        revealed: false,
      };
  }
}
