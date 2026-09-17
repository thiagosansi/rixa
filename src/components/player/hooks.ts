'use client';

import { useEffect } from 'react';

type WakeLockSentinelLike = { release: () => Promise<void>; released?: boolean };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

/** Mantém a tela acesa enquanto `active`. Silencioso onde não existe suporte. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return;
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let disposed = false;

    async function acquire() {
      if (disposed || document.visibilityState !== 'visible') return;
      try {
        const s = await nav.wakeLock!.request('screen');
        if (disposed) {
          s.release().catch(() => {});
          return;
        }
        sentinel = s;
      } catch {
        /* bateria fraca / sem permissão: segue sem wake lock */
      }
    }

    // o lock cai sozinho quando a aba vai pro fundo: pede de novo ao voltar
    function onVisibility() {
      if (document.visibilityState === 'visible') void acquire();
    }

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
