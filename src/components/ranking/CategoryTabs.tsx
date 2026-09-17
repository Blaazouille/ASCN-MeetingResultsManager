/**
 * Responsabilité : onglets de sélection de catégorie de classement (Dames/Messieurs/Mixte).
 * Appelé par : RankingPage.tsx.
 * Suppression casserait : le filtrage du classement par catégorie.
 */
import { cn } from '@/lib/utils';

export interface CategoryTabsProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}

/** Strips the "Classement " prefix for the tab label, e.g. "Classement Mixte" -> "Mixte". */
function tabLabel(category: string): string {
  return category.replace(/^Classement\s+/i, '');
}

export function CategoryTabs({ categories, active, onChange }: CategoryTabsProps): JSX.Element {
  return (
    <div role="tablist" className="flex gap-1 border-b border-neutral-200">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={category === active}
          onClick={() => onChange(category)}
          className={cn(
            'border-b-2 px-4 py-2 text-sm font-medium transition-colors duration-150',
            category === active
              ? 'border-secondary-600 text-secondary-800'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          )}
        >
          {tabLabel(category)}
        </button>
      ))}
    </div>
  );
}
