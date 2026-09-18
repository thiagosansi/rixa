export type TeamId = 'red' | 'blue';
export type DeckMode = 'familia' | 'sem-filtro';
export type RoundKind = 'mimica' | 'tabu' | 'mentiroso' | 'leilao' | 'telefone' | 'relampago';
export type Phase = 'lobby' | 'round-intro' | 'round-play' | 'round-result' | 'game-over';

export type Player = { id: string; name: string; team: TeamId | null; lastSeen: number };
export type Scores = Record<TeamId, number>;

/** Contadores separados por time (os campos agregados continuam existindo). */
export type TurnTally = { scored: number; penalties: number; skipped: number };

export type MimicaState = {
  kind: 'mimica';
  activeTeam: TeamId;
  /** quem faz a mímica neste turno */
  performerId: string | null;
  wordIndex: number;
  deadline: number;
  solvedWords: string[];
  guesses: { playerId: string; text: string; correct: boolean; at: number }[];
  turnIndex: number; // 0 = 1o time, 1 = 2o time
  /** acertos e pulos por time (penalties fica sempre 0 na mímica) */
  byTeam: Record<TeamId, TurnTally>;
  /** instante do último pulo aceito (toque duplo no botão não queima duas palavras) */
  lastSkipAt: number | null;
};

export type TabuState = {
  kind: 'tabu';
  activeTeam: TeamId;
  clueGiverId: string | null;
  cardIndex: number;
  deadline: number;
  scored: number;
  penalties: number;
  guesses: { playerId: string; text: string; correct: boolean; at: number }[];
  turnIndex: number;
  byTeam: Record<TeamId, TurnTally>;
  /** instante da última penalidade aceita (debounce de árbitros simultâneos) */
  lastPenaltyAt: number | null;
};

export type MentirosoState = {
  kind: 'mentiroso';
  stage: 'writing' | 'voting' | 'reveal';
  questionIndex: number;
  /** 1..totalQuestions — a rodada joga várias perguntas em sequência */
  questionNumber: number;
  totalQuestions: number;
  lies: { playerId: string; text: string }[];
  options: { id: string; text: string; ownerId: string | null }[]; // ownerId null = verdade
  votes: Record<string, string>; // playerId -> optionId
  deadline: number;
};

export type LeilaoState = {
  kind: 'leilao';
  stage: 'bidding' | 'challenge' | 'judging';
  categoryIndex: number;
  /** 1..totalCategories — a rodada joga várias categorias em sequência */
  categoryNumber: number;
  totalCategories: number;
  /**
   * Lances. No estado do HOST são sempre os valores reais; no estado TRANSMITIDO
   * (ver `toPublicState`) ficam `null` durante o `bidding` — use `hasBid`.
   */
  bids: Record<TeamId, number | null>;
  /** "já apostou" — a única coisa pública sobre os lances durante o bidding */
  hasBid: Record<TeamId, boolean>;
  /** instante em que o lance ATUAL do time foi dado (desempate: quem chegou primeiro) */
  bidAt: Record<TeamId, number | null>;
  winner: TeamId | null;
  target: number;
  deadline: number;
  answers: string[];
  accepted: (boolean | null)[];
};

export type RelampagoState = {
  kind: 'relampago';
  questionIndex: number;
  questionNumber: number;
  totalQuestions: number;
  answers: Record<string, { choice: number; at: number }>;
  deadline: number;
  revealed: boolean;
};

/** Um lance da corrente: frase (passos pares) ou só emojis (passos ímpares). */
export type TelefoneEntry = {
  playerId: string;
  text: string;
  mode: 'phrase' | 'emoji';
  /** entrada preenchida pelo host quando o prazo estourou sem entrega */
  auto: boolean;
};

export type TelefoneChain = {
  /** quem escreveu a frase inicial (a corrente "é" dele; o time dele leva os votos) */
  starterId: string;
  starterTeam: TeamId;
  /** começo sugerido do baralho (inspiração/placeholder no passo 0) */
  suggestion: string;
  /** entries[k] = lance do passo k (comprimento cresce até `steps`) */
  entries: TelefoneEntry[];
};

