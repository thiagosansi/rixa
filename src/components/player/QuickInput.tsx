'use client';

import { useRef, useState } from 'react';

export type QuickInputProps = {
  onSubmit: (text: string) => void;
  placeholder: string;
  buttonLabel?: string;
  maxLength?: number;
  disabled?: boolean;
  /** rótulo acessível do campo */
  label: string;
  /** mantém o texto depois de enviar (ex.: mentira que pode ser reescrita) */
  keepText?: boolean;
  initialValue?: string;
  autoFocus?: boolean;
};

/**
 * Campo de envio rápido para o celular: fonte >= 16px (sem zoom no iOS),
 * Enter envia, o foco volta pro campo (o teclado não fecha entre palpites).
 */
export function QuickInput({
  onSubmit,
  placeholder,
  buttonLabel = 'Enviar',
  maxLength = 60,
  disabled = false,
  label,
  keepText = false,
  initialValue = '',
  autoFocus = false,
}: QuickInputProps) {
  const [text, setText] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function submit() {
    const value = text.trim();
    if (!value || disabled) return;
    onSubmit(value);
    if (!keepText) setText('');
    inputRef.current?.focus();
  }

  return (
    <form
      className="flex items-stretch gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, maxLength))}
        onFocus={(e) => {
          // teclado abrindo: garante que o campo (e o botão ao lado) fiquem visíveis
          const el = e.currentTarget;
          setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
        }}
        aria-label={label}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoFocus={autoFocus}
        type="text"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="send"
        className="min-h-16 min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 text-2xl text-ink outline-none placeholder:text-muted/60 focus:border-gold disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || text.trim().length === 0}
        // não rouba o foco do input: o teclado continua aberto
        onPointerDown={(e) => e.preventDefault()}
        className="display min-h-16 shrink-0 rounded-2xl border-2 border-gold bg-gold px-5 text-xl text-[#170d02] shadow-[0_5px_0_#a8781f] active:translate-y-[3px] disabled:opacity-40 disabled:shadow-none"
      >
        {buttonLabel}
      </button>
    </form>
  );
}

export default QuickInput;
