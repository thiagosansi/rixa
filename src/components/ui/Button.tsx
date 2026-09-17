'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'red' | 'blue' | 'gold' | 'danger';
type Size = 'md' | 'lg' | 'xl';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
};

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gold text-[#170d02] border-gold hover:brightness-110 active:brightness-95 shadow-[0_6px_0_#a8781f]',
  gold: 'bg-gold text-[#170d02] border-gold hover:brightness-110 shadow-[0_6px_0_#a8781f]',
  red: 'bg-team-red text-white border-team-red hover:brightness-110 shadow-[0_6px_0_#9c1128]',
  blue: 'bg-team-blue text-[#04203a] border-team-blue hover:brightness-110 shadow-[0_6px_0_#12608f]',
  ghost: 'bg-surface-2 text-ink border-line hover:border-muted',
  danger: 'bg-transparent text-team-red border-team-red/60 hover:bg-team-red/10',
};

const SIZES: Record<Size, string> = {
  md: 'min-h-[56px] px-5 text-lg',
  lg: 'min-h-[64px] px-7 text-2xl',
  xl: 'min-h-[80px] px-9 text-3xl md:text-4xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={[
        'display inline-flex items-center justify-center gap-3 rounded-2xl border-2',
        'transition-[filter,transform,border-color] duration-100 active:translate-y-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:translate-y-0',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default Button;
