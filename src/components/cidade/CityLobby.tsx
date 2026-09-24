'use client';

import { useState, type FormEvent } from 'react';
import type { CidadeState } from '@/game/types';
import { Button, CodeDisplay } from '@/components/ui';
import { CityBoard, CityScoreboard } from './CityBoard';

export function CityLobby({ state, joinUrl, onStart, onAddPlayer }: { state: CidadeState; joinUrl: string | null; onStart: () => void; onAddPlayer: (name: string) => void }) {
  const [name, setName] = useState('');
  const ready = state.players.length >= 2 && state.players.length <= 6;

  function addPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    onAddPlayer(name);
    setName('');
  }

  return (
    <section className="flex flex-col gap-5">
      <CodeDisplay code={state.code} joinUrl={joinUrl} className="justify-center" />
      <div className="rounded-3xl border-2 border-gold/50 bg-gold/10 px-5 py-4 text-center">
        <div className="display text-2xl text-gold">Cidade em Jogo</div>
        <p className="mt-2 text-lg text-ink">Compre bairros, cobre aluguéis e termine com o maior patrimônio. Cada jogador pode usar celular, tablet ou computador.</p>
      </div>
      <CityBoard state={state} />
      <div className="rounded-3xl border-2 border-line bg-surface px-4 py-4">
        <div className="display text-center text-sm tracking-[0.15em] text-muted">JOGAR SÓ NO COMPUTADOR</div>
        <p className="mt-2 text-center text-sm text-muted">Adicione os nomes e passe o computador para cada pessoa no próprio turno.</p>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={addPlayer}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 16))}
            maxLength={16}
            placeholder="nome do jogador"
            className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface-2 px-4 text-xl text-ink outline-none focus:border-gold"
          />
          <Button type="submit" size="lg" disabled={state.players.length >= 6 || !name.trim()}>Adicionar</Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted">Ou compartilhe o código para cada pessoa entrar pelo próprio dispositivo.</p>
      </div>
      <CityScoreboard state={state} />
      <p className="text-center text-muted">{state.players.length}/6 jogadores · mínimo de 2 para começar · 12 voltas na cidade</p>
      <Button size="xl" fullWidth disabled={!ready} onClick={onStart}>Começar partida</Button>
    </section>
  );
}
