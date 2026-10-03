/**
 * Responsabilité : cases à cocher des catégories annoncées pendant la cérémonie (Mixte seul par défaut).
 * Appelé par : CeremonyPreparation.tsx.
 * Suppression casserait : le choix des catégories annoncées sur l'écran Cérémonie.
 */
import { categoryShortLabel } from '@/lib/ui-labels';
import { cn } from '@/lib/utils';

export interface CeremonyCategoryPickerProps {
  /** Every category that can be announced, in import order. */
  available: string[];
  /** The ticked ones; never empty while some are available. */
  selected: string[];
  onToggle: (category: string) => void;
}

export function CeremonyCategoryPicker({ available, selected, onToggle }: CeremonyCategoryPickerProps): JSX.Element {
  const onlyOneLeft = selected.length === 1 && available.length > 1;
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-2">
        {available.map((category) => {
          const isChecked = selected.includes(category);
          // Same rule as the active categories in Paramètres: the last box can't be unticked,
          // so there is always something to announce.
          const isLocked = isChecked && onlyOneLeft;
          return (
            <li key={category}>
              <label
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-md bg-surface-sunken px-4 text-base font-semibold',
                  isLocked ? 'cursor-not-allowed text-ink-muted' : 'cursor-pointer text-ink'
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isLocked}
                  onChange={() => onToggle(category)}
                  className="h-5 w-5 accent-marine disabled:cursor-not-allowed"
                />
                {categoryShortLabel(category)}
              </label>
            </li>
          );
        })}
      </ul>
      {onlyOneLeft && <p className="text-sm text-ink-muted">Au moins une catégorie doit rester cochée.</p>}
    </div>
  );
}
