'use client';

import type { CidadePlayer, CidadeState } from '@/game/types';
import { cidadePlayerWealth } from '@/cidade/engine';

const COLOR_CLASSES: Record<CidadePlayer['color'], string> = {
  coral: 'bg-team-red',
  sky: 'bg-team-blue',
  lime: 'bg-[#3ddc97]',
  violet: 'bg-[#a78bfa]',
  orange: 'bg-[#fb923c]',
  pink: 'bg-[#f472b6]',
};

function tileTone(type: string): string {
  if (type === 'property') return 'border-gold/50 bg-gold/5';
  if (type === 'event') return 'border-team-blue/50 bg-team-blue/5';
  if (type === 'tax') return 'border-team-red/50 bg-team-red/5';
  return 'border-line bg-surface';
}

function occupants(state: CidadeState, index: number): CidadePlayer[] {
  return state.players.filter((player) => player.position === index);
}

export function CityBoard({ state, compact = false }: { state: CidadeState; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-3 gap-2 sm:grid-cols-4 ${compact ? 'text-xs' : 'text-sm'}`}>
      {state.board.map((tile, index) => {
        const property = state.properties[tile.id];
        const players = occupants(state, index);
        const owner = property?.ownerId ? state.players.find((player) => player.id === property.ownerId) : null;
        return (
          <div key={tile.id} className={`flex min-h-28 flex-col justify-between rounded-2xl border-2 p-2 ${tileTone(tile.type)} ${index === 0 ? 'ring-2 ring-gold/40' : ''}`}>
            <div>
              <div className="display text-[0.68rem] leading-tight text-ink">{tile.name}</div>
              {tile.type === 'property' && <div className="mt-1 text-muted">${tile.price} · aluguel ${tile.rent}</div>}
              {tile.type === 'tax' && <div className="mt-1 text-team-red">−${tile.tax}</div>}
              {tile.type === 'event' && <div className="mt-1 text-team-blue">carta</div>}
              {owner && <div className="mt-1 truncate text-gold">{owner.name} · nível {property?.level ?? 0}</div>}
            </div>
            {players.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1" aria-label={`Jogadores em ${tile.name}`}>
                {players.map((player) => (
                  <span key={player.id} title={player.name} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg text-xs font-bold text-white ${COLOR_CLASSES[player.color]}`}>
                    {player.name.slice(0, 1).toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CityScoreboard({ state }: { state: CidadeState }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {state.players.map((player) => (
        <div key={player.id} className={`rounded-2xl border-2 px-3 py-2 ${state.currentPlayerId === player.id ? 'border-gold bg-gold/10' : 'border-line bg-surface'}`}>
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${COLOR_CLASSES[player.color]}`} />
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
