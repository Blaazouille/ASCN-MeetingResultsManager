/**
 * Responsabilité : préparation de la cérémonie (blocs cochés et leur ordre), traduite en options du déroulé.
 * Appelé par : use-ceremony.ts et les tests.
 * Suppression casserait : le choix et le réordonnancement des blocs d'annonce sur l'écran Cérémonie.
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

/** Options for buildCeremonyScript: the ticked blocks, in the planned order. */
export function planToOptions(plan: readonly PlannedBlock[], teamPlaces: number): CeremonyOptions {
  return { blocks: plan.filter((entry) => entry.enabled).map((entry) => entry.block), teamPlaces };
}
