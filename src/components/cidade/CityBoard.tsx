'use client';

import type { CidadePlayer, CidadeState, CidadeTile } from '@/game/types';
import { cidadePlayerWealth } from '@/cidade/engine';

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
  return (
    <div className="relative col-start-2 col-span-5 row-start-2 row-span-5 min-h-0 overflow-hidden rounded-[1.35rem] border-[3px] border-[#b99d67] bg-[#f0dca9] text-center shadow-inner sm:rounded-[1.8rem]">
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(135deg, transparent 0 42%, rgba(77,142,126,.25) 42% 45%, transparent 45% 100%), linear-gradient(25deg, transparent 0 58%, rgba(208,160,82,.22) 58% 61%, transparent 61% 100%), radial-gradient(circle at 18% 22%, rgba(255,255,255,.8), transparent 28%)' }} />
      <div className="pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full border-[10px] border-[#6aa87f]/30 sm:h-44 sm:w-44" />
      <div className="pointer-events-none absolute -bottom-10 -left-5 h-24 w-36 rotate-12 rounded-[45%] bg-[#74b48a]/25 sm:h-32 sm:w-52" />
      <div className="relative flex h-full flex-col items-center justify-center gap-1 px-2 sm:gap-2">
        <div className="flex items-end gap-0.5 text-[#315e57]" aria-hidden="true">
          <span className="h-5 w-2 rounded-t-sm bg-[#d86c57] sm:h-8 sm:w-3" />
          <span className="h-8 w-3 rounded-t-sm bg-[#4d8fb0] sm:h-12 sm:w-4" />
          <span className="h-6 w-2 rounded-t-sm bg-[#e1a84f] sm:h-9 sm:w-3" />
          <span className="h-10 w-3 rounded-t-sm bg-[#6c73b5] sm:h-14 sm:w-4" />
          <span className="h-7 w-2 rounded-t-sm bg-[#d86c57] sm:h-10 sm:w-3" />
        </div>
        <div className="display text-[1.05rem] leading-none text-[#463550] sm:text-3xl">Cidade</div>
        <div className="display -mt-0.5 text-[0.78rem] leading-none text-[#d2763f] sm:text-xl">em jogo</div>
        <div className="font-body text-[0.55rem] font-semibold text-[#6c5a4e] sm:text-sm">negócios · sorte · estratégia</div>
        <CityDice roll={state.lastRoll} compact={compact} />
        <div className="max-w-[92%] font-body text-[0.56rem] leading-tight text-[#463550] sm:text-sm">
          {current ? <><strong>{current.name}</strong> joga agora</> : 'Adicione jogadores para ocupar a cidade.'}
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
                  <div className="mt-1 break-words font-body text-[0.66rem] font-extrabold leading-[0.92] tracking-tight text-[#3d2d36] sm:text-[0.78rem]">{tile.name}</div>
                  {tile.type === 'tax' && <div className="mt-1 font-body font-bold text-[#c34e55]">−${tile.tax}</div>}
                  {tile.type === 'event' && <div className="mt-1 font-body font-bold text-[#397fba]">carta</div>}
                  {owner && <div className="mt-1 truncate font-body font-bold text-[#b2762d]">{owner.name}</div>}
                </div>
                {players.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1" aria-label={`Jogadores em ${tile.name}`}>
                    {players.map((player) => (
                      <span key={player.id} title={player.name} className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/80 text-[0.58rem] font-bold text-white shadow-sm sm:h-7 sm:w-7 sm:text-xs ${COLOR_CLASSES[player.color]}`}>
                        {player.name.slice(0, 1).toUpperCase()}
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
