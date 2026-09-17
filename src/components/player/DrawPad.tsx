'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Envelope } from '@/game/types';

/**
 * Protocolo de traço (contrato com a TV):
 *   { t:'stroke', playerId, points:[x0,y0,x1,y1,...], color, end }
 * - coordenadas normalizadas 0..1 relativas ao canvas 4:3;
 * - cada envelope CONTINUA o traço atual até chegar `end:true`;
 * - no máximo 1 envelope a cada FLUSH_MS (~16/s), inclusive os de `end`.
 */
const FLUSH_MS = 60;
/** largura do traço como fração da largura do canvas (a TV pode usar a mesma proporção) */
export const STROKE_WIDTH_RATIO = 0.008;

export const DRAW_COLORS = [
  { value: '#0a0710', label: 'preto' },
  { value: '#e11d48', label: 'vermelho' },
  { value: '#2563eb', label: 'azul' },
  { value: '#16a34a', label: 'verde' },
  { value: '#ea580c', label: 'laranja' },
] as const;

type LocalStroke = { color: string; points: number[] };
type Outgoing = { points: number[]; color: string; end: boolean; key: string };

export type DrawPadProps = {
  playerId: string;
  send: (env: Envelope) => void;
  /** mudou a chave (palavra nova / turno novo) => limpa o canvas local */
  resetKey: string | number;
  disabled?: boolean;
};

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function DrawPad({ playerId, send, resetKey, disabled = false }: DrawPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<LocalStroke[]>([]);
  const activePointerRef = useRef<number | null>(null);
  const queueRef = useRef<Outgoing[]>([]);
  const colorRef = useRef<string>(DRAW_COLORS[0].value);
  const sendRef = useRef(send);
  // a TV usa a chave pra descartar traço que chegar atrasado, depois da troca de palavra/turno
  const keyRef = useRef(String(resetKey));
  keyRef.current = String(resetKey);
  const [color, setColor] = useState<string>(DRAW_COLORS[0].value);

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  /* ---------------- render local ---------------- */

  const paintSegment = useCallback((stroke: LocalStroke, fromPointIndex: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const pts = stroke.points;
    const count = pts.length / 2;
    if (count === 0) return;

    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = Math.max(2, w * STROKE_WIDTH_RATIO);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (count === 1) {
      ctx.beginPath();
      ctx.arc(pts[0] * w, pts[1] * h, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const start = Math.max(0, fromPointIndex - 1);
    ctx.beginPath();
    ctx.moveTo(pts[start * 2] * w, pts[start * 2 + 1] * h);
    for (let i = start + 1; i < count; i++) ctx.lineTo(pts[i * 2] * w, pts[i * 2 + 1] * h);
    ctx.stroke();
  }, []);

  const repaintAll = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokesRef.current) paintSegment(s, 0);
  }, [paintSegment]);

  // devicePixelRatio + resize (rotação do aparelho, teclado etc.)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.width * 0.75 * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        repaintAll();
      }
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(canvas);
    window.addEventListener('resize', fit);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [repaintAll]);

  /* ---------------- fila de saída com teto de taxa ---------------- */

  useEffect(() => {
    const id = setInterval(() => {
      const next = queueRef.current[0];
      if (!next || next.points.length === 0) return;
      queueRef.current.shift();
      sendRef.current({
        t: 'stroke',
        playerId,
        points: next.points,
        color: next.color,
        end: next.end,
        key: next.key,
      });
    }, FLUSH_MS);
    return () => clearInterval(id);
  }, [playerId]);

  const enqueuePoint = useCallback((x: number, y: number) => {
    const q = queueRef.current;
    const tail = q[q.length - 1];
    if (tail && !tail.end) tail.points.push(x, y);
    else q.push({ points: [x, y], color: colorRef.current, end: false, key: keyRef.current });
  }, []);

  const enqueueEnd = useCallback((lastX: number, lastY: number) => {
    const q = queueRef.current;
    const tail = q[q.length - 1];
    if (tail && !tail.end) tail.end = true;
    // o pedaço anterior já saiu: fecha o traço repetindo o último ponto
    else q.push({ points: [lastX, lastY], color: colorRef.current, end: true, key: keyRef.current });
  }, []);

  /* ---------------- limpar ---------------- */

  const clearLocal = useCallback(() => {
    strokesRef.current = [];
    queueRef.current = [];
    activePointerRef.current = null;
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // palavra nova ou turno novo: a TV limpa o lado dela, eu limpo o meu
  useEffect(() => {
    clearLocal();
  }, [resetKey, clearLocal]);

  function clearEverywhere() {
    clearLocal();
    sendRef.current({ t: 'clear-canvas', playerId });
  }

  /* ---------------- pointer events ---------------- */

  function toNorm(e: { clientX: number; clientY: number }): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [
      round4(clamp01((e.clientX - rect.left) / rect.width)),
      round4(clamp01((e.clientY - rect.top) / rect.height)),
    ];
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || activePointerRef.current !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    activePointerRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* alguns webviews não suportam captura */
    }
    const [x, y] = toNorm(e);
    const stroke: LocalStroke = { color: colorRef.current, points: [x, y] };
    strokesRef.current.push(stroke);
    paintSegment(stroke, 0);
    enqueuePoint(x, y);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointerRef.current !== e.pointerId) return;
    e.preventDefault();
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    if (!stroke) return;
    const native = e.nativeEvent;
    const samples =
      typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const events = samples.length > 0 ? samples : [native];
    const from = stroke.points.length / 2;
    for (const ev of events) {
      const [x, y] = toNorm(ev);
      const n = stroke.points.length;
      if (stroke.points[n - 2] === x && stroke.points[n - 1] === y) continue;
      stroke.points.push(x, y);
      enqueuePoint(x, y);
    }
    if (stroke.points.length / 2 > from) paintSegment(stroke, from);
  }

  function finish(e: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointerRef.current !== e.pointerId) return;
    activePointerRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* já solto */
    }
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    if (!stroke) return;
    const n = stroke.points.length;
    enqueueEnd(stroke.points[n - 2], stroke.points[n - 1]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="draw-surface relative w-full overflow-hidden rounded-2xl border-2 border-line">
        <canvas
          ref={canvasRef}
          data-testid="drawpad"
          aria-label="área de desenho"
          className="draw-canvas block h-full w-full"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <div className="flex items-center gap-1">
        <div className="flex min-w-0 flex-1 items-center justify-between" role="radiogroup" aria-label="cor do traço">
          {DRAW_COLORS.map((c) => {
            const selected = c.value === color;
            return (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={c.label}
                onClick={() => {
                  colorRef.current = c.value;
                  setColor(c.value);
                }}
                className="flex h-14 min-w-0 flex-1 items-center justify-center rounded-full"
              >
                <span
                  className={`block rounded-full border-2 transition-all ${
                    selected ? 'h-12 w-12 border-gold ring-2 ring-gold/60' : 'h-9 w-9 border-ink/70'
                  }`}
                  style={{ background: c.value }}
                />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={clearEverywhere}
          className="display min-h-14 shrink-0 rounded-2xl border-2 border-team-red/60 px-3 text-base text-team-red active:bg-team-red/10"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}

export default DrawPad;
