'use client';

import { useEffect, useRef, useState } from 'react';

export type TimerProps = {
  /** epoch ms */
  deadline: number;
  /** duração total em ms, para a barra de progresso */
  totalMs?: number;
  /**
   * (relógio de quem definiu o deadline) − (relógio local), em ms. O celular passa
   * `state.now - Date.now()` para não depender do próprio relógio estar certo.
   */
  offsetMs?: number;
  onExpire?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

function remainingMs(deadline: number, offsetMs: number): number {
  return Math.max(0, deadline - (Date.now() + offsetMs));
}

export function Timer({
  deadline,
  totalMs,
  offsetMs = 0,
  onExpire,
  size = 'md',
  className = '',
}: TimerProps) {
  const [left, setLeft] = useState(() => remainingMs(deadline, offsetMs));
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    firedRef.current = false;
    setLeft(remainingMs(deadline, offsetMs));
    const id = setInterval(() => {
      const ms = remainingMs(deadline, offsetMs);
      setLeft(ms);
      if (ms <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    }, 200);
    return () => clearInterval(id);
  }, [deadline, offsetMs]);

  const seconds = Math.ceil(left / 1000);
  const total = totalMs && totalMs > 0 ? totalMs : 60_000;
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const urgent = seconds <= 5;

  const textSize =
    size === 'lg' ? 'text-7xl md:text-9xl' : size === 'sm' ? 'text-2xl' : 'text-5xl';

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <span
        className={`display tabular-nums ${textSize} ${
          urgent ? 'text-team-red animate-pulse-soft' : 'text-ink'
        }`}
      >
        {seconds}
      </span>
      <div className="h-2 w-full min-w-24 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
            urgent ? 'bg-team-red' : 'bg-gold'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default Timer;
