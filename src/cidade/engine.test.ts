import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyCidadeHost, applyCidadePlayer, createCidadeGame } from './engine';

function joined() {
  let state = createCidadeGame('CITY');
  state = applyCidadePlayer(state, 'p1', { type: 'join', name: 'Ana' });
  state = applyCidadePlayer(state, 'p2', { type: 'join', name: 'Bia' });
  return state;
}

describe('Cidade em Jogo', () => {
  it('permite montar uma partida pass-and-play no computador', () => {
    let state = createCidadeGame('CITY');
    state = applyCidadeHost(state, { type: 'add-player', name: 'Ana' });
    state = applyCidadeHost(state, { type: 'add-player', name: 'Bia' });
    assert.deepEqual(state.players.map((player) => player.name), ['Ana', 'Bia']);
    state = applyCidadeHost(state, { type: 'start' });
    state = applyCidadePlayer(state, 'host-player-1', { type: 'roll-dice' });
    assert.ok(state.lastRoll);
  });

  it('entra sem times e começa com dois jogadores', () => {
    let state = joined();
    assert.equal(state.players.length, 2);
    assert.notEqual(state.players[0].color, state.players[1].color);
    state = applyCidadeHost(state, { type: 'start' });
    assert.equal(state.phase, 'playing');
    assert.equal(state.awaiting, 'roll');
    assert.equal(state.currentPlayerId, 'p1');
  });

  it('lança dados, movimenta e permite comprar um imóvel disponível', () => {
    let state = applyCidadeHost(joined(), { type: 'start' });
    state = applyCidadePlayer(state, 'p1', { type: 'roll-dice' });
    assert.ok(state.lastRoll);
    assert.notEqual(state.players[0].position, 0);
    assert.ok(state.awaiting === 'buy-or-end' || state.awaiting === 'end-turn');

    state = {
      ...state,
      awaiting: 'buy-or-end',
      currentPlayerId: 'p1',
      players: state.players.map((player) => player.id === 'p1' ? { ...player, position: 1 } : player),
    };
    state = applyCidadePlayer(state, 'p1', { type: 'buy-property' });
    assert.equal(state.properties.aurora.ownerId, 'p1');
    assert.ok(state.players[0].propertyIds.includes('aurora'));
    assert.equal(state.awaiting, 'end-turn');
  });

  it('passa o turno para o próximo jogador', () => {
    let state = applyCidadeHost(joined(), { type: 'start' });
    state = applyCidadePlayer(state, 'p1', { type: 'end-turn' });
    assert.equal(state.currentPlayerId, 'p1', 'não encerra antes de lançar');
    state = applyCidadePlayer(state, 'p1', { type: 'roll-dice' });
    state = applyCidadePlayer(state, 'p1', { type: 'end-turn' });
    assert.equal(state.currentPlayerId, 'p2');
    assert.equal(state.awaiting, 'roll');
  });
});
