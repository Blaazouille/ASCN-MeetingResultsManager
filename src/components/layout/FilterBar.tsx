/**
 * Responsabilité : carte blanche qui regroupe les filtres d'une page de classement.
 * Appelé par : RankingToolbar.tsx, IndividualPage.tsx, PalmaresPage.tsx.
 * Suppression casserait : la mise en page des filtres des classements.
 */
import type { ReactNode } from 'react';

export interface FilterBarProps {
  children: ReactNode;
}

export function FilterBar({ children }: FilterBarProps): JSX.Element {
  return (
    <section aria-label="Filtres" className="flex flex-wrap items-center gap-6 rounded-lg bg-surface-raised px-4 py-3 shadow-card">
      {children}
    </section>
  );
}
