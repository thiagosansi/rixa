'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col items-center justify-center gap-10 px-5 py-10 thumb-safe">
      <header className="text-center">
        <h1 className="display stroke-title text-7xl text-gold md:text-[10rem]">JOGOS</h1>
        <p className="mt-3 text-lg text-muted md:text-2xl">
          Escolha uma experiência para jogar em casa. A TV é opcional e cada pessoa pode usar celular, tablet ou computador.
        </p>
      </header>

      <nav className="flex w-full flex-col gap-5">
        <Link
          href="/mesa"
          className="display flex min-h-[96px] items-center justify-center rounded-3xl border-2 border-gold bg-gold px-6 text-center text-3xl text-[#170d02] shadow-[0_8px_0_#a8781f] transition active:translate-y-[4px] md:text-5xl"
        >
          RIXA · desafios em equipe
        </Link>
        <Link
          href="/tv"
          className="display flex min-h-16 items-center justify-center rounded-3xl border-2 border-line bg-surface-2 px-6 text-center text-xl text-ink transition hover:border-muted active:translate-y-[4px] md:text-3xl"
        >
          RIXA com TV
        </Link>
        <Link
          href="/cidade"
          className="display flex min-h-[96px] items-center justify-center rounded-3xl border-2 border-[#3ddc97] bg-[#3ddc97]/15 px-6 text-center text-3xl text-ink shadow-[0_8px_0_#167a55] transition active:translate-y-[4px] md:text-5xl"
        >
          Cidade em Jogo
        </Link>
        <Link
          href="/jogar"
          className="display flex min-h-[96px] items-center justify-center rounded-3xl border-2 border-line bg-surface-2 px-6 text-center text-3xl text-ink transition hover:border-muted active:translate-y-[4px] md:text-5xl"
        >
          Jogar RIXA como participante
        </Link>
        <Link
          href="/cidade/jogar"
          className="display flex min-h-16 items-center justify-center rounded-3xl border-2 border-line bg-surface-2 px-6 text-center text-xl text-ink transition hover:border-muted active:translate-y-[4px] md:text-3xl"
        >
          Jogar Cidade como participante
        </Link>
      </nav>

      <p className="max-w-md text-center text-sm text-muted">
        RIXA: 4 a 8 jogadores. Cidade em Jogo: 2 a 6 jogadores.
      </p>
    </main>
  );
}