export type TelefoneState = {
  kind: 'telefone';
  stage: 'writing' | 'reveal' | 'voting' | 'result';
  /** participantes (só quem tem time), embaralhados: a posição i começa a corrente i */
  order: string[];
  /** 3 ou 5 (ímpar: começa e termina em frase) */
  steps: number;
  /** passo atual durante `writing` (0..steps-1) */
  step: number;
  /**
   * Correntes. No estado do HOST são sempre completas; no estado TRANSMITIDO
   * (ver `toPublicState`) durante o `writing` os textos vão vazios (só progresso).
   */
  chains: TelefoneChain[];
  deadline: number;
  /** reveal: corrente e passo sendo mostrados na TV */
  revealChain: number;
  revealStep: number;
  /** playerId -> índice da corrente mais engraçada */
  votes: Record<string, number>;
  /** por corrente: a frase final preservou >= 50% das palavras da inicial (calculado no reveal) */
  survived: boolean[];
  /** correntes com >= 1 voto, da mais votada pra menos (calculado no result) */
  ranking: number[];
};

export type RoundState =
  | MimicaState
  | TabuState
  | MentirosoState
  | LeilaoState
  | TelefoneState
  | RelampagoState;

export type GameState = {
  code: string;
  phase: Phase;
  deck: DeckMode;
  players: Player[];
  scores: Scores;
  roundIndex: number;   // 0..5
  round: RoundState | null;
  multiplier: number;   // 1, ou 3 na rodada final
  roundLog: { roundIndex: number; kind: RoundKind; delta: Scores }[];
  /** segredos por jogador: o celular lê apenas secrets[meuId] */
  secrets: Record<string, PlayerSecret>;
  /** relógio do host no momento do broadcast (o celular corrige o próprio relógio com isso) */
  now: number;
};

export type PlayerSecret =
  | { kind: 'mimica-word'; word: string }
  | { kind: 'tabu-card'; word: string; forbidden: string[]; role: 'clue-giver' | 'referee' }
  | { kind: 'mentiroso-truth'; truth: string }
  | { kind: 'leilao-bid'; amount: number | null }
  /**
   * Tarefa do passo atual do telefone sem fio. `input` = lance do passo anterior
   * daquela corrente (null no passo 0); `starter` = começo sugerido (só no passo 0).
   * Viaja por envelope `secret` endereçado (nunca no broadcast) durante o `writing`.
   */
  | {
      kind: 'telefone-task';
      chainIndex: number;
      step: number;
      mode: 'phrase' | 'emoji';
      input: string | null;
      starter: string | null;
    }
  | { kind: 'none' };

export type PlayerAction =
  | { type: 'join'; name: string }
  | { type: 'pick-team'; team: TeamId }
  | { type: 'heartbeat' }
  | { type: 'guess'; text: string }
  | { type: 'tabu-penalty' }
  | { type: 'tabu-skip' }
  | { type: 'mimica-skip' }
  | { type: 'submit-lie'; text: string }
  | { type: 'vote'; optionId: string }
  | { type: 'bid'; amount: number }
  | { type: 'submit-answer'; text: string }
  | { type: 'judge'; index: number; accepted: boolean }
  | { type: 'telefone-submit'; text: string }
  | { type: 'telefone-vote'; chainIndex: number }
  | { type: 'answer-choice'; choice: number };

export type HostAction =
  | { type: 'set-deck'; deck: DeckMode }
  | { type: 'start-game' }
  | { type: 'next-phase' }
  | { type: 'tick' }
  | { type: 'kick'; playerId: string };

export type Envelope =
  | { t: 'state'; state: GameState }
  | { t: 'act'; playerId: string; action: PlayerAction }
  /** segredo entregue só ao destinatário (o relay ws roteia por playerId) */
  | { t: 'secret'; playerId: string; secret: PlayerSecret };
