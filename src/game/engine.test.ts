/**
 * Testes do motor. Rodam com o runner nativo do Node: `npm test`.
 * O relógio é controlado (mock de Date) para que bônus de velocidade, debounce
 * e desempate por horário sejam determinísticos.
 */
import { after, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { GameState, HostAction, PlayerAction, RoundState, TeamId } from './types';
import type { Deck } from './content';
import {
  canStart,
  createGame,
  hostApplyHost,
  hostApplyPlayer,
  privateSecrets,
  telefoneAllSubmitted,
  telefoneSurvived,
  toPublicState,
  validateTelefoneText,
} from './engine';
import {
  DURATIONS,
  LEILAO_TOTAL_CATEGORIES,
  MENTIROSO_TOTAL_QUESTIONS,
  POINTS,
  RELAMPAGO_TOTAL_QUESTIONS,
  MIMICA_SKIP_DEBOUNCE_MS,
  ROUND_ORDER,
  TABU_PENALTY_DEBOUNCE_MS,
  TELEFONE_AUTO_EMOJI,
  TELEFONE_AUTO_PHRASE,
  TOTAL_ROUNDS,
  multiplierFor,
  telefoneChainFor,
} from './rounds';

const DECK: Deck = {
  mimica: ['gato', 'casa', 'sol', 'bola', 'pato', 'chuva', 'navio'],
  tabu: ['praia', 'pizza', 'futebol', 'violao', 'onibus', 'escola', 'cinema'].map((word) => ({
    word,
    forbidden: ['a', 'b', 'c'],
  })),
  mentiroso: [
    { question: 'Q1 ____', truth: 'Verdade Um' },
    { question: 'Q2 ____', truth: 'Verdade Dois' },
    { question: 'Q3 ____', truth: 'Verdade Três' },
    { question: 'Q4 ____', truth: 'Verdade Quatro' },
  ],
  leilao: [{ category: 'Frutas' }, { category: 'Capitais' }, { category: 'Carros' }],
  telefone: ['Começo A', 'Começo B', 'Começo C', 'Começo D', 'Começo E'],
  detetive: [
    {
      title: 'Caso de teste',
      setting: 'Uma sala',
      incident: 'Algo sumiu',
      publicClues: ['Pista 1', 'Pista 2'],
      roleCards: [
        { role: 'Responsável', clue: 'Você fez isso.' },
        { role: 'Testemunha', clue: 'Você viu algo.' },
        { role: 'Vizinho', clue: 'Você ouviu algo.' },
      ],
      culpritRole: 'Responsável',
      solution: 'O responsável fez isso.',
    },
  ],
  relampago: Array.from({ length: 7 }, (_, i) => ({
    text: `Pergunta ${i}`,
    options: ['A', 'B', 'C', 'D'],
    answerIndex: i % 4,
  })),
};

/* ------------------------------------------------------------------ */
/* utilitários                                                         */
/* ------------------------------------------------------------------ */

let clock = 1_800_000_000_000;
function advance(ms: number): void {
  clock += ms;
  mock.timers.setTime(clock);
}

before(() => mock.timers.enable({ apis: ['Date'], now: clock }));
after(() => mock.timers.reset());

const act = (s: GameState, id: string, action: PlayerAction) => hostApplyPlayer(s, id, action, DECK);
const host = (s: GameState, action: HostAction) => hostApplyHost(s, action, DECK);
const next = (s: GameState) => host(s, { type: 'next-phase' });

function table(red: number, blue: number): GameState {
  let s = createGame('TEST');
  const seat = (id: string, team: TeamId) => {
    s = act(s, id, { type: 'join', name: id });
    s = act(s, id, { type: 'pick-team', team });
  };
  for (let i = 1; i <= red; i++) seat(`r${i}`, 'red');
  for (let i = 1; i <= blue; i++) seat(`b${i}`, 'blue');
  return s;
}

/** Começa o jogo e avança (sem pontuar nada) até o round-play da rodada `roundIndex`. */
function playAt(s: GameState, roundIndex: number): GameState {
  s = host(s, { type: 'start-game' });
  for (let guard = 0; guard < 200; guard++) {
    if (s.roundIndex === roundIndex && s.phase === 'round-play') return s;
    s = next(s);
  }
  throw new Error(`não chegou na rodada ${roundIndex}`);
}

function roundOf<K extends RoundState['kind']>(s: GameState, kind: K): Extract<RoundState, { kind: K }> {
  assert.equal(s.round?.kind, kind);
  return s.round as Extract<RoundState, { kind: K }>;
}

function secretWord(s: GameState, playerId: string | null): string {
  const secret = playerId ? s.secrets[playerId] : undefined;
  assert.ok(secret && (secret.kind === 'mimica-word' || secret.kind === 'tabu-card'));
  return secret.word;
}

const at = <T>(arr: T[], index: number): T => arr[index % arr.length];

function optionOf(s: GameState, ownerId: string | null): string {
  const option = roundOf(s, 'mentiroso').options.find((o) => o.ownerId === ownerId);
  assert.ok(option, `sem opção de ${ownerId}`);
  return option.id;
}

/* ------------------------------------------------------------------ */
/* lobby                                                               */
/* ------------------------------------------------------------------ */

describe('lobby', () => {
  it('join é idempotente: reconectar não duplica nem zera o time', () => {
    let s = createGame('TEST');
    s = act(s, 'p1', { type: 'join', name: 'Ana' });
    s = act(s, 'p1', { type: 'pick-team', team: 'blue' });
    s = act(s, 'p1', { type: 'join', name: 'Ana Maria' });
    assert.equal(s.players.length, 1);
    assert.equal(s.players[0].team, 'blue');
    assert.equal(s.players[0].name, 'Ana Maria');
  });

  it('canStart: 4+ pessoas e os dois times preenchidos', () => {
    assert.equal(canStart(table(2, 1)), false, '3 pessoas');
    assert.equal(canStart(table(4, 0)), false, 'um time vazio');
    assert.equal(canStart(table(1, 3)), true);
    assert.equal(canStart(table(3, 4)), true);

    let s = table(2, 2);
    s = act(s, 'x', { type: 'join', name: 'sem time' });
    assert.equal(canStart(s), true, 'gente sem time não impede');
    assert.equal(host(table(2, 1), { type: 'start-game' }).phase, 'lobby');
  });
});

/* ------------------------------------------------------------------ */
/* mímica / tabu                                                       */
/* ------------------------------------------------------------------ */

describe('mímica e tabu', () => {
  it('contadores por time não misturam os dois turnos', () => {
    let s = playAt(table(2, 2), 0);
    let r = roundOf(s, 'mimica');
    const guesser = r.performerId === 'r1' ? 'r2' : 'r1';
    s = act(s, guesser, { type: 'guess', text: secretWord(s, r.performerId) });
    s = act(s, guesser, { type: 'guess', text: secretWord(s, roundOf(s, 'mimica').performerId) });
    s = next(s); // vez do azul
    r = roundOf(s, 'mimica');
    assert.equal(r.activeTeam, 'blue');
    const blueGuesser = r.performerId === 'b1' ? 'b2' : 'b1';
    s = act(s, blueGuesser, { type: 'guess', text: secretWord(s, r.performerId) });
    r = roundOf(s, 'mimica');
    assert.deepEqual(r.byTeam.red, { scored: 2, penalties: 0, skipped: 0 });
    assert.deepEqual(r.byTeam.blue, { scored: 1, penalties: 0, skipped: 0 });
    assert.equal(r.solvedWords.length, 3, 'o agregado continua existindo');
    assert.deepEqual(s.scores, { red: 2 * POINTS.mimicaCorrect, blue: POINTS.mimicaCorrect });
  });

  it('mímica: quem faz a mímica não chuta; adversário também não', () => {
    const s = playAt(table(2, 2), 0);
    const r = roundOf(s, 'mimica');
    assert.equal(r.activeTeam, 'red');
    assert.ok(r.performerId);
    const word = secretWord(s, r.performerId);
    assert.equal(act(s, r.performerId, { type: 'guess', text: word }), s, 'performer recusado');
    assert.equal(act(s, 'b1', { type: 'guess', text: word }), s, 'adversário recusado');
    assert.equal(s.scores.red, 0);
  });

  it('mímica: pular troca a palavra sem penalidade e conta em byTeam', () => {
    let s = playAt(table(2, 2), 0);
    const before = roundOf(s, 'mimica');
    const performer = before.performerId!;
    const guesser = performer === 'r1' ? 'r2' : 'r1';
    const oldWord = secretWord(s, performer);

    s = act(s, performer, { type: 'mimica-skip' });
    let r = roundOf(s, 'mimica');
    assert.equal(r.wordIndex, before.wordIndex + 1);
    assert.notEqual(secretWord(s, performer), oldWord, 'palavra nova');
    assert.equal(r.lastSkipAt, clock);
    assert.deepEqual(r.byTeam.red, { scored: 0, penalties: 0, skipped: 1 });
    assert.deepEqual(s.scores, { red: 0, blue: 0 }, 'sem penalidade');
    assert.equal(r.solvedWords.length, 0);

    // a palavra pulada não vale mais; a nova vale
    s = act(s, guesser, { type: 'guess', text: oldWord });
    r = roundOf(s, 'mimica');
    assert.equal(r.guesses.at(-1)?.correct, false, 'palavra pulada não vale');
    assert.equal(s.scores.red, 0);
    s = act(s, guesser, { type: 'guess', text: secretWord(s, performer) });
    r = roundOf(s, 'mimica');
    assert.deepEqual(r.byTeam.red, { scored: 1, penalties: 0, skipped: 1 });
    assert.equal(s.scores.red, POINTS.mimicaCorrect);
  });

  it('mímica: pulo de quem não faz a mímica é ignorado', () => {
    const s = playAt(table(2, 2), 0);
    const r = roundOf(s, 'mimica');
    const colleague = r.performerId === 'r1' ? 'r2' : 'r1';
    assert.equal(act(s, colleague, { type: 'mimica-skip' }), s, 'colega');
    assert.equal(act(s, 'b1', { type: 'mimica-skip' }), s, 'adversário');
  });

  it('mímica: pulo repetido em menos de 1s é ignorado', () => {
    let s = playAt(table(2, 2), 0);
    const performer = roundOf(s, 'mimica').performerId!;
    const start = roundOf(s, 'mimica').wordIndex;

    s = act(s, performer, { type: 'mimica-skip' });
    advance(300);
    const again = act(s, performer, { type: 'mimica-skip' });
    assert.equal(again, s, 'toque duplo');
    assert.equal(roundOf(s, 'mimica').wordIndex, start + 1);

    advance(MIMICA_SKIP_DEBOUNCE_MS);
    s = act(s, performer, { type: 'mimica-skip' });
    const r = roundOf(s, 'mimica');
    assert.equal(r.wordIndex, start + 2);
    assert.equal(r.byTeam.red.skipped, 2);

    // o 2o time começa sem debounce herdado
    s = next(s);
    assert.equal(roundOf(s, 'mimica').lastSkipAt, null);
  });

  it('tabu: penalidade repetida em menos de 1500ms é ignorada', () => {
    let s = playAt(table(2, 2), 1);
    const before = roundOf(s, 'tabu');
    assert.equal(before.activeTeam, 'blue');

    s = act(s, 'r1', { type: 'tabu-penalty' });
    advance(400);
    s = act(s, 'r2', { type: 'tabu-penalty' }); // o outro árbitro, mesma infração
    let r = roundOf(s, 'tabu');
    assert.equal(r.penalties, 1);
    assert.equal(r.cardIndex, before.cardIndex + 1, 'pula UMA carta');
    assert.equal(s.scores.blue, POINTS.tabuPenalty);

    advance(TABU_PENALTY_DEBOUNCE_MS);
    s = act(s, 'r2', { type: 'tabu-penalty' });
    r = roundOf(s, 'tabu');
    assert.equal(r.penalties, 2);
    assert.deepEqual(r.byTeam.blue, { scored: 0, penalties: 2, skipped: 0 });
    assert.deepEqual(r.byTeam.red, { scored: 0, penalties: 0, skipped: 0 });
    assert.equal(s.scores.blue, 2 * POINTS.tabuPenalty);

    // quem está jogando não pode se multar
    advance(5000);
    assert.equal(act(s, 'b1', { type: 'tabu-penalty' }), s);
  });
});

/* ------------------------------------------------------------------ */
/* mentiroso                                                           */
/* ------------------------------------------------------------------ */

describe('mentiroso', () => {
  it('rejeita mentira igual (normalizada) à verdade ou à mentira de outro jogador', () => {
    let s = playAt(table(2, 2), 2);
    const truth = at(DECK.mentiroso, roundOf(s, 'mentiroso').questionIndex).truth;

    assert.equal(act(s, 'r1', { type: 'submit-lie', text: `  ${truth.toUpperCase()}!! ` }), s);

    s = act(s, 'r1', { type: 'submit-lie', text: 'Água de coco' });
    assert.equal(act(s, 'b1', { type: 'submit-lie', text: 'agua  de COCO.' }), s, 'cópia do r1');
    assert.equal(roundOf(s, 'mentiroso').lies.length, 1);

    // trocar a PRÓPRIA mentira continua valendo
    s = act(s, 'r1', { type: 'submit-lie', text: 'Suco de caju' });
    assert.deepEqual(roundOf(s, 'mentiroso').lies, [{ playerId: 'r1', text: 'Suco de caju' }]);
    s = act(s, 'b1', { type: 'submit-lie', text: 'agua de coco' });
    assert.equal(roundOf(s, 'mentiroso').lies.length, 2, 'agora está livre');
  });

  it('voto na mentira de colega não pontua; votar na própria mentira é impossível', () => {
    let s = playAt(table(2, 2), 2);
    s = act(s, 'r1', { type: 'submit-lie', text: 'mentira do r1' });
    s = act(s, 'b1', { type: 'submit-lie', text: 'mentira do b1' });
    s = next(s); // voting

    assert.equal(act(s, 'r1', { type: 'vote', optionId: optionOf(s, 'r1') }), s, 'própria mentira');

    s = act(s, 'r2', { type: 'vote', optionId: optionOf(s, 'r1') }); // colega: 0
    s = act(s, 'b2', { type: 'vote', optionId: optionOf(s, 'r1') }); // adversário: +75 red
    s = act(s, 'b1', { type: 'vote', optionId: optionOf(s, null) }); // verdade: +100 blue
    const voted = s;
    s = act(s, 'b1', { type: 'vote', optionId: optionOf(s, 'r1') });
    assert.equal(s, voted, 'voto é único');

    s = next(s); // reveal + pontuação
    assert.equal(roundOf(s, 'mentiroso').stage, 'reveal');
    assert.deepEqual(s.scores, {
      red: POINTS.mentirosoVoteReceived,
      blue: POINTS.mentirosoFoundTruth,
    });
  });

  it('joga 3 perguntas em sequência antes de fechar a rodada', () => {
    let s = playAt(table(2, 2), 2);
    const first = roundOf(s, 'mentiroso').questionIndex;
    for (let q = 1; q <= MENTIROSO_TOTAL_QUESTIONS; q++) {
      const r = roundOf(s, 'mentiroso');
      assert.equal(r.questionNumber, q);
      assert.equal(r.totalQuestions, MENTIROSO_TOTAL_QUESTIONS);
      assert.equal(r.questionIndex, first + q - 1);
      assert.equal(r.stage, 'writing');
      assert.deepEqual([r.lies, r.options, r.votes], [[], [], {}], 'pergunta nova começa limpa');
      s = act(s, 'r1', { type: 'submit-lie', text: `lorota ${q}` });
      s = next(s);
      assert.equal(roundOf(s, 'mentiroso').stage, 'voting');
      s = next(s);
      assert.equal(roundOf(s, 'mentiroso').stage, 'reveal');
      s = next(s);
    }
    assert.equal(s.phase, 'round-result');
  });
});

/* ------------------------------------------------------------------ */
/* leilão                                                              */
/* ------------------------------------------------------------------ */

describe('leilão', () => {
  it('lance vale de 1 a 10 e qualquer membro pode subir OU baixar', () => {
    let s = playAt(table(2, 2), 3);
    s = act(s, 'r1', { type: 'bid', amount: 99 });
    assert.equal(roundOf(s, 'leilao').bids.red, 10);
    s = act(s, 'r2', { type: 'bid', amount: 4 });
    assert.equal(roundOf(s, 'leilao').bids.red, 4, 'colega baixou');
    s = act(s, 'r1', { type: 'bid', amount: -3 });
    assert.equal(roundOf(s, 'leilao').bids.red, 1);
    assert.equal(act(s, 'r1', { type: 'bid', amount: Number.NaN }), s);
    assert.deepEqual(roundOf(s, 'leilao').hasBid, { red: true, blue: false });
  });

  it('empate: vence quem deu o lance final PRIMEIRO', () => {
    let s = playAt(table(2, 2), 3);
    s = act(s, 'r1', { type: 'bid', amount: 8 });
    advance(1000);
    s = act(s, 'b1', { type: 'bid', amount: 6 }); // azul chega no 6 primeiro
    advance(1000);
    s = act(s, 'r2', { type: 'bid', amount: 6 }); // vermelho baixa pra 6 depois
    advance(1000);
    const same = act(s, 'b2', { type: 'bid', amount: 6 }); // repetir não renova o horário
    assert.equal(same, s);
    s = next(s);
    const r = roundOf(s, 'leilao');
    assert.equal(r.stage, 'challenge');
    assert.equal(r.winner, 'blue');
    assert.equal(r.target, 6);
  });

  it('challenge fecha ao bater o target e vai direto pro julgamento', () => {
    let s = playAt(table(2, 2), 3);
    s = act(s, 'r1', { type: 'bid', amount: 3 });
    s = next(s);
    s = act(s, 'r1', { type: 'submit-answer', text: 'maçã' });
    s = act(s, 'r2', { type: 'submit-answer', text: 'MACA' }); // duplicada
    s = act(s, 'b1', { type: 'submit-answer', text: 'intruso' }); // time errado
    s = act(s, 'r2', { type: 'submit-answer', text: 'pera' });
    assert.equal(roundOf(s, 'leilao').stage, 'challenge');
    s = act(s, 'r1', { type: 'submit-answer', text: 'uva' });
    let r = roundOf(s, 'leilao');
    assert.equal(r.stage, 'judging');
    assert.deepEqual(r.answers, ['maçã', 'pera', 'uva']);
    assert.equal(act(s, 'r1', { type: 'submit-answer', text: 'kiwi' }), s, 'não entra mais nada');

    for (let i = 0; i < 3; i++) s = act(s, 'b1', { type: 'judge', index: i, accepted: true });
    s = next(s);
    assert.equal(s.scores.red, 3 * POINTS.leilaoPerTarget);
    r = roundOf(s, 'leilao');
    assert.equal(r.categoryNumber, 2, 'segunda categoria');
    assert.equal(r.stage, 'bidding');
    assert.deepEqual(r.bids, { red: null, blue: null });
  });

  it('joga 2 categorias; categoria sem lance nenhum é pulada', () => {
    let s = playAt(table(2, 2), 3);
    const first = roundOf(s, 'leilao');
    assert.equal(first.totalCategories, LEILAO_TOTAL_CATEGORIES);
    s = next(s); // ninguém apostou
    const second = roundOf(s, 'leilao');
    assert.equal(second.categoryNumber, 2);
    assert.equal(second.categoryIndex, first.categoryIndex + 1);
    s = next(s);
    assert.equal(s.phase, 'round-result');
    assert.deepEqual(s.scores, { red: 0, blue: 0 });
  });

  it('lance secreto: o estado público não carrega valores durante o bidding', () => {
    let s = playAt(table(2, 2), 3);
    s = act(s, 'r1', { type: 'bid', amount: 7 });
    s = act(s, 'b1', { type: 'bid', amount: 9 });

    const pub = toPublicState(s, 123);
    assert.equal(pub.now, 123);
    const pr = roundOf(pub, 'leilao');
    assert.deepEqual(pr.bids, { red: null, blue: null });
    assert.deepEqual(pr.bidAt, { red: null, blue: null });
    assert.deepEqual(pr.hasBid, { red: true, blue: true });
    assert.ok(Object.values(pub.secrets).every((x) => x.kind === 'none'));
    assert.ok(!/"amount"|[^0-9][79][^0-9]/.test(JSON.stringify({ r: pub.round, s: pub.secrets })));

    // cada jogador recebe, endereçado, só o lance do PRÓPRIO time
    const mine = Object.fromEntries(privateSecrets(s).map((x) => [x.playerId, x.secret]));
    assert.deepEqual(mine.r2, { kind: 'leilao-bid', amount: 7 });
    assert.deepEqual(mine.b2, { kind: 'leilao-bid', amount: 9 });

    // martelo batido: os lances aparecem
    s = next(s);
    assert.deepEqual(roundOf(toPublicState(s), 'leilao').bids, { red: 7, blue: 9 });
    assert.deepEqual(privateSecrets(s), []);
  });
});

/* ------------------------------------------------------------------ */
/* telefone sem fio                                                    */
/* ------------------------------------------------------------------ */

const TELEFONE_ROUND = ROUND_ORDER.indexOf('telefone');

function tele(s: GameState) {
  return roundOf(s, 'telefone');
}

/** Todo mundo entrega no passo atual (frase ou emojis conforme o passo) e o host avança. */
function playStep(s: GameState, textFor?: (id: string, chain: number) => string): GameState {
  const r = tele(s);
  const n = r.order.length;
  r.order.forEach((id, position) => {
    const chain = telefoneChainFor(position, r.step, n);
    // frase única por autor (sem palavra em comum: corrente "não sobrevive" por padrão)
    const text = textFor ? textFor(id, chain) : r.step % 2 === 1 ? '🍕🔥' : `${id}${id}${id}`;
    s = act(s, id, { type: 'telefone-submit', text });
  });
  assert.equal(telefoneAllSubmitted(tele(s)), true, 'todos entregaram');
  return next(s);
}

/** Passa por todo o reveal (um passo por vez) até a votação. */
function revealAll(s: GameState): GameState {
  for (let guard = 0; guard < 100; guard++) {
    if (tele(s).stage !== 'reveal') return s;
    s = next(s);
  }
  throw new Error('reveal não terminou');
}

describe('telefone sem fio', () => {
  it('é a 5ª rodada, sem multiplicador; a final continua sendo a única 3x', () => {
    assert.equal(TOTAL_ROUNDS, 7);
    assert.deepEqual([...ROUND_ORDER], ['mimica', 'tabu', 'mentiroso', 'leilao', 'telefone', 'detetive', 'relampago']);
    assert.equal(TELEFONE_ROUND, 4);
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(multiplierFor), [1, 1, 1, 1, 1, 1, 3]);
    const s = playAt(table(2, 2), TELEFONE_ROUND);
    assert.equal(s.multiplier, 1);
    assert.equal(tele(s).stage, 'writing');
  });

  for (const [red, blue, steps] of [
    [2, 2, 3],
    [3, 4, 5],
  ] as const) {
    it(`rotação ${red + blue} jogadores / ${steps} passos: ninguém repete corrente, 1 lance por corrente por passo`, () => {
      let s = playAt(table(red, blue), TELEFONE_ROUND);
      s = act(s, 'x', { type: 'join', name: 'espectador' }); // sem time: fica de fora
      const r0 = tele(s);
      const n = red + blue;
      assert.equal(r0.order.length, n);
      assert.equal(r0.steps, steps);
      assert.equal(r0.chains.length, n);
      assert.ok(!r0.order.includes('x'));
      assert.equal(new Set(r0.order).size, n, 'ordem sem repetição');
      r0.chains.forEach((c, i) => {
        assert.equal(c.starterId, r0.order[i]);
        assert.equal(c.starterTeam, r0.order[i].startsWith('r') ? 'red' : 'blue');
        assert.ok(c.suggestion.startsWith('Começo '));
      });

      const visited = new Map<string, Set<number>>();
      for (let k = 0; k < steps; k++) {
        const r = tele(s);
        assert.equal(r.step, k);
        // a tarefa de cada um aponta pra corrente (i + k) mod N e traz só o lance anterior
        r.order.forEach((id, position) => {
          const expected = (position + k) % n;
          const secret = s.secrets[id];
          assert.ok(secret.kind === 'telefone-task', `${id} tem tarefa`);
          assert.equal(secret.chainIndex, expected);
          assert.equal(secret.step, k);
          assert.equal(secret.mode, k % 2 === 1 ? 'emoji' : 'phrase');
          if (k === 0) {
            assert.equal(secret.input, null);
            assert.equal(secret.starter, r.chains[expected].suggestion);
          } else {
            assert.equal(secret.input, r.chains[expected].entries[k - 1].text);
            assert.equal(secret.starter, null);
          }
          const seen = visited.get(id) ?? new Set<number>();
          assert.ok(!seen.has(expected), `${id} repetiu a corrente ${expected}`);
          seen.add(expected);
          visited.set(id, seen);
        });
        assert.equal(s.secrets.x.kind, 'none', 'espectador não recebe tarefa');
        assert.equal(act(s, 'x', { type: 'telefone-submit', text: 'intruso na corrente' }), s);
        s = playStep(s);
      }
      const done = tele(s);
      assert.equal(done.stage, 'reveal');
      for (const c of done.chains) {
        assert.equal(c.entries.length, steps, 'exatamente 1 lance por passo');
        c.entries.forEach((e, k) => {
          assert.equal(e.mode, k % 2 === 1 ? 'emoji' : 'phrase');
          assert.equal(e.auto, false);
          assert.equal(done.order.indexOf(e.playerId) >= 0, true);
        });
        assert.equal(new Set(c.entries.map((e) => e.playerId)).size, steps, 'pessoas diferentes em cada passo');
      }
    });
  }

  it('validação: emoji aceita só emojis (1 a 12); frase de 3 a 120 caracteres', () => {
    assert.equal(validateTelefoneText('🍕🔥 👨‍👩‍👧', 'emoji'), '🍕🔥 👨‍👩‍👧');
    assert.equal(validateTelefoneText('🇧🇷', 'emoji'), '🇧🇷');
    assert.equal(validateTelefoneText('1️⃣', 'emoji'), '1️⃣');
    assert.equal(validateTelefoneText('  👍🏽  ❤️‍🔥 ', 'emoji'), '👍🏽 ❤️‍🔥');
    assert.equal(validateTelefoneText('abc', 'emoji'), null);
    assert.equal(validateTelefoneText('🍕 legal', 'emoji'), null);
    assert.equal(validateTelefoneText('', 'emoji'), null);
    assert.equal(validateTelefoneText('   ', 'emoji'), null);
    assert.equal(validateTelefoneText('😀'.repeat(13), 'emoji'), null);
    assert.equal(validateTelefoneText('😀'.repeat(12), 'emoji'), '😀'.repeat(12));
    assert.equal(validateTelefoneText('ab', 'phrase'), null);
    assert.equal(validateTelefoneText('  ab ', 'phrase'), null);
    assert.equal(validateTelefoneText('abc', 'phrase'), 'abc');
    assert.equal(validateTelefoneText('  o   gato  ', 'phrase'), 'o gato');
    assert.equal(validateTelefoneText('x'.repeat(121), 'phrase'), null);

    // no engine, não só na UI: passo 0 é frase, passo 1 é emoji
    let s = playAt(table(2, 2), TELEFONE_ROUND);
    assert.equal(act(s, 'r1', { type: 'telefone-submit', text: 'ab' }), s, 'frase de 2 chars');
    assert.equal(act(s, 'r1', { type: 'telefone-submit', text: '🍕' }), s, 'emoji no passo de frase (1 char)');
    s = act(s, 'r1', { type: 'telefone-submit', text: 'primeira versão' });
    s = act(s, 'r1', { type: 'telefone-submit', text: 'segunda versão' }); // reenvio substitui
    const chain0 = telefoneChainFor(tele(s).order.indexOf('r1'), 0, 4);
    assert.deepEqual(tele(s).chains[chain0].entries, [
      { playerId: 'r1', text: 'segunda versão', mode: 'phrase', auto: false },
    ]);
    s = playStep(s);
    assert.equal(tele(s).step, 1);
    assert.equal(act(s, 'r1', { type: 'telefone-submit', text: 'abc' }), s, 'letras no passo de emoji');
    assert.equal(act(s, 'r1', { type: 'telefone-submit', text: '🍕 legal' }), s);
    assert.equal(act(s, 'r1', { type: 'telefone-submit', text: '😀'.repeat(13) }), s);
    assert.notEqual(act(s, 'r1', { type: 'telefone-submit', text: '🍕🔥 👨‍👩‍👧' }), s);
  });

  it('prazo estourado: quem não entregou recebe lance automático; tick avança', () => {
    let s = playAt(table(2, 2), TELEFONE_ROUND);
    s = act(s, 'r1', { type: 'telefone-submit', text: 'só o r1 entregou' });
    assert.equal(host(s, { type: 'tick' }), s, 'antes do prazo o tick não faz nada');
    advance(DURATIONS.telefone.step + 1);
    s = host(s, { type: 'tick' });
    let r = tele(s);
    assert.equal(r.step, 1);
    assert.equal(r.deadline, clock + DURATIONS.telefone.step);
    for (const c of r.chains) {
      const e = c.entries[0];
      if (e.playerId === 'r1') assert.deepEqual(e, { playerId: 'r1', text: 'só o r1 entregou', mode: 'phrase', auto: false });
      else assert.deepEqual(e, { playerId: e.playerId, text: TELEFONE_AUTO_PHRASE, mode: 'phrase', auto: true });
    }
    // passo de emoji: automático é 🤷
    advance(DURATIONS.telefone.step + 1);
    s = host(s, { type: 'tick' });
    r = tele(s);
    assert.equal(r.step, 2);
    assert.ok(r.chains.every((c) => c.entries[1].text === TELEFONE_AUTO_EMOJI && c.entries[1].auto));
    // último passo estourado: vai pro reveal
    advance(DURATIONS.telefone.step + 1);
    s = host(s, { type: 'tick' });
    r = tele(s);
    assert.equal(r.stage, 'reveal');
    assert.deepEqual([r.revealChain, r.revealStep], [0, 0]);
    assert.equal(r.survived.length, 4);
    // reveal anda sozinho a cada 4s e um passo por vez no next-phase
    assert.equal(host(s, { type: 'tick' }), s);
    advance(DURATIONS.telefone.reveal + 1);
    s = host(s, { type: 'tick' });
    assert.deepEqual([tele(s).revealChain, tele(s).revealStep], [0, 1]);
    s = next(s);
    assert.deepEqual([tele(s).revealChain, tele(s).revealStep], [0, 2]);
    s = next(s);
    assert.deepEqual([tele(s).revealChain, tele(s).revealStep], [1, 0]);
    s = revealAll(s);
    assert.equal(tele(s).stage, 'voting');
    // votação estourada sem votos: resultado sem bônus, depois fecha a rodada
    advance(DURATIONS.telefone.voting + 1);
    s = host(s, { type: 'tick' });
    assert.equal(tele(s).stage, 'result');
    assert.deepEqual(tele(s).ranking, []);
    assert.deepEqual(s.scores, { red: 0, blue: 0 });
    advance(DURATIONS.telefone.result + 1);
    s = host(s, { type: 'tick' });
    assert.equal(s.phase, 'round-result');
  });

  it('sobrevivência: >= 50% das palavras significativas (4+ letras) da frase inicial', () => {
    const chain = (first: string, last: string, auto = false) => ({
      starterId: 'r1',
      starterTeam: 'red' as const,
      suggestion: '',
      entries: [
        { playerId: 'r1', text: first, mode: 'phrase' as const, auto: false },
        { playerId: 'b1', text: '🍕', mode: 'emoji' as const, auto: false },
        { playerId: 'r2', text: last, mode: 'phrase' as const, auto },
      ],
    });
    assert.equal(telefoneSurvived(chain('O gato subiu no telhado', 'O gato subiu no telhado')), true, 'igual');
    assert.equal(telefoneSurvived(chain('O gato subiu no telhado', 'o GATO caiu do TELHADO!')), true, 'igual normalizada');
    // significativas: gato, subiu, telhado, madrugada (4) — 2 de 4 = 50%
    assert.equal(telefoneSurvived(chain('O gato subiu no telhado de madrugada', 'um gato no telhado')), true, '50%');
    // 1 de 4 = 25%
    assert.equal(telefoneSurvived(chain('O gato subiu no telhado de madrugada', 'um gato na chuva')), false, 'abaixo de 50%');
    assert.equal(telefoneSurvived(chain('O gato subiu no telhado', 'pizza com abacaxi')), false, 'nada em comum');
    assert.equal(telefoneSurvived(chain('O gato subiu no telhado', 'O gato subiu no telhado', true)), false, 'ponta automática não conta');
    assert.equal(telefoneSurvived(chain('eu vi o sol', 'eu vi o sol')), true, 'sem palavra de 4+ letras: compara tudo');
  });

  it('votação e pontuação: 200 pra mais votada, 100 pra segunda, 75 por sobrevivente pra cada time', () => {
    let s = playAt(table(3, 4), TELEFONE_ROUND); // 7 pessoas, 5 passos
    const r0 = tele(s);
    assert.equal(r0.order.length, 7);
    // corrente 0 sobrevive (frase final igual), as outras não
    const phraseFor = (id: string, chain: number) => (chain === 0 ? 'A vaca foi pro brejo' : `${id}${id}${id}`);
    for (let k = 0; k < 5; k++) s = playStep(s, (id, chain) => (k % 2 === 1 ? '🐄' : phraseFor(id, chain)));
    let r = tele(s);
    assert.equal(r.stage, 'reveal');
    assert.equal(r.survived[0], true);
    assert.ok(r.survived.slice(1).every((x) => !x));
    s = revealAll(s);
    r = tele(s);
    assert.equal(r.stage, 'voting');

    const starterOf = (chain: number) => r0.order[chain];
    const voters = r0.order;
    // quem começou a corrente 0 não pode votar nela
    assert.equal(act(s, starterOf(0), { type: 'telefone-vote', chainIndex: 0 }), s, 'própria corrente');
    assert.equal(act(s, voters[0], { type: 'telefone-vote', chainIndex: 99 }), s, 'corrente inexistente');
    assert.equal(act(s, 'x', { type: 'telefone-vote', chainIndex: 1 }), s, 'espectador');
    // corrente 1 recebe 3 votos, corrente 2 recebe 2, corrente 3 recebe 1 (ninguém vota na própria)
    const plan = new Map<string, number>();
    for (const target of [1, 1, 1, 2, 2, 3]) {
      const voter = voters.find((id) => !plan.has(id) && starterOf(target) !== id);
      assert.ok(voter);
      plan.set(voter, target);
    }
    for (const [voter, target] of plan) s = act(s, voter, { type: 'telefone-vote', chainIndex: target });
    const voted = s;
    const [firstVoter] = plan.keys();
    assert.equal(act(s, firstVoter, { type: 'telefone-vote', chainIndex: 2 }), voted, 'voto é único');

    s = next(s);
    r = tele(s);
    assert.equal(r.stage, 'result');
    assert.deepEqual(r.ranking, [1, 2, 3]);
    const expected = { red: 75, blue: 75 };
    expected[r0.chains[1].starterTeam] += POINTS.telefoneFirst;
    expected[r0.chains[2].starterTeam] += POINTS.telefoneSecond;
    assert.deepEqual(s.scores, expected);
    s = next(s);
    assert.equal(s.phase, 'round-result');
    assert.deepEqual(s.roundLog.at(-1)?.kind, 'telefone');
  });

  it('empate em 1º: todas levam 200 e não há 2º', () => {
    let s = playAt(table(2, 2), TELEFONE_ROUND);
    const order = tele(s).order;
    for (let k = 0; k < 3; k++) s = playStep(s);
    s = revealAll(s);
    assert.equal(tele(s).stage, 'voting');
    // correntes 0 e 1 com 1 voto cada, corrente 2 com 1 voto também? não: 0 e 1 empatam, 2 fica sem voto
    const starter = (c: number) => order[c];
    const voterFor = (c: number, used: Set<string>) => order.find((id) => id !== starter(c) && !used.has(id))!;
    const used = new Set<string>();
    const v0 = voterFor(0, used); used.add(v0);
    const v1 = voterFor(1, used); used.add(v1);
    s = act(s, v0, { type: 'telefone-vote', chainIndex: 0 });
    s = act(s, v1, { type: 'telefone-vote', chainIndex: 1 });
    s = next(s);
    const r = tele(s);
    assert.deepEqual(r.ranking, [0, 1]);
    const survivors = r.survived.filter(Boolean).length; // frases diferentes em cada passo: 0
    assert.equal(survivors, 0);
    const expected = { red: 0, blue: 0 };
    expected[r.chains[0].starterTeam] += POINTS.telefoneFirst;
    expected[r.chains[1].starterTeam] += POINTS.telefoneFirst;
    assert.deepEqual(s.scores, expected);
  });

  it('estado público: nenhum texto de corrente (nem sugestão, nem tarefa) sai no broadcast durante o writing', () => {
    let s = playAt(table(2, 2), TELEFONE_ROUND);
    s = act(s, 'r1', { type: 'telefone-submit', text: 'segredo absoluto do r1' });
    s = playStep(s, () => 'texto secretíssimo da corrente');
    s = act(s, 'b1', { type: 'telefone-submit', text: '🍕🔥' });

    const pub = toPublicState(s, 123);
    const pr = roundOf(pub, 'telefone');
    const json = JSON.stringify({ r: pub.round, s: pub.secrets });
    assert.ok(!/secret|Começo|🍕/.test(json), 'sem texto no público: ' + json.slice(0, 200));
    assert.ok(pr.chains.every((c) => c.suggestion === '' && c.entries.every((e) => e.text === '')));
    assert.ok(Object.values(pub.secrets).every((x) => x.kind === 'none'));
    // progresso continua visível: quem já entregou o passo atual
    const done = pr.chains.filter((c) => c.entries[1]).map((c) => c.entries[1].playerId);
    assert.deepEqual(done, ['b1']);
    assert.equal(pr.chains.every((c) => c.entries[0]?.playerId), true);

    // a tarefa vai endereçada, uma por participante
    const mine = privateSecrets(s);
    assert.equal(mine.length, 4);
    for (const { playerId, secret } of mine) {
      assert.equal(secret.kind, 'telefone-task');
      assert.ok(secret.kind === 'telefone-task' && secret.step === 1 && secret.mode === 'emoji');
      assert.ok(secret.kind === 'telefone-task' && secret.input === 'texto secretíssimo da corrente');
      assert.ok(tele(s).order.includes(playerId));
    }

    // no reveal as correntes viram públicas e não há mais segredo endereçado
    s = playStep(s, () => '🐄');
    s = playStep(s, () => 'frase final qualquer');
    assert.equal(tele(s).stage, 'reveal');
    assert.equal(roundOf(toPublicState(s), 'telefone').chains[0].entries[0].text, 'texto secretíssimo da corrente');
    assert.deepEqual(privateSecrets(s), []);
  });
});

