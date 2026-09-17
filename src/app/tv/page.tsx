'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DeckMode, Envelope, GameState, HostAction, Player, TeamId } from '@/game/types';
import {
  canStart,
  createGame,
  hostApplyHost,
  hostApplyPlayer,
  privateSecrets,
  teamCounts,
  toPublicState,
} from '@/game/engine';
import { DECK_LABELS, pickDeck } from '@/game/content';
import { ROUND_INFO, TOTAL_ROUNDS, roundKindAt } from '@/game/rounds';
import { makeRoomCode } from '@/lib/id';
import { buildJoinUrl, isLocalHostname, pickJoinOrigin } from '@/lib/join-url';
import { useRoomChannel } from '@/lib/channel';
import { Button, CodeDisplay, TEAM_NAME, TeamBadge } from '@/components/ui';
import type { Deck } from '@/game/content';
import { autoAdvanceFor } from '@/components/tv/autoAdvance';
import { RoundIntro } from '@/components/tv/RoundIntro';
import { RoundResult } from '@/components/tv/RoundResult';
import { GameOver } from '@/components/tv/GameOver';
import { HostControls } from '@/components/tv/HostControls';
import { MimicaScreen } from '@/components/tv/MimicaScreen';
import { TabuScreen } from '@/components/tv/TabuScreen';
import { MentirosoScreen } from '@/components/tv/MentirosoScreen';
import { LeilaoScreen } from '@/components/tv/LeilaoScreen';
import { RelampagoScreen } from '@/components/tv/RelampagoScreen';

const DECK_OPTIONS: DeckMode[] = ['familia', 'sem-filtro'];

