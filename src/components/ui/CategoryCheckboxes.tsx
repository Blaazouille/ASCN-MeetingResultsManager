/**
 * Responsabilité : cases à cocher des catégories (une par catégorie, toutes décochables) et phrase affichée quand aucune n'est cochée.
 * Appelé par : CeremonyPreparation.tsx (catégories annoncées) et ExportPackDialog.tsx (catégories exportées).
 * Suppression casserait : le choix des catégories sur l'écran Cérémonie et dans « Tout exporter ».
 */
import { categoryShortLabel } from '@/lib/ui-labels';

export interface CategoryCheckboxesProps {
  /** Every category that can be ticked, in display order. */
  available: string[];
  /** The ticked ones; may be empty. */
  selected: string[];
  /** True when none is ticked: `missingHint` is shown under the boxes. */
  isMissing: boolean;
  onToggle: (category: string) => void;
  /** Read by screen readers only: the title next to the boxes already says it on screen. */
  legend: string;
  /** Sentence explaining why the action is blocked when no box is ticked. */
  missingHint: string;
  /** Id of that sentence, so the blocked buttons can point to it with aria-describedby. */
  missingHintId: string;
}

export function CategoryCheckboxes({
  available,
  selected,
  isMissing,
  onToggle,
  legend,
  missingHint,
  missingHintId,
}: CategoryCheckboxesProps): JSX.Element {
  return (
    // fieldset + legend so a screen reader announces the boxes as one group.
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{legend}</legend>
      <ul className="flex flex-wrap gap-2">
        {/* Every box stays enabled and looks normal, even the last ticked one: a greyed
            box read as broken. The action is blocked instead when none is ticked. */}
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
        <p id={missingHintId} className="text-[15px] font-semibold text-corail-strong">
          {missingHint}
        </p>
      )}
    </fieldset>
  );
}
