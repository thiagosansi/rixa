'use client';

import Image from 'next/image';
import type { CidadePlayer, CidadeReaction, CidadeState, CidadeTile } from '@/game/types';
import { cidadePlayerWealth } from '@/cidade/engine';
import { CIDADE_REACTIONS } from '@/cidade/content';

const COLOR_CLASSES: Record<CidadePlayer['color'], string> = {
  coral: 'bg-team-red',
  sky: 'bg-team-blue',
  lime: 'bg-[#3ddc97]',
  violet: 'bg-[#a78bfa]',
  orange: 'bg-[#fb923c]',
  pink: 'bg-[#f472b6]',
};

const GROUP_COLORS: Record<string, string> = {
  azul: 'bg-[#61b5df]',
  verde: 'bg-[#58bb7a]',
  laranja: 'bg-[#f39a4e]',
  roxo: 'bg-[#9b7be4]',
  rosa: 'bg-[#e879a3]',
  amarelo: 'bg-[#e4c249]',
};

const TILE_LABELS: Record<string, string[]> = {
  start: ['Praça', 'Central'],
  aurora: ['Vila', 'Aurora'],
  'event-1': ['Notícia do', 'Bairro'],
  mercado: ['Mercado', 'Municipal'],
  'tax-1': ['Taxa de', 'Urbanização'],
  estacao: ['Estação', 'Norte'],
  jardins: ['Jardins do', 'Sol'],
  'event-2': ['Boato na', 'Vizinhança'],
  cinema: ['Cinema da', 'Rua 8'],
  jail: ['Delegacia'],
  porto: ['Porto', 'Velho'],
  parque: ['Parque das', 'Mangueiras'],
  'event-3': ['Festival da', 'Cidade'],
  teatro: ['Teatro', 'Municipal'],
  'tax-2': ['Licença', 'Comercial'],
  farol: ['Farol da', 'Enseada'],
  'event-4': ['Achados e', 'Perdidos'],
  mirante: ['Mirante', 'Alto'],
  'go-to-jail': ['Fiscalização'],
  galeria: ['Galeria', 'Central'],
  'event-5': ['Festival de', 'Rua'],
  hotel: ['Hotel', 'Beira-Mar'],
  terminal: ['Terminal', 'Sul'],
  'event-6': ['Conselho', 'Comunitário'],
};

const TILE_IMAGES: Record<string, { src: string; alt: string }> = {
  start: { src: '/images/praca-central-3d.webp', alt: 'Miniatura 3D da Praça Central' },
  teatro: { src: '/images/teatro-municipal-3d.webp', alt: 'Miniatura 3D do Teatro Municipal' },
};

/** As 24 casas formam um circuito: topo, direita, baixo e esquerda. */
const BOARD_POSITIONS = [
  { column: 1, row: 1 }, { column: 2, row: 1 }, { column: 3, row: 1 }, { column: 4, row: 1 },
  { column: 5, row: 1 }, { column: 6, row: 1 }, { column: 7, row: 1 },
  { column: 7, row: 2 }, { column: 7, row: 3 }, { column: 7, row: 4 }, { column: 7, row: 5 }, { column: 7, row: 6 },
  { column: 7, row: 7 }, { column: 6, row: 7 }, { column: 5, row: 7 }, { column: 4, row: 7 },
  { column: 3, row: 7 }, { column: 2, row: 7 }, { column: 1, row: 7 },
  { column: 1, row: 6 }, { column: 1, row: 5 }, { column: 1, row: 4 }, { column: 1, row: 3 }, { column: 1, row: 2 },
] as const;

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function tileSurface(tile: CidadeTile): string {
  if (tile.type === 'property') return 'border-[#a8843f] bg-[#fff3d5]';
  if (tile.type === 'event') return 'border-[#4389c5] bg-[#eaf4ff]';
  if (tile.type === 'tax' || tile.type === 'go-to-jail') return 'border-[#cf5b5e] bg-[#ffe7e3]';
  if (tile.type === 'start') return 'border-[#2da66d] bg-[#e8f8dc]';
  return 'border-[#827294] bg-[#f0eaf5]';
}

function tileSymbol(tile: CidadeTile): string {
  if (tile.type === 'start') return '★';
  if (tile.type === 'property') return '◆';
  if (tile.type === 'event') return '✦';
  if (tile.type === 'tax') return '⚑';
  if (tile.type === 'go-to-jail') return '→';
  if (tile.type === 'jail') return '⌂';
  return '·';
}

