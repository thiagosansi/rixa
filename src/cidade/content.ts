import type { CidadeTile, CidadePlayerColor } from '@/game/types';

/** Tabuleiro original do RIXA: negócios de bairro, não uma cópia de um jogo existente. */
export const CIDADE_BOARD: CidadeTile[] = [
  { id: 'start', name: 'Praça Central', type: 'start' },
  { id: 'aurora', name: 'Vila Aurora', type: 'property', price: 120, rent: 20, colorGroup: 'azul' },
  { id: 'event-1', name: 'Notícia do Bairro', type: 'event' },
  { id: 'mercado', name: 'Mercado Municipal', type: 'property', price: 140, rent: 24, colorGroup: 'azul' },
  { id: 'tax-1', name: 'Taxa de Urbanização', type: 'tax', tax: 80 },
  { id: 'estacao', name: 'Estação Norte', type: 'property', price: 180, rent: 32, colorGroup: 'verde' },
  { id: 'jardins', name: 'Jardins do Sol', type: 'property', price: 220, rent: 42, colorGroup: 'verde' },
  { id: 'event-2', name: 'Boato na Vizinhança', type: 'event' },
  { id: 'cinema', name: 'Cinema da Rua 8', type: 'property', price: 240, rent: 48, colorGroup: 'verde' },
  { id: 'jail', name: 'Delegacia', type: 'jail' },
  { id: 'porto', name: 'Porto Velho', type: 'property', price: 260, rent: 54, colorGroup: 'laranja' },
  { id: 'parque', name: 'Parque das Mangueiras', type: 'rest' },
  { id: 'event-3', name: 'Festival da Cidade', type: 'event' },
  { id: 'teatro', name: 'Teatro Municipal', type: 'property', price: 300, rent: 68, colorGroup: 'laranja' },
  { id: 'tax-2', name: 'Licença Comercial', type: 'tax', tax: 120 },
  { id: 'farol', name: 'Farol da Enseada', type: 'property', price: 320, rent: 76, colorGroup: 'roxo' },
  { id: 'event-4', name: 'Achados e Perdidos', type: 'event' },
  { id: 'mirante', name: 'Mirante Alto', type: 'property', price: 360, rent: 88, colorGroup: 'roxo' },
  { id: 'go-to-jail', name: 'Fiscalização', type: 'go-to-jail' },
  { id: 'galeria', name: 'Galeria Central', type: 'property', price: 400, rent: 100, colorGroup: 'rosa' },
  { id: 'event-5', name: 'Festival de Rua', type: 'event' },
  { id: 'hotel', name: 'Hotel Beira-Mar', type: 'property', price: 440, rent: 116, colorGroup: 'rosa' },
  { id: 'terminal', name: 'Terminal Sul', type: 'property', price: 220, rent: 44, colorGroup: 'amarelo' },
  { id: 'event-6', name: 'Conselho Comunitário', type: 'event' },
];

export const CIDADE_EVENTS = [
  { title: 'Mutirão no bairro', text: 'Seu trabalho voluntário foi reconhecido.', amount: 80 },
  { title: 'Conta inesperada', text: 'Uma manutenção urgente apareceu.', amount: -70 },
  { title: 'Cliente fiel', text: 'Seu negócio recebeu uma encomenda grande.', amount: 110 },
  { title: 'Chuva forte', text: 'A cidade ajudou a cobrir parte do prejuízo.', amount: 50 },
  { title: 'Multa por atraso', text: 'Você perdeu o prazo de uma licença.', amount: -100 },
  { title: 'Prêmio local', text: 'Seu empreendimento ganhou destaque.', amount: 140 },
  { title: 'Feira de domingo', text: 'As vendas surpreenderam.', amount: 90 },
  { title: 'Obra na rua', text: 'O acesso ficou difícil por alguns dias.', amount: -60 },
];

export const CIDADE_COLORS: CidadePlayerColor[] = ['coral', 'sky', 'lime', 'violet', 'orange', 'pink'];

export const CIDADE_STARTING_MONEY = 1_200;
export const CIDADE_MAX_TURNS = 12;
export const CIDADE_START_BONUS = 200;
export const CIDADE_REACTIONS = ['👏', '🔥', '😱', '💸', '😈', '🎉'] as const;
