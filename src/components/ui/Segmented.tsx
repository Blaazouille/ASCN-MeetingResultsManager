/**
 * Responsabilité : sélecteur « une option parmi quelques-unes » toujours visible (catégorie, nageurs comptés, statut).
 * Appelé par : CategoryTabs.tsx, RankingToolbar.tsx, SettingsForm.tsx.
 * Suppression casserait : le choix de la catégorie, du nombre de nageurs comptés et du statut.
 */
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string | number> {
  /** Visible label beside the options; also the group's accessible name. */
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  hideLabel = false,
}: SegmentedProps<T>): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      {!hideLabel && (
        <span className="text-sm font-semibold text-ink-soft" aria-hidden>
          {label}
        </span>
      )}
      <div role="group" aria-label={label} className="inline-flex gap-1 rounded-md bg-surface-sunken p-1">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'h-10 min-w-[48px] rounded-sm px-4 text-[15px] transition-colors',
                selected
                  ? 'bg-surface-raised font-bold text-marine shadow-segment'
                  : 'font-semibold text-ink-soft hover:text-ink'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
