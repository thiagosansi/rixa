'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export type CodeDisplayProps = {
  code: string;
  /** URL completa pro celular, ex.: http://192.168.0.10:3000/jogar?code=ABCD */
  joinUrl?: string | null;
  className?: string;
};

export function CodeDisplay({ code, joinUrl, className = '' }: CodeDisplayProps) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!joinUrl) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(joinUrl, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0a0710', light: '#f6f0ff' },
    })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setQr(null);
      });
    return () => {
      alive = false;
    };
  }, [joinUrl]);

  const pretty = joinUrl?.replace(/^https?:\/\//, '').replace(/\?.*$/, '');

  return (
    <div className={`flex flex-col items-center gap-6 md:flex-row md:items-center ${className}`}>
      <div className="rounded-3xl border-2 border-line bg-surface p-6 text-center">
        <div className="display text-sm tracking-[0.3em] text-muted">CÓDIGO DA SALA</div>
        <div className="display stroke-title text-8xl tracking-[0.12em] text-gold md:text-[10rem]">
          {code || '----'}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="rounded-3xl border-2 border-line bg-ink p-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt={`QR code para entrar na sala ${code}`}
              className="h-48 w-48 md:h-64 md:w-64"
            />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center text-center text-sm text-[#0a0710] md:h-64 md:w-64">
              gerando QR…
            </div>
          )}
        </div>
        {pretty && (
          <div className="display text-center text-xl text-ink md:text-3xl">
            {pretty}
            <div className="mt-1 font-body text-xs normal-case tracking-normal text-muted">
              abra no celular e digite o código
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CodeDisplay;
