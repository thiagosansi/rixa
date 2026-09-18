/**
 * Motor do RIXA — reducer PURO.
 * Não importa React, não importa Supabase, não faz I/O.
 * A TV (host) é a única autoridade: ela roda este reducer e transmite o GameState.
 */
import type {
  DeckMode,
  GameState,
  HostAction,
  LeilaoState,
  Player,
  PlayerAction,
  PlayerSecret,
  RoundState,
  Scores,
  TeamId,
  TelefoneChain,
  TelefoneEntry,
  TelefoneState,
  TurnTally,
} from './types';
import type { Deck } from './content';
import {
  DURATIONS,
  LEILAO_MAX_BID,
  LEILAO_MIN_BID,
  MIMICA_SKIP_DEBOUNCE_MS,
  POINTS,
  RELAMPAGO_TOTAL_QUESTIONS,
  TABU_PENALTY_DEBOUNCE_MS,
  TEAMS,
  TELEFONE_AUTO_EMOJI,
  TELEFONE_AUTO_PHRASE,
  TELEFONE_EMOJI_MAX,
  TELEFONE_EMOJI_MIN,
  TELEFONE_PHRASE_MAX,
  TELEFONE_PHRASE_MIN,
  TOTAL_ROUNDS,
  contentSeed,
  initialRoundState,
  mentirosoRevealMs,
  multiplierFor,
  otherTeam,
  pickRotating,
  playersOfTeam,
  roundKindAt,
  startingTeam,
  telefoneChainFor,
  telefoneSteps,
} from './rounds';

/* ------------------------------------------------------------------ */
/* helpers puros                                                       */
/* ------------------------------------------------------------------ */

export function emptyScores(): Scores {
  return { red: 0, blue: 0 };
}

export function createGame(code: string, deck: DeckMode = 'familia'): GameState {
  return {
    code,
    phase: 'lobby',
    deck,
    players: [],
    scores: emptyScores(),
    roundIndex: 0,
    round: null,
    multiplier: 1,
    roundLog: [],
    secrets: {},
    now: Date.now(),
  };
}

/** minúsculo, sem acento, sem pontuação, espaços colapsados */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function teamCounts(state: GameState): Record<TeamId, number> {
  return {
    red: playersOfTeam(state.players, 'red').length,
    blue: playersOfTeam(state.players, 'blue').length,
  };
}

/** Pode começar quando os dois times têm ao menos 1 pessoa e há 4+ no total. */
export function canStart(state: GameState): boolean {
  const c = teamCounts(state);
  return c.red >= 1 && c.blue >= 1 && state.players.length >= 4;
}

