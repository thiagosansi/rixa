/** Letras sem ambiguidade visual: sem I, O (e nenhum dígito, então 0/1 nem entram). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

const PLAYER_ID_KEY = 'rixa:player-id';
const PLAYER_NAME_KEY = 'rixa:player-name';

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

/** Código de sala de 4 letras, legível a 3 metros. */
export function makeRoomCode(length = 4): string {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

export function isRoomCode(value: string): boolean {
  return new RegExp(`^[${ALPHABET}]{4}$`).test(value.toUpperCase());
}

export function normalizeRoomCode(value: string): string {
  return value
    .toUpperCase()
    .split('')
    .filter((c) => ALPHABET.includes(c))
    .join('')
    .slice(0, 4);
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * ID estável do jogador, guardado no localStorage.
 * É o que torna a reconexão idempotente: recarregar a aba não cria outro jogador.
 */
export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const stored = window.localStorage.getItem(PLAYER_ID_KEY);
    if (stored) return stored;
    const id = newId();
    window.localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    return newId();
  }
}

export function getStoredName(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(PLAYER_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setStoredName(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    /* modo privado: segue o jogo */
  }
}
