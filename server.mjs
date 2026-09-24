/**
 * RIXA — custom server.
 * Serve o app Next e um relay WebSocket burro em /api/ws.
 * O servidor NÃO tem lógica de jogo: só reenvia mensagens para a mesma sala.
 * A TV continua sendo a autoridade do jogo.
 *
 * Roteamento (para o lance secreto do leilão não vazar entre celulares):
 *  - quem manda `state` é o HOST da sala; quem manda `act` fica associado ao seu playerId;
 *  - `act` (que carrega o valor do lance) vai SÓ para o host, quando há host na sala;
 *  - mensagem com `to: [playerId…]` vai só para os sockets desses jogadores;
 *  - todo o resto continua broadcast.
 * Não é autenticação: um cliente malicioso que se passe por outro playerId recebe o
 * segredo dele. Protege de curioso com DevTools aberto, não de ataque ativo.
 */
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import next from 'next';
import { WebSocketServer } from 'ws';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || '0.0.0.0';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
/** só existe depois do prepare() */
let upgradeNext = null;

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const rooms = new Map();

function joinRoom(room, socket) {
  if (socket.rixaRoom === room) return;
  leaveRoom(socket);
  let set = rooms.get(room);
  if (!set) {
    set = new Set();
    rooms.set(room, set);
  }
  set.add(socket);
  socket.rixaRoom = room;
}

function leaveRoom(socket) {
  const room = socket.rixaRoom;
  if (!room) return;
  const set = rooms.get(room);
  if (set) {
    set.delete(socket);
    if (set.size === 0) rooms.delete(room);
  }
  socket.rixaRoom = null;
}

function lanAddress() {
  const nets = networkInterfaces();
  const candidates = [];
  for (const list of Object.values(nets)) {
    for (const net of list ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      candidates.push(net.address);
    }
  }
  const preferred = candidates.find((ip) => ip.startsWith('192.168.'))
    ?? candidates.find((ip) => ip.startsWith('10.'))
    ?? candidates.find((ip) => /^172\.(1[6-9]|2\d|3[01])\./.test(ip));
  return preferred ?? candidates[0] ?? '127.0.0.1';
}

await app.prepare();
upgradeNext = app.getUpgradeHandler();

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error('[rixa] erro ao servir', req.url, err);
    res.statusCode = 500;
    res.end('erro interno');
  });
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024 });

server.on('upgrade', (req, socket, head) => {
  let pathname = '/';
  let search = '';
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    pathname = url.pathname;
    search = url.search;
  } catch {
    socket.destroy();
    return;
  }

  if (pathname === '/api/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, search);
    });
    return;
  }

  // HMR do Next e qualquer outro upgrade continuam funcionando
  if (!upgradeNext) {
    socket.destroy();
    return;
  }
  upgradeNext(req, socket, head).catch(() => socket.destroy());
});

wss.on('connection', (ws, req, search) => {
  ws.rixaRoom = null;
  ws.rixaHost = false;
  ws.rixaPlayerId = null;
  ws.isAlive = true;

  try {
    const params = new URLSearchParams(search ?? '');
    const room = params.get('room');
    if (room) joinRoom(room.toUpperCase(), ws);
  } catch {
    /* sem query: a sala vem na primeira mensagem */
  }

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return; // mensagem malformada: descarta
    }
    if (!msg || typeof msg.room !== 'string' || !msg.env) return;

    const room = msg.room.toUpperCase();
    joinRoom(room, ws);

    const env = msg.env;
    if (env.t === 'state') ws.rixaHost = true;
    if (env.t === 'act' && typeof env.playerId === 'string') ws.rixaPlayerId = env.playerId;

    const peers = rooms.get(room);
    if (!peers) return;

    const to = Array.isArray(msg.to) ? new Set(msg.to.filter((id) => typeof id === 'string')) : null;
    let hostOnly = false;
    if (!to && env.t === 'act') {
      for (const peer of peers) {
        if (peer !== ws && peer.rixaHost && peer.readyState === peer.OPEN) {
          hostOnly = true;
          break;
        }
      }
    }

    // sem host na sala: uma ação de jogador não pode virar broadcast para os celulares
    if (!to && !hostOnly && env.t === 'act' && env.action?.type !== 'join') return;

    const payload = JSON.stringify({ room, env });
    for (const peer of peers) {
      if (peer === ws) continue; // não ecoa pro remetente
      if (peer.readyState !== peer.OPEN) continue;
      if (to && !(peer.rixaPlayerId && to.has(peer.rixaPlayerId))) continue;
      if (hostOnly && !peer.rixaHost) continue;
      try {
        peer.send(payload);
      } catch {
        /* peer morreu: o close cuida da limpeza */
      }
    }
  });

  ws.on('close', () => leaveRoom(ws));
  ws.on('error', () => {
    leaveRoom(ws);
    try {
      ws.terminate();
    } catch {
      /* ok */
    }
  });
});

// Keepalive: proxies (Render etc.) derrubam conexões ociosas. A cada 25s manda ping;
// quem não respondeu com pong ao ping anterior é dado como morto, sai da sala e é encerrado.
const HEARTBEAT_MS = Number(process.env.RIXA_HEARTBEAT_MS) || 25_000;
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      leaveRoom(ws);
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      /* ok */
    }
  }
}, HEARTBEAT_MS);
heartbeat.unref?.();

server.listen(port, hostname, () => {
  const ip = lanAddress();
  console.log(`\n  RIXA no ar`);
  console.log(`  RIXA      http://localhost:${port}/mesa`);
  console.log(`  Cidade    http://localhost:${port}/cidade`);
  console.log(`  Celulares http://${ip}:${port}/jogar ou /cidade/jogar`);
  console.log(`  WebSocket ws://${ip}:${port}/api/ws\n`);
});

function shutdown() {
  clearInterval(heartbeat);
  for (const ws of wss.clients) ws.terminate();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
