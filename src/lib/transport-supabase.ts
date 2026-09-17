import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Envelope } from '@/game/types';
import type { Transport, TransportFactory } from './transport';
import { getSupabase } from './supabase';

/** Canal da sala. Broadcast puro: self:false para não ecoar o próprio envio. */
export function roomChannel(code: string): RealtimeChannel {
  return getSupabase().channel('rixa-' + code.toUpperCase(), {
    config: { broadcast: { self: false, ack: false } },
  });
}

export function sendEnvelope(channel: RealtimeChannel, env: Envelope) {
  return channel.send({ type: 'broadcast', event: env.t, payload: env });
}

export function onEnvelope(channel: RealtimeChannel, handler: (e: Envelope) => void) {
  return channel.on('broadcast', { event: '*' }, (msg) => {
    const payload = msg.payload as Envelope | undefined;
    if (payload && typeof payload === 'object' && 't' in payload) handler(payload);
  });
}

/** Alternativa hospedada: Supabase Realtime, mesma interface Transport. */
export const createSupabaseTransport: TransportFactory = (code, onEnv, onStatus) => {
  let disposed = false;
  let channel: RealtimeChannel | null = null;
  const queue: Envelope[] = [];
  let ready = false;

  onStatus('connecting');

  try {
    const ch = roomChannel(code);
    channel = ch;
    onEnvelope(ch, (env) => {
      if (!disposed) onEnv(env);
    });
    ch.subscribe((status) => {
      if (disposed) return;
      if (status === 'SUBSCRIBED') {
        ready = true;
        onStatus('open');
        while (queue.length > 0) {
          const next = queue.shift();
          if (next) void sendEnvelope(ch, next);
        }
      } else if (status === 'CLOSED') {
        ready = false;
        onStatus('closed');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        ready = false;
        onStatus('error');
      }
    });
  } catch {
    onStatus('error');
  }

  const transport: Transport = {
    send(env) {
      if (disposed || !channel) return;
      if (!ready) {
        queue.push(env);
        if (queue.length > 40) queue.shift();
        return;
      }
      void sendEnvelope(channel, env);
    },
    close() {
      disposed = true;
      queue.length = 0;
      const ch = channel;
      channel = null;
      if (ch) void getSupabase().removeChannel(ch);
      onStatus('closed');
    },
  };

  return transport;
};