function accentFor(tile: CidadeTile): string {
  if (tile.type === 'property') return GROUP_COLORS[tile.colorGroup ?? ''] ?? 'bg-[#b99754]';
  if (tile.type === 'event') return 'bg-[#4389c5]';
  if (tile.type === 'tax' || tile.type === 'go-to-jail') return 'bg-[#cf5b5e]';
  if (tile.type === 'start') return 'bg-[#2da66d]';
  return 'bg-[#827294]';
}

function tileNameLines(tile: CidadeTile): string[] {
  return TILE_LABELS[tile.id] ?? [tile.name];
}

function occupants(state: CidadeState, index: number): CidadePlayer[] {
  return state.players.filter((player) => player.position === index);
}

function DieFace({ value, label }: { value: number | null; label: string }) {
  const active = value ? PIPS[value] : [];
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#c9b88f] bg-[#fff9e9] p-1 shadow-[0_3px_0_rgba(91,61,36,0.22)] sm:h-14 sm:w-14" aria-label={`${label}: ${value ?? 'não lançado'}`}>
      {value ? (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5">
          {Array.from({ length: 9 }, (_, index) => <span key={index} className={`rounded-full ${active.includes(index) ? 'bg-[#463550]' : ''}`} />)}
        </div>
      ) : <span className="font-body text-3xl text-[#b9a986]">?</span>}
    </div>
  );
}

