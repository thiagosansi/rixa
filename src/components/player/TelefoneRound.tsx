'use client';

import { useRef, useState } from 'react';
import type { TelefoneState } from '@/game/types';
import {
  POINTS,
  TELEFONE_EMOJI_MAX,
  TELEFONE_PHRASE_MAX,
  TELEFONE_PHRASE_MIN,
  telefoneChainFor,
} from '@/game/rounds';
import { splitEmojis, validateTelefoneText } from '@/game/engine';
import { telefoneBonuses } from '@/game/telefone-view';
import { WaitingCard } from './WaitingCard';
import { TEAM_LABEL, TEAM_TEXT, buzz, playerName, type RoundProps } from './shared';

/* ------------------------------------------------------------------ */
/* painel de emojis (80, em grupos; cada um passa em `splitEmojis`)     */
/* ------------------------------------------------------------------ */

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'rostos',
    emojis: ['😂', '🤣', '😍', '😭', '😱', '😡', '🤢', '🥴', '😴', '🤔', '😎', '🙄', '🤡', '😈', '🥳', '😬'],
  },
  {
    label: 'pessoas e gestos',
    emojis: ['👍', '👎', '🙏', '👏', '💪', '🤷', '🤦', '🙈', '💃', '🕺', '🏃', '👶', '👵', '👴', '👰', '👮'],
  },
  {
    label: 'comida e bebida',
    emojis: ['🍕', '🍔', '🌭', '🍟', '🍗', '🥩', '🍰', '🎂', '🍺', '🍷', '🥃', '☕', '🍌', '🍉', '🥑', '🧀'],
  },
  {
    label: 'objetos',
    emojis: ['📱', '💻', '🔑', '🚪', '🛏️', '🚽', '🪣', '💰', '💣', '🔪', '🎁', '📦', '👗', '👙', '🩲', '🧻'],
  },
  {
    label: 'lugares e transporte',
    emojis: ['🏠', '🏥', '⛪', '🏖️', '🚗', '🚌', '✈️', '🚀'],
  },
  {
    label: 'símbolos',
    emojis: ['❤️', '💔', '🔥', '💩', '⚡', '💤', '❓', '❗'],
  },
];

/* ------------------------------------------------------------------ */
/* editor de frase                                                     */
/* ------------------------------------------------------------------ */

function phraseError(text: string): string | null {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return null;
  if (clean.length < TELEFONE_PHRASE_MIN) return `mínimo ${TELEFONE_PHRASE_MIN} letras`;
  if (clean.length > TELEFONE_PHRASE_MAX) return `máximo ${TELEFONE_PHRASE_MAX} letras`;
  return null;
}

