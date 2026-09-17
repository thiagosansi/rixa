import { networkInterfaces } from 'node:os';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function lanAddress(): string {
  const nets = networkInterfaces();
  const candidates: string[] = [];
  for (const list of Object.values(nets)) {
    for (const net of list ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      candidates.push(net.address);
    }
  }
  return (
    candidates.find((ip) => ip.startsWith('192.168.')) ??
    candidates.find((ip) => ip.startsWith('10.')) ??
    candidates.find((ip) => /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) ??
    candidates[0] ??
    '127.0.0.1'
  );
}

/** Usado pela TV para mostrar em que endereço os celulares entram. */
export async function GET(request: Request) {
  const ip = lanAddress();
  const host = request.headers.get('host') ?? `localhost:3000`;
  const port = host.includes(':') ? host.split(':').pop() : '80';
  const origin = port === '80' ? `http://${ip}` : `http://${ip}:${port}`;
  return NextResponse.json({ ip, port, origin, join: `${origin}/jogar` });
}