export function CityDice({ roll, compact = false }: { roll: [number, number] | null; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${compact ? 'scale-75 sm:scale-90' : ''}`} aria-label={roll ? `Dados: ${roll[0]} e ${roll[1]}` : 'Dados ainda não lançados'}>
      <DieFace value={roll?.[0] ?? null} label="Dado 1" />
      <DieFace value={roll?.[1] ?? null} label="Dado 2" />
    </div>
  );
}

function CityCenter({ state, compact }: { state: CidadeState; compact: boolean }) {
  const current = state.players.find((player) => player.id === state.currentPlayerId);
  const mover = state.lastMove ? state.players.find((player) => player.id === state.lastMove?.playerId) : null;
  return (
    <div className="relative col-start-2 col-span-5 row-start-2 row-span-5 min-h-0 overflow-hidden rounded-[1.35rem] border-[3px] border-[#b99d67] bg-[#f0dca9] text-center shadow-inner sm:rounded-[1.8rem]">
      {/* Arte 3D original gerada para o centro do tabuleiro. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/cidade-diorama-3d.webp" alt="Maquete 3D de uma praça cercada por prédios" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-[#f0dca9]/25" />
      <div className="relative flex h-full flex-col items-center justify-center gap-1 px-2 sm:gap-2">
        <div className="rounded-2xl border-2 border-[#b99d67] bg-[#fff3d5]/90 px-2 py-1 shadow-[0_4px_0_rgba(67,48,52,0.2)] sm:rounded-3xl sm:px-4 sm:py-2">
          <div className="display text-[1.05rem] leading-none text-[#463550] sm:text-3xl">Cidade</div>
          <div className="display -mt-0.5 text-[0.78rem] leading-none text-[#d2763f] sm:text-xl">em jogo</div>
          <div className="mt-1 font-body text-[0.5rem] font-bold text-[#6c5a4e] sm:text-xs">negócios · sorte · estratégia</div>
        </div>
        <CityDice roll={state.lastRoll} compact={compact} />
        <div className="max-w-[92%] rounded-full bg-[#fff3d5]/90 px-2 py-1 font-body text-[0.56rem] leading-tight text-[#463550] shadow-sm sm:px-3 sm:text-sm">
          {mover && state.lastMove ? <><strong>{mover.name}</strong> avançou {state.lastMove.steps} casas</> : current ? <><strong>{current.name}</strong> joga agora</> : 'Adicione jogadores para ocupar a cidade.'}
        </div>
      </div>
    </div>
  );
}

export function CityBoard({ state, compact = false }: { state: CidadeState; compact?: boolean }) {
  return (
    <section className="rounded-[2.25rem] border-[3px] border-[#c99d3f] bg-[#ead39a] p-2 shadow-[0_12px_0_rgba(51,31,49,0.28)] sm:p-4">
      <div className="rounded-[1.8rem] border-[3px] border-[#244e43] bg-[#347e61] p-1.5 sm:p-3">
        <div className="grid aspect-square grid-cols-7 grid-rows-7 gap-1 sm:gap-2">
          {state.board.map((tile, index) => {
            const property = state.properties[tile.id];
            const players = occupants(state, index);
            const owner = property?.ownerId ? state.players.find((player) => player.id === property.ownerId) : null;
            const position = BOARD_POSITIONS[index];
            return (
              <div
                key={tile.id}
                style={{ gridColumn: position.column, gridRow: position.row }}
                className={`flex min-h-0 flex-col justify-between overflow-hidden rounded-xl border-2 p-1 shadow-[0_2px_0_rgba(40,35,48,0.18)] ${tileSurface(tile)} ${compact ? 'text-[0.52rem] sm:text-[0.64rem]' : 'text-[0.62rem] sm:p-2 sm:text-xs'}`}
                title={`${tile.name}${tile.type === 'property' ? ` · $${tile.price} · aluguel $${tile.rent}` : ''}`}
              >
                <div className={`mb-1 h-1.5 shrink-0 rounded-full ${accentFor(tile)}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 font-body font-bold text-[#6b4f45]">
                    <span>{tileSymbol(tile)}</span>
                    {tile.type === 'property' && <span>${tile.price}</span>}
                  </div>
                  {TILE_IMAGES[tile.id] && <Image src={TILE_IMAGES[tile.id].src} alt={TILE_IMAGES[tile.id].alt} width={128} height={128} sizes="(min-width: 640px) 72px, 48px" className="mx-auto my-0.5 h-7 w-full object-contain sm:h-9" />}
                  <div className="mt-1 overflow-hidden font-body text-[0.56rem] font-extrabold leading-[0.98] tracking-[-0.01em] text-[#3d2d36] sm:text-[0.68rem]">
                    {tileNameLines(tile).map((line) => <span key={line} className="block whitespace-nowrap">{line}</span>)}
                  </div>
                  {tile.type === 'tax' && <div className="mt-1 font-body font-bold text-[#c34e55]">−${tile.tax}</div>}
                  {tile.type === 'event' && <div className="mt-1 font-body font-bold text-[#397fba]">carta</div>}
                  {tile.type === 'property' && property && property.level > 0 && <div className="mt-1 flex gap-0.5" aria-label={`${property.level} melhoria${property.level > 1 ? 's' : ''}`}>
                    {Array.from({ length: property.level }, (_, level) => <span key={level} className="h-2 w-2 rounded-sm bg-[#d2763f] shadow-sm sm:h-2.5 sm:w-2.5" />)}
                  </div>}
                  {owner && <div className="mt-1 truncate font-body font-bold text-[#b2762d]">{owner.name}</div>}
                </div>
                {players.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1" aria-label={`Jogadores em ${tile.name}`}>
                    {players.map((player) => (
                      <span key={player.id} title={player.name} className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/80 text-[0.58rem] font-bold text-white shadow-sm sm:h-7 sm:w-7 sm:text-xs ${state.lastMove?.playerId === player.id ? 'animate-bounce ring-2 ring-white' : ''} ${COLOR_CLASSES[player.color]}`}>
                        {player.name.slice(0, 1).toUpperCase()}
                        {state.lastReaction?.playerId === player.id && <span className="absolute -right-2 -top-4 text-sm drop-shadow sm:text-lg">{state.lastReaction.emoji}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <CityCenter state={state} compact={compact} />
        </div>
      </div>
    </section>
  );
}

export function CityScoreboard({ state }: { state: CidadeState }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {state.players.map((player) => (
        <div key={player.id} className={`rounded-2xl border-2 px-3 py-2 ${state.currentPlayerId === player.id ? 'border-gold bg-gold/10' : 'border-line bg-surface'}`}>
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 shrink-0 rounded-full ${COLOR_CLASSES[player.color]}`} />
            <span className="display min-w-0 truncate text-sm text-ink">{player.name}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-gold">${player.money}</span>
            <span className="text-muted">patrimônio ${cidadePlayerWealth(state, player)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CityReactions({ onReact }: { onReact: (emoji: CidadeReaction) => void }) {
  return (
    <section className="rounded-2xl border-2 border-line bg-surface px-3 py-3">
      <div className="display text-center text-xs tracking-[0.15em] text-muted">torcida da cidade</div>
      <div className="mt-2 flex justify-center gap-2">
        {CIDADE_REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => onReact(emoji)} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-line bg-surface-2 text-xl transition hover:-translate-y-0.5 hover:border-gold" aria-label={`Reagir ${emoji}`}>{emoji}</button>)}
      </div>
    </section>
  );
}

export function CityActivity({ state }: { state: CidadeState }) {
  return (
    <section className="rounded-2xl border-2 border-line bg-surface px-3 py-3">
      <div className="display text-xs tracking-[0.15em] text-muted">cidade ao vivo</div>
      <div className="mt-2 flex flex-col gap-1.5">
        {state.activity.length === 0 && <p className="text-sm text-muted">As jogadas e reações aparecerão aqui.</p>}
        {state.activity.slice(-5).reverse().map((entry) => <p key={entry.id} className="font-body text-sm leading-snug text-ink"><span className="mr-1 text-gold">•</span>{entry.text}</p>)}
      </div>
    </section>
  );
}
