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

export default function JogarPage() {
  const [playerId, setPlayerId] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [room, setRoom] = useState<string | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  /** segredo que chega endereçado só a mim (lance do meu time no leilão) */
  const [privateSecret, setPrivateSecret] = useState<PlayerSecret | null>(null);
  /** relógio do host − relógio deste celular (ms): celular com hora errada não erra o timer */
  const [clockOffset, setClockOffset] = useState(0);
  const offsetRef = useRef<number | null>(null);
  const playerIdRef = useRef('');

  // id estável + código vindo do QR (?code=ABCD) + último nome usado
  useEffect(() => {
    setPlayerId(getPlayerId());
    setNameInput(getStoredName());
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('code');
    if (fromUrl) setCodeInput(normalizeRoomCode(fromUrl));
  }, []);

  const handleEnvelope = useCallback((env: Envelope) => {
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

  // heartbeat: a TV sabe quem ainda está na mesa
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
  const bidding =
    game?.phase === 'round-play' && game.round?.kind === 'leilao' && game.round.stage === 'bidding';
  // fora do bidding o segredo endereçado perde a validade
  useEffect(() => {
    if (!bidding) setPrivateSecret(null);
  }, [bidding]);
  const secret: PlayerSecret =
    bidding && privateSecret?.kind === 'leilao-bid'
      ? privateSecret
      : (game?.secrets?.[playerId] ?? { kind: 'none' });

  function enter() {
    const code = normalizeRoomCode(codeInput);
    const name = nameInput.trim();
    if (code.length !== 4 || name.length === 0) return;
    setStoredName(name);
    setRoom(code);
  }

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
            Confira se a TV está aberta e se o celular está no mesmo WiFi.
            <button
              type="button"
              className="mt-4 block min-h-14 w-full rounded-2xl border-2 border-line px-4 text-lg text-ink"
              onClick={() => {
                setGame(null);
                setRoom(null);
              }}
            >
              Trocar código
            </button>
          </WaitingCard>
        )}

        {game?.phase === 'lobby' && (
          <TeamPicker current={team} onPick={(t) => act({ type: 'pick-team', team: t })} />
        )}

        {game && inGame && (!me || !team) && game.phase !== 'game-over' && <SpectatorScreen game={game} />}

        {game && me && team && game.phase === 'round-intro' && (
          <RoundIntroScreen game={game} me={me} team={team} />
        )}
        {game && me && team && game.phase === 'round-play' && (
          <RoundScreen game={game} me={me} team={team} secret={secret} act={act} send={send} />
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
        O código aparece na TV. Mesma rede WiFi, mesmo jogo.
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
          Beleza. Olhe pra TV e espere o jogo começar.
        </p>
      )}
    </section>
  );
}
