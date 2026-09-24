import type { GameState, Player, RoundKind, RoundState, TeamId, TurnTally } from './types';

/** Ordem fixa do torneio: roundIndex 0..6 */
export const ROUND_ORDER: readonly RoundKind[] = [
  'mimica',
  'tabu',
  'mentiroso',
  'leilao',
  'telefone',
  'detetive',
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
  mimica: {
    kind: 'mimica',
    title: 'Mímica',
    tagline: 'Uma pessoa faz mímica na frente de todo mundo. O time chuta pelo celular.',
    rules: [
      'Um jogador de cada time vê a palavra no celular e faz mímica; o resto do time digita os palpites.',
      'Cada acerto vale 150 pontos. Travou? Pode pular sem perder nada.',
      'Sem falar, sem fazer som, sem apontar objetos, sem soletrar no ar.',
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
  telefone: {
    kind: 'telefone',
    title: 'Telefone sem fio',
    tagline: 'Uma frase vira emojis, os emojis viram frase… e ninguém vê a corrente inteira.',
    rules: [
      'Cada um começa uma frase. Ela passa de celular em celular: reescreva SÓ com emojis, depois traduza de volta.',
      'No fim a mesa revela as correntes. Todo mundo vota na mais engraçada (não vale a sua).',
      'Frase que chegou inteira: +75 pra cada time. Mais votada: +200 · segunda: +100 pro time de quem começou.',
    ],
  },
  detetive: {
    kind: 'detetive',
    title: 'Detetive da Casa',
    tagline: 'Uma história, pistas secretas e um responsável tentando escapar.',
    rules: [
      'Cada pessoa recebe um personagem e uma pista secreta no celular.',
      'Conversem em voz alta, liberem as pistas da mesa e tentem reconstruir o que aconteceu.',
      'No fim, vote em quem foi o responsável. Ninguém é eliminado da partida.',
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
  mimica: { turn: 60_000 },
  tabu: { turn: 60_000 },
  mentiroso: { writing: 45_000, voting: 30_000, reveal: 12_000 },
  leilao: { bidding: 30_000, challenge: 90_000, judging: 60_000 },
  telefone: { step: 45_000, reveal: 4_000, voting: 30_000, result: 15_000 },
  detetive: { investigation: 45_000, discussion: 45_000, voting: 30_000, reveal: 12_000 },
  relampago: { question: 12_000, reveal: 5_000 },
} as const;

export const RELAMPAGO_TOTAL_QUESTIONS = 6;
export const MENTIROSO_TOTAL_QUESTIONS = 3;
export const LEILAO_TOTAL_CATEGORIES = 2;
export const LEILAO_MIN_BID = 1;
export const LEILAO_MAX_BID = 10;
/** Telefone sem fio: limites de cada lance. */
export const TELEFONE_PHRASE_MIN = 3;
export const TELEFONE_PHRASE_MAX = 120;
export const TELEFONE_EMOJI_MIN = 1;
export const TELEFONE_EMOJI_MAX = 12;
/** Lances automáticos de quem deixou o prazo estourar. */
export const TELEFONE_AUTO_PHRASE = '(ficou em branco)';
export const TELEFONE_AUTO_EMOJI = '🤷';

/**
 * Passos da corrente: sempre ímpar (começa e termina em frase) e menor que o número
 * de participantes, para ninguém repetir corrente. 5+ pessoas: 5 passos; 3–4: 3;
 * mesa degenerada de 1–2 (só com espectadores completando os 4): 1.
 */
export function telefoneSteps(participants: number): number {
  if (participants >= 5) return 5;
  if (participants >= 3) return 3;
  return 1;
}

/** Corrente em que o jogador da posição `position` trabalha no passo `step`. */
export function telefoneChainFor(position: number, step: number, participants: number): number {
  return (position + step) % participants;
}
/** Dois árbitros apertando juntos contam como UMA infração. */
export const TABU_PENALTY_DEBOUNCE_MS = 1500;
/** Toque duplo no "Pular" da mímica conta como UM pulo. */
export const MIMICA_SKIP_DEBOUNCE_MS = 1000;

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
 *  - mímica:    1 turno de 60s, ~3 palavras x 150            ≈ 300–600
 *  - tabu:      1 turno de 60s, ~4–5 cartas x 100, -50/infração ≈ 300–500
 *  - mentiroso: 3 perguntas; verdade 100, enganar ADVERSÁRIO 75  ≈ 400–750
 *  - leilão:    2 categorias; lance (1..10) x 50 pra quem cumpre
 *               (ou pro rival se falhar)                        ≈ 0–700, típico 300
 *  - telefone:  de propósito mais leve: corrente sobrevivente 75 pra CADA time;
 *               mais votada 200, segunda 100 pro time de quem começou ≈ 75–500
 *  - relâmpago: 6 perguntas x MÉDIA do time (0..150) x 3        ≤ 2700, típico 1000–1800
 * Relâmpago usa média (e não soma) para o placar não depender do tamanho do time.
 */
export const POINTS = {
  mimicaCorrect: 150,
  tabuCorrect: 100,
  tabuPenalty: -50,
  mentirosoVoteReceived: 75,
  mentirosoFoundTruth: 100,
  leilaoPerTarget: 50,
  telefoneSurvive: 75,
  telefoneFirst: 200,
  telefoneSecond: 100,
  detetiveFound: 125,
  detetiveSurvived: 200,
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

/** Rodada final (index 5, relâmpago) vale triplo. */
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
  return {
    red: { scored: 0, penalties: 0, skipped: 0 },
    blue: { scored: 0, penalties: 0, skipped: 0 },
  };
}

/** Estado inicial da rodada `kind`, derivado do estado atual do jogo. */
export function initialRoundState(kind: RoundKind, state: GameState, now: number): RoundState {
  const first = startingTeam(state.roundIndex);
  switch (kind) {
    case 'mimica': {
      const performer = pickRotating(playersOfTeam(state.players, first), state.roundIndex);
      return {
        kind: 'mimica',
        activeTeam: first,
        performerId: performer?.id ?? null,
        wordIndex: contentSeed(now, 1),
        deadline: now + DURATIONS.mimica.turn,
        solvedWords: [],
        guesses: [],
        turnIndex: 0,
        byTeam: emptyTally(),
        lastSkipAt: null,
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
    case 'telefone':
      // `order`/`chains` são montados pelo engine (precisa do embaralhamento determinístico)
      return {
        kind: 'telefone',
        stage: 'writing',
        order: [],
        steps: 1,
        step: 0,
        chains: [],
        deadline: now + DURATIONS.telefone.step,
        revealChain: 0,
        revealStep: 0,
        votes: {},
        survived: [],
        ranking: [],
      };
    case 'detetive': {
      const participants = state.players.filter((p) => p.team !== null);
      const offset = participants.length > 0 ? contentSeed(now, 7) % participants.length : 0;
      const order = participants
        .map((_, i) => participants[(i + offset) % participants.length]?.id ?? '')
        .filter(Boolean);
      return {
        kind: 'detetive',
        stage: 'investigation',
        caseIndex: contentSeed(now, 8),
        order,
        culpritId: order.length > 0 ? order[contentSeed(now, 9) % order.length] : null,
        revealedClues: 1,
        votes: {},
        deadline: now + DURATIONS.detetive.investigation,
      };
    }
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
