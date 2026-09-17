'use client';

import type { GameState, Player, TeamId } from '@/game/types';
import {
  ROUND_INFO,
  TOTAL_ROUNDS,
  otherTeam,
  pickRotating,
  playersOfTeam,
  roundKindAt,
  startingTeam,
} from '@/game/rounds';
import { WaitingCard } from './WaitingCard';
import { TEAM_LABEL, TEAM_TEXT } from './shared';

/** O que EU vou fazer na rodada que está para começar. */
function myRoleText(game: GameState, me: Player, team: TeamId): string {
  const kind = roundKindAt(game.roundIndex);
  if (kind === 'desenha' || kind === 'tabu') {
    const first = startingTeam(game.roundIndex);
    const performer = pickRotating(playersOfTeam(game.players, team), game.roundIndex);
    const verb = kind === 'desenha' ? 'desenha' : 'dá as dicas';
    const order = first === team ? 'Seu time começa.' : 'O outro time começa; o seu vai depois.';
    const rivalJob = kind === 'tabu' ? ' Na vez deles você é árbitro: botão PEGOU! na mão.' : '';
    if (performer?.id === me.id) {
      return `VOCÊ ${verb} pelo seu time${kind === 'desenha' ? ' — no celular' : ' — em voz alta'}. ${order}${rivalJob}`;
    }
    return `${performer?.name ?? 'Alguém'} ${verb} pelo seu time; você adivinha digitando aqui. ${order}${rivalJob}`;
  }
  if (kind === 'mentiroso') return 'Você escreve uma mentira convincente e depois vota tentando achar a verdade.';
  if (kind === 'leilao') return 'Você dá o lance do seu time. Quem prometer mais, lista; o outro time julga.';
  return 'Todo mundo responde no próprio celular. Rapidez dá bônus e tudo vale 3x.';
}

