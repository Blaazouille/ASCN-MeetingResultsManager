/**
 * Responsabilité : tuile « grand chiffre + libellé » du résumé d'import (nageurs, clubs, catégories).
 * Appelé par : ImportPage.tsx.
 * Suppression casserait : le résumé chiffré du fichier importé.
 */
import type { ReactNode } from 'react';
import { formatPoints } from '@/lib/utils';

export interface StatTileProps {
  value: number;
  label: string;
  /** Shown under the label, e.g. one chip per category. */
  children?: ReactNode;
}

export function StatTile({ value, label, children }: StatTileProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-surface-header px-5 py-4">
      <span className="font-display text-[44px] font-bold leading-none tabular-nums text-marine">{formatPoints(value)}</span>
      <span className="text-[15px] text-ink-soft">{label}</span>
      {children && <div className="flex flex-wrap gap-1.5 pt-2">{children}</div>}
    </div>
  );
}
