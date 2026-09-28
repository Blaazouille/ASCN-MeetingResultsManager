/**
 * Responsabilité : en-tête de page (surtitre, titre, résumé, actions à droite).
 * Appelé par : toutes les pages.
 * Suppression casserait : le titre et les actions principales de chaque écran.
 */
import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** Usually the open meeting's name. */
  overline?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ overline, title, subtitle, actions }: PageHeaderProps): JSX.Element {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-1.5">
        {overline && <span className="text-sm font-semibold text-ink-muted">{overline}</span>}
        <h1 className="font-display text-[44px] font-bold leading-none text-marine">{title}</h1>
        {subtitle && <p className="text-[15px] text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
