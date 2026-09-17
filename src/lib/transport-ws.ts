import type { Envelope } from '@/game/types';
import type { SendOptions, Transport, TransportFactory } from './transport';

type Wire = { room: string; env: Envelope; to?: string[] };
type Queued = { env: Envelope; opts?: SendOptions };

const MIN_BACKOFF = 500;
const MAX_BACKOFF = 5000;
const MAX_QUEUE = 40;

function resolveUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/ws`;
}

/**
 * Adaptador padrão: WebSocket nativo contra o relay local (server.mjs).
 * Reconecta sozinho com backoff + jitter e reenvia o último "hello"
 * (join do celular / state da TV) assim que a conexão volta.
 */
export const createWsTransport: TransportFactory = (code, onEnvelope, onStatus) => {
  let socket: WebSocket | null = null;
  let disposed = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let hello: Envelope | null = null;
  const queue: Queued[] = [];

  const room = code.toUpperCase();

  function isHello(env: Envelope): boolean {
    return env.t === 'state' || (env.t === 'act' && env.action.type === 'join');
  }

  function rawSend(env: Envelope, opts?: SendOptions): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    const wire: Wire = opts?.to ? { room, env, to: opts.to } : { room, env };
    socket.send(JSON.stringify(wire));
    return true;
  }

  function flush() {
    while (queue.length > 0) {
      const next = queue[0];
      if (!rawSend(next.env, next.opts)) return;
      queue.shift();
    }
  }

  function scheduleReconnect() {
    if (disposed || retryTimer) return;
    const base = Math.min(MAX_BACKOFF, MIN_BACKOFF * 2 ** attempt);
    const jitter = Math.random() * base * 0.3;
    attempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, base + jitter);
  }

  function connect() {
    if (disposed) return;
    onStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(resolveUrl());
    } catch {
      onStatus('error');
      scheduleReconnect();
      return;
    }
    socket = ws;

    ws.onopen = () => {
      if (disposed) {
        ws.close();
        return;
      }
      attempt = 0;
      onStatus('open');
      // anuncia presença de novo antes de qualquer coisa que estava na fila
      if (hello) rawSend(hello);
      flush();
    };

    ws.onmessage = (event) => {
      if (disposed) return;
      try {
        const data = JSON.parse(String(event.data)) as Wire;
        if (!data || data.room !== room || !data.env) return;
        onEnvelope(data.env);
      } catch {
        /* mensagem malformada: ignora */
      }
    };

    ws.onerror = () => {
      if (!disposed) onStatus('error');
    };

    ws.onclose = () => {
      if (socket === ws) socket = null;
      if (disposed) return;
      onStatus('closed');
      scheduleReconnect();
    };
  }

  connect();

  const transport: Transport = {
    send(env, opts) {
      if (disposed) return;
      if (isHello(env)) hello = env;
      if (rawSend(env, opts)) return;
      // segredo endereçado não entra na fila: a TV reenvia a cada 1s e ele pode ter mudado
      if (env.t === 'secret') return;
      queue.push({ env, opts });
      if (queue.length > MAX_QUEUE) queue.shift();
    },
    close() {
      disposed = true;
      queue.length = 0;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      const ws = socket;
      socket = null;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          ws.close();
        } catch {
          /* já fechado */
        }
      }
      onStatus('closed');
    },
  };

  return transport;
};
