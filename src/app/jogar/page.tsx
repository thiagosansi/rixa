'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Envelope, GameState, PlayerAction, PlayerSecret, TeamId } from '@/game/types';
import { getPlayerId, getStoredName, normalizeRoomCode, setStoredName } from '@/lib/id';
import { useRoomChannel } from '@/lib/channel';
import { Button } from '@/components/ui';
import { PlayerHeader } from '@/components/player/PlayerHeader';
import { RoundScreen } from '@/components/player/RoundScreen';
import {
  GameOverScreen,
  RoundIntroScreen,
  RoundResultScreen,
  SpectatorScreen,
} from '@/components/player/PhaseScreens';
import { WaitingCard } from '@/components/player/WaitingCard';
import { useWakeLock } from '@/components/player/hooks';

const ROOM_KEY = 'rixa:room-code';

function getStoredRoom(): string {
  try {
    return window.localStorage.getItem(ROOM_KEY) ?? '';
  } catch {
    return '';
  }
}

function setStoredRoom(code: string | null): void {
  try {
    if (code) window.localStorage.setItem(ROOM_KEY, code);
    else window.localStorage.removeItem(ROOM_KEY);
  } catch {
    /* modo privado: segue o jogo */
  }
}

export default function JogarPage() {
  const [booted, setBooted] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [room, setRoom] = useState<string | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  /** qualquer segredo que chega endereçado só a mim */
  const [privateSecret, setPrivateSecret] = useState<PlayerSecret | null>(null);
  /** relógio do host − relógio deste celular (ms): celular com hora errada não erra o timer */
  const [clockOffset, setClockOffset] = useState(0);
  const offsetRef = useRef<number | null>(null);
  const playerIdRef = useRef('');

  // id estável + código vindo do QR (?code=ABCD) ou da última sala + último nome usado.
  // Se já tem id, nome e código, reentra sozinho: recarregar a página não pede "Entrar" de novo.
  // (Idempotente: em StrictMode o efeito roda duas vezes e chega no mesmo estado.)
  useEffect(() => {
    const id = getPlayerId();
    const name = getStoredName();
    const fromUrl = new URLSearchParams(window.location.search).get('code');
    const code = normalizeRoomCode(fromUrl ?? getStoredRoom());
    setPlayerId(id);
    setNameInput(name);
    setCodeInput(code);
    if (id && name.trim().length > 0 && code.length === 4) {
      setStoredRoom(code);
      setRoom(code);
    }
    setBooted(true);
  }, []);

  const handleEnvelope = useCallback((env: Envelope) => {
    if (env.game === 'cidade') return;
    if (env.t === 'secret') {
      if (env.playerId === playerIdRef.current) setPrivateSecret(env.secret);
      return;
    }
    if (env.t !== 'state') return;
    setGame(env.state);
    if (typeof env.state.now === 'number' && env.state.now > 0) {
      // a latência só ATRASA a amostra, então a maior amostra é a melhor estimativa;
      // salto grande = alguém acertou o relógio, recomeça.
      const sample = env.state.now - Date.now();
      const prev = offsetRef.current;
      const next = prev === null || Math.abs(sample - prev) > 2000 ? sample : Math.max(prev, sample);
      if (next !== prev) {
        offsetRef.current = next;
        setClockOffset(next);
      }
    }
  }, []);

  const { send, status, connected } = useRoomChannel(room, handleEnvelope);

  const nameRef = useRef(nameInput);
  nameRef.current = nameInput;
  playerIdRef.current = playerId;

  const act = useCallback(
    (action: PlayerAction) => {
      if (!playerId) return;
      send({ t: 'act', playerId, action });
    },
    [playerId, send],
  );

  // anuncia presença assim que o canal abre (o transporte reenvia isso ao reconectar)
  useEffect(() => {
    if (!room || !connected || !playerId) return;
    send({ t: 'act', playerId, action: { type: 'join', name: nameRef.current } });
  }, [room, connected, playerId, send]);

  // heartbeat: o anfitrião sabe quem ainda está na mesa
  useEffect(() => {
    if (!room || !connected || !playerId) return;
    const id = setInterval(() => {
      send({ t: 'act', playerId, action: { type: 'heartbeat' } });
    }, 5000);
    return () => clearInterval(id);
  }, [room, connected, playerId, send]);

  // tela acesa enquanto a partida rola
  useWakeLock(room !== null && game !== null && game.phase !== 'game-over');

  const me = useMemo(
    () => game?.players.find((p) => p.id === playerId) ?? null,
    [game, playerId],
  );
  // O broadcast nunca carrega segredos. O último envelope endereçado é a fonte
  // principal; o estado público fica apenas como fallback durante a transição.
  const secret: PlayerSecret = privateSecret ?? game?.secrets?.[playerId] ?? { kind: 'none' };

  function enter() {
    const code = normalizeRoomCode(codeInput);
    const name = nameInput.trim();
    if (code.length !== 4 || name.length === 0) return;
    setStoredName(name);
    setStoredRoom(code);
    setRoom(code);
  }

  /** sai da sala e desliga a reentrada automática: volta ao formulário com os campos preenchidos */
  function leave() {
    setStoredRoom(null);
    setGame(null);
    setRoom(null);
  }

  // evita piscar o formulário antes de saber se a reentrada automática vai acontecer
  if (!booted) return null;

  if (!room) {
    return (
      <JoinForm
        code={codeInput}
        name={nameInput}
        onCode={(v) => setCodeInput(normalizeRoomCode(v))}
        onName={setNameInput}
        onEnter={enter}
      />
    );
  }

  const inGame = game !== null && game.phase !== 'lobby';
  const team = me?.team ?? null;

  return (
    <div className="player-shell flex min-h-[100dvh] flex-col">
      <PlayerHeader
        room={room}
        name={nameInput}
        me={me}
        game={game}
        connected={connected}
        clockOffset={clockOffset}
      />

      {!connected && (
        <div
          role="status"
          className="display animate-pulse-soft bg-team-red px-4 py-2 text-center text-base text-white"
          data-testid="reconnecting"
        >
          {status === 'connecting' ? 'reconectando…' : 'sem conexão — reconectando…'}
        </div>
      )}

      <main className="player-main mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4">
        {!game && (
          <WaitingCard emoji="📡" title={`Procurando a sala ${room}`}>
            Confira se a mesa está aberta e se o celular está no mesmo WiFi.
            <button
              type="button"
              className="mt-4 block min-h-14 w-full rounded-2xl border-2 border-line px-4 text-lg text-ink"
              onClick={leave}
            >
              Trocar código
            </button>
          </WaitingCard>
        )}

        {game?.phase === 'lobby' && (
          <>
            <TeamPicker current={team} onPick={(t) => act({ type: 'pick-team', team: t })} />
            <button
              type="button"
              className="mx-auto min-h-14 px-4 text-base text-muted underline underline-offset-4"
              onClick={leave}
              data-testid="switch-player"
            >
              Não é você ({nameInput})? Trocar
            </button>
          </>
        )}

        {game && inGame && (!me || !team) && game.phase !== 'game-over' && <SpectatorScreen game={game} />}

        {game && me && team && game.phase === 'round-intro' && (
          <RoundIntroScreen game={game} me={me} team={team} />
        )}
        {game && me && team && game.phase === 'round-play' && (
          <RoundScreen game={game} me={me} team={team} secret={secret} act={act} />
        )}
        {game && me && team && game.phase === 'round-result' && (
          <RoundResultScreen game={game} team={team} />
        )}
        {game?.phase === 'game-over' && <GameOverScreen game={game} team={team} />}
      </main>
    </div>
  );
}

