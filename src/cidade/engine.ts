import type {
  CidadeHostAction,
  CidadePlayer,
  CidadePlayerAction,
  CidadePlayerColor,
  CidadeState,
} from '@/game/types';
import {
  CIDADE_BOARD,
  CIDADE_COLORS,
  CIDADE_EVENTS,
  CIDADE_MAX_TURNS,
  CIDADE_START_BONUS,
  CIDADE_STARTING_MONEY,
} from './content';

function playerById(state: CidadeState, id: string): CidadePlayer | undefined {
  return state.players.find((player) => player.id === id);
}

function activePlayers(state: CidadeState): CidadePlayer[] {
  return state.players;
}

function cleanName(name: string): string {
  return name.trim().slice(0, 16) || 'Anônimo';
}

function nextColor(players: CidadePlayer[]): CidadePlayerColor {
  return CIDADE_COLORS.find((color) => !players.some((player) => player.color === color)) ?? CIDADE_COLORS[players.length % CIDADE_COLORS.length];
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rollFor(state: CidadeState): [number, number] {
  const seed = hash(`${state.code}:${state.turnNumber}:${state.currentPlayerId ?? ''}:${state.eventIndex}`);
  return [1 + (seed % 6), 1 + (Math.floor(seed / 7) % 6)];
}

function withMessage(state: CidadeState, lastAction: string, lastEvent = state.lastEvent): CidadeState {
  return { ...state, lastAction, lastEvent, now: Date.now() };
}

function propertyValue(state: CidadeState, propertyId: string): number {
  const tile = state.board.find((item) => item.id === propertyId);
  const property = state.properties[propertyId];
  return (tile?.price ?? 0) + (property?.level ?? 0) * Math.round((tile?.price ?? 0) * 0.25);
}

export function cidadePlayerWealth(state: CidadeState, player: CidadePlayer): number {
  return player.money + player.propertyIds.reduce((sum, id) => sum + propertyValue(state, id), 0);
}

function winnerFor(state: CidadeState): string | null {
  return activePlayers(state).slice().sort((a, b) => cidadePlayerWealth(state, b) - cidadePlayerWealth(state, a))[0]?.id ?? null;
}

export function createCidadeGame(code: string): CidadeState {
  const properties = Object.fromEntries(
    CIDADE_BOARD.filter((tile) => tile.type === 'property').map((tile) => [tile.id, { ownerId: null, level: 0 }]),
  );
  return {
    code,
    phase: 'lobby',
    players: [],
    board: CIDADE_BOARD,
    properties,
    currentPlayerId: null,
    turnNumber: 0,
    maxTurns: CIDADE_MAX_TURNS,
    awaiting: null,
    lastRoll: null,
    lastEvent: null,
    lastAction: null,
    eventIndex: 0,
    winnerId: null,
    now: Date.now(),
  };
}

export function canStartCidade(state: CidadeState): boolean {
  return state.phase === 'lobby' && state.players.length >= 2 && state.players.length <= 6;
}

function finishTurn(state: CidadeState): CidadeState {
  const players = activePlayers(state);
  const index = players.findIndex((player) => player.id === state.currentPlayerId);
  const nextIndex = index < 0 ? 0 : (index + 1) % players.length;
  const completedRound = nextIndex === 0;
  const nextTurn = state.turnNumber + (completedRound ? 1 : 0);
  if (nextTurn >= state.maxTurns) {
    const finished = { ...state, phase: 'finished' as const, awaiting: null, currentPlayerId: null, turnNumber: nextTurn };
    return { ...finished, winnerId: winnerFor(finished), lastAction: 'Partida encerrada: patrimônio final calculado.', now: Date.now() };
  }
  return withMessage(
    {
      ...state,
      currentPlayerId: players[nextIndex]?.id ?? null,
      awaiting: 'roll',
      lastRoll: null,
      turnNumber: nextTurn,
    },
    `Vez de ${players[nextIndex]?.name ?? 'ninguém'}.`,
  );
}

export function applyCidadePlayer(state: CidadeState, playerId: string, action: CidadePlayerAction): CidadeState {
  const now = Date.now();
  if (action.type === 'join') {
    const name = cleanName(action.name);
    const existing = playerById(state, playerId);
    if (existing) {
      return { ...state, players: state.players.map((player) => player.id === playerId ? { ...player, name, lastSeen: now } : player), now };
    }
    if (state.phase !== 'lobby' || state.players.length >= 6) return state;
    const player: CidadePlayer = {
      id: playerId,
      name,
      color: nextColor(state.players),
      position: 0,
      money: CIDADE_STARTING_MONEY,
      propertyIds: [],
      lastSeen: now,
    };
    return { ...state, players: [...state.players, player], now };
  }

  if (action.type === 'heartbeat') {
    return playerById(state, playerId) ? { ...state, players: state.players.map((player) => player.id === playerId ? { ...player, lastSeen: now } : player), now } : state;
  }

  if (state.phase !== 'playing' || state.currentPlayerId !== playerId) return state;
  const current = playerById(state, playerId);
  if (!current) return state;

  if (action.type === 'roll-dice') {
    if (state.awaiting !== 'roll') return state;
    const roll = rollFor(state);
    const spaces = roll[0] + roll[1];
    const nextPosition = (current.position + spaces) % state.board.length;
    const passedStart = current.position + spaces >= state.board.length;
    let nextMoney = current.money + (passedStart ? CIDADE_START_BONUS : 0);
    let lastEvent: string | null = passedStart ? `Passou pela Praça Central: +${CIDADE_START_BONUS}.` : null;
    let nextAwaiting: CidadeState['awaiting'] = 'end-turn';
    const nextProperties = state.properties;
    let nextPlayers = state.players.map((player) => player.id === playerId ? { ...player, position: nextPosition, money: nextMoney, lastSeen: now } : player);
    const tile = state.board[nextPosition];

    if (tile.type === 'property') {
      const property = state.properties[tile.id];
      if (property.ownerId === null && (tile.price ?? 0) <= nextMoney) {
        nextAwaiting = 'buy-or-end';
        lastEvent = `${tile.name} está disponível por ${tile.price}.`;
      } else if (property.ownerId && property.ownerId !== playerId) {
        const owner = playerById(state, property.ownerId);
        const rent = (tile.rent ?? 0) * (1 + property.level);
        nextMoney -= rent;
        nextPlayers = nextPlayers.map((player) => {
          if (player.id === playerId) return { ...player, money: nextMoney };
          if (player.id === property.ownerId) return { ...player, money: player.money + rent };
          return player;
        });
        lastEvent = `${current.name} pagou ${rent} de aluguel para ${owner?.name ?? 'outro jogador'}.`;
      }
    } else if (tile.type === 'tax') {
      nextMoney -= tile.tax ?? 0;
      nextPlayers = nextPlayers.map((player) => player.id === playerId ? { ...player, money: nextMoney } : player);
      lastEvent = `${current.name} pagou ${tile.tax} de ${tile.name}.`;
    } else if (tile.type === 'event') {
      const event = CIDADE_EVENTS[state.eventIndex % CIDADE_EVENTS.length];
      nextMoney += event.amount;
      nextPlayers = nextPlayers.map((player) => player.id === playerId ? { ...player, money: nextMoney } : player);
      lastEvent = `${event.title}: ${event.text} (${event.amount >= 0 ? '+' : ''}${event.amount}).`;
    } else if (tile.type === 'go-to-jail') {
      const jail = state.board.findIndex((item) => item.type === 'jail');
      nextPlayers = nextPlayers.map((player) => player.id === playerId ? { ...player, position: jail, money: nextMoney } : player);
      lastEvent = `${current.name} foi para a Delegacia.`;
    }

    return withMessage(
      { ...state, players: nextPlayers, properties: nextProperties, awaiting: nextAwaiting, lastRoll: roll, eventIndex: tile.type === 'event' ? state.eventIndex + 1 : state.eventIndex },
      `${current.name} lançou ${roll[0]} + ${roll[1]} e caiu em ${tile.name}.`,
      lastEvent,
    );
  }

  if (action.type === 'buy-property') {
    if (state.awaiting !== 'buy-or-end') return state;
    const tile = state.board[current.position];
    const property = state.properties[tile.id];
    if (tile.type !== 'property' || !property || property.ownerId !== null || current.money < (tile.price ?? 0)) return state;
    const price = tile.price ?? 0;
    const players = state.players.map((player) => player.id === playerId ? { ...player, money: player.money - price, propertyIds: [...player.propertyIds, tile.id] } : player);
    return withMessage({ ...state, players, properties: { ...state.properties, [tile.id]: { ...property, ownerId: playerId } }, awaiting: 'end-turn' }, `${current.name} comprou ${tile.name} por ${price}.`);
  }

  if (action.type === 'end-turn') {
    if (state.awaiting !== 'end-turn' && state.awaiting !== 'buy-or-end') return state;
    return finishTurn(state);
  }

  return state;
}

export function applyCidadeHost(state: CidadeState, action: CidadeHostAction): CidadeState {
  if (action.type === 'add-player') {
    if (state.phase !== 'lobby' || state.players.length >= 6) return state;
    const player: CidadePlayer = {
      id: `host-player-${state.players.length + 1}`,
      name: cleanName(action.name),
      color: nextColor(state.players),
      position: 0,
      money: CIDADE_STARTING_MONEY,
      propertyIds: [],
      lastSeen: Date.now(),
    };
    return withMessage(
      { ...state, players: [...state.players, player] },
      `${player.name} entrou na partida pelo computador.`,
    );
  }
  if (action.type === 'reset') return createCidadeGame(state.code);
  if (action.type === 'start' && canStartCidade(state)) {
    return withMessage({ ...state, phase: 'playing', currentPlayerId: state.players[0]?.id ?? null, awaiting: 'roll', turnNumber: 0 }, `Cidade em Jogo começou. Vez de ${state.players[0]?.name ?? 'ninguém'}.`);
  }
  return state;
}