export function playerById(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

export function teamOf(state: GameState, playerId: string): TeamId | null {
  return playerById(state, playerId)?.team ?? null;
}

/** Hash determinístico (evita Math.random para o reducer continuar previsível). */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffleDeterministic<T>(items: T[], seed: string): T[] {
  return items
    .map((item, i) => ({ item, k: hash(`${seed}:${i}`) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.item);
}

function addScore(state: GameState, team: TeamId | null, basePoints: number): GameState {
  if (!team || basePoints === 0) return state;
  return {
    ...state,
    scores: { ...state.scores, [team]: state.scores[team] + basePoints * state.multiplier },
  };
}

function withRound<R extends RoundState>(state: GameState, round: R): GameState {
  return { ...state, round };
}

function sumLogged(state: GameState): Scores {
  return state.roundLog.reduce<Scores>(
    (acc, entry) => ({ red: acc.red + entry.delta.red, blue: acc.blue + entry.delta.blue }),
    emptyScores(),
  );
}

/** Fecha a rodada: calcula o delta (placar atual - o que já foi logado) e vai pro resultado. */
function finishRound(state: GameState): GameState {
  const already = sumLogged(state);
  const delta: Scores = {
    red: state.scores.red - already.red,
    blue: state.scores.blue - already.blue,
  };
  return {
    ...state,
    phase: 'round-result',
    roundLog: [
      ...state.roundLog,
      { roundIndex: state.roundIndex, kind: roundKindAt(state.roundIndex), delta },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* segredos                                                            */
/* ------------------------------------------------------------------ */

function pick<T>(arr: T[], index: number): T | null {
  if (arr.length === 0) return null;
  return arr[((index % arr.length) + arr.length) % arr.length];
}

/**
 * Recalcula os segredos por jogador. O celular lê apenas secrets[meuId].
 * Deve ser chamado pelo host a cada transição de estado.
 */
export function computeSecrets(state: GameState, content: Deck): Record<string, PlayerSecret> {
  const secrets: Record<string, PlayerSecret> = {};
  for (const p of state.players) secrets[p.id] = { kind: 'none' };

  const round = state.round;
  if (!round || state.phase !== 'round-play') return secrets;

  if (round.kind === 'mimica') {
    const word = pick(content.mimica, round.wordIndex);
    if (round.performerId && word) secrets[round.performerId] = { kind: 'mimica-word', word };
    return secrets;
  }

  if (round.kind === 'tabu') {
    const card = pick(content.tabu, round.cardIndex);
    if (!card) return secrets;
    if (round.clueGiverId) {
      secrets[round.clueGiverId] = {
        kind: 'tabu-card',
        word: card.word,
        forbidden: card.forbidden,
        role: 'clue-giver',
      };
    }
    // o time adversário fiscaliza: vê a carta inteira
    for (const p of playersOfTeam(state.players, otherTeam(round.activeTeam))) {
      secrets[p.id] = {
        kind: 'tabu-card',
        word: card.word,
        forbidden: card.forbidden,
        role: 'referee',
      };
    }
    return secrets;
  }

  if (round.kind === 'leilao') {
    // lance secreto: cada jogador só conhece o lance do PRÓPRIO time.
    // (toPublicState tira isto do broadcast; a TV entrega por envelope `secret` endereçado.)
    if (round.stage !== 'bidding') return secrets;
    for (const p of state.players) {
      if (p.team) secrets[p.id] = { kind: 'leilao-bid', amount: round.bids[p.team] };
    }
    return secrets;
  }

  if (round.kind === 'telefone') {
    // tarefa do passo: cada participante vê SÓ o lance anterior da corrente em que trabalha.
    // (toPublicState tira isto do broadcast; a TV entrega por envelope `secret` endereçado.)
    if (round.stage !== 'writing') return secrets;
    for (const task of telefoneTasks(round)) secrets[task.playerId] = task.secret;
    return secrets;
  }

  // mentiroso: ninguém recebe a verdade durante o jogo (o variante 'mentiroso-truth'
  // existe no contrato para telas futuras que queiram revelar a verdade a um juiz).
  return secrets;
}

/* ------------------------------------------------------------------ */
/* telefone sem fio                                                    */
/* ------------------------------------------------------------------ */

export type TelefoneTask = {
  playerId: string;
  secret: Extract<PlayerSecret, { kind: 'telefone-task' }>;
};

/** Modo do passo k: frases nos pares, emojis nos ímpares. */
export function telefoneModeFor(step: number): 'phrase' | 'emoji' {
  return step % 2 === 1 ? 'emoji' : 'phrase';
}

/** Tarefa de cada participante no passo atual (corrente = (posição + passo) mod N). */
export function telefoneTasks(r: TelefoneState): TelefoneTask[] {
  const n = r.order.length;
  if (n === 0 || r.stage !== 'writing') return [];
  const mode = telefoneModeFor(r.step);
  return r.order.map((playerId, position) => {
    const chainIndex = telefoneChainFor(position, r.step, n);
    const chain = r.chains[chainIndex];
    const previous = r.step > 0 ? (chain?.entries[r.step - 1]?.text ?? '') : null;
    return {
      playerId,
      secret: {
        kind: 'telefone-task',
        chainIndex,
        step: r.step,
        mode,
        input: previous,
        starter: r.step === 0 ? (chain?.suggestion ?? '') : null,
      },
    };
  });
}

/**
 * Um emoji "visual": pictograma (com tom de pele / seletor de variação opcionais),
 * bandeira (2 indicadores regionais) ou keycap (dígito + ⃣), com sequências ZWJ e
 * tags de subdivisão (🏴󠁧󠁢󠁳󠁣󠁴󠁿) coladas.
 */
const EMOJI_ATOM =
  '(?:\\p{Extended_Pictographic}\\uFE0F?\\p{Emoji_Modifier}?|\\p{Regional_Indicator}{2}|[0-9#*]\\uFE0F?\\u20E3)';
const EMOJI_TOKEN = `${EMOJI_ATOM}(?:[\\u{E0020}-\\u{E007F}]+)?(?:\\u200D${EMOJI_ATOM})*`;
const EMOJI_ONLY = new RegExp(`^(?:\\s*${EMOJI_TOKEN})+\\s*$`, 'u');
const EMOJI_SCAN = new RegExp(EMOJI_TOKEN, 'gu');

/** Separa a string em emojis (null se houver qualquer coisa que não seja emoji ou espaço). */
export function splitEmojis(text: string): string[] | null {
  if (!EMOJI_ONLY.test(text)) return null;
  return text.match(EMOJI_SCAN) ?? [];
}

/**
 * Valida/normaliza um lance. Frase: 3 a 120 caracteres (trim, espaços colapsados).
 * Emoji: só emojis e espaços, de 1 a 12 emojis. Devolve null se inválido.
 */
export function validateTelefoneText(text: string, mode: 'phrase' | 'emoji'): string | null {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (mode === 'emoji') {
    const emojis = splitEmojis(clean);
    if (!emojis || emojis.length < TELEFONE_EMOJI_MIN || emojis.length > TELEFONE_EMOJI_MAX) return null;
    return clean;
  }
  if (clean.length < TELEFONE_PHRASE_MIN || clean.length > TELEFONE_PHRASE_MAX) return null;
  return clean;
}

/** Palavras "significativas" (>= 4 letras, normalizadas) de uma frase. */
export function significantWords(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(' ')
      .filter((w) => w.length >= 4),
  );
}

/**
 * A corrente sobreviveu se a frase final compartilha >= 50% das palavras significativas
 * da inicial. Frase inicial sem palavra de 4+ letras: compara todas as palavras.
 * Lance automático (prazo estourado) em uma das pontas nunca conta como sobrevivência.
 */
export function telefoneSurvived(chain: TelefoneChain): boolean {
  const first = chain.entries[0];
  const last = chain.entries[chain.entries.length - 1];
  if (!first || !last || first === last) return false;
  if (first.auto || last.auto || last.mode !== 'phrase') return false;
  let start = significantWords(first.text);
  let end = significantWords(last.text);
  if (start.size === 0) {
    start = new Set(normalize(first.text).split(' ').filter(Boolean));
    end = new Set(normalize(last.text).split(' ').filter(Boolean));
  }
  if (start.size === 0) return false;
  let shared = 0;
  for (const w of start) if (end.has(w)) shared++;
  return shared * 2 >= start.size;
}

/** Contagem de votos por corrente. */
export function telefoneVoteCounts(r: TelefoneState): number[] {
  const counts = r.chains.map(() => 0);
  for (const chainIndex of Object.values(r.votes)) {
    if (chainIndex >= 0 && chainIndex < counts.length) counts[chainIndex]++;
  }
  return counts;
}

/** Correntes com >= 1 voto, da mais votada pra menos (empate: ordem da corrente). */
export function telefoneRanking(r: TelefoneState): number[] {
  const counts = telefoneVoteCounts(r);
  return counts
    .map((votes, i) => ({ votes, i }))
    .filter((x) => x.votes > 0)
    .sort((a, b) => b.votes - a.votes || a.i - b.i)
    .map((x) => x.i);
}

/**
 * Monta as correntes: participantes (só quem tem time) embaralhados com semente;
 * a posição i começa a corrente i, com um começo sugerido do baralho.
 */
function setupTelefone(state: GameState, r: TelefoneState, content: Deck, now: number): TelefoneState {
  const participants = state.players.filter((p) => p.team !== null);
  const order = shuffleDeterministic(participants, `${state.code}:telefone:${state.roundIndex}:${now}`);
  const seed = contentSeed(now, 6);
  const chains: TelefoneChain[] = order.map((p, i) => ({
    starterId: p.id,
    starterTeam: p.team as TeamId,
    suggestion: pick(content.telefone, seed + i) ?? '',
    entries: [],
  }));
  return {
    ...r,
    order: order.map((p) => p.id),
    steps: telefoneSteps(order.length),
    step: 0,
    chains,
    deadline: now + DURATIONS.telefone.step,
  };
}

/** Quem não entregou no passo atual recebe o lance automático. */
function fillTelefoneAuto(r: TelefoneState): TelefoneChain[] {
  const mode = telefoneModeFor(r.step);
  const n = r.order.length;
  const chains = r.chains.map((c) => ({ ...c, entries: c.entries.slice() }));
  for (let position = 0; position < n; position++) {
    const chainIndex = telefoneChainFor(position, r.step, n);
    const chain = chains[chainIndex];
    if (chain.entries[r.step]) continue;
    const auto: TelefoneEntry = {
      playerId: r.order[position],
      text: mode === 'emoji' ? TELEFONE_AUTO_EMOJI : TELEFONE_AUTO_PHRASE,
      mode,
      auto: true,
    };
    chain.entries[r.step] = auto;
  }
  return chains;
}

/** Todo mundo entregou o passo atual? (a TV usa para não esperar o relógio) */
export function telefoneAllSubmitted(r: TelefoneState): boolean {
  if (r.stage !== 'writing') return false;
  const n = r.order.length;
  if (n === 0) return false;
  for (let position = 0; position < n; position++) {
    const chain = r.chains[telefoneChainFor(position, r.step, n)];
    if (!chain?.entries[r.step]) return false;
  }
  return true;
}

/** Todo mundo votou? */
export function telefoneAllVoted(r: TelefoneState): boolean {
  if (r.stage !== 'voting') return false;
  return r.order.length > 0 && r.order.every((id) => r.votes[id] !== undefined);
}

function advanceTelefone(state: GameState, r: TelefoneState, now: number): GameState {
  switch (r.stage) {
    case 'writing': {
      const chains = fillTelefoneAuto(r);
      if (r.step + 1 < r.steps) {
        return withRound(state, {
          ...r,
          chains,
          step: r.step + 1,
          deadline: now + DURATIONS.telefone.step,
        });
      }
      return withRound(state, {
        ...r,
        chains,
        stage: 'reveal',
        revealChain: 0,
        revealStep: 0,
        survived: chains.map(telefoneSurvived),
        deadline: now + DURATIONS.telefone.reveal,
      });
    }
    case 'reveal': {
      const n = r.chains.length;
      if (r.revealStep + 1 < r.steps) {
        return withRound(state, {
          ...r,
          revealStep: r.revealStep + 1,
          deadline: now + DURATIONS.telefone.reveal,
        });
      }
      if (r.revealChain + 1 < n) {
        return withRound(state, {
          ...r,
          revealChain: r.revealChain + 1,
          revealStep: 0,
          deadline: now + DURATIONS.telefone.reveal,
        });
      }
      return withRound(state, {
        ...r,
        stage: 'voting',
        votes: {},
        deadline: now + DURATIONS.telefone.voting,
      });
    }
    case 'voting': {
      const ranking = telefoneRanking(r);
      const scored = scoreTelefone(state, { ...r, ranking });
      return withRound(scored, {
        ...r,
        stage: 'result',
        ranking,
        deadline: now + DURATIONS.telefone.result,
      });
    }
    case 'result':
      return finishRound(state);
  }
}

/**
 * Pontuação: cada corrente sobrevivente vale 75 para os DOIS times; a mais votada
 * 200 e a segunda 100 para o time de quem começou. Empate em 1º: todas levam 200 e
 * não há 2º; empate em 2º: todas levam 100. Sem votos, sem bônus.
 */
function scoreTelefone(state: GameState, r: TelefoneState): GameState {
  let next = state;
  for (const survived of r.survived) {
    if (!survived) continue;
    for (const team of TEAMS) next = addScore(next, team, POINTS.telefoneSurvive);
  }
  const counts = telefoneVoteCounts(r);
  if (r.ranking.length === 0) return next;
  const top = counts[r.ranking[0]];
  const firsts = r.ranking.filter((i) => counts[i] === top);
  for (const i of firsts) next = addScore(next, r.chains[i].starterTeam, POINTS.telefoneFirst);
  if (firsts.length > 1) return next;
  const rest = r.ranking.filter((i) => counts[i] < top);
  if (rest.length === 0) return next;
  const second = counts[rest[0]];
  for (const i of rest.filter((i) => counts[i] === second)) {
    next = addScore(next, r.chains[i].starterTeam, POINTS.telefoneSecond);
  }
  return next;
}

/* ------------------------------------------------------------------ */
/* ações do jogador                                                    */
/* ------------------------------------------------------------------ */

export function applyPlayer(
  state: GameState,
  playerId: string,
  action: PlayerAction,
  content?: Deck,
): GameState {
  const now = Date.now();

  switch (action.type) {
    case 'join': {
      const name = action.name.trim().slice(0, 16) || 'Anônimo';
      const existing = playerById(state, playerId);
      if (existing) {
        // idempotente: reconectar não duplica nem zera o time
        return {
          ...state,
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, name, lastSeen: now } : p,
          ),
        };
      }
      const player: Player = { id: playerId, name, team: null, lastSeen: now };
      return { ...state, players: [...state.players, player] };
    }

    case 'pick-team': {
      if (state.phase !== 'lobby') return state;
      if (!playerById(state, playerId)) return state;
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId ? { ...p, team: action.team, lastSeen: now } : p,
        ),
      };
    }

    case 'heartbeat':
      return {
        ...state,
        players: state.players.map((p) => (p.id === playerId ? { ...p, lastSeen: now } : p)),
      };

    case 'guess':
      return applyGuess(state, playerId, action.text, now);

    case 'tabu-penalty': {
      const r = state.round;
      if (state.phase !== 'round-play' || r?.kind !== 'tabu') return state;
      // só o time adversário fiscaliza
      if (teamOf(state, playerId) !== otherTeam(r.activeTeam)) return state;
      // dois árbitros apertando juntos = uma infração só
      if (r.lastPenaltyAt !== null && now - r.lastPenaltyAt < TABU_PENALTY_DEBOUNCE_MS) return state;
      const scored = addScore(state, r.activeTeam, POINTS.tabuPenalty);
      const tally = r.byTeam[r.activeTeam];
      return withRound(scored, {
        ...r,
        penalties: r.penalties + 1,
        cardIndex: r.cardIndex + 1,
        lastPenaltyAt: now,
        byTeam: { ...r.byTeam, [r.activeTeam]: { ...tally, penalties: tally.penalties + 1 } },
      });
    }

    case 'tabu-skip': {
      const r = state.round;
      if (state.phase !== 'round-play' || r?.kind !== 'tabu') return state;
      if (r.clueGiverId !== playerId) return state;
      return withRound(state, { ...r, cardIndex: r.cardIndex + 1 });
    }

    case 'mimica-skip': {
      const r = state.round;
      if (state.phase !== 'round-play' || r?.kind !== 'mimica') return state;
      if (!r.performerId || r.performerId !== playerId) return state; // só quem faz a mímica pula
      // toque duplo no botão = um pulo só
      if (r.lastSkipAt !== null && now - r.lastSkipAt < MIMICA_SKIP_DEBOUNCE_MS) return state;
      const tally = r.byTeam[r.activeTeam];
      return withRound(state, {
        ...r,
        wordIndex: r.wordIndex + 1,
        lastSkipAt: now,
        byTeam: { ...r.byTeam, [r.activeTeam]: { ...tally, skipped: tally.skipped + 1 } },
      });
    }

    case 'submit-lie': {
      const r = state.round;
      if (state.phase !== 'round-play' || r?.kind !== 'mentiroso' || r.stage !== 'writing') {
        return state;
      }
      if (!teamOf(state, playerId)) return state;
      const text = action.text.trim().slice(0, 80);
      const key = normalize(text);
      if (!text || !key) return state;
      // igual à verdade ou à mentira de outra pessoa viraria opção duplicada na votação
      const truth = content ? pick(content.mentiroso, r.questionIndex)?.truth : undefined;
      if (truth !== undefined && normalize(truth) === key) return state;
      if (r.lies.some((l) => l.playerId !== playerId && normalize(l.text) === key)) return state;
      const lies = r.lies.some((l) => l.playerId === playerId)
        ? r.lies.map((l) => (l.playerId === playerId ? { ...l, text } : l))
        : [...r.lies, { playerId, text }];
      return withRound(state, { ...r, lies });
    }

    case 'vote': {
      const r = state.round;
      if (state.phase !== 'round-play' || r?.kind !== 'mentiroso' || r.stage !== 'voting') {
        return state;
      }
      if (!teamOf(state, playerId)) return state;
      if (r.votes[playerId]) return state; // voto é único
      const option = r.options.find((o) => o.id === action.optionId);
      if (!option) return state;
      if (option.ownerId === playerId) return state; // não vota na própria mentira
      return withRound(state, { ...r, votes: { ...r.votes, [playerId]: action.optionId } });
    }

    case 'bid': {
      const r = state.round;
      if (state.phase !== 'round-play' || r?.kind !== 'leilao' || r.stage !== 'bidding') {
        return state;
      }
      const team = teamOf(state, playerId);
      if (!team) return state;
      if (!Number.isFinite(action.amount)) return state;
      const amount = Math.max(LEILAO_MIN_BID, Math.min(LEILAO_MAX_BID, Math.floor(action.amount)));
      // o lance é do TIME: qualquer membro pode subir ou baixar até o prazo.
      // Repetir o mesmo valor não renova o horário (o desempate é de quem chegou primeiro).
      if (r.bids[team] === amount) return state;
      return withRound(state, {
        ...r,
        bids: { ...r.bids, [team]: amount },
        hasBid: { ...r.hasBid, [team]: true },
        bidAt: { ...r.bidAt, [team]: now },
      });
    }

    case 'submit-answer': {
      const r = state.round;
      if (state.phase !== 'round-play' || r?.kind !== 'leilao' || r.stage !== 'challenge') {
        return state;
      }
      if (r.winner && teamOf(state, playerId) !== r.winner) return state;
      if (r.answers.length >= r.target) return state; // meta batida: não entra mais nada
      const text = action.text.trim().slice(0, 60);
      if (!text) return state;
      const dup = r.answers.some((a) => normalize(a) === normalize(text));
      if (dup) return state;
      const answers = [...r.answers, text];
      const accepted = [...r.accepted, null];
      if (answers.length >= r.target) {
        // bateu a meta: fecha o desafio e vai direto pro julgamento
        return withRound(state, {
          ...r,
          answers,
          accepted,
          stage: 'judging',
          deadline: now + DURATIONS.leilao.judging,
        });
      }
      return withRound(state, { ...r, answers, accepted });
    }

    case 'judge': {
      const r = state.round;
      if (state.phase !== 'round-play' || r?.kind !== 'leilao' || r.stage !== 'judging') {
        return state;
      }
      if (r.winner && teamOf(state, playerId) !== otherTeam(r.winner)) return state;
      if (action.index < 0 || action.index >= r.accepted.length) return state;
      const accepted = r.accepted.slice();
      accepted[action.index] = action.accepted;
      return withRound(state, { ...r, accepted });
    }

    case 'telefone-submit': {
      const r = state.round;
      if (state.phase !== 'round-play' || r?.kind !== 'telefone' || r.stage !== 'writing') {
        return state;
      }
      const position = r.order.indexOf(playerId);
      if (position < 0) return state; // espectador (ou alguém que entrou depois) fica fora
      const mode = telefoneModeFor(r.step);
      const text = validateTelefoneText(action.text, mode);
      if (text === null) return state;
      const chainIndex = telefoneChainFor(position, r.step, r.order.length);
      const chains = r.chains.map((c, i) => {
        if (i !== chainIndex) return c;
        const entries = c.entries.slice();
        entries[r.step] = { playerId, text, mode, auto: false }; // reenviar substitui
        return { ...c, entries };
      });
      return withRound(state, { ...r, chains });
    }

    case 'telefone-vote': {
      const r = state.round;
      if (state.phase !== 'round-play' || r?.kind !== 'telefone' || r.stage !== 'voting') {
        return state;
      }
      if (!r.order.includes(playerId)) return state;
      if (r.votes[playerId] !== undefined) return state; // voto é único
      const chain = r.chains[action.chainIndex];
      if (!chain || !Number.isInteger(action.chainIndex)) return state;
      if (chain.starterId === playerId) return state; // não vota na corrente que começou
      return withRound(state, { ...r, votes: { ...r.votes, [playerId]: action.chainIndex } });
    }

    case 'answer-choice': {
      const r = state.round;
      if (state.phase !== 'round-play' || r?.kind !== 'relampago' || r.revealed) return state;
      if (r.answers[playerId]) return state; // primeira resposta vale
      if (!teamOf(state, playerId)) return state;
      return withRound(state, {
        ...r,
        answers: { ...r.answers, [playerId]: { choice: action.choice, at: now } },
      });
    }
  }
}

function applyGuess(state: GameState, playerId: string, raw: string, now: number): GameState {
  const r = state.round;
  if (state.phase !== 'round-play') return state;
  if (!r || (r.kind !== 'mimica' && r.kind !== 'tabu')) return state;

  const text = raw.trim().slice(0, 60);
  if (!text) return state;

  const team = teamOf(state, playerId);
  if (team !== r.activeTeam) return state;

  const performerId = r.kind === 'mimica' ? r.performerId : r.clueGiverId;
  if (performerId === playerId) return state; // quem faz a mímica/dá dica não chuta

  const secret = performerId ? state.secrets[performerId] : undefined;
  const target =
    secret && (secret.kind === 'mimica-word' || secret.kind === 'tabu-card') ? secret.word : null;
  const correct = target !== null && normalize(text) === normalize(target);

  const entry = { playerId, text, correct, at: now };

  if (r.kind === 'mimica') {
    const next = addScore(state, correct ? r.activeTeam : null, correct ? POINTS.mimicaCorrect : 0);
    return withRound(next, {
      ...r,
      guesses: [...r.guesses, entry].slice(-30),
      wordIndex: correct ? r.wordIndex + 1 : r.wordIndex,
      solvedWords: correct && target ? [...r.solvedWords, target] : r.solvedWords,
      byTeam: correct ? bumpScored(r.byTeam, r.activeTeam) : r.byTeam,
    });
  }

  const next = addScore(state, correct ? r.activeTeam : null, correct ? POINTS.tabuCorrect : 0);
  return withRound(next, {
    ...r,
    guesses: [...r.guesses, entry].slice(-30),
    cardIndex: correct ? r.cardIndex + 1 : r.cardIndex,
    scored: correct ? r.scored + 1 : r.scored,
    byTeam: correct ? bumpScored(r.byTeam, r.activeTeam) : r.byTeam,
  });
}

function bumpScored(byTeam: Record<TeamId, TurnTally>, team: TeamId): Record<TeamId, TurnTally> {
  return { ...byTeam, [team]: { ...byTeam[team], scored: byTeam[team].scored + 1 } };
}

/* ------------------------------------------------------------------ */
/* ações do host                                                       */
/* ------------------------------------------------------------------ */

export function applyHost(state: GameState, action: HostAction, content: Deck): GameState {
  const now = Date.now();

  switch (action.type) {
    case 'set-deck':
      if (state.phase !== 'lobby') return state;
      return { ...state, deck: action.deck };

    case 'kick':
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.playerId),
      };

    case 'start-game': {
      if (state.phase !== 'lobby' || !canStart(state)) return state;
      return {
        ...state,
        phase: 'round-intro',
        roundIndex: 0,
        multiplier: multiplierFor(0),
        round: null,
        scores: emptyScores(),
        roundLog: [],
      };
    }

    case 'next-phase':
      return nextPhase(state, content, now);

    case 'tick': {
      if (state.phase !== 'round-play' || !state.round) return state;
      if (now <= state.round.deadline) return state;
      return advanceRound(state, content, now);
    }
  }
}

