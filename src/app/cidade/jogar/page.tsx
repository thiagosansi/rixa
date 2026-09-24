'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CidadePlayerAction, CidadeState, Envelope } from '@/game/types';
import { getPlayerId, getStoredName, normalizeRoomCode, setStoredName } from '@/lib/id';
import { cidadePlayerWealth } from '@/cidade/engine';
import { useRoomChannel } from '@/lib/channel';
import { Button } from '@/components/ui';
import { CityBoard, CityDice, CityScoreboard } from '@/components/cidade/CityBoard';

const ROOM_KEY = 'cidade:room-code';

function storedRoom(): string {
  try { return window.localStorage.getItem(ROOM_KEY) ?? ''; } catch { return ''; }
}

function saveRoom(code: string | null): void {
  try {
    if (code) window.localStorage.setItem(ROOM_KEY, code);
    else window.localStorage.removeItem(ROOM_KEY);
  } catch { /* modo privado */ }
}

export default function CidadePlayerPage() {
  const [booted, setBooted] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [room, setRoom] = useState<string | null>(null);
  const [state, setState] = useState<CidadeState | null>(null);
  const playerIdRef = useRef('');

  useEffect(() => {
    const id = getPlayerId();
    const name = getStoredName();
    const fromUrl = new URLSearchParams(window.location.search).get('code');
    const code = normalizeRoomCode(fromUrl ?? storedRoom());
    setPlayerId(id);
    setNameInput(name);
    setCodeInput(code);
    if (name.trim() && code.length === 4) setRoom(code);
    setBooted(true);
  }, []);

  playerIdRef.current = playerId;

  const handleEnvelope = useCallback((env: Envelope) => {
    if (env.game === 'cidade' && env.t === 'state') setState(env.state);
  }, []);
  const { send, status, connected } = useRoomChannel(room, handleEnvelope);

  const act = useCallback((action: CidadePlayerAction) => {
    if (!playerId) return;
    send({ t: 'act', game: 'cidade', playerId, action });
  }, [playerId, send]);

  const nameRef = useRef(nameInput);
  nameRef.current = nameInput;
  useEffect(() => {
    if (!room || !connected || !playerId) return;
    act({ type: 'join', name: nameRef.current });
  }, [room, connected, playerId, act]);

  useEffect(() => {
    if (!room || !connected || !playerId) return;
    const id = setInterval(() => act({ type: 'heartbeat' }), 5000);
    return () => clearInterval(id);
  }, [room, connected, playerId, act]);

  const me = useMemo(() => state?.players.find((player) => player.id === playerId) ?? null, [state, playerId]);

  function enter() {
    const code = normalizeRoomCode(codeInput);
    const name = nameInput.trim();
    if (code.length !== 4 || !name) return;
    setStoredName(name);
    saveRoom(code);
    setRoom(code);
  }

  function leave() {
    saveRoom(null);
    setRoom(null);
    setState(null);
  }

  if (!booted) return null;
  if (!room) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-6 px-5 py-8 thumb-safe">
        <div className="text-center"><div className="display text-6xl text-gold">CIDADE</div><p className="mt-2 text-muted">Entre pelo celular, tablet ou computador.</p></div>
        <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); enter(); }}>
          <label className="flex flex-col gap-2"><span className="display text-sm text-muted">código da sala</span><input value={codeInput} onChange={(event) => setCodeInput(normalizeRoomCode(event.target.value))} maxLength={4} placeholder="ABCD" className="display min-h-[72px] rounded-2xl border-2 border-line bg-surface px-5 text-center text-5xl tracking-[0.3em] text-ink outline-none focus:border-gold" /></label>
          <label className="flex flex-col gap-2"><span className="display text-sm text-muted">seu nome</span><input value={nameInput} onChange={(event) => setNameInput(event.target.value.slice(0, 16))} placeholder="como te chamam" className="min-h-[64px] rounded-2xl border-2 border-line bg-surface px-5 text-2xl text-ink outline-none focus:border-gold" /></label>
          <Button type="submit" size="lg" fullWidth disabled={codeInput.length !== 4 || !nameInput.trim()}>Entrar na cidade</Button>
        </form>
      </main>
    );
  }

  const current = state?.currentPlayerId === playerId;
  const canRoll = current && state?.phase === 'playing' && state.awaiting === 'roll';
  const canBuy = current && state?.phase === 'playing' && state.awaiting === 'buy-or-end';
  const canEnd = current && state?.phase === 'playing' && (state.awaiting === 'end-turn' || state.awaiting === 'buy-or-end');

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-4 px-4 py-4 lg:max-w-5xl">
      <header className="flex items-center justify-between gap-3 border-b-2 border-line pb-3">
        <div><div className="display text-3xl text-gold">CIDADE</div><div className="text-sm text-muted">{me?.name ?? nameInput} · sala {room}</div></div>
        <span className={`h-3 w-3 rounded-full ${connected ? 'bg-[#3ddc97]' : 'animate-pulse-soft bg-team-red'}`} aria-label={connected ? 'conectado' : 'desconectado'} />
      </header>

      {!state && <div className="rounded-2xl border-2 border-line bg-surface px-4 py-6 text-center text-lg text-muted">Procurando a cidade…</div>}
      {state?.phase === 'lobby' && (
        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border-2 border-gold/50 bg-gold/10 px-4 py-4 text-center"><div className="display text-2xl text-gold">Você está na cidade</div><p className="mt-2 text-lg text-ink">Escolha seu bairro ao entrar e aguarde o anfitrião começar.</p></div>
          <CityScoreboard state={state} />
          <Button variant="ghost" onClick={leave}>Trocar sala</Button>
        </section>
      )}
      {state?.phase === 'playing' && (
        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border-2 border-line bg-surface px-4 py-3 text-center"><div className="display text-sm text-muted">volta {state.turnNumber + 1}/{state.maxTurns}</div><div className="display mt-1 text-3xl text-gold">{current ? 'sua vez' : `${state.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'alguém'} joga`}</div></div>
          <CityBoard state={state} compact />
          <div className="rounded-2xl border-2 border-gold/50 bg-gold/10 px-4 py-4 text-center"><div className="display text-sm text-gold">seu patrimônio</div><div className="display mt-1 text-4xl text-ink">${me ? cidadePlayerWealth(state, me) : 0}</div><div className="mt-1 text-muted">dinheiro em caixa: ${me?.money ?? 0} · imóveis: {me?.propertyIds.length ?? 0}</div></div>
          {state.lastRoll && <div className="rounded-2xl border-2 border-line bg-surface px-4 py-3 text-center text-lg text-ink"><CityDice roll={state.lastRoll} /><p className="mt-2">{state.lastEvent ?? state.lastAction}</p></div>}
          {current && canRoll && <Button size="xl" fullWidth onClick={() => act({ type: 'roll-dice' })}>Lançar dados</Button>}
          {current && canBuy && <div className="grid grid-cols-2 gap-2"><Button size="lg" onClick={() => act({ type: 'buy-property' })}>Comprar</Button><Button size="lg" variant="ghost" onClick={() => act({ type: 'end-turn' })}>Passar</Button></div>}
          {current && canEnd && !canBuy && <Button size="xl" fullWidth onClick={() => act({ type: 'end-turn' })}>Encerrar turno</Button>}
          {!current && <p className="text-center text-lg text-muted">Aguarde sua vez. O dado e as decisões ficam no dispositivo de quem está jogando.</p>}
          <CityScoreboard state={state} />
        </section>
      )}
      {state?.phase === 'finished' && <section className="flex flex-col gap-4 text-center"><div className="display text-4xl text-gold">Partida encerrada</div><p className="text-xl text-ink">Vencedor: {state.players.find((player) => player.id === state.winnerId)?.name ?? '—'}</p><CityBoard state={state} compact /><CityScoreboard state={state} /></section>}
      {!connected && <p className="text-center text-team-red">{status === 'connecting' ? 'conectando…' : 'sem conexão — tentando voltar'}</p>}
    </main>
  );
}
