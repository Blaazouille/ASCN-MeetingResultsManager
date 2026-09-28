/**
 * Responsabilité : bouton d'action (principal, secondaire, discret) du design « Tableau de bassin ».
 * Appelé par : les pages et composants qui déclenchent une action (exports, création, import, paramètres).
 * Suppression casserait : tous les boutons d'action de l'interface.
 */
import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: LucideIcon;
  iconAfter?: LucideIcon;
}

// primary = the one action a screen exists for; use it at most once per screen.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-marine text-on-marine hover:bg-marine-deep',
  secondary: 'border-line-strong bg-surface-raised text-marine hover:bg-surface-sunken',
  ghost: 'bg-transparent text-marine hover:bg-surface-sunken',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconAfter: IconAfter,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border-[1.5px] border-transparent font-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        size === 'lg' ? 'h-12 px-6 text-base' : 'h-11 px-5 text-[15px]',
        VARIANT_CLASSES[variant],
        className
      )}
      {...rest}
    >
      {Icon && <Icon className="h-5 w-5" aria-hidden />}
      {children}
      {IconAfter && <IconAfter className="h-5 w-5" aria-hidden />}
    </button>
  );
}
