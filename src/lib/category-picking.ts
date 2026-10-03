/**
 * Responsabilité : règles des cases « catégories cochées » (cochées par défaut, cocher/décocher, aucune cochée).
 * Appelé par : ceremony-plan.ts et use-ceremony.ts (catégories annoncées), ExportPackDialog.tsx (catégories exportées), les tests.
 * Suppression casserait : le choix des catégories sur l'écran Cérémonie et dans « Tout exporter ».
 */
import { isMixteCategory } from './category-selection';

/**
 * Categories ticked when the boxes appear: Mixte only, the only category the
 * Meeting de la Mer actually rewards (same rule as the result screens,
 * isMixteCategory). Without a Mixte category, nothing tells which one is
 * rewarded, so every category is ticked.
 */
export function defaultPickedCategories(available: readonly string[]): string[] {
  const mixte = available.filter(isMixteCategory);
  return mixte.length > 0 ? mixte : [...available];
}

/** Ticks or unticks one category; every box can be unticked, including the last one. */
export function togglePickedCategory(selected: readonly string[], category: string): string[] {
  return selected.includes(category) ? selected.filter((entry) => entry !== category) : [...selected, category];
}

/**
 * True when there are categories to choose from but none is ticked: the
 * action (launching the ceremony, exporting) is then blocked, with a sentence
 * saying why. Without any category there is nothing to tick, so nothing to ask.
 */
export function isMissingPickedCategory(available: readonly string[], selected: readonly string[]): boolean {
  return available.length > 0 && selected.length === 0;
}