function JoinForm({
  code,
  name,
  onCode,
  onName,
  onEnter,
}: {
  code: string;
  name: string;
  onCode: (v: string) => void;
  onName: (v: string) => void;
  onEnter: () => void;
}) {
  const ready = code.length === 4 && name.trim().length > 0;
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-6 px-5 py-8 thumb-safe">
      <h1 className="display stroke-title text-center text-6xl text-gold">RIXA</h1>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onEnter();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="display text-sm text-muted">código da sala</span>
          <input
            value={code}
            onChange={(e) => onCode(e.target.value)}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            maxLength={4}
            placeholder="ABCD"
            className="display min-h-[72px] rounded-2xl border-2 border-line bg-surface px-5 text-center text-5xl tracking-[0.3em] text-ink outline-none focus:border-gold"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="display text-sm text-muted">seu nome</span>
          <input
            value={name}
            onChange={(e) => onName(e.target.value.slice(0, 16))}
            autoCapitalize="words"
            autoComplete="given-name"
            placeholder="como te chamam"
            className="min-h-[64px] rounded-2xl border-2 border-line bg-surface px-5 text-2xl text-ink outline-none focus:border-gold"
          />
        </label>

        <Button type="submit" size="lg" fullWidth disabled={!ready}>
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Peça o código de 4 letras para quem abriu a mesa.
      </p>
    </main>
  );
}

function TeamPicker({
  current,
  onPick,
}: {
  current: TeamId | null;
  onPick: (team: TeamId) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <span className="display text-center text-lg text-muted">escolha seu time</span>
      <div className="grid grid-cols-2 gap-4">
        <Button
          size="xl"
          variant="red"
          className={current === 'red' ? 'ring-4 ring-ink/60' : 'opacity-80'}
          onClick={() => onPick('red')}
        >
          Vermelho
        </Button>
        <Button
          size="xl"
          variant="blue"
          className={current === 'blue' ? 'ring-4 ring-ink/60' : 'opacity-80'}
          onClick={() => onPick('blue')}
        >
          Azul
        </Button>
      </div>
      {current && (
        <p className="text-center text-lg text-muted">
          Beleza. Aguarde o anfitrião começar o jogo.
        </p>
      )}
    </section>
  );
}
