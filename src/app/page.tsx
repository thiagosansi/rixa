'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col items-center justify-center gap-10 px-5 py-10 thumb-safe">
      <header className="text-center">
        <h1 className="display stroke-title text-8xl text-gold md:text-[11rem]">RIXA</h1>
        <p className="mt-3 text-lg text-muted md:text-2xl">
          Cinco rodadas. Dois times. Uma TV e os celulares da mesa.
        </p>
      </header>

      <nav className="flex w-full flex-col gap-5">
        <Link
          href="/tv"
          className="display flex min-h-[96px] items-center justify-center rounded-3xl border-2 border-gold bg-gold px-6 text-center text-3xl text-[#170d02] shadow-[0_8px_0_#a8781f] transition active:translate-y-[4px] md:text-5xl"
        >
          Abrir arena na TV
        </Link>
        <Link
          href="/jogar"
          className="display flex min-h-[96px] items-center justify-center rounded-3xl border-2 border-line bg-surface-2 px-6 text-center text-3xl text-ink transition hover:border-muted active:translate-y-[4px] md:text-5xl"
        >
          Entrar pelo celular
        </Link>
      </nav>

      <p className="max-w-md text-center text-sm text-muted">
        Abra a arena na TV, mostre o código pra mesa e cada pessoa entra pelo próprio celular.
        4 a 8 jogadores.
      </p>
    </main>
  );
}
