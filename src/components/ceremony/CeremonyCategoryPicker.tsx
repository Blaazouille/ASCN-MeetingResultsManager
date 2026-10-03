/**
 * Responsabilité : cases à cocher des catégories annoncées pendant la cérémonie (Mixte seul par défaut).
 * Appelé par : CeremonyPreparation.tsx.
 * Suppression casserait : le choix des catégories annoncées sur l'écran Cérémonie.
 */
import { categoryShortLabel } from '@/lib/ui-labels';

/** Id of the sentence shown when no box is ticked; « Lancer » and « Imprimer » point to it with aria-describedby. */
export const NO_CATEGORY_HINT_ID = 'ceremony-no-category-hint';

export interface CeremonyCategoryPickerProps {
  /** Every category that can be announced, in import order. */
  available: string[];
  /** The ticked ones; may be empty. */
  selected: string[];
  /** True when none is ticked: the sentence explaining the blocked launch is shown. */
  isMissing: boolean;
  onToggle: (category: string) => void;
}

export function CeremonyCategoryPicker({ available, selected, isMissing, onToggle }: CeremonyCategoryPickerProps): JSX.Element {
  return (
    // fieldset + legend so a screen reader announces the boxes as one group; the
    // legend is hidden because the card title above already says it on screen.
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Catégories annoncées</legend>
      <ul className="flex flex-wrap gap-2">
        {/* Every box stays enabled and looks normal, even the last ticked one: a greyed
            box read as broken. The launch is blocked instead when none is ticked. */}
        {available.map((category) => (
          <li key={category}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md bg-surface-sunken px-4 text-base font-semibold text-ink">
              <input
                type="checkbox"
                checked={selected.includes(category)}
                onChange={() => onToggle(category)}
                className="h-5 w-5 accent-marine"
              />
              {categoryShortLabel(category)}
            </label>
          </li>
        ))}
      </ul>
      {isMissing && (
        <p id={NO_CATEGORY_HINT_ID} className="text-[15px] font-semibold text-corail-strong">
          Cochez au moins une catégorie pour lancer le déroulé.
        </p>
      )}
    </fieldset>
  );
}
