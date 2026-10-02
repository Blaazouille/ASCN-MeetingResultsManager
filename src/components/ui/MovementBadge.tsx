/**
 * Responsabilité : indicateur discret de mouvement de rang (↑2, ↓1, « nouveau ») depuis le dernier import.
 * Appelé par : TeamRankingTable.tsx, IndividualRankingTable.tsx.
 * Suppression casserait : les flèches de mouvement des classements.
 */
import type { Movement } from '@/lib/import-diff';
import { movementAriaLabel, movementText } from '@/lib/ui-labels';
import { cn } from '@/lib/utils';

export interface MovementBadgeProps {
  /** Absent = stable or no previous import: nothing is rendered. */
  movement: Movement | undefined;
}

export function MovementBadge({ movement }: MovementBadgeProps): JSX.Element | null {
  if (movement === undefined) return null;
  return (
    <span
      aria-label={movementAriaLabel(movement)}
      className={cn(
        'whitespace-nowrap text-sm font-bold tabular-nums',
        movement === 'new' ? 'text-ink-muted' : movement > 0 ? 'text-success' : 'text-corail-strong'
      )}
    >
      {movementText(movement)}
    </span>
  );
}
