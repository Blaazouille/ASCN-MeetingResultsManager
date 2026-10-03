/**
 * Responsabilité : préparation de la cérémonie (blocs cochés et leur ordre, catégories annoncées), traduite en options du déroulé.
 * Appelé par : use-ceremony.ts et les tests.
 * Suppression casserait : le choix des blocs, de leur ordre et des catégories annoncées sur l'écran Cérémonie.
 */
import { CEREMONY_BLOCKS, type CeremonyBlock, type CeremonyOptions } from './ceremony-script';

export interface PlannedBlock {
  block: CeremonyBlock;
  enabled: boolean;
}

/** Every block ticked, in the default order. */
export const DEFAULT_PLAN: readonly PlannedBlock[] = CEREMONY_BLOCKS.map((block) => ({ block, enabled: true }));

/** Ticks or unticks one block; its position is kept so re-ticking puts it back where it was. */
export function toggleBlock(plan: readonly PlannedBlock[], block: CeremonyBlock): PlannedBlock[] {
  return plan.map((entry) => (entry.block === block ? { ...entry, enabled: !entry.enabled } : entry));
}

/** Moves a block one position up (-1) or down (+1); a move past either end leaves the plan unchanged. */
export function moveBlock(plan: readonly PlannedBlock[], index: number, delta: -1 | 1): PlannedBlock[] {
  const target = index + delta;
  if (index < 0 || index >= plan.length || target < 0 || target >= plan.length) return [...plan];
  const next = [...plan];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

/**
 * Categories ticked when the screen opens: Mixte only, the only category the
 * Meeting de la Mer actually rewards. Matched on the name (any case) since
 * the file names it « Classement Mixte ». Without a Mixte category, nothing
 * tells which one is rewarded, so every category is ticked.
 */
export function defaultCeremonyCategories(available: readonly string[]): string[] {
  const mixte = available.filter((category) => category.toLowerCase().includes('mixte'));
  return mixte.length > 0 ? mixte : [...available];
}

/**
 * The categories actually announced, in `available` order. `chosen` is null
 * until the manager ticks or unticks one. A choice that no longer matches any
 * available category (data or Paramètres changed meanwhile) falls back to the
 * default, so at least one category is always announced.
 */
export function resolveCeremonyCategories(available: readonly string[], chosen: readonly string[] | null): string[] {
  const kept = chosen === null ? [] : available.filter((category) => chosen.includes(category));
  return kept.length > 0 ? kept : defaultCeremonyCategories(available);
}

/** Ticks or unticks one category; the last ticked one stays ticked, as with the active categories in Paramètres. */
export function toggleCeremonyCategory(selected: readonly string[], category: string): string[] {
  if (!selected.includes(category)) return [...selected, category];
  return selected.length === 1 ? [...selected] : selected.filter((entry) => entry !== category);
}

/** Options for buildCeremonyScript: the ticked blocks, in the planned order, for the ticked categories. */
export function planToOptions(plan: readonly PlannedBlock[], teamPlaces: number, categories: string[]): CeremonyOptions {
  return { blocks: plan.filter((entry) => entry.enabled).map((entry) => entry.block), teamPlaces, categories };
}