function PhraseEditor({
  initial,
  starter,
  onSubmit,
  autoFocus,
}: {
  initial: string;
  /** começo sugerido (só no passo 0) */
  starter: string | null;
  onSubmit: (text: string) => void;
  autoFocus: boolean;
}) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const clean = text.replace(/\s+/g, ' ').trim();
  const error = phraseError(text);
  const valid = validateTelefoneText(text, 'phrase') !== null;

  function applyStarter() {
    if (!starter) return;
    const next = starter.endsWith('…') ? `${starter.slice(0, -1)} ` : `${starter} `;
    setText(next);
    const el = ref.current;
    if (el) {
      el.focus();
      requestAnimationFrame(() => el.setSelectionRange(next.length, next.length));
    }
  }

  function submit() {
    if (!valid) return;
    onSubmit(clean);
  }

  return (
    <form
      className="flex flex-col gap-2"
      data-testid="telefone-phrase-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {starter && (
        <button
          type="button"
          data-testid="telefone-use-starter"
          onClick={applyStarter}
          className="display flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border-2 border-line bg-surface-2 px-4 text-left text-base text-ink active:border-gold"
        >
          <span>Usar esse começo</span>
          <span className="text-gold">↓</span>
        </button>
      )}
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, TELEFONE_PHRASE_MAX + 20))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        onFocus={(e) => {
          // teclado abrindo: campo e botão continuam na tela
          const el = e.currentTarget;
          setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
        }}
        aria-label="sua frase"
        placeholder={starter ? 'complete o começo ou invente a sua' : 'escreva a frase'}
        rows={3}
        autoFocus={autoFocus}
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck
        enterKeyHint="send"
        data-testid="telefone-phrase"
        className="min-h-[5.5rem] w-full resize-none rounded-2xl border-2 border-line bg-surface px-4 py-3 text-xl leading-snug text-ink outline-none placeholder:text-muted/60 focus:border-gold"
      />
      <div className="flex items-center justify-between px-1 text-sm">
        <span role="alert" className={error ? 'text-team-red' : 'text-muted'} data-testid="telefone-error">
          {error ?? (clean.length === 0 ? `de ${TELEFONE_PHRASE_MIN} a ${TELEFONE_PHRASE_MAX} letras` : '')}
        </span>
        <span
          className={`tabular-nums ${clean.length > TELEFONE_PHRASE_MAX ? 'text-team-red' : 'text-muted'}`}
        >
          {clean.length}/{TELEFONE_PHRASE_MAX}
        </span>
      </div>
      <button
        type="submit"
        disabled={!valid}
        data-testid="telefone-send"
        // não rouba o foco do campo: o teclado continua aberto
        onPointerDown={(e) => e.preventDefault()}
        className="display min-h-16 w-full rounded-2xl border-2 border-gold bg-gold text-2xl text-[#170d02] shadow-[0_5px_0_#a8781f] active:translate-y-[3px] disabled:opacity-40 disabled:shadow-none"
      >
        Enviar
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* editor de emojis                                                    */
/* ------------------------------------------------------------------ */

function emojiError(text: string): string | null {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return null;
  const emojis = splitEmojis(clean);
  if (!emojis) return 'só emojis — nada de letras ou números';
  if (emojis.length > TELEFONE_EMOJI_MAX) return `máximo ${TELEFONE_EMOJI_MAX} emojis`;
  return null;
}