/* ------------------------------------------------------------------ */
/* detetive                                                            */
/* ------------------------------------------------------------------ */

describe('detetive da casa', () => {
  it('entrega personagens em segredo, libera pistas e pontua quem encontra o responsável', () => {
    let s = playAt(table(2, 2), 5);
    let r = roundOf(s, 'detetive');
    assert.equal(r.stage, 'investigation');
    assert.equal(r.revealedClues, 1);
    assert.ok(r.culpritId);

    const publicState = toPublicState(s);
    assert.equal(roundOf(publicState, 'detetive').culpritId, null);
    assert.ok(Object.values(publicState.secrets).every((secret) => secret.kind === 'none'));
    assert.equal(privateSecrets(s).length, 4);
    assert.ok(privateSecrets(s).every(({ secret }) => secret.kind === 'detetive-role'));

    s = next(s); // discussão: mais uma pista
    r = roundOf(s, 'detetive');
    assert.equal(r.stage, 'discussion');
    assert.equal(r.revealedClues, 2);
    s = next(s); // votação
    r = roundOf(s, 'detetive');
    assert.equal(r.stage, 'voting');

    const culprit = r.culpritId!;
    const fallback = r.order.find((id) => id !== culprit)!;
    for (const id of r.order) {
      s = act(s, id, { type: 'detetive-vote', accusedId: id === culprit ? fallback : culprit });
    }
    s = next(s);
    r = roundOf(s, 'detetive');
    assert.equal(r.stage, 'reveal');
    assert.equal(r.culpritId, culprit);
    assert.equal(s.scores.red + s.scores.blue, 3 * POINTS.detetiveFound);

    s = next(s);
    assert.equal(s.phase, 'round-result');
  });
});

