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

/** As 24 casas formam um circuito: topo, direita, baixo e esquerda. */
const BOARD_POSITIONS = [
  { column: 1, row: 1 }, { column: 2, row: 1 }, { column: 3, row: 1 }, { column: 4, row: 1 },
  { column: 5, row: 1 }, { column: 6, row: 1 }, { column: 7, row: 1 },
  { column: 7, row: 2 }, { column: 7, row: 3 }, { column: 7, row: 4 }, { column: 7, row: 5 }, { column: 7, row: 6 },
  { column: 7, row: 7 }, { column: 6, row: 7 }, { column: 5, row: 7 }, { column: 4, row: 7 },
  { column: 3, row: 7 }, { column: 2, row: 7 }, { column: 1, row: 7 },
  { column: 1, row: 6 }, { column: 1, row: 5 }, { column: 1, row: 4 }, { column: 1, row: 3 }, { column: 1, row: 2 },
] as const;

function tileTone(tile: CidadeTile): string {
  if (tile.type === 'property') return 'border-gold/60 bg-gold/10';
  if (tile.type === 'event') return 'border-team-blue/60 bg-team-blue/10';
  if (tile.type === 'tax' || tile.type === 'go-to-jail') return 'border-team-red/60 bg-team-red/10';
  if (tile.type === 'start') return 'border-[#3ddc97]/70 bg-[#3ddc97]/15';
  return 'border-line bg-surface';
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

function occupants(state: CidadeState, index: number): CidadePlayer[] {
  return state.players.filter((player) => player.position === index);
}

export function CityDice({ roll, compact = false }: { roll: [number, number] | null; compact?: boolean }) {
  const values = roll ?? [null, null];
  return (
    <div className={`flex items-center justify-center gap-2 ${compact ? 'scale-90' : ''}`} aria-label={roll ? `Dados: ${roll[0]} e ${roll[1]}` : 'Dados ainda não lançados'}>
      {values.map((value, index) => (
        <div key={index} className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-line bg-surface text-3xl text-ink shadow-[0_3px_0_rgba(0,0,0,0.25)] sm:h-14 sm:w-14 sm:text-4xl">
          {value ?? '–'}
        </div>
      ))}
    </div>
  );
}

export function CityBoard({ state, compact = false }: { state: CidadeState; compact?: boolean }) {
  const current = state.players.find((player) => player.id === state.currentPlayerId);
  return (
    <section className="rounded-[2rem] border-2 border-gold/40 bg-[#171126] p-2 shadow-[0_10px_0_rgba(0,0,0,0.2)] sm:p-4">
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
              className={`flex min-h-0 flex-col justify-between overflow-hidden rounded-lg border-2 p-1 ${tileTone(tile)} ${compact ? 'text-[0.55rem] sm:text-[0.65rem]' : 'text-[0.62rem] sm:rounded-xl sm:p-2 sm:text-xs'} ${index === 0 ? 'ring-2 ring-[#3ddc97]' : ''}`}
              title={`${tile.name}${tile.type === 'property' ? ` · $${tile.price} · aluguel $${tile.rent}` : ''}`}
            >
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-gold">{tileSymbol(tile)}</span>
                  {tile.type === 'property' && <span className="text-muted">${tile.price}</span>}
                </div>
                <div className="display mt-1 line-clamp-3 break-words leading-tight text-ink">{tile.name}</div>
                {tile.type === 'tax' && <div className="mt-1 text-team-red">−${tile.tax}</div>}
                {tile.type === 'event' && <div className="mt-1 text-team-blue">carta</div>}
                {owner && <div className="mt-1 truncate text-gold">{owner.name}</div>}
              </div>
              {players.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1" aria-label={`Jogadores em ${tile.name}`}>
                  {players.map((player) => (
                    <span key={player.id} title={player.name} className={`flex h-5 w-5 items-center justify-center rounded-full border border-bg text-[0.6rem] font-bold text-white sm:h-7 sm:w-7 sm:text-xs ${COLOR_CLASSES[player.color]}`}>
                      {player.name.slice(0, 1).toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="col-start-2 col-span-5 row-start-2 row-span-5 flex min-h-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-line bg-surface-2 px-2 text-center sm:gap-3 sm:rounded-3xl">
          <div className="display text-lg text-gold sm:text-3xl">Cidade em Jogo</div>
          <div className="text-[0.65rem] text-muted sm:text-sm">compre · cobre · cresça</div>
          <CityDice roll={state.lastRoll} compact={compact} />
          <div className="max-w-[90%] text-[0.65rem] leading-tight text-ink sm:text-sm">
            {current ? <><span className="display text-gold">vez de {current.name}</span><br />lance os dados e movimente sua peça</> : 'Entre na partida para ocupar a cidade.'}
          </div>
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
