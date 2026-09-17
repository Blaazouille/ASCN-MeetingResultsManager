/**
 * Responsabilité : onglets de filtre par genre (Tous / Dames / Messieurs).
 * Appelé par : IndividualPage.tsx.
 * Suppression casserait : le filtre par genre du classement individuel.
 */
import { cn } from '@/lib/utils';

export type GenderFilter = 'all' | 'F' | 'M';

export interface GenderTabsProps {
  active: GenderFilter;
  onChange: (filter: GenderFilter) => void;
}

const TABS: { value: GenderFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'F', label: 'Dames' },
  { value: 'M', label: 'Messieurs' },
];

export function GenderTabs({ active, onChange }: GenderTabsProps): JSX.Element {
  return (
    <div role="tablist" className="flex gap-1 border-b border-neutral-200">
      {TABS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={value === active}
          onClick={() => onChange(value)}
          className={cn(
            'border-b-2 px-4 py-2 text-sm font-medium transition-colors duration-150',
            value === active
              ? 'border-secondary-600 text-secondary-800'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
