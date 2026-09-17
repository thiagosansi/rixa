'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Envelope } from '@/game/types';

export type DrawEnvelope = Extract<Envelope, { t: 'stroke' } | { t: 'clear-canvas' }>;

/** Barramento simples: a página da TV publica os envelopes de traço, o canvas assina. */
export type StrokeBus = {
  subscribe: (fn: (env: DrawEnvelope) => void) => () => void;
};

type Stroke = { color: string; points: number[]; lastAt: number };

/** traço aberto sem notícia há tanto tempo = o `end:true` se perdeu; o próximo envelope começa outro */
const OPEN_STROKE_STALE_MS = 3000;

const LINE_WIDTH_RATIO = 0.006; // ~0,6% da largura
const MAX_POINTS_PER_ENVELOPE = 4000;
const PAPER = '#f6f0ff';

function safeColor(color: unknown): string {
  return typeof color === 'string' && color.length > 0 && color.length <= 32 ? color : '#0a0710';
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export type DrawCanvasProps = {
  bus: StrokeBus;
  /** só aceitamos traços deste jogador */
  drawerId: string | null;
  /** mudou => canvas limpa (palavra nova / turno novo) */
  clearKey: string | number;
  className?: string;
};

export function DrawCanvas({ bus, drawerId, clearKey, className = '' }: DrawCanvasProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const openRef = useRef<Map<string, Stroke>>(new Map());
  const drawerRef = useRef(drawerId);
  const keyRef = useRef(String(clearKey));

  useEffect(() => {
    drawerRef.current = drawerId;
  }, [drawerId]);

  const publishCount = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.dataset.strokes = String(strokesRef.current.length);
  }, []);

  const paintSegment = useCallback((stroke: Stroke, fromPoint: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const pts = stroke.points;
    const total = pts.length / 2;
    if (total === 0) return;

    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = Math.max(1.5, w * LINE_WIDTH_RATIO);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (total === 1) {
      ctx.beginPath();
      ctx.arc(pts[0] * w, pts[1] * h, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const start = Math.max(0, Math.min(fromPoint, total - 1));
    ctx.beginPath();
    ctx.moveTo(pts[start * 2] * w, pts[start * 2 + 1] * h);
    for (let i = start + 1; i < total; i++) ctx.lineTo(pts[i * 2] * w, pts[i * 2 + 1] * h);
    ctx.stroke();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) paintSegment(stroke, 0);
    publishCount();
  }, [paintSegment, publishCount]);

  const clearAll = useCallback(() => {
    strokesRef.current = [];
    openRef.current.clear();
    redraw();
  }, [redraw]);

  // tamanho real em pixels do dispositivo + resize
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const fit = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const cssW = wrap.clientWidth;
      if (cssW <= 0) return;
      const w = Math.round(cssW * dpr);
      const h = Math.round((cssW * 3 * dpr) / 4);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      redraw();
    };

    fit();
    redraw();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [redraw]);

  // palavra nova / turno novo: limpa tudo, inclusive traço em aberto (o `end:true` dele
  // pode nunca chegar — o celular esvazia a fila de envio quando a palavra troca)
  useEffect(() => {
    keyRef.current = String(clearKey);
    clearAll();
  }, [clearKey, clearAll]);

  useEffect(() => {
    return bus.subscribe((env) => {
      if (!drawerRef.current || env.playerId !== drawerRef.current) return;

      if (env.t === 'clear-canvas') {
        clearAll();
        return;
      }

      // traço atrasado da palavra/turno anterior: não pode sujar o canvas novo
      if (typeof env.key === 'string' && env.key !== keyRef.current) return;

      const raw = Array.isArray(env.points) ? env.points.slice(0, MAX_POINTS_PER_ENVELOPE * 2) : [];
      const clean: number[] = [];
      for (let i = 0; i + 1 < raw.length; i += 2) {
        const x = Number(raw[i]);
        const y = Number(raw[i + 1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        clean.push(clamp01(x), clamp01(y));
      }

      const nowMs = Date.now();
      let stroke = openRef.current.get(env.playerId);
      if (stroke && nowMs - stroke.lastAt > OPEN_STROKE_STALE_MS) {
        openRef.current.delete(env.playerId);
        stroke = undefined;
      }
      if (!stroke) {
        if (clean.length === 0) return;
        stroke = { color: safeColor(env.color), points: [], lastAt: nowMs };
        openRef.current.set(env.playerId, stroke);
        strokesRef.current.push(stroke);
      }

      stroke.lastAt = nowMs;
      const before = stroke.points.length / 2;
      for (const n of clean) stroke.points.push(n);
      const after = stroke.points.length / 2;

      if (after === 1) {
        if (env.end) paintSegment(stroke, 0); // toque único = ponto
      } else if (after > before) {
        paintSegment(stroke, Math.max(0, before - 1));
      }

      if (env.end) openRef.current.delete(env.playerId);
      publishCount();
    });
  }, [bus, clearAll, paintSegment, publishCount]);

  return (
    <div
      className={`overflow-hidden rounded-3xl border-4 border-line bg-[#f6f0ff] shadow-[0_0_60px_rgba(0,0,0,0.5)] ${className}`}
    >
      <div ref={wrapRef} className="relative w-full" style={{ aspectRatio: '4 / 3' }}>
        <canvas
          ref={canvasRef}
          data-tv="draw-canvas"
          aria-label="Desenho ao vivo"
          className="absolute inset-0 block h-full w-full"
        />
      </div>
    </div>
  );
}

export default DrawCanvas;