export default function TvPage() {
  const [code, setCode] = useState<string | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

  const gameRef = useRef<GameState | null>(null);
  gameRef.current = game;

  const deckMode: DeckMode = game?.deck ?? 'familia';
  const content = useMemo(() => pickDeck(deckMode), [deckMode]);
  const contentRef = useRef(content);
  contentRef.current = content;

  // a sala nasce no cliente (código aleatório não pode vir do SSR)
  useEffect(() => {
    const c = makeRoomCode();
    setCode(c);
    setGame(createGame(c));
  }, []);

  // endereço que a mesa digita no celular: IP da LAN em casa, origin público quando hospedado
  useEffect(() => {
    if (!code) return;
    const { hostname, origin: pageOrigin } = window.location;
    if (!isLocalHostname(hostname)) {
      setJoinUrl(buildJoinUrl(pageOrigin, code));
      return;
    }
    let alive = true;
    fetch('/api/lan')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { origin?: string } | null) => {
        if (alive) setJoinUrl(buildJoinUrl(pickJoinOrigin(hostname, pageOrigin, data?.origin), code));
      })
      .catch(() => {
        if (alive) setJoinUrl(buildJoinUrl(pageOrigin, code));
      });
    return () => {
      alive = false;
    };
  }, [code]);

  const handleEnvelope = useCallback((env: Envelope) => {
    if (env.t !== 'act') return;
    setGame((prev) =>
      prev ? hostApplyPlayer(prev, env.playerId, env.action, contentRef.current) : prev,
    );
  }, []);

  const { send, status, connected } = useRoomChannel(code, handleEnvelope);

  // O broadcast leva só o estado PÚBLICO (sem os lances do leilão, com o relógio do host);
  // o que é secreto vai em envelope endereçado a cada jogador.
  const broadcast = useCallback(
    (g: GameState) => {
      send({ t: 'state', state: toPublicState(g, Date.now()) });
      for (const { playerId, secret } of privateSecrets(g)) {
        send({ t: 'secret', playerId, secret }, { to: [playerId] });
      }
    },
    [send],
  );

  // a TV é a autoridade: toda mudança de estado vira broadcast
  useEffect(() => {
    if (!game || !connected) return;
    broadcast(game);
  }, [game, connected, broadcast]);

  // rede de segurança: quem chega atrasado (ou reconecta) sincroniza em até 1s
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => {
      const g = gameRef.current;
      if (g) broadcast(g);
    }, 1000);
    return () => clearInterval(id);
  }, [connected, broadcast]);

  // relógio da rodada
  const phase = game?.phase;
  useEffect(() => {
    if (phase !== 'round-play') return;
    const id = setInterval(() => {
      setGame((prev) => (prev ? hostApplyHost(prev, { type: 'tick' }, contentRef.current) : prev));
    }, 300);
    return () => clearInterval(id);
  }, [phase]);

  const host = useCallback((action: HostAction) => {
    setGame((prev) => (prev ? hostApplyHost(prev, action, contentRef.current) : prev));
  }, []);

  // todo mundo já jogou? não espera o relógio
  const auto = game ? autoAdvanceFor(game) : null;
  const autoKey = auto?.key ?? null;
  const autoDelay = auto?.delayMs ?? 0;
  useEffect(() => {
    if (!autoKey) return;
    const id = setTimeout(() => {
      setGame((prev) => {
        if (!prev || autoAdvanceFor(prev)?.key !== autoKey) return prev;
        return hostApplyHost(prev, { type: 'next-phase' }, contentRef.current);
      });
    }, autoDelay);
    return () => clearTimeout(id);
  }, [autoKey, autoDelay]);

  /** Fecha a rodada inteira (pontuando o que estiver pendente) e vai pro resultado. */
  const endRound = useCallback(() => {
    setGame((prev) => {
      let next = prev;
      for (let i = 0; next && next.phase === 'round-play' && i < 64; i++) {
        next = hostApplyHost(next, { type: 'next-phase' }, contentRef.current);
      }
      return next;
    });
  }, []);

  /** Volta ao lobby mantendo jogadores, times e baralho; zera placar e histórico. */
  const restart = useCallback(() => {
    setGame((prev) =>
      prev ? { ...createGame(prev.code, prev.deck), players: prev.players } : prev,
    );
  }, []);

  if (!game || !code) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <span className="display animate-pulse-soft text-4xl text-muted">abrindo a arena…</span>
      </main>
    );
  }

  return (
    <main className="tv-root mx-auto flex min-h-[100dvh] w-full max-w-[1600px] flex-col gap-6 px-8 py-6">
      <TopBar game={game} status={status} />
      {game.phase === 'lobby' && (
        <Lobby
          game={game}
          joinUrl={joinUrl}
          onDeck={(deck) => host({ type: 'set-deck', deck })}
          onStart={() => host({ type: 'start-game' })}
        />
      )}
      {game.phase === 'round-intro' && (
        <Screen key={`intro-${game.roundIndex}`}>
          <RoundIntro game={game} onNext={() => host({ type: 'next-phase' })} />
        </Screen>
      )}
      {game.phase === 'round-play' && game.round && (
        <Screen key={`play-${game.roundIndex}`} className="pb-12">
          <RoundPlay
            game={game}
            content={content}
            onNext={() => host({ type: 'next-phase' })}
          />
          <HostControls onSkip={() => host({ type: 'next-phase' })} onEndRound={endRound} />
        </Screen>
      )}
      {game.phase === 'round-result' && (
        <Screen key={`result-${game.roundIndex}`}>
          <RoundResult game={game} onNext={() => host({ type: 'next-phase' })} />
        </Screen>
      )}
      {game.phase === 'game-over' && (
        <Screen key="game-over">
          <GameOver game={game} onRestart={restart} />
        </Screen>
      )}
    </main>
  );
}

function TopBar({ game, status }: { game: GameState; status: string }) {
  const roundLabel =
    game.phase === 'lobby'
      ? 'Aguardando a mesa'
      : game.phase === 'game-over'
        ? 'Fim de jogo'
        : `Rodada ${game.roundIndex + 1} de ${TOTAL_ROUNDS} · ${ROUND_INFO[roundKindAt(game.roundIndex)].title}`;
  // no resultado/fim a própria tela faz a contagem animada: o placar do topo daria spoiler
  const showScores = game.phase !== 'round-result' && game.phase !== 'game-over';

  return (
    <header className="flex items-center justify-between gap-6">
      <div>
        <span className="display text-4xl text-gold md:text-6xl">RIXA</span>
        <span className="ml-4 text-lg text-muted md:text-2xl">{roundLabel}</span>
      </div>
      <div className="flex items-center gap-6">
        {showScores && (
          <div data-tv="scoreboard" className="flex items-center gap-3">
            <TopScore team="red" value={game.scores.red} />
            {game.multiplier > 1 && (
              <span className="display animate-pulse-soft rounded-xl border-2 border-gold bg-gold/15 px-3 py-2 text-3xl text-gold">
                {game.multiplier}x
              </span>
            )}
            <TopScore team="blue" value={game.scores.blue} />
          </div>
        )}
        <span
          className={`display rounded-lg border px-3 py-1 text-xs ${
            status === 'open'
              ? 'border-team-blue/50 text-team-blue'
              : 'border-team-red/50 text-team-red'
          }`}
        >
          {status === 'open' ? 'no ar' : status}
        </span>
      </div>
    </header>
  );
}

