/**
 * Responsabilité : catégorie sélectionnée commune aux écrans Classement, Individuels et Palmarès.
 * Appelé par : AppShell.tsx (useSelectedCategory, état partagé, vidé au changement de meeting),
 * RankingPage, IndividualPage et PalmaresPage (useCategoryChoice).
 * Suppression casserait : le partage de la catégorie entre les trois écrans de résultats.
 */
import { useCallback, useEffect, useState } from 'react';
import { isStaleSelection, resolveCategory } from '@/lib/category-selection';

export interface UseSelectedCategoryResult {
  /** The volunteer's last choice; null means « apply the default rule » (Mixte, otherwise the first category). */
  selected: string | null;
  select: (category: string) => void;
  /** Back to the default rule. Called on a meeting change and when the choice is no longer offered. */
  reset: () => void;
}

/**
 * Owns the shared choice. Mounted once in AppShell, like useImport: a state kept in each page was lost
 * on every screen change, so the volunteer had to pick the category again on each screen.
 */
export function useSelectedCategory(): UseSelectedCategoryResult {
  const [selected, setSelected] = useState<string | null>(null);
  const select = useCallback((category: string): void => setSelected(category), []);
  const reset = useCallback((): void => setSelected(null), []);
  return { selected, select, reset };
}

export interface CategoryChoice {
  /** Category to display on the screen, always one of the offered categories ('' when none). */
  category: string;
  setCategory: (category: string) => void;
}

/** Reads and writes the shared choice for one screen, given the categories this screen offers. */
export function useCategoryChoice(selection: UseSelectedCategoryResult, categories: string[]): CategoryChoice {
  const { selected, select, reset } = selection;
  // Forget the stale choice instead of only hiding it: per the product rule it falls back to the
  // default, so a category re-enabled later in Paramètres must not come back selected by surprise.
  useEffect(() => {
    if (isStaleSelection(selected, categories)) reset();
  }, [selected, categories, reset]);

  return { category: resolveCategory(selected, categories), setCategory: select };
}
