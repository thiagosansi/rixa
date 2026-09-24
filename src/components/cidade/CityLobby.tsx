'use client';

import type { CidadeState } from '@/game/types';
import { Button, CodeDisplay } from '@/components/ui';
import { CityScoreboard } from './CityBoard';

export function CityLobby({ state, joinUrl, onStart }: { state: CidadeState; joinUrl: string | null; onStart: () => void }) {
  const ready = state.players.length >= 2 && state.players.length <= 6;
  return (
    <section className="flex flex-col gap-5">
      <CodeDisplay code={state.code} joinUrl={joinUrl} className="justify-center" />
      <div className="rounded-3xl border-2 border-gold/50 bg-gold/10 px-5 py-4 text-center">
        <div className="display text-2xl text-gold">Cidade em Jogo</div>
        <p className="mt-2 text-lg text-ink">Compre bairros, cobre aluguéis e termine com o maior patrimônio. Cada jogador pode usar celular, tablet ou computador.</p>
      </div>
      <CityScoreboard state={state} />
      <p className="text-center text-muted">{state.players.length}/6 jogadores · mínimo de 2 para começar · 30 voltas na cidade</p>
      <Button size="xl" fullWidth disabled={!ready} onClick={onStart}>Começar partida</Button>
    </section>
  );
}