/** Placar do topo: grande o bastante pra ler do sofá, e pisca quando muda. */
function TopScore({ team, value }: { team: TeamId; value: number }) {
  const tone =
    team === 'red'
      ? 'border-team-red/50 bg-team-red/10 text-team-red'
      : 'border-team-blue/50 bg-team-blue/10 text-team-blue';
  return (
    <div className={`min-w-36 rounded-2xl border-2 px-4 py-1.5 text-center ${tone}`}>
      <div className="display text-sm opacity-80">{TEAM_NAME[team]}</div>
      <div key={value} className="display tv-score-bump text-5xl tabular-nums md:text-6xl">
        {value}
      </div>
    </div>
  );
}

function Lobby({
  game,
  joinUrl,
  onDeck,
  onStart,
}: {
  game: GameState;
  joinUrl: string | null;
  onDeck: (deck: DeckMode) => void;
  onStart: () => void;
}) {
  const counts = teamCounts(game);
  const ready = canStart(game);
  const noTeam = game.players.filter((p) => p.team === null);

  return (
    <div className="flex flex-1 flex-col gap-8">
      <CodeDisplay code={game.code} joinUrl={joinUrl} className="justify-center" />

      <div className="grid flex-1 grid-cols-2 gap-6">
        <TeamColumn team="red" players={game.players.filter((p) => p.team === 'red')} />
        <TeamColumn team="blue" players={game.players.filter((p) => p.team === 'blue')} />
      </div>

      {noTeam.length > 0 && (
        <div className="rounded-2xl border-2 border-line bg-surface px-5 py-3">
          <span className="display text-sm text-muted">escolhendo time</span>
          <div className="mt-1 flex flex-wrap gap-3">
            {noTeam.map((p) => (
              <span key={p.id} className="animate-pop text-2xl text-ink">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="display text-lg text-muted">baralho</span>
          {DECK_OPTIONS.map((deck) => (
            <Button
              key={deck}
              size="md"
              variant={game.deck === deck ? 'gold' : 'ghost'}
              onClick={() => onDeck(deck)}
            >
              {DECK_LABELS[deck]}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-5">
          <span className="text-lg text-muted">
            {counts.red} x {counts.blue} · {game.players.length} na mesa
            {!ready && ' · precisa de 4+ pessoas e os dois times preenchidos'}
          </span>
          <Button size="xl" disabled={!ready} onClick={onStart}>
            Começar
          </Button>
        </div>
      </div>
    </div>
  );
}

function TeamColumn({ team, players }: { team: TeamId; players: Player[] }) {
  const tone = team === 'red' ? 'border-team-red/40' : 'border-team-blue/40';
  return (
    <section className={`flex flex-col gap-4 rounded-3xl border-2 ${tone} bg-surface/60 p-6`}>
      <TeamBadge team={team} size="lg" />
      <ul className="flex flex-col gap-2">
        {players.map((p) => (
          <li key={p.id} className="display animate-slide-up text-4xl text-ink md:text-5xl">
            {p.name}
          </li>
        ))}
        {players.length === 0 && <li className="text-xl text-muted">ninguém ainda</li>}
      </ul>
    </section>
  );
}

/** Transição entre fases: cada fase entra deslizando. */
function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`tv-screen flex flex-1 flex-col ${className}`}>{children}</div>;
}

function RoundPlay({
  game,
  content,
  onNext,
}: {
  game: GameState;
  content: Deck;
  onNext: () => void;
}) {
  const round = game.round;
  if (!round) return null;
  switch (round.kind) {
    case 'mimica':
      return <MimicaScreen game={game} round={round} />;
    case 'tabu':
      return <TabuScreen game={game} round={round} />;
    case 'mentiroso':
      return <MentirosoScreen game={game} round={round} content={content} />;
    case 'leilao':
      return <LeilaoScreen game={game} round={round} content={content} onNext={onNext} />;
    case 'relampago':
      return <RelampagoScreen game={game} round={round} content={content} />;
  }
}