function nextPhase(state: GameState, content: Deck, now: number): GameState {
  switch (state.phase) {
    case 'lobby':
      return applyHost(state, { type: 'start-game' }, content);

    case 'round-intro': {
      const kind = roundKindAt(state.roundIndex);
      const base = initialRoundState(kind, state, now);
      const round = base.kind === 'telefone' ? setupTelefone(state, base, content, now) : base;
      return {
        ...state,
        phase: 'round-play',
        multiplier: multiplierFor(state.roundIndex),
        round,
      };
    }

    case 'round-play':
      return advanceRound(state, content, now);

    case 'round-result': {
      if (state.roundIndex >= TOTAL_ROUNDS - 1) {
        return { ...state, phase: 'game-over', round: null };
      }
      const roundIndex = state.roundIndex + 1;
      return {
        ...state,
        phase: 'round-intro',
        roundIndex,
        multiplier: multiplierFor(roundIndex),
        round: null,
      };
    }

    case 'game-over':
      return state;
  }
}

/** Avança o estágio interno da rodada; quando não há mais estágio, fecha a rodada. */
function advanceRound(state: GameState, content: Deck, now: number): GameState {
  const r = state.round;
  if (!r) return state;

  switch (r.kind) {
    case 'mimica': {
      if (r.turnIndex === 0) {
        const next = otherTeam(r.activeTeam);
        const performer = pickRotating(playersOfTeam(state.players, next), state.roundIndex);
        return withRound(state, {
          ...r,
          activeTeam: next,
          performerId: performer?.id ?? null,
          turnIndex: 1,
          // palavra nova: o 2o time não herda a palavra que o 1o deixou na mesa
          wordIndex: r.wordIndex + 1,
          deadline: now + DURATIONS.mimica.turn,
          guesses: [],
          lastSkipAt: null,
        });
      }
      return finishRound(state);
    }

    case 'tabu': {
      if (r.turnIndex === 0) {
        const next = otherTeam(r.activeTeam);
        const giver = pickRotating(playersOfTeam(state.players, next), state.roundIndex);
        return withRound(state, {
          ...r,
          activeTeam: next,
          clueGiverId: giver?.id ?? null,
          turnIndex: 1,
          // carta nova: quem fiscalizava JÁ VIU a carta atual e agora vai adivinhar
          cardIndex: r.cardIndex + 1,
          deadline: now + DURATIONS.tabu.turn,
          guesses: [],
          lastPenaltyAt: null,
        });
      }
      return finishRound(state);
    }

    case 'mentiroso': {
      if (r.stage === 'writing') {
        const q = pick(content.mentiroso, r.questionIndex);
        const truthOption = { id: 'truth', text: q?.truth ?? '???', ownerId: null };
        // mentira igual à verdade (ou repetida) viraria opção duplicada na votação
        const seen = new Set<string>([normalize(truthOption.text)]);
        const lieOptions = r.lies
          .map((l, i) => ({ id: `lie-${i}`, text: l.text, ownerId: l.playerId }))
          .filter((o) => {
            const key = normalize(o.text);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        const options = shuffleDeterministic(
          [truthOption, ...lieOptions],
          `${state.code}:${r.questionIndex}`,
        );
        return withRound(state, {
          ...r,
          stage: 'voting',
          options,
          deadline: now + DURATIONS.mentiroso.voting,
        });
      }
      if (r.stage === 'voting') {
        return withRound(scoreMentiroso(state, r), {
          ...r,
          stage: 'reveal',
          deadline: now + mentirosoRevealMs(r.options.length),
        });
      }
      if (r.questionNumber >= r.totalQuestions) return finishRound(state);
      return withRound(state, {
        ...r,
        stage: 'writing',
        questionIndex: r.questionIndex + 1,
        questionNumber: r.questionNumber + 1,
        lies: [],
        options: [],
        votes: {},
        deadline: now + DURATIONS.mentiroso.writing,
      });
    }

    case 'leilao': {
      if (r.stage === 'bidding') {
        const winner = leilaoWinner(r);
        const target = winner ? (r.bids[winner] ?? 0) : 0;
        if (!winner || target === 0) return nextLeilaoCategory(state, r, now); // ninguém apostou
        return withRound(state, {
          ...r,
          stage: 'challenge',
          winner,
          target,
          deadline: now + DURATIONS.leilao.challenge,
        });
      }
      if (r.stage === 'challenge') {
        return withRound(state, {
          ...r,
          stage: 'judging',
          deadline: now + DURATIONS.leilao.judging,
        });
      }
      return nextLeilaoCategory(scoreLeilao(state, r), r, now);
    }

    case 'telefone':
      return advanceTelefone(state, r, now);

    case 'relampago': {
      if (!r.revealed) {
        return withRound(scoreRelampago(state, r, content), {
          ...r,
          revealed: true,
          deadline: now + DURATIONS.relampago.reveal,
        });
      }
      if (r.questionNumber >= r.totalQuestions) return finishRound(state);
      return withRound(state, {
        ...r,
        questionIndex: r.questionIndex + 1,
        questionNumber: r.questionNumber + 1,
        answers: {},
        revealed: false,
        deadline: now + DURATIONS.relampago.question,
      });
    }
  }
}

/** Maior lance vence; no empate, quem deu o lance final PRIMEIRO. */
function leilaoWinner(r: LeilaoState): TeamId | null {
  const red = r.bids.red ?? 0;
  const blue = r.bids.blue ?? 0;
  if (red === 0 && blue === 0) return null;
  if (red !== blue) return red > blue ? 'red' : 'blue';
  const redAt = r.bidAt.red ?? Infinity;
  const blueAt = r.bidAt.blue ?? Infinity;
  return blueAt < redAt ? 'blue' : 'red';
}

function nextLeilaoCategory(state: GameState, r: LeilaoState, now: number): GameState {
  if (r.categoryNumber >= r.totalCategories) return finishRound(state);
  return withRound(state, {
    ...r,
    stage: 'bidding',
    categoryIndex: r.categoryIndex + 1,
    categoryNumber: r.categoryNumber + 1,
    bids: { red: null, blue: null },
    hasBid: { red: false, blue: false },
    bidAt: { red: null, blue: null },
    winner: null,
    target: 0,
    answers: [],
    accepted: [],
    deadline: now + DURATIONS.leilao.bidding,
  });
}

/* ------------------------------------------------------------------ */
/* pontuação por rodada                                                */
/* ------------------------------------------------------------------ */

function scoreMentiroso(state: GameState, r: Extract<RoundState, { kind: 'mentiroso' }>): GameState {
  let next = state;
  for (const [voterId, optionId] of Object.entries(r.votes)) {
    const option = r.options.find((o) => o.id === optionId);
    if (!option) continue;
    if (option.ownerId === null) {
      // achou a verdade
      next = addScore(next, teamOf(next, voterId), POINTS.mentirosoFoundTruth);
    } else {
      // enganou alguém — só vale se for ADVERSÁRIO (voto de colega não pontua: dava pra farmar)
      const ownerTeam = teamOf(next, option.ownerId);
      if (ownerTeam && ownerTeam !== teamOf(next, voterId)) {
        next = addScore(next, ownerTeam, POINTS.mentirosoVoteReceived);
      }
    }
  }
  return next;
}

function scoreLeilao(state: GameState, r: LeilaoState): GameState {
  if (!r.winner || r.target <= 0) return state;
  const ok = r.accepted.filter((a) => a === true).length;
  const prize = r.target * POINTS.leilaoPerTarget;
  return ok >= r.target
    ? addScore(state, r.winner, prize)
    : addScore(state, otherTeam(r.winner), prize);
}

function scoreRelampago(
  state: GameState,
  r: Extract<RoundState, { kind: 'relampago' }>,
  content: Deck,
): GameState {
  const q = pick(content.relampago, r.questionIndex);
  if (!q) return state;
  let next = state;
  for (const team of TEAMS) {
    next = addScore(next, team, relampagoTeamPoints(state, r, team, q.answerIndex));
  }
  return next;
}

/** Pontos de UM jogador na pergunta: 100 + bônus de velocidade (0..50), ou 0. */
export function relampagoPlayerPoints(
  answer: { choice: number; at: number } | undefined,
  answerIndex: number,
  deadline: number,
): number {
  if (!answer || answer.choice !== answerIndex) return 0;
  const windowMs = DURATIONS.relampago.question;
  const remaining = Math.max(0, Math.min(windowMs, deadline - answer.at));
  return POINTS.relampagoCorrect + Math.round((remaining / windowMs) * POINTS.relampagoSpeedBonusMax);
}

/**
 * Pontos base do TIME na pergunta = média arredondada dos membros (quem não respondeu
 * ou errou conta 0). Média, e não soma, para 3x4 valer o mesmo que 4x4.
 */
export function relampagoTeamPoints(
  state: GameState,
  r: Extract<RoundState, { kind: 'relampago' }>,
  team: TeamId,
  answerIndex: number,
): number {
  const members = playersOfTeam(state.players, team);
  if (members.length === 0) return 0;
  const total = members.reduce(
    (sum, p) => sum + relampagoPlayerPoints(r.answers[p.id], answerIndex, r.deadline),
    0,
  );
  return Math.round(total / members.length);
}

/* ------------------------------------------------------------------ */
/* fachada usada pela TV                                               */
/* ------------------------------------------------------------------ */

/** Aplica uma ação e já recalcula os segredos. Use isto no host. */
export function hostApplyPlayer(
  state: GameState,
  playerId: string,
  action: PlayerAction,
  content: Deck,
): GameState {
  const next = applyPlayer(state, playerId, action, content);
  if (next === state) return state;
  return { ...next, secrets: computeSecrets(next, content) };
}

export function hostApplyHost(state: GameState, action: HostAction, content: Deck): GameState {
  const next = applyHost(state, action, content);
  if (next === state) return state;
  return { ...next, secrets: computeSecrets(next, content) };
}

/** Segredos que só viajam por envelope endereçado (nunca no broadcast). */
function isPrivateSecret(secret: PlayerSecret): boolean {
  return secret.kind === 'leilao-bid' || secret.kind === 'telefone-task';
}

function hideSecrets(secrets: Record<string, PlayerSecret>): Record<string, PlayerSecret> {
  const out: Record<string, PlayerSecret> = {};
  for (const [id, secret] of Object.entries(secrets)) {
    out[id] = isPrivateSecret(secret) ? { kind: 'none' } : secret;
  }
  return out;
}

/**
 * O que pode sair no broadcast. O estado do host guarda os lances reais do leilão;
 * durante o `bidding` o broadcast leva só `hasBid` (bids/bidAt viram null e o segredo
 * `leilao-bid` sai de `secrets`). O lance do próprio time chega por envelope `secret`
 * endereçado — ver `privateSecrets`.
 *
 * Telefone sem fio: durante o `writing` as correntes vão sem texto (só quem entregou
 * em cada passo) e sem o começo sugerido; a tarefa de cada um vai endereçada.
 * Em `reveal`/`voting`/`result` as correntes completas são públicas.
 */
export function toPublicState(state: GameState, now: number = Date.now()): GameState {
  const r = state.round;
  if (state.phase !== 'round-play' || !r) return { ...state, now };
  if (r.kind === 'leilao' && r.stage === 'bidding') {
    return {
      ...state,
      now,
      secrets: hideSecrets(state.secrets),
      round: { ...r, bids: { red: null, blue: null }, bidAt: { red: null, blue: null } },
    };
  }
  if (r.kind === 'telefone' && r.stage === 'writing') {
    return {
      ...state,
      now,
      secrets: hideSecrets(state.secrets),
      round: {
        ...r,
        chains: r.chains.map((c) => ({
          ...c,
          suggestion: '',
          entries: c.entries.map((e) => ({ ...e, text: '' })),
        })),
      },
    };
  }
  return { ...state, now };
}

/** Segredos que NÃO podem ir no broadcast: a TV manda um envelope `secret` por destinatário. */
export function privateSecrets(state: GameState): { playerId: string; secret: PlayerSecret }[] {
  return Object.entries(state.secrets)
    .filter(([, secret]) => isPrivateSecret(secret))
    .map(([playerId, secret]) => ({ playerId, secret }));
}

/* exports auxiliares para as telas */
export { TEAMS, TOTAL_ROUNDS, roundKindAt, otherTeam, startingTeam, RELAMPAGO_TOTAL_QUESTIONS };
