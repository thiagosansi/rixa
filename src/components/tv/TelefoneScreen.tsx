'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { GameState, TelefoneChain, TelefoneEntry, TelefoneState } from '@/game/types';
import { DURATIONS, POINTS, TEAMS, telefoneChainFor } from '@/game/rounds';
import { splitEmojis, telefoneModeFor } from '@/game/engine';
import { telefoneBonuses } from '@/game/telefone-view';
import { Button, Timer } from '@/components/ui';
import { PlayHeader, TEAM_PANEL, TEAM_TEXT, playerName, playerTeam, teamLabel } from './shared';

/**
 * Arena do Telefone sem fio.
 *  - writing: NUNCA lê texto de corrente (o estado público chega com `text: ''`, mas
 *    a tela nem tenta): só quem entregou.
 *  - reveal: um "fio" vertical, um lance por vez; carimbo de sobrevivência no fim.
 *  - voting: correntes numeradas (1ª frase → última), contador de votos.
 *  - result: pódio + sobreviventes + pontos por time.
 */
export function TelefoneScreen({
  game,
  round,
  onNext,
}: {
  game: GameState;
  round: TelefoneState;
  onNext: () => void;
}) {
  return (
    <div
      className="flex flex-1 flex-col gap-4"
      data-tv="telefone"
      data-stage={round.stage}
      data-step={round.step}
    >
      {round.stage === 'writing' && <Writing game={game} round={round} />}
      {round.stage === 'reveal' && <Reveal game={game} round={round} onNext={onNext} />}
      {round.stage === 'voting' && <Voting game={game} round={round} />}
      {round.stage === 'result' && <Result game={game} round={round} onNext={onNext} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* helpers de texto                                                    */
/* ------------------------------------------------------------------ */

function stepTitle(step: number): string {
  if (step === 0) return 'Comece uma frase';
  return telefoneModeFor(step) === 'emoji' ? 'Reescreva só com emojis' : 'Traduza os emojis';
}

function stepHint(step: number): string {
  if (step === 0) return 'cada um começa a própria corrente no celular — tem um começo sugerido lá';
  return telefoneModeFor(step) === 'emoji'
    ? 'chegou a frase de outra pessoa: vire ela em emojis, sem nenhuma letra'
    : 'chegaram só emojis: escreva a frase que você acha que eles querem dizer';
}

/** Fonte do balão de frase pelo comprimento (tudo escala com a ALTURA da TV). */
function phraseSize(text: string): string {
  if (text.length <= 30) return 'text-[clamp(1.5rem,4.6vh,3rem)]';
  if (text.length <= 70) return 'text-[clamp(1.25rem,3.6vh,2.25rem)]';
  return 'text-[clamp(1.05rem,2.9vh,1.75rem)]';
}

/** Emojis ~2x a frase; encolhe um pouco quando são muitos. */
function emojiSize(text: string): string {
  const count = splitEmojis(text)?.length ?? 12;
  return count <= 6 ? 'text-[clamp(2.25rem,6.5vh,4.5rem)]' : 'text-[clamp(1.75rem,5.5vh,3.5rem)]';
}

/** Tamanho da fonte dos cards de votação: encolhe conforme a quantidade de correntes. */
function cardSize(n: number): { phrase: string; emoji: string } {
  if (n <= 4)
    return {
      phrase: 'text-[clamp(1.25rem,3.2vh,2rem)]',
      emoji: 'text-[clamp(1.25rem,3.4vh,2.25rem)]',
    };
  if (n <= 6)
    return {
      phrase: 'text-[clamp(1.1rem,2.7vh,1.6rem)]',
      emoji: 'text-[clamp(1.1rem,2.9vh,1.75rem)]',
    };
  return {
    phrase: 'text-[clamp(1rem,2.3vh,1.35rem)]',
    emoji: 'text-[clamp(1rem,2.5vh,1.5rem)]',
  };
}

function firstPhrase(chain: TelefoneChain): string {
  return chain.entries[0]?.text ?? '';
}

function lastPhrase(chain: TelefoneChain): string {
  return chain.entries[chain.entries.length - 1]?.text ?? '';
}

function middleEmojis(chain: TelefoneChain): string[] {
  return chain.entries.filter((e) => e.mode === 'emoji').map((e) => e.text);
}

/* ------------------------------------------------------------------ */
/* writing                                                             */
/* ------------------------------------------------------------------ */

function StepTrack({ steps, step }: { steps: number; step: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="passos da corrente">
      {Array.from({ length: steps }, (_, k) => {
        const mode = telefoneModeFor(k);
        const state = k < step ? 'done' : k === step ? 'current' : 'todo';
        const tone =
          state === 'current'
            ? 'border-gold bg-gold text-[#170d02]'
            : state === 'done'
              ? 'border-gold/50 bg-gold/15 text-gold'
              : 'border-line bg-surface text-muted';
        return (
          <li
            key={k}
            data-state={state}
            className={`display rounded-lg border-2 px-2.5 py-1 text-base md:text-lg ${tone}`}
          >
            {mode === 'emoji' ? '😀' : 'Aa'}
          </li>
        );
      })}
    </ol>
  );
}

function Writing({ game, round }: { game: GameState; round: TelefoneState }) {
  const n = round.order.length;
  const done = round.order.map((_, position) => {
    const chain = round.chains[telefoneChainFor(position, round.step, n)];
    return Boolean(chain?.entries[round.step]);
  });
  const doneCount = done.filter(Boolean).length;
  const cols = n <= 4 ? 'grid-cols-4' : n <= 6 ? 'grid-cols-3' : n <= 8 ? 'grid-cols-4' : 'grid-cols-5';
  const emoji = telefoneModeFor(round.step) === 'emoji';

  return (
    <>
      <PlayHeader
        eyebrow={`Passo ${round.step + 1} de ${round.steps}`}
        deadline={round.deadline}
        totalMs={DURATIONS.telefone.step}
      >
        <StepTrack steps={round.steps} step={round.step} />
      </PlayHeader>

      <div
        key={round.step}
        className="animate-slide-up flex flex-1 flex-col items-center justify-center gap-[clamp(0.75rem,3vh,2rem)] text-center"
      >
        <div>
          <h2 className="display stroke-title tv-lh text-balance text-[clamp(2.5rem,8vh,5.5rem)] text-gold">
            {emoji ? '😀 ' : '✍️ '}
            {stepTitle(round.step)}
          </h2>
          <p className="mt-2 text-[clamp(1.125rem,2.8vh,1.75rem)] text-muted">{stepHint(round.step)}</p>
        </div>

        <div className="w-full max-w-6xl">
          <div className="display mb-3 text-[clamp(1.25rem,3vh,1.75rem)] text-muted">
            <span className="text-ink" data-tv="telefone-count">
              {doneCount} de {n}
            </span>{' '}
            entregaram
          </div>
          <ul className={`grid ${cols} gap-3`} data-tv="telefone-progress">
            {round.order.map((id, position) => {
              const team = playerTeam(game, id);
              const ok = done[position];
              return (
                <li
                  key={id}
                  data-done={ok ? '1' : '0'}
                  className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-[clamp(0.5rem,1.6vh,1rem)] transition-opacity duration-300 ${
                    team ? TEAM_PANEL[team] : 'border-line bg-surface'
                  } ${ok ? 'opacity-100' : 'opacity-60'}`}
                >
                  <span
                    className={`display min-w-0 truncate text-[clamp(1.25rem,3.4vh,2.25rem)] ${team ? TEAM_TEXT[team] : 'text-ink'}`}
                  >
                    {playerName(game, id)}
                  </span>
                  {ok ? (
                    <span
                      key="done"
                      className="display animate-pop flex h-[clamp(2rem,5vh,3rem)] w-[clamp(2rem,5vh,3rem)] shrink-0 items-center justify-center rounded-full bg-gold text-[clamp(1.25rem,3.2vh,2rem)] text-[#170d02]"
                      aria-label="entregou"
                    >
                      ✓
                    </span>
                  ) : (
                    <span className="display animate-pulse-soft shrink-0 text-[clamp(0.9rem,2.2vh,1.25rem)] text-muted">
                      escrevendo…
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p
        data-tv="telefone-rules"
        className="display flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-line bg-surface/60 px-4 py-2 text-[clamp(0.95rem,2.2vh,1.25rem)] text-muted"
      >
        <span className="text-team-red">📵 regras</span>
        <span>ninguém vê a corrente inteira</span>
        <span>frase: 3 a 120 letras</span>
        <span>emojis: 1 a 12, sem letra nenhuma</span>
        <span>não entregou? vai em branco</span>
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* cabeçalho compacto (reveal/voting/result: o relógio grande do PlayHeader */
/* roubaria a altura que o fio e os cards precisam em 720p)               */
/* ------------------------------------------------------------------ */

function CompactHeader({
  eyebrow,
  title,
  titleClass = 'text-gold',
  deadline,
  totalMs,
  children,
}: {
  eyebrow: string;
  title: string;
  titleClass?: string;
  deadline: number;
  totalMs: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <div className="display text-[clamp(1rem,2.4vh,1.5rem)] text-muted">{eyebrow}</div>
        <h2 className={`display tv-lh truncate text-[clamp(1.75rem,5vh,3.25rem)] ${titleClass}`}>{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {children}
        <div data-tv="timer">
          <Timer deadline={deadline} totalMs={totalMs} size="md" className="w-28" />
        </div>
      </div>
    </div>
  );
}

/** Chips pequenos de quem já votou (o NameChip padrão é grande demais pra 720p). */
function SmallChips({ game, ids, done }: { game: GameState; ids: string[]; done: (id: string) => boolean }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {ids.map((id) => {
        const team = playerTeam(game, id);
        const ok = done(id);
        return (
          <span
            key={id}
            className={`display inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1 text-[clamp(0.9rem,2.2vh,1.25rem)] transition-opacity ${
              team ? `${TEAM_PANEL[team]} ${TEAM_TEXT[team]}` : 'border-line bg-surface text-ink'
            } ${ok ? 'animate-pop opacity-100' : 'opacity-40'}`}
          >
            <span aria-hidden>{ok ? '✓' : '…'}</span>
            {playerName(game, id)}
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* reveal                                                              */
/* ------------------------------------------------------------------ */

function AutoTag() {
  return (
    <span className="display rounded-md border border-dashed border-line px-1.5 py-0.5 text-[clamp(0.7rem,1.6vh,0.9rem)] text-muted">
      automático
    </span>
  );
}

function ThreadEntry({
  game,
  entry,
  step,
  current,
}: {
  game: GameState;
  entry: TelefoneEntry;
  step: number;
  current: boolean;
}) {
  const team = playerTeam(game, entry.playerId);
  const emoji = entry.mode === 'emoji';
  const bubble = emoji
    ? 'border-gold/50 bg-gold/10'
    : entry.auto
      ? 'border-dashed border-line bg-surface/60'
      : 'border-line bg-surface';
  return (
    <li
      data-tv="telefone-entry"
      data-mode={entry.mode}
      className={`grid grid-cols-[2.5rem_minmax(0,1fr)_10rem] items-center gap-3 ${current ? 'tv-reveal-pop' : ''}`}
    >
      <span
        className={`display flex h-10 w-10 items-center justify-center rounded-full border-2 text-xl ${
          emoji ? 'border-gold bg-gold/20 text-gold' : 'border-line bg-surface-2 text-ink'
        }`}
      >
        {step + 1}
      </span>
      <div
        className={`min-w-0 rounded-2xl border-2 px-5 py-[clamp(0.25rem,1vh,0.75rem)] ${bubble} ${
          emoji ? 'text-center' : ''
        }`}
      >
        <p
          className={`break-words ${emoji ? `leading-[1.1] tracking-[0.08em] ${emojiSize(entry.text)}` : `leading-[1.2] ${entry.auto ? 'italic text-muted' : 'text-ink'} ${phraseSize(entry.text)}`}`}
        >
          {entry.text}
        </p>
      </div>
      <div className="flex min-w-0 flex-col items-start gap-0.5">
        <span
          className={`display w-full truncate text-[clamp(1rem,2.6vh,1.5rem)] ${team ? TEAM_TEXT[team] : 'text-ink'}`}
        >
          {playerName(game, entry.playerId)}
        </span>
        <span className="text-[clamp(0.75rem,1.8vh,1rem)] text-muted">
          {entry.auto ? <AutoTag /> : emoji ? 'em emojis' : step === 0 ? 'começou' : 'traduziu'}
        </span>
      </div>
    </li>
  );
}

function SurvivalStamp({
  game,
  chain,
  survived,
}: {
  game: GameState;
  chain: TelefoneChain;
  survived: boolean;
}) {
  const bonus = POINTS.telefoneSurvive * game.multiplier;
  return (
    <div
      data-tv="telefone-survived"
      data-survived={survived ? '1' : '0'}
      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4"
    >
      <div className="rounded-2xl border-2 border-line bg-surface px-4 py-1.5">
        <div className="display text-[clamp(0.8rem,1.9vh,1rem)] text-muted">começou assim</div>
        <p className="line-clamp-2 text-[clamp(1rem,2.6vh,1.5rem)] leading-tight text-ink">
          “{firstPhrase(chain)}”
        </p>
      </div>
      <div
        className={`tv-stamp display flex flex-col items-center rounded-3xl border-4 px-6 py-1 text-center ${
          survived
            ? 'tv-glow-gold border-gold bg-gold text-[#170d02]'
            : 'rotate-[-3deg] border-team-red bg-team-red/15 text-team-red'
        }`}
      >
        <span className="text-[clamp(1.4rem,4vh,3rem)] leading-none">
          {survived ? 'Sobreviveu ✅' : 'Morreu no caminho 💀'}
        </span>
        <span className="mt-0.5 text-[clamp(0.85rem,2.1vh,1.4rem)] opacity-90">
          {survived ? `+${bonus} pra cada time` : 'ninguém pontua'}
        </span>
      </div>
      <div
        className={`rounded-2xl border-2 px-4 py-1.5 ${survived ? 'border-gold/50 bg-gold/10' : 'border-line bg-surface'}`}
      >
        <div className="display text-[clamp(0.8rem,1.9vh,1rem)] text-muted">chegou assim</div>
        <p className="line-clamp-2 text-[clamp(1rem,2.6vh,1.5rem)] leading-tight text-ink">
          “{lastPhrase(chain)}”
        </p>
      </div>
    </div>
  );
}

function Reveal({ game, round, onNext }: { game: GameState; round: TelefoneState; onNext: () => void }) {
  const chain = round.chains[round.revealChain];
  const shown = chain ? chain.entries.slice(0, round.revealStep + 1) : [];
  const complete = round.revealStep >= round.steps - 1;
  const listRef = useRef<HTMLOListElement>(null);

  // último recurso: se o fio não coube, rola pro lance que acabou de entrar
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [round.revealChain, round.revealStep]);

  if (!chain) return null;
  const team = chain.starterTeam;

  return (
    <div
      key={round.revealChain}
      className="animate-slide-up flex flex-1 flex-col gap-2"
      data-tv="telefone-reveal"
    >
      <CompactHeader
        eyebrow={`Corrente ${round.revealChain + 1} de ${round.chains.length} · passo ${round.revealStep + 1} de ${round.steps}`}
        title={`Corrente de ${playerName(game, chain.starterId)} · ${teamLabel(team)}`}
        titleClass={TEAM_TEXT[team]}
        deadline={round.deadline}
        totalMs={DURATIONS.telefone.reveal}
      >
        <ol className="flex items-center gap-1.5" aria-label="correntes">
          {round.chains.map((c, i) => (
            <li
              key={i}
              className={`h-3 w-6 rounded-full ${
                i < round.revealChain ? 'bg-gold/50' : i === round.revealChain ? 'bg-gold' : 'bg-line'
              }`}
              title={playerName(game, c.starterId)}
            />
          ))}
        </ol>
        <Button size="md" variant="ghost" onClick={onNext} data-tv="primary-action">
          {complete
            ? round.revealChain + 1 < round.chains.length
              ? 'Próxima corrente'
              : 'Votar'
            : 'Próximo'}
        </Button>
      </CompactHeader>

      <ol
        ref={listRef}
        className="flex min-h-0 flex-col gap-[clamp(0.25rem,0.8vh,0.75rem)] overflow-y-auto pr-1"
        style={{
          maxHeight: complete ? 'calc(100dvh - 352px)' : 'calc(100dvh - 280px)',
        }}
      >
        {shown.map((e, k) => (
          <ThreadEntry key={k} game={game} entry={e} step={k} current={k === round.revealStep} />
        ))}
      </ol>

      {complete && (
        <SurvivalStamp game={game} chain={chain} survived={round.survived[round.revealChain] ?? false} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* voting                                                              */
/* ------------------------------------------------------------------ */

function ChainCard({
  game,
  chain,
  index,
  size,
  compact = false,
}: {
  game: GameState;
  chain: TelefoneChain;
  index: number;
  size: { phrase: string; emoji: string };
  compact?: boolean;
}) {
  const middle = middleEmojis(chain);
  return (
    <li
      data-tv="telefone-chain-option"
      className={`flex gap-4 rounded-3xl border-2 px-5 ${compact ? 'py-2' : 'py-[clamp(0.5rem,1.8vh,1rem)]'} ${TEAM_PANEL[chain.starterTeam]}`}
    >
      <span className="display flex h-[clamp(2.5rem,6vh,4rem)] w-[clamp(2.5rem,6vh,4rem)] shrink-0 items-center justify-center rounded-2xl bg-gold text-[clamp(1.5rem,4vh,2.75rem)] text-[#170d02]">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className={`display text-[clamp(0.9rem,2.2vh,1.25rem)] ${TEAM_TEXT[chain.starterTeam]}`}>
          começou {playerName(game, chain.starterId)}
        </div>
        <p className={`line-clamp-2 leading-tight text-ink ${size.phrase}`}>{firstPhrase(chain)}</p>
        <div className={`flex min-w-0 items-center gap-2 leading-none text-muted ${size.emoji}`}>
          <span className="text-[0.8em]">↓</span>
          <span className="min-w-0 truncate">{middle.join('  ·  ')}</span>
        </div>
        <p className={`line-clamp-2 leading-tight text-muted ${size.phrase}`}>
          <span className="text-gold">→ </span>
          {lastPhrase(chain)}
        </p>
      </div>
    </li>
  );
}

function Voting({ game, round }: { game: GameState; round: TelefoneState }) {
  const n = round.chains.length;
  const voters = round.order;
  const voted = Object.keys(round.votes).length;
  const cols = n <= 4 ? 'grid-cols-2' : n <= 6 ? 'grid-cols-3' : 'grid-cols-4';
  const size = cardSize(n);

  return (
    <>
      <CompactHeader
        eyebrow="Votação · no celular"
        title="Qual corrente foi a mais engraçada?"
        deadline={round.deadline}
        totalMs={DURATIONS.telefone.voting}
      />

      <div key="voting" className="animate-slide-up flex flex-1 flex-col gap-3">
        <ol className={`grid ${cols} content-start gap-3`}>
          {round.chains.map((c, i) => (
            <ChainCard key={i} game={game} chain={c} index={i} size={size} compact={n > 6} />
          ))}
        </ol>
        <div className="mt-auto text-center">
          <div className="display mb-2 text-[clamp(1.1rem,2.8vh,1.75rem)] text-muted">
            votos ·{' '}
            <span className="text-ink" data-tv="telefone-votes">
              {voted}/{voters.length}
            </span>{' '}
            · não vale votar na própria
          </div>
          <SmallChips game={game} ids={voters} done={(id) => round.votes[id] !== undefined} />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* result                                                              */
/* ------------------------------------------------------------------ */

function Podium({
  game,
  round,
  chainIndex,
  place,
  votes,
  delay,
}: {
  game: GameState;
  round: TelefoneState;
  chainIndex: number;
  place: 1 | 2;
  votes: number;
  delay: number;
}) {
  const chain = round.chains[chainIndex];
  const points = (place === 1 ? POINTS.telefoneFirst : POINTS.telefoneSecond) * game.multiplier;
  const gold = place === 1;
  return (
    <li
      data-tv="telefone-rank"
      data-place={place}
      className={`tv-stamp flex min-w-0 flex-col gap-1 rounded-3xl border-4 px-6 py-[clamp(0.5rem,2vh,1.25rem)] ${
        gold ? 'tv-glow-gold border-gold bg-gold/15' : TEAM_PANEL[chain.starterTeam]
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-4">
        <span
          className={`display text-[clamp(2rem,6vh,4rem)] leading-none ${gold ? 'text-gold' : 'text-ink'}`}
        >
          {place}º {gold ? '🏆' : '🥈'}
        </span>
        <span
          className={`display text-[clamp(1.75rem,5.5vh,3.5rem)] leading-none ${gold ? 'text-gold' : TEAM_TEXT[chain.starterTeam]}`}
        >
          +{points}
        </span>
      </div>
      <div className={`display truncate text-[clamp(1.5rem,4.2vh,2.75rem)] ${TEAM_TEXT[chain.starterTeam]}`}>
        {playerName(game, chain.starterId)}{' '}
        <span className="text-[0.6em] text-muted">
          · {teamLabel(chain.starterTeam)} · {votes} voto
          {votes === 1 ? '' : 's'}
        </span>
      </div>
      <p className="line-clamp-2 text-[clamp(1rem,2.6vh,1.5rem)] leading-tight text-ink">
        “{firstPhrase(chain)}”
      </p>
      <p className="line-clamp-2 text-[clamp(1rem,2.6vh,1.5rem)] leading-tight text-muted">
        <span className="text-gold">→ </span>“{lastPhrase(chain)}”
      </p>
    </li>
  );
}

function Result({ game, round, onNext }: { game: GameState; round: TelefoneState; onNext: () => void }) {
  const { counts, firsts, seconds, deltas } = telefoneBonuses(round, game.multiplier);
  const survivors = round.chains.map((c, i) => ({ c, i })).filter(({ i }) => round.survived[i]);
  const podium = [
    ...firsts.map((i) => ({ i, place: 1 as const })),
    ...seconds.map((i) => ({ i, place: 2 as const })),
  ];
  const cols = podium.length <= 1 ? 'grid-cols-1' : podium.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <>
      <CompactHeader
        eyebrow="Resultado"
        title={podium.length > 0 ? 'As mais engraçadas 🏆' : 'Ninguém votou'}
        deadline={round.deadline}
        totalMs={DURATIONS.telefone.result}
      >
        <Button size="md" variant="ghost" onClick={onNext} data-tv="primary-action">
          Fechar rodada
        </Button>
      </CompactHeader>

      <div key="result" className="animate-slide-up flex flex-1 flex-col gap-4" data-tv="telefone-result">
        <div className="flex flex-1 flex-col justify-center gap-4">
          {podium.length > 0 && (
            <ol className={`grid ${cols} mx-auto w-full max-w-6xl gap-4`}>
              {podium.map(({ i, place }, k) => (
                <Podium
                  key={i}
                  game={game}
                  round={round}
                  chainIndex={i}
                  place={place}
                  votes={counts[i]}
                  delay={k * 350}
                />
              ))}
            </ol>
          )}
          {firsts.length > 1 && (
            <p className="display text-center text-[clamp(1rem,2.6vh,1.5rem)] text-muted">
              empate no 1º: cada uma leva +{POINTS.telefoneFirst * game.multiplier} e não há 2º
            </p>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
          <section
            className="tv-rule rounded-2xl border-2 border-line bg-surface px-5 py-3"
            style={{ animationDelay: '700ms' }}
            data-tv="telefone-survivors"
          >
            <div className="display text-[clamp(1rem,2.4vh,1.35rem)] text-muted">
              chegaram inteiras{' '}
              <span className="text-ink">
                ({survivors.length} de {round.chains.length})
              </span>{' '}
              · +{POINTS.telefoneSurvive * game.multiplier} pra cada time por corrente
            </div>
            {survivors.length === 0 ? (
              <p className="mt-1 text-[clamp(1.1rem,2.8vh,1.6rem)] text-muted">
                nenhuma sobreviveu ao caminho 💀
              </p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {survivors.map(({ c, i }) => (
                  <li
                    key={i}
                    className={`display animate-pop rounded-xl border-2 px-3 py-1 text-[clamp(1rem,2.6vh,1.5rem)] ${TEAM_PANEL[c.starterTeam]} ${TEAM_TEXT[c.starterTeam]}`}
                  >
                    ✅ {playerName(game, c.starterId)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex gap-4">
            {TEAMS.map((team, k) => (
              <div
                key={team}
                data-tv="telefone-delta"
                data-team={team}
                className={`tv-stamp rounded-2xl border-2 px-8 py-2 text-center ${TEAM_PANEL[team]}`}
                style={{ animationDelay: `${1000 + k * 200}ms` }}
              >
                <div className={`display text-[clamp(0.9rem,2.2vh,1.25rem)] ${TEAM_TEXT[team]}`}>
                  {teamLabel(team)}
                </div>
                <div
                  className={`display text-[clamp(2.5rem,7vh,4.5rem)] leading-none tabular-nums ${TEAM_TEXT[team]}`}
                >
                  +{deltas[team]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default TelefoneScreen;
