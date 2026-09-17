'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Envelope } from '@/game/types';
import { createTransport, type SendOptions, type Transport, type TransportStatus } from './transport';

export { roomChannel, sendEnvelope, onEnvelope } from './transport-supabase';
export type { SendOptions, Transport, TransportStatus } from './transport';

export type RoomChannel = {
  send: (env: Envelope, opts?: SendOptions) => void;
  status: TransportStatus;
  connected: boolean;
};

/**
 * Conecta na sala `code` usando o transporte configurado.
 * Seguro no StrictMode do React 19: o cleanup fecha o transporte de verdade
 * (flag `disposed` no adaptador impede reconexão zumbi no double-mount).
 */
export function useRoomChannel(
  code: string | null,
  onEnvelope: (e: Envelope) => void,
): RoomChannel {
  const handlerRef = useRef(onEnvelope);
  const transportRef = useRef<Transport | null>(null);
  const [status, setStatus] = useState<TransportStatus>('closed');

  useEffect(() => {
    handlerRef.current = onEnvelope;
  }, [onEnvelope]);

  useEffect(() => {
    if (!code) {
      setStatus('closed');
      return;
    }
    let disposed = false;
    const transport = createTransport(
      code,
      (env) => {
        if (!disposed) handlerRef.current(env);
      },
      (s) => {
        if (!disposed) setStatus(s);
      },
    );
    transportRef.current = transport;

    return () => {
      disposed = true;
      transportRef.current = null;
      transport.close();
    };
  }, [code]);

  const send = useCallback((env: Envelope, opts?: SendOptions) => {
    transportRef.current?.send(env, opts);
  }, []);

  return { send, status, connected: status === 'open' };
}