function EmojiEditor({ initial, onSubmit }: { initial: string; onSubmit: (text: string) => void }) {
  const [text, setText] = useState(initial);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const clean = text.replace(/\s+/g, ' ').trim();
  const emojis = splitEmojis(clean);
  const count = emojis?.length ?? 0;
  const error = emojiError(text);
  const valid = validateTelefoneText(text, 'emoji') !== null;
  const full = emojis !== null && count >= TELEFONE_EMOJI_MAX;

  function add(emoji: string) {
    if (full) return;
    setText((t) => t + emoji);
    buzz(10);
  }

  function backspace() {
    setText((t) => {
      const parts = splitEmojis(t.trim());
      if (parts && parts.length > 0) return parts.slice(0, -1).join('');
      // tem letra no meio: apaga o último caractere (code point) mesmo
      return Array.from(t).slice(0, -1).join('');
    });
  }

  function submit() {
    if (!valid) return;
    onSubmit(clean);
  }

  return (
    <form
      className="flex flex-col gap-2"
      data-testid="telefone-emoji-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-stretch gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="seus emojis"
          placeholder="🍕🔥…"
          type="text"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="send"
          data-testid="telefone-emoji"
          className="min-h-16 min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 text-[32px] leading-none text-ink outline-none placeholder:text-muted/50 focus:border-gold"
        />
        <button
          type="button"
          aria-label="apagar o último emoji"
          data-testid="telefone-backspace"
          onPointerDown={(e) => e.preventDefault()}
          onClick={backspace}
          disabled={text.length === 0}
          className="display min-h-16 min-w-16 shrink-0 rounded-2xl border-2 border-line bg-surface-2 text-3xl text-ink active:border-gold disabled:opacity-40"
        >
          ⌫
        </button>
      </div>
      <div className="flex items-center justify-between px-1 text-sm">
        <span role="alert" className={error ? 'text-team-red' : 'text-muted'} data-testid="telefone-error">
          {error ??
            (count === 0
              ? `toque nos emojis ou use o teclado · até ${TELEFONE_EMOJI_MAX}`
              : full
                ? 'chegou no máximo'
                : '')}
        </span>
        <span
          className={`tabular-nums ${error ? 'text-team-red' : 'text-muted'}`}
          data-testid="telefone-emoji-count"
        >
          {count}/{TELEFONE_EMOJI_MAX}
        </span>
      </div>
      <button
        type="submit"
        disabled={!valid}
        data-testid="telefone-send"
        onPointerDown={(e) => e.preventDefault()}
        className="display min-h-16 w-full rounded-2xl border-2 border-gold bg-gold text-2xl text-[#170d02] shadow-[0_5px_0_#a8781f] active:translate-y-[3px] disabled:opacity-40 disabled:shadow-none"
      >
        Enviar
      </button>

      <div
        data-testid="telefone-emoji-panel"
        className="max-h-[42dvh] overflow-y-auto overflow-x-hidden rounded-2xl border-2 border-line bg-surface py-1"
      >
        {EMOJI_GROUPS.map((g) => (
          <div key={g.label} className="mb-1">
            <div className="display px-2 pt-1 text-[11px] tracking-[0.15em] text-muted">{g.label}</div>
            <div className="grid grid-cols-8">
              {g.emojis.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`adicionar ${e}`}
                  data-emoji={e}
                  // não rouba o foco (nem abre o teclado) ao tocar
                  onPointerDown={(ev) => ev.preventDefault()}
                  onClick={() => add(e)}
                  disabled={full}
                  className="flex h-11 w-full items-center justify-center rounded-lg text-[26px] leading-none active:bg-gold/20 disabled:opacity-30"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* tela                                                                */
/* ------------------------------------------------------------------ */

export function TelefoneRound({ game, me, team, secret, act, round }: RoundProps & { round: TelefoneState }) {
  const [sentText, setSentText] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pendingVote, setPendingVote] = useState<number | null>(null);
  const position = round.order.indexOf(me.id);
  const n = round.order.length;

  if (position < 0) {
    return (
      <WaitingCard emoji="👀" title="Olha pra TV">
        Você não está numa corrente nesta rodada — acompanhe a revelação pela TV.
      </WaitingCard>
    );
  }

  const header = (label: string) => (
    <div className="flex items-center justify-between px-1">
      <span className="display text-base text-muted">
        passo {round.step + 1} de {round.steps}
      </span>
      <span className="display text-base text-gold">{label}</span>
    </div>
  );

  /* ---------- escrevendo ---------- */
  if (round.stage === 'writing') {
    const chainIndex = telefoneChainFor(position, round.step, n);
    const delivered = Boolean(round.chains[chainIndex]?.entries[round.step]);
    const task = secret.kind === 'telefone-task' && secret.step === round.step ? secret : null;
    if (!task) {
      return (
        <section className="flex flex-col gap-3" data-testid="telefone-writing" data-step={round.step}>
          {header('…')}
          <WaitingCard emoji="📨" title="Recebendo a sua corrente…">
            Já já chega o que você tem que fazer neste passo.
          </WaitingCard>
        </section>
      );
    }
    const emoji = task.mode === 'emoji';

    function submit(text: string) {
      setSentText(text);
      setEditing(false);
      buzz(30);
      act({ type: 'telefone-submit', text });
    }

    const showSent = (delivered || sentText !== null) && !editing;

    return (
      <section className="flex flex-col gap-3" data-testid="telefone-writing" data-step={round.step}>
        {header(emoji ? 'só emojis' : 'frase')}

        {task.input === null ? (
          <div className="rounded-2xl border-2 border-gold/60 bg-gold/10 px-4 py-3">
            <div className="display text-xs tracking-[0.2em] text-gold">comece uma corrente</div>
            <p className="mt-1 text-lg leading-snug text-ink">
              Começo sugerido:{' '}
              <span className="text-gold" data-testid="telefone-starter">
                {task.starter}
              </span>
            </p>
          </div>
        ) : emoji ? (
          <div className="rounded-2xl border-2 border-gold/60 bg-gold/10 px-4 py-3">
            <div className="display text-xs tracking-[0.2em] text-gold">reescreva isto só com emojis:</div>
            <p className="mt-1 break-words text-2xl leading-snug text-ink" data-testid="telefone-input">
              {task.input}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-gold/60 bg-gold/10 px-4 py-3 text-center">
            <div className="display text-xs tracking-[0.2em] text-gold">o que isso quer dizer?</div>
            <p
              className="mt-2 break-words text-5xl leading-[1.2] tracking-[0.06em]"
              data-testid="telefone-input"
            >
              {task.input}
            </p>
          </div>
        )}

        {showSent ? (
          <div
            className="animate-pop flex flex-col gap-3 rounded-2xl border-2 border-team-blue/60 bg-team-blue/10 px-4 py-3"
            data-testid="telefone-sent"
          >
            <div className="display text-sm text-team-blue">Enviado ✓ — dá pra editar até o tempo acabar</div>
            <p
              className={`break-words text-ink ${emoji ? 'text-4xl leading-[1.2] tracking-[0.06em]' : 'text-lg'}`}
            >
              {sentText ?? '(sua resposta já está com a TV)'}
            </p>
            <button
              type="button"
              data-testid="telefone-edit"
              onClick={() => setEditing(true)}
              className="display min-h-14 w-full rounded-2xl border-2 border-line bg-surface-2 text-lg text-ink active:border-gold"
            >
              Editar
            </button>
            <p className="text-center text-sm text-muted">
              Olha pra TV 👀 — o passo avança quando todo mundo entregar.
            </p>
          </div>
        ) : emoji ? (
          <EmojiEditor key={`e${round.step}`} initial={sentText ?? ''} onSubmit={submit} />
        ) : (
          <PhraseEditor
            key={`p${round.step}`}
            initial={sentText ?? ''}
            starter={round.step === 0 ? task.starter : null}
            onSubmit={submit}
            autoFocus
          />
        )}
      </section>
    );
  }

  /* ---------- revelação ---------- */
  if (round.stage === 'reveal') {
    const chain = round.chains[round.revealChain];
    const starter = chain ? playerName(game, chain.starterId) : '';
    return (
      <WaitingCard emoji="📺" title="Olha pra TV">
        Revelando as correntes na TV.
        <br />
        <span className="text-ink" data-testid="telefone-reveal-progress">
          Corrente {round.revealChain + 1} de {round.chains.length}
        </span>{' '}
        (de {starter}) · passo {round.revealStep + 1} de {round.steps}
      </WaitingCard>
    );
  }

  /* ---------- votação ---------- */
  if (round.stage === 'voting') {
    const myVote = round.votes[me.id];
    const chosen = myVote ?? pendingVote;
    const locked = chosen !== null && chosen !== undefined;
    const voted = Object.keys(round.votes).length;
    return (
      <section className="flex flex-col gap-3" data-testid="telefone-voting">
        <h2 className="display text-center text-2xl text-gold">
          {locked ? 'Votado ✓ — aguarde' : 'Qual corrente foi a mais engraçada?'}
        </h2>
        <ul className="flex flex-col gap-2">
          {round.chains.map((c, i) => {
            const own = c.starterId === me.id;
            const selected = chosen === i;
            const first = c.entries[0]?.text ?? '';
            const last = c.entries[c.entries.length - 1]?.text ?? '';
            return (
              <li key={i}>
                <button
                  type="button"
                  data-testid={`telefone-vote-${i}`}
                  disabled={own || locked}
                  onClick={() => {
                    setPendingVote(i);
                    buzz(30);
                    act({ type: 'telefone-vote', chainIndex: i });
                  }}
                  className={`flex min-h-16 w-full items-start gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-colors ${
                    selected
                      ? 'border-gold bg-gold/15 text-ink'
                      : own
                        ? 'border-dashed border-line bg-transparent text-muted'
                        : 'border-line bg-surface-2 text-ink active:border-gold disabled:opacity-50'
                  }`}
                >
                  <span
                    className={`display flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${
                      selected ? 'bg-gold text-[#170d02]' : 'bg-surface text-ink'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`display text-xs ${TEAM_TEXT[c.starterTeam]}`}>
                      {playerName(game, c.starterId)}
                      {own ? ' · essa é sua' : ''}
                      {selected ? ' · seu voto' : ''}
                    </span>
                    <span className="break-words text-base leading-snug">{first}</span>
                    <span className="break-words text-base leading-snug text-muted">
                      <span className="text-gold">→ </span>
                      {last}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-center text-base text-muted">
          {voted} de {n} votaram · não vale votar na sua
        </p>
      </section>
    );
  }

  /* ---------- resultado ---------- */
  const { counts, firsts, seconds, deltas } = telefoneBonuses(round, game.multiplier);
  const myChain = round.chains.findIndex((c) => c.starterId === me.id);
  const myVotes = myChain >= 0 ? counts[myChain] : 0;
  const isFirst = firsts.includes(myChain);
  const isSecond = seconds.includes(myChain);
  const survived = myChain >= 0 && round.survived[myChain];
  const place = isFirst ? 1 : isSecond ? 2 : round.ranking.indexOf(myChain) + 1;
  const bonus = isFirst ? POINTS.telefoneFirst : isSecond ? POINTS.telefoneSecond : 0;
  const rival = team === 'red' ? 'blue' : 'red';

  return (
    <section className="flex flex-col gap-3" data-testid="telefone-result">
      <WaitingCard
        emoji={isFirst ? '🏆' : isSecond ? '🥈' : survived ? '✅' : '💀'}
        title={
          isFirst
            ? 'Sua corrente foi a mais engraçada!'
            : isSecond
              ? 'Sua corrente ficou em 2º'
              : place > 0
                ? `Sua corrente ficou em ${place}º`
                : 'Sua corrente não recebeu votos'
        }
        tone={isFirst ? 'gold' : isSecond ? 'good' : survived ? 'good' : 'neutral'}
      >
        <span data-testid="telefone-my-votes">
          {myVotes} voto{myVotes === 1 ? '' : 's'}
          {bonus > 0 ? ` · +${bonus * game.multiplier} pro seu time` : ''}
        </span>
        <br />
        {survived
          ? `E chegou inteira: +${POINTS.telefoneSurvive * game.multiplier} pra cada time.`
          : 'Ela morreu no caminho — a frase final não tem a ver com a sua.'}
      </WaitingCard>

      <div className="grid grid-cols-2 gap-3 text-center">
        {([team, rival] as const).map((t) => (
          <div
            key={t}
            className={`rounded-2xl border-2 px-3 py-3 ${
              t === 'red' ? 'border-team-red/50 bg-team-red/10' : 'border-team-blue/50 bg-team-blue/10'
            }`}
          >
            <div className={`display text-sm ${TEAM_TEXT[t]}`}>
              {TEAM_LABEL[t]}
              {t === team ? ' (você)' : ''}
            </div>
            <div
              className={`display text-4xl tabular-nums ${TEAM_TEXT[t]}`}
              data-testid={`telefone-delta-${t}`}
            >
              +{deltas[t]}
            </div>
            <div className="text-xs text-muted">nesta rodada</div>
          </div>
        ))}
      </div>
      <p className="text-center text-lg text-muted">Olha pra TV 👀 — o pódio está lá.</p>
    </section>
  );
}

export default TelefoneRound;
