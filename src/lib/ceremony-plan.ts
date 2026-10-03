/**
 * Responsabilité : préparation de la cérémonie (blocs cochés et leur ordre, catégories annoncées), traduite en options du déroulé.
 * Appelé par : use-ceremony.ts et les tests.
 * Suppression casserait : le choix des blocs, de leur ordre et des catégories annoncées sur l'écran Cérémonie.
 */
import { CEREMONY_BLOCKS, type CeremonyBlock, type CeremonyOptions } from './ceremony-script';
import { defaultPickedCategories } from './category-picking';

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
 * The categories actually announced, in `available` order. `chosen` is null
 * until the manager ticks or unticks one: the default applies
 * (defaultPickedCategories: Mixte only, or every category without Mixte). An empty
 * choice is kept as is, so the manager sees he unticked everything (the
 * screen then blocks the launch) instead of the boxes silently ticking back.
 * A choice whose categories all disappeared from the data (re-import or
 * Paramètres changed meanwhile) falls back to the default: the manager did
 * not untick them, they vanished.
 */
export function resolveCeremonyCategories(available: readonly string[], chosen: readonly string[] | null): string[] {
  if (chosen === null) return defaultPickedCategories(available);
  if (chosen.length === 0) return [];
  const kept = available.filter((category) => chosen.includes(category));
  return kept.length > 0 ? kept : defaultPickedCategories(available);
}

/** Options for buildCeremonyScript: the ticked blocks, in the planned order, for the ticked categories. */
export function planToOptions(plan: readonly PlannedBlock[], teamPlaces: number, categories: string[]): CeremonyOptions {
  return { blocks: plan.filter((entry) => entry.enabled).map((entry) => entry.block), teamPlaces, categories };
}
