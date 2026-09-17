import type { Envelope } from '@/game/types';
import { createWsTransport } from './transport-ws';
import { createSupabaseTransport } from './transport-supabase';

export type TransportStatus = 'connecting' | 'open' | 'closed' | 'error';

export type SendOptions = {
  /**
   * Entrega só a estes playerIds. O relay ws respeita; o transporte supabase é broadcast
   * puro e IGNORA (lá o segredo do leilão é visível a quem inspecionar o tráfego).
   */
  to?: string[];
};

export type Transport = {
  send: (env: Envelope, opts?: SendOptions) => void;
  close: () => void;
};

export type TransportFactory = (
  code: string,
  onEnvelope: (env: Envelope) => void,
  onStatus: (s: TransportStatus) => void,
) => Transport;

export type TransportKind = 'ws' | 'supabase';

export function transportKind(): TransportKind {
  return process.env.NEXT_PUBLIC_TRANSPORT === 'supabase' ? 'supabase' : 'ws';
}

/** Seleciona o adaptador via NEXT_PUBLIC_TRANSPORT ('ws' | 'supabase'). Default: 'ws'. */
export const createTransport: TransportFactory = (code, onEnvelope, onStatus) => {
  const factory = transportKind() === 'supabase' ? createSupabaseTransport : createWsTransport;
  return factory(code, onEnvelope, onStatus);
};