export function RoundIntroScreen({ game, me, team }: { game: GameState; me: Player; team: TeamId }) {
  const info = ROUND_INFO[roundKindAt(game.roundIndex)];
  return (
    <section className="flex flex-col gap-4">
      <div className="text-center">
        <div className="display text-base text-muted">
          rodada {game.roundIndex + 1} de {TOTAL_ROUNDS}
        </div>
        <h2 className="display mt-1 text-4xl text-gold">{info.title}</h2>
        <p className="mt-2 text-lg text-muted">{info.tagline}</p>
      </div>

      <div className="rounded-2xl border-2 border-gold/60 bg-gold/10 px-4 py-4">
        <div className="display text-xs tracking-[0.2em] text-gold">seu papel</div>
        <p className="mt-1 text-xl leading-snug text-ink" data-testid="my-role">
          {myRoleText(game, me, team)}
        </p>
      </div>

      <ul className="flex flex-col gap-2 rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg text-ink/90">
        {info.rules.map((rule) => (
          <li key={rule} className="flex gap-2">
            <span className="text-gold">▸</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      <p className="text-center text-lg text-muted">Olha pra TV 👀 — começa quando o anfitrião apertar.</p>
    </section>
  );
}

export function RoundResultScreen({ game, team }: { game: GameState; team: TeamId }) {
  const info = ROUND_INFO[roundKindAt(game.roundIndex)];
  const entry = [...game.roundLog].reverse().find((e) => e.roundIndex === game.roundIndex);
  const delta = entry?.delta ?? { red: 0, blue: 0 };
  const rival = otherTeam(team);
  const mine = delta[team];
  const theirs = delta[rival];
  const tone = mine > theirs ? 'good' : mine < theirs ? 'bad' : 'neutral';
  const lead = game.scores[team] - game.scores[rival];
  const isLast = game.roundIndex >= TOTAL_ROUNDS - 1;

  return (
    <section className="flex flex-col gap-4">
      <div className="text-center">
        <div className="display text-base text-muted">fim da rodada {game.roundIndex + 1}</div>
        <h2 className="display mt-1 text-3xl text-gold">{info.title}</h2>
      </div>

      <WaitingCard
        emoji={tone === 'good' ? '😎' : tone === 'bad' ? '😤' : '🤝'}
        title={tone === 'good' ? 'Rodada de vocês' : tone === 'bad' ? 'Rodada deles' : 'Deu empate'}
        tone={tone}
      >
        <span className={TEAM_TEXT[team]}>
          seu time {mine >= 0 ? '+' : ''}
          {mine}
        </span>
        {' · '}
        <span className={TEAM_TEXT[rival]}>
          eles {theirs >= 0 ? '+' : ''}
          {theirs}
        </span>
      </WaitingCard>

      <p className="text-center text-xl text-ink" data-testid="standing">
        {lead > 0 && <>Seu time está na frente por {lead}.</>}
        {lead < 0 && <>Seu time está atrás por {-lead}. {isLast ? '' : 'Dá pra virar.'}</>}
        {lead === 0 && <>Tudo empatado no geral.</>}
      </p>
      <p className="text-center text-lg text-muted">
        {isLast ? 'Olha pra TV 👀 — vem o resultado final.' : 'Olha pra TV 👀 — já vem a próxima rodada.'}
      </p>
    </section>
  );
}

export function GameOverScreen({ game, team }: { game: GameState; team: TeamId | null }) {
  const { red, blue } = game.scores;
  const winner: TeamId | null = red === blue ? null : red > blue ? 'red' : 'blue';
  const won = team !== null && winner === team;
  const lost = team !== null && winner !== null && winner !== team;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="display text-center text-4xl text-gold">Fim de jogo</h2>
      <WaitingCard
        emoji={won ? '🏆' : lost ? '🥈' : '🤝'}
        title={won ? 'Seu time venceu!' : lost ? 'Não foi dessa vez' : winner ? `Deu ${TEAM_LABEL[winner]}` : 'Empate!'}
        tone={won ? 'gold' : lost ? 'bad' : 'neutral'}
      >
        {won && <>Pode zoar o time {TEAM_LABEL[otherTeam(team!)]} à vontade. Vocês mereceram.</>}
        {lost && <>O time {TEAM_LABEL[winner!]} levou. Peça revanche — ninguém precisa sair da mesa assim.</>}
        {!won && !lost && !winner && <>Ninguém levou. Só uma revanche resolve.</>}
      </WaitingCard>

      <div className="grid grid-cols-2 gap-3 text-center">
        {(['red', 'blue'] as const).map((t) => (
          <div
            key={t}
            className={`rounded-2xl border-2 px-3 py-3 ${
              t === 'red' ? 'border-team-red/50 bg-team-red/10' : 'border-team-blue/50 bg-team-blue/10'
            } ${winner === t ? 'ring-2 ring-gold' : ''}`}
          >
            <div className={`display text-sm ${TEAM_TEXT[t]}`}>
              {TEAM_LABEL[t]}
              {team === t ? ' (você)' : ''}
            </div>
            <div className={`display text-5xl tabular-nums ${TEAM_TEXT[t]}`}>{game.scores[t]}</div>
          </div>
        ))}
      </div>

      {game.roundLog.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-2xl border-2 border-line bg-surface px-4 py-3 text-base">
          {game.roundLog.map((e) => (
            <li key={e.roundIndex} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-muted">{ROUND_INFO[e.kind].title}</span>
              <span className="shrink-0 tabular-nums">
                <span className="text-team-red">{e.delta.red}</span>
                <span className="text-muted"> × </span>
                <span className="text-team-blue">{e.delta.blue}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SpectatorScreen({ game }: { game: GameState }) {
  const info = ROUND_INFO[roundKindAt(game.roundIndex)];
  return (
    <WaitingCard emoji="🍺" title="Você está de espectador">
      O jogo começou antes de você escolher um time, e não dá pra entrar com a partida rolando.
      <br />
      Agora: rodada {game.roundIndex + 1} de {TOTAL_ROUNDS} — {info.title}. Acompanhe pela TV e entre na
      próxima partida.
    </WaitingCard>
  );
}
