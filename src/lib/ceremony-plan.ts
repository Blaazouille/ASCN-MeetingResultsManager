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
 * until the manager ticks or unticks one: the default applies. An empty
 * choice is kept as is, so the manager sees he unticked everything (the
 * screen then blocks the launch) instead of the boxes silently ticking back.
 * A choice whose categories all disappeared from the data (re-import or
 * Paramètres changed meanwhile) falls back to the default: the manager did
 * not untick them, they vanished.
 */
export function resolveCeremonyCategories(available: readonly string[], chosen: readonly string[] | null): string[] {
  if (chosen === null) return defaultCeremonyCategories(available);
  if (chosen.length === 0) return [];
  const kept = available.filter((category) => chosen.includes(category));
  return kept.length > 0 ? kept : defaultCeremonyCategories(available);
}

/** Ticks or unticks one category; every box can be unticked, including the last one. */
export function toggleCeremonyCategory(selected: readonly string[], category: string): string[] {
  return selected.includes(category) ? selected.filter((entry) => entry !== category) : [...selected, category];
}

/**
 * True when there are categories to choose from but none is ticked: the
 * launch and the printed sheet are then blocked, with a sentence saying why.
 * Without any category in the data there is nothing to tick, so nothing to ask.
 */
export function isMissingCeremonyCategory(available: readonly string[], selected: readonly string[]): boolean {
  return available.length > 0 && selected.length === 0;
}

/** Options for buildCeremonyScript: the ticked blocks, in the planned order, for the ticked categories. */
export function planToOptions(plan: readonly PlannedBlock[], teamPlaces: number, categories: string[]): CeremonyOptions {
  return { blocks: plan.filter((entry) => entry.enabled).map((entry) => entry.block), teamPlaces, categories };
}
