/**
 * Decide qual origin vai no QR/endereço de entrada dos celulares.
 *
 * Em casa a TV costuma abrir `localhost`, que não serve para o celular: aí vale o IP da
 * rede local devolvido por /api/lan. Hospedado (Render etc.) o /api/lan devolveria o IP
 * interno do container, então vale o origin público da própria página (preserva https).
 */

/** Tira colchetes de IPv6 (`[::1]` -> `::1`) e normaliza caixa. */
function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
}

/** localhost, loopback ou IPv4 privado (10/8, 172.16/12, 192.168/16). */
export function isLocalHostname(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (host === 'localhost' || host === '::1') return true;

  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return false;

  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/**
 * @param hostname   window.location.hostname
 * @param pageOrigin window.location.origin
 * @param lanOrigin  origin devolvido por /api/lan (pode faltar se a chamada falhou)
 */
export function pickJoinOrigin(
  hostname: string,
  pageOrigin: string,
  lanOrigin?: string | null,
): string {
  if (isLocalHostname(hostname) && lanOrigin) return lanOrigin;
  return pageOrigin;
}

export function buildJoinUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/jogar?code=${encodeURIComponent(code)}`;
}
