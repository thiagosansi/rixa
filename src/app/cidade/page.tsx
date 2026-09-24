'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CidadePlayerAction, CidadeState, Envelope } from '@/game/types';
import { applyCidadeHost, applyCidadePlayer, canStartCidade, createCidadeGame, cidadePlayerWealth, cidadePropertyUpgradeCost } from '@/cidade/engine';
import { makeRoomCode } from '@/lib/id';
import { buildJoinUrl, isLocalHostname, pickJoinOrigin } from '@/lib/join-url';
import { useRoomChannel } from '@/lib/channel';
import { Button } from '@/components/ui';
import { CityActivity, CityBoard, CityDice, CityReactions, CityScoreboard } from '@/components/cidade/CityBoard';
import { CityLobby } from '@/components/cidade/CityLobby';

export default function CidadeHostPage() {
  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState<CidadeState | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const stateRef = useRef<CidadeState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    const nextCode = makeRoomCode();
    setCode(nextCode);
    setState(createCidadeGame(nextCode));
  }, []);

  useEffect(() => {
    if (!code) return;
    const { hostname, origin: pageOrigin } = window.location;
    if (!isLocalHostname(hostname)) {
      setJoinUrl(buildJoinUrl(pageOrigin, code, '/cidade/jogar'));
      return;
    }
    let alive = true;
    fetch('/api/lan')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { origin?: string } | null) => {
        if (alive) setJoinUrl(buildJoinUrl(pickJoinOrigin(hostname, pageOrigin, data?.origin), code, '/cidade/jogar'));
      })
      .catch(() => {
        if (alive) setJoinUrl(buildJoinUrl(pageOrigin, code, '/cidade/jogar'));
      });
    return () => {
      alive = false;
    };
  }, [code]);

  const handleEnvelope = useCallback((env: Envelope) => {
    if (env.game !== 'cidade' || env.t !== 'act') return;
    setState((current) => current ? applyCidadePlayer(current, env.playerId, env.action) : current);
  }, []);

  const { send, status, connected } = useRoomChannel(code, handleEnvelope);

  const broadcast = useCallback((next: CidadeState) => {
    send({ t: 'state', game: 'cidade', state: next });
  }, [send]);

  useEffect(() => {
    if (!state || !connected) return;
    broadcast(state);
  }, [state, connected, broadcast]);

  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => {
      if (stateRef.current) broadcast(stateRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [connected, broadcast]);

  const host = useCallback((action: 'start' | 'reset') => {
    setState((current) => current ? applyCidadeHost(current, { type: action }) : current);
  }, []);

  const addPlayer = useCallback((name: string) => {
    setState((current) => current ? applyCidadeHost(current, { type: 'add-player', name }) : current);
  }, []);

  const hostTurn = useCallback((action: CidadePlayerAction) => {
    setState((current) => {
      if (!current?.currentPlayerId) return current;
      return applyCidadePlayer(current, current.currentPlayerId, action);
    });
  }, []);

  const restart = () => {
    if (!code) return;
    setState(createCidadeGame(code));
  };

  if (!state || !code) {
    return <main className="flex min-h-[100dvh] items-center justify-center"><span className="display animate-pulse-soft text-4xl text-muted">abrindo a cidade…</span></main>;
  }

  const winner = state.winnerId ? state.players.find((player) => player.id === state.winnerId) : null;
  const currentPlayer = state.players.find((player) => player.id === state.currentPlayerId) ?? null;
  const currentTile = currentPlayer ? state.board[currentPlayer.position] : null;
  const currentProperty = currentTile ? state.properties[currentTile.id] : null;
  const upgradeCost = currentTile ? cidadePropertyUpgradeCost(state, currentTile.id) : 0;
  const canUpgrade = state.phase === 'playing' && state.awaiting === 'end-turn' && !!currentPlayer && currentTile?.type === 'property' && currentProperty?.ownerId === currentPlayer.id && (currentProperty.level ?? 0) < 2 && currentPlayer.money >= upgradeCost;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:px-6">
      <header className="flex items-center justify-between gap-3 border-b-2 border-line pb-3">
        <div>
          <span className="display text-3xl text-gold sm:text-5xl">CIDADE</span>
          <span className="ml-2 text-sm text-muted sm:text-lg">em jogo</span>
        </div>
        <span className={`display rounded-lg border px-2 py-1 text-xs ${connected ? 'border-[#3ddc97]/60 text-[#3ddc97]' : 'border-team-red/60 text-team-red'}`}>
          {connected ? 'no ar' : status}
        </span>
      </header>

      {state.phase === 'lobby' && <CityLobby state={state} joinUrl={joinUrl} onStart={() => host('start')} onAddPlayer={addPlayer} />}

      {state.phase === 'playing' && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="display text-sm text-muted">volta {state.turnNumber + 1}/{state.maxTurns}</div>
              <h1 className="display text-3xl text-gold sm:text-5xl">{state.players.find((player) => player.id === state.currentPlayerId)?.name ?? '—'} joga</h1>
            </div>
            <div className="rounded-xl border-2 border-gold/50 bg-gold/10 px-3 py-2 text-center text-sm text-ink">sala {state.code}</div>
          </div>
          <CityBoard state={state} />
          <CityActivity state={state} />
          <section className="rounded-3xl border-2 border-gold/50 bg-gold/10 px-4 py-4">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <div className="display text-sm text-gold">controle do turno</div>
                <div className="display mt-1 text-2xl text-ink">{state.players.find((player) => player.id === state.currentPlayerId)?.name ?? '—'}</div>
                <p className="mt-1 text-sm text-muted">Use aqui no modo pass-and-play ou jogue pelo dispositivo do jogador.</p>
              </div>
              <CityDice roll={state.lastRoll} />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {state.awaiting === 'roll' && <Button size="xl" fullWidth onClick={() => hostTurn({ type: 'roll-dice' })}>Lançar dados</Button>}
              {state.awaiting === 'buy-or-end' && <>
                <Button size="lg" fullWidth onClick={() => hostTurn({ type: 'buy-property' })}>Comprar imóvel</Button>
                <Button size="lg" variant="ghost" fullWidth onClick={() => hostTurn({ type: 'end-turn' })}>Passar</Button>
              </>}
              {state.awaiting === 'end-turn' && <div className="grid w-full gap-2 sm:grid-cols-2">
                <Button size="xl" fullWidth onClick={() => hostTurn({ type: 'end-turn' })}>Encerrar turno</Button>
                {canUpgrade && <Button size="lg" variant="gold" fullWidth onClick={() => hostTurn({ type: 'upgrade-property' })}>Construir · ${upgradeCost}</Button>}
              </div>}
            </div>
          </section>
          <CityReactions onReact={(emoji) => hostTurn({ type: 'react', emoji })} />
          <CityScoreboard state={state} />
          <div className="rounded-2xl border-2 border-line bg-surface px-4 py-3 text-center text-lg text-ink">
            {state.lastRoll && <div className="display text-2xl text-gold">último dado: {state.lastRoll[0]} + {state.lastRoll[1]}</div>}
            <p className="mt-1">{state.lastEvent ?? state.lastAction ?? 'Cada jogador joga pelo próprio dispositivo.'}</p>
          </div>
        </section>
      )}

      {state.phase === 'finished' && winner && (
        <section className="flex flex-col gap-5 text-center">
          <div>
            <div className="display text-sm tracking-[0.2em] text-muted">fim de jogo</div>
            <h1 className="display mt-2 text-5xl text-gold">{winner.name} venceu</h1>
            <p className="mt-2 text-xl text-ink">Patrimônio final: ${cidadePlayerWealth(state, winner)}</p>
          </div>
          <CityBoard state={state} />
          <CityScoreboard state={state} />
          <Button size="xl" onClick={restart}>Jogar de novo</Button>
        </section>
      )}

      {state.phase === 'lobby' && !canStartCidade(state) && state.players.length > 0 && (
        <p className="text-center text-sm text-muted">Aguardando pelo menos 2 jogadores.</p>
      )}
    </main>
  );
}
