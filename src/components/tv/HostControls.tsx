'use client';

import { useEffect, useState } from 'react';

/** Controles discretos do host: destravam a noite se alguém sumir. */
export function HostControls({
  onSkip,
  onEndRound,
}: {
  onSkip: () => void;
  onEndRound: () => void;
}) {
  const [arming, setArming] = useState(false);

  useEffect(() => {
    if (!arming) return;
    const id = setTimeout(() => setArming(false), 3000);
    return () => clearTimeout(id);
  }, [arming]);

  const base =
    'display rounded-lg border border-line bg-surface/80 px-3 py-2 text-xs text-muted transition-colors hover:border-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-gold';

  return (
    <div
      data-tv="host-controls"
      className="fixed bottom-3 right-3 z-30 flex items-center gap-2 opacity-40 transition-opacity duration-200 focus-within:opacity-100 hover:opacity-100"
    >
      <span className="display text-[10px] text-muted">host</span>
      <button type="button" className={base} data-tv="host-skip" onClick={onSkip}>
        Pular fase
      </button>
      <button
        type="button"
        data-tv="host-end-round"
        className={`${base} ${arming ? 'border-team-red text-team-red' : ''}`}
        onClick={() => {
          if (arming) {
            setArming(false);
            onEndRound();
          } else {
            setArming(true);
          }
        }}
      >
        {arming ? 'Confirma encerrar?' : 'Encerrar rodada'}
      </button>
    </div>
  );
}

export default HostControls;