/* ------------------------------------------------------------------ */
/* relâmpago                                                           */
/* ------------------------------------------------------------------ */

describe('relâmpago', () => {
  it('pontua a MÉDIA do time (1x3) e aplica 3x', () => {
    let s = playAt(table(1, 3), 6);
    const before = { ...s.scores };
    assert.equal(s.multiplier, 3);
    const r = roundOf(s, 'relampago');
    assert.equal(r.totalQuestions, RELAMPAGO_TOTAL_QUESTIONS);
    assert.equal(RELAMPAGO_TOTAL_QUESTIONS, 6);
    const right = at(DECK.relampago, r.questionIndex).answerIndex;
    const wrong = (right + 1) % 4;

    s = act(s, 'r1', { type: 'answer-choice', choice: right }); // na hora: 150
    s = act(s, 'b1', { type: 'answer-choice', choice: right }); // na hora: 150
    advance(6000);
    s = act(s, 'b2', { type: 'answer-choice', choice: wrong }); // errou: 0
    // b3 não responde: 0
    s = next(s);

    // vermelho: média de [150] = 150 -> x3 = 450
    // azul: média de [150, 0, 0] = 50 -> x3 = 150  (na regra antiga, por jogador, daria 450 x 450)
    assert.deepEqual(s.scores, { red: before.red + 450, blue: before.blue + 150 });
  });

  it('teto teórico da final: 6 x 150 x 3 = 2700, independente do tamanho do time', () => {
    let s = playAt(table(3, 4), 6);
    const before = { ...s.scores };
    for (let q = 0; q < RELAMPAGO_TOTAL_QUESTIONS; q++) {
      const right = at(DECK.relampago, roundOf(s, 'relampago').questionIndex).answerIndex;
      for (const p of s.players) s = act(s, p.id, { type: 'answer-choice', choice: right });
      s = next(s); // reveal
      s = next(s); // próxima pergunta / fim
    }
    assert.equal(s.phase, 'round-result');
    assert.deepEqual(s.scores, { red: before.red + 2700, blue: before.blue + 2700 });
  });
});

