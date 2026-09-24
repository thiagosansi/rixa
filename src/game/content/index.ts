import type { DeckMode } from '@/game/types';
import * as familiaModule from './familia';
import * as semFiltroModule from './sem-filtro';

export type MimicaWord = string;
export type TabuCard = { word: string; forbidden: string[] };
export type MentirosoQuestion = { question: string; truth: string };
export type LeilaoCategory = { category: string; hint?: string };
export type RelampagoQuestion = { text: string; options: string[]; answerIndex: number };
/** Começo sugerido de uma corrente do telefone sem fio (inspiração/placeholder no passo 0). */
export type TelefoneStarter = string;
export type DetectiveCase = {
  title: string;
  setting: string;
  incident: string;
  publicClues: string[];
  roleCards: { role: string; clue: string }[];
  culpritRole: string;
  solution: string;
};

export type Deck = {
  mimica: MimicaWord[];
  tabu: TabuCard[];
  mentiroso: MentirosoQuestion[];
  leilao: LeilaoCategory[];
  telefone: TelefoneStarter[];
  detetive: DetectiveCase[];
  relampago: RelampagoQuestion[];
};

export const EMPTY_DECK: Deck = {
  mimica: [],
  tabu: [],
  mentiroso: [],
  leilao: [],
  telefone: [],
  detetive: [],
  relampago: [],
};

function isDeck(value: unknown): value is Deck {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.mimica) &&
    Array.isArray(v.tabu) &&
    Array.isArray(v.mentiroso) &&
    Array.isArray(v.leilao) &&
    Array.isArray(v.relampago)
  );
}

/** Baralho antigo continua carregando: chaves novas recebem lista vazia. */
function withDefaults(deck: Deck): Deck {
  return {
    ...deck,
    telefone: Array.isArray(deck.telefone) ? deck.telefone : [],
    detetive: Array.isArray(deck.detetive) ? deck.detetive : [],
  };
}

/**
 * Pega o baralho exportado pelo módulo, seja qual for o nome do export.
 * Assim o agente de conteúdo pode usar `familia`, `FAMILIA`, `default`… e nada quebra.
 */
function resolveDeck(mod: object): Deck {
  const direct = Object.values(mod).find(isDeck);
  return direct ? withDefaults(direct) : EMPTY_DECK;
}

export const DECKS: Record<DeckMode, Deck> = {
  familia: resolveDeck(familiaModule),
  'sem-filtro': resolveDeck(semFiltroModule),
};

export function pickDeck(mode: DeckMode): Deck {
  return DECKS[mode] ?? DECKS.familia;
}

export const DECK_LABELS: Record<DeckMode, string> = {
  familia: 'Família',
  'sem-filtro': 'Sem Filtro',
};
