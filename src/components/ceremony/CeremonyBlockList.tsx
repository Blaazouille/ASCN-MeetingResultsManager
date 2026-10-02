/**
 * Responsabilité : blocs d'annonce à cocher et à réordonner (Monter / Descendre) avant la cérémonie.
 * Appelé par : CeremonyPreparation.tsx.
 * Suppression casserait : le choix de ce qui est annoncé et dans quel ordre.
 */
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { CeremonyBlock } from '@/lib/ceremony-script';
import type { PlannedBlock } from '@/lib/ceremony-plan';
import { CEREMONY_BLOCK_LABELS } from '@/lib/ceremony-labels';

export interface CeremonyBlockListProps {
  plan: PlannedBlock[];
  onToggle: (block: CeremonyBlock) => void;
  onMove: (index: number, delta: -1 | 1) => void;
}

const MOVE_BUTTON =
  'flex h-11 w-11 items-center justify-center rounded-sm text-marine transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40';

// Up/down buttons rather than drag and drop: three items, and buttons work
// the same with a mouse, a touchpad or the keyboard.
export function CeremonyBlockList({ plan, onToggle, onMove }: CeremonyBlockListProps): JSX.Element {
  return (
    <ol className="flex flex-col gap-2">
      {plan.map((entry, index) => {
        const label = CEREMONY_BLOCK_LABELS[entry.block];
        return (
          <li key={entry.block} className="flex items-center gap-3 rounded-md bg-surface-sunken px-3 py-1">
            <span className="w-6 text-center font-display text-xl font-bold tabular-nums text-ink-muted">{index + 1}</span>
            <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 text-base font-semibold text-ink">
              <input
                type="checkbox"
                checked={entry.enabled}
                onChange={() => onToggle(entry.block)}
                className="h-5 w-5 accent-marine"
              />
              {label}
            </label>
            <button
              type="button"
              className={MOVE_BUTTON}
              disabled={index === 0}
              onClick={() => onMove(index, -1)}
              aria-label={`Monter «\u00a0${label}\u00a0»`}
            >
              <ChevronUp className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              className={MOVE_BUTTON}
              disabled={index === plan.length - 1}
              onClick={() => onMove(index, 1)}
              aria-label={`Descendre «\u00a0${label}\u00a0»`}
            >
              <ChevronDown className="h-5 w-5" aria-hidden />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