/* ------------------------------------------------------------------ */
/* torneio completo                                                    */
/* ------------------------------------------------------------------ */

describe('torneio completo (3 x 4)', () => {
  it('o placar final bate com o cálculo esperado, rodada a rodada', () => {
    let s = host(table(3, 4), { type: 'start-game' });
    let telefoneDelta = { red: 0, blue: 0 };
    const detectiveDelta = { red: 0, blue: 0 };
    const guessRight = (st: GameState): GameState => {
      const r = st.round;
      assert.ok(r && (r.kind === 'mimica' || r.kind === 'tabu'));
      const performer = r.kind === 'mimica' ? r.performerId : r.clueGiverId;
      const guesser = st.players.find((p) => p.team === r.activeTeam && p.id !== performer);
      assert.ok(guesser);
      return act(st, guesser.id, { type: 'guess', text: secretWord(st, performer) });
    };

    /* R1 mímica — vermelho começa: 2 acertos e 1 pulo (+1 no debounce); azul: 1 */
    s = next(s);
    s = guessRight(guessRight(s));
    s = act(s, 'r1', { type: 'guess', text: 'chute errado' });
    s = act(s, 'b1', { type: 'guess', text: 'não é a vez dele' });
    const performer = roundOf(s, 'mimica').performerId!;
    s = act(s, performer, { type: 'guess', text: secretWord(s, performer) }); // ignorado
    s = act(s, performer, { type: 'mimica-skip' });
    advance(200);
    s = act(s, performer, { type: 'mimica-skip' }); // toque duplo: ignorado
    assert.equal(roundOf(s, 'mimica').byTeam.red.skipped, 1);
    s = next(s);
    s = guessRight(s);
    s = next(s);
    assert.deepEqual(s.roundLog[0].delta, { red: 300, blue: 150 });

    /* R2 tabu — azul começa: 3 acertos, 2 infrações (uma terceira cai no debounce); vermelho: 2 */
    s = next(next(s));
    assert.equal(roundOf(s, 'tabu').activeTeam, 'blue');
    s = guessRight(guessRight(guessRight(s)));
    s = act(s, 'r1', { type: 'tabu-penalty' });
    advance(500);
    s = act(s, 'r2', { type: 'tabu-penalty' }); // ignorada
    advance(2000);
    s = act(s, 'r3', { type: 'tabu-penalty' });
    s = next(s);
    s = guessRight(guessRight(s));
    s = next(s);
    assert.deepEqual(s.roundLog[1].delta, { red: 200, blue: 200 });

    /* R3 mentiroso — 3 perguntas */
    s = next(next(s));
    // P1: todos mentem
    for (const p of s.players) s = act(s, p.id, { type: 'submit-lie', text: `lorota de ${p.id}` });
    s = next(s);
    s = act(s, 'r1', { type: 'vote', optionId: optionOf(s, null) }); // +100 red
    s = act(s, 'r2', { type: 'vote', optionId: optionOf(s, 'b1') }); // +75 blue
    s = act(s, 'r3', { type: 'vote', optionId: optionOf(s, 'r1') }); // colega: 0
    s = act(s, 'b1', { type: 'vote', optionId: optionOf(s, null) }); // +100 blue
    s = act(s, 'b2', { type: 'vote', optionId: optionOf(s, 'r1') }); // +75 red
    s = act(s, 'b3', { type: 'vote', optionId: optionOf(s, 'r2') }); // +75 red
    s = act(s, 'b4', { type: 'vote', optionId: optionOf(s, 'b1') }); // colega: 0
    s = next(next(s)); // reveal -> P2
    // P2: só r1 e b1 mentem
    assert.equal(roundOf(s, 'mentiroso').questionNumber, 2);
    s = act(s, 'r1', { type: 'submit-lie', text: 'segunda do r1' });
    s = act(s, 'b1', { type: 'submit-lie', text: 'segunda do b1' });
    s = next(s);
    s = act(s, 'r1', { type: 'vote', optionId: optionOf(s, null) }); // +100 red
    s = act(s, 'b1', { type: 'vote', optionId: optionOf(s, null) }); // +100 blue
    s = act(s, 'r2', { type: 'vote', optionId: optionOf(s, 'b1') }); // +75 blue
    s = act(s, 'b2', { type: 'vote', optionId: optionOf(s, 'r1') }); // +75 red
    s = next(next(s)); // reveal -> P3
    // P3: ninguém mente; todo mundo acha a verdade (3 x 100 e 4 x 100)
    assert.equal(roundOf(s, 'mentiroso').questionNumber, 3);
    s = next(s);
    for (const p of s.players) s = act(s, p.id, { type: 'vote', optionId: optionOf(s, null) });
    s = next(next(s));
    assert.equal(s.phase, 'round-result');
    assert.deepEqual(s.roundLog[2].delta, { red: 250 + 175 + 300, blue: 175 + 175 + 400 });

    /* R4 leilão — 2 categorias */
    s = next(next(s));
    // C1: 5 x 5, vermelho apostou primeiro -> vermelho encara e cumpre: +250
    s = act(s, 'r1', { type: 'bid', amount: 5 });
    advance(1000);
    s = act(s, 'b1', { type: 'bid', amount: 7 });
    advance(1000);
    s = act(s, 'b2', { type: 'bid', amount: 5 });
    s = next(s);
    assert.equal(roundOf(s, 'leilao').winner, 'red');
    for (const fruit of ['uva', 'pera', 'kiwi', 'manga', 'caju']) {
      s = act(s, 'r2', { type: 'submit-answer', text: fruit });
    }
    assert.equal(roundOf(s, 'leilao').stage, 'judging');
    for (let i = 0; i < 5; i++) s = act(s, 'b3', { type: 'judge', index: i, accepted: true });
    s = next(s);
    // C2: azul 4 x 3, azul encara, manda só 2 -> falha: +200 pro vermelho
    assert.equal(roundOf(s, 'leilao').categoryNumber, 2);
    s = act(s, 'b1', { type: 'bid', amount: 4 });
    s = act(s, 'r1', { type: 'bid', amount: 3 });
    s = next(s);
    assert.equal(roundOf(s, 'leilao').winner, 'blue');
    s = act(s, 'b1', { type: 'submit-answer', text: 'Lima' });
    s = act(s, 'b2', { type: 'submit-answer', text: 'Quito' });
    s = next(s); // tempo do desafio acabou
    s = act(s, 'r1', { type: 'judge', index: 0, accepted: true });
    s = act(s, 'r1', { type: 'judge', index: 1, accepted: true });
    s = next(s);
    assert.equal(s.phase, 'round-result');
    assert.deepEqual(s.roundLog[3].delta, { red: 450, blue: 0 });

    /* R5 telefone sem fio — 7 pessoas, 5 passos; r3 deixa o prazo do passo 2 estourar */
    s = next(next(s));
    assert.equal(s.multiplier, 1, 'o telefone não é a final');
    {
      const r0 = tele(s);
      assert.equal(r0.steps, 5);
      const chainOf = (id: string, step: number) => telefoneChainFor(r0.order.indexOf(id), step, 7);
      // corrente 0 sobrevive (frase inicial e final iguais); as outras viram frases únicas por autor
      const phrase = (id: string, chain: number) => (chain === 0 ? 'Cachorro comeu o bolo da festa' : `${id}${id}${id}`);
      const emoji = (id: string) => (id.startsWith('r') ? '🐶🎂' : '🎉🍰 🐕');
      for (let k = 0; k < 5; k++) {
        const r = tele(s);
        assert.equal(r.step, k);
        for (const id of r.order) {
          if (k === 2 && id === 'r3') continue; // r3 dorme no ponto
          s = act(s, id, { type: 'telefone-submit', text: k % 2 === 1 ? emoji(id) : phrase(id, chainOf(id, k)) });
        }
        if (k === 2) {
          assert.equal(telefoneAllSubmitted(tele(s)), false);
          advance(DURATIONS.telefone.step + 1);
          s = host(s, { type: 'tick' });
          const filled = tele(s).chains[chainOf('r3', 2)].entries[2];
          assert.deepEqual(filled, { playerId: 'r3', text: TELEFONE_AUTO_PHRASE, mode: 'phrase', auto: true });
        } else {
          assert.equal(telefoneAllSubmitted(tele(s)), true);
          s = next(s);
        }
      }
      let r = tele(s);
      assert.equal(r.stage, 'reveal');
      // o lance automático caiu no meio (passo 2), não nas pontas: a corrente 0 sobrevive
      assert.equal(r.survived[0], true);
      assert.equal(r.survived.filter(Boolean).length, 1);
      s = revealAll(s);
      r = tele(s);
      assert.equal(r.stage, 'voting');
      // votos: 3 na corrente 1, 2 na corrente 2, 1 na 3; b4 não vota
      const starter = (c: number) => r0.order[c];
      const plan = new Map<string, number>();
      for (const target of [1, 1, 1, 2, 2, 3]) {
        const voter = r0.order.find((id) => id !== 'b4' && !plan.has(id) && starter(target) !== id);
        assert.ok(voter);
        plan.set(voter, target);
      }
      for (const [voter, target] of plan) s = act(s, voter, { type: 'telefone-vote', chainIndex: target });
      s = next(s);
      r = tele(s);
      assert.equal(r.stage, 'result');
      assert.deepEqual(r.ranking, [1, 2, 3]);
      const expected = { red: 75, blue: 75 };
      expected[r0.chains[1].starterTeam] += 200;
      expected[r0.chains[2].starterTeam] += 100;
      s = next(s);
      assert.equal(s.phase, 'round-result');
      assert.deepEqual(s.roundLog[4].delta, expected);
      telefoneDelta = expected;
    }

    /* R6 detetive — todo mundo aponta o responsável, menos ele */
    s = next(next(s));
    {
      const d = roundOf(s, 'detetive');
      const culprit = d.culpritId!;
      const fallback = d.order.find((id) => id !== culprit)!;
      s = next(s); // investigação -> discussão
      s = next(s); // discussão -> votação
      for (const id of d.order) {
        s = act(s, id, { type: 'detetive-vote', accusedId: id === culprit ? fallback : culprit });
        if (id !== culprit) {
          const team = s.players.find((p) => p.id === id)?.team;
          if (team) detectiveDelta[team] += POINTS.detetiveFound;
        }
      }
      s = next(s); // revelação
      assert.equal(roundOf(s, 'detetive').stage, 'reveal');
      s = next(s); // resultado da rodada
      assert.deepEqual(s.roundLog[5].delta, detectiveDelta);
    }

    /* R7 relâmpago — 6 perguntas, média do time, 3x */
    s = next(next(s));
    assert.equal(s.multiplier, 3);
    const answer = (st: GameState, ids: string[], how: 'right' | 'wrong'): GameState => {
      const right = at(DECK.relampago, roundOf(st, 'relampago').questionIndex).answerIndex;
      for (const id of ids) {
        st = act(st, id, { type: 'answer-choice', choice: how === 'right' ? right : (right + 1) % 4 });
      }
      return st;
    };
    // P1  red: [150,150,150] -> 150 -> 450 | blue: [150,125,0,0] -> 68,75 -> 69 -> 207
    s = answer(s, ['r1', 'r2', 'r3', 'b1'], 'right');
    advance(6000);
    s = answer(s, ['b2'], 'right');
    s = answer(s, ['b3'], 'wrong');
    s = next(next(s));
    // P2  red: [125,0,0] -> 41,67 -> 42 -> 126 | blue: no último instante [100 x 4] -> 100 -> 300
    advance(6000);
    s = answer(s, ['r1'], 'right');
    s = answer(s, ['r2'], 'wrong');
    advance(6000);
    s = answer(s, ['b1', 'b2', 'b3', 'b4'], 'right');
    s = next(next(s));
    // P3  todo mundo na hora: 450 x 450
    s = answer(s, s.players.map((p) => p.id), 'right');
    s = next(next(s));
    // P4–P6 ninguém responde
    for (let q = 4; q <= 6; q++) {
      assert.equal(roundOf(s, 'relampago').questionNumber, q);
      s = next(next(s));
    }
    assert.equal(s.phase, 'round-result');
    assert.deepEqual(s.roundLog[6].delta, { red: 450 + 126 + 450, blue: 207 + 300 + 450 });

    s = next(s);
    assert.equal(s.phase, 'game-over');
    assert.equal(s.roundLog.length, 7);
    assert.deepEqual(s.scores, {
      red: 300 + 200 + 725 + 450 + telefoneDelta.red + detectiveDelta.red + 1026,
      blue: 150 + 200 + 750 + 0 + telefoneDelta.blue + detectiveDelta.blue + 957,
    });
    assert.equal(telefoneDelta.red + telefoneDelta.blue, 450, 'telefone distribuiu 75+75+200+100');
    assert.deepEqual(s.scores, {
      red: 2701 + telefoneDelta.red + detectiveDelta.red,
      blue: 2057 + telefoneDelta.blue + detectiveDelta.blue,
    });
    const logged = s.roundLog.reduce(
      (acc, e) => ({ red: acc.red + e.delta.red, blue: acc.blue + e.delta.blue }),
      { red: 0, blue: 0 },
    );
    assert.deepEqual(logged, s.scores, 'o log por rodada soma o placar');
  });
});
