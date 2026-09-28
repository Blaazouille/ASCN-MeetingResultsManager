/**
 * Responsabilité : onglets de sélection de catégorie de classement (Dames/Messieurs/Mixte).
 * Appelé par : RankingToolbar.tsx, IndividualPage.tsx, PalmaresPage.tsx.
 * Suppression casserait : le filtrage du classement par catégorie.
 */
import { categoryShortLabel } from '@/lib/ui-labels';
import { Segmented } from '@/components/ui/Segmented';

export interface CategoryTabsProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}

export function CategoryTabs({ categories, active, onChange }: CategoryTabsProps): JSX.Element {
  const options = categories.map((category) => ({ value: category, label: categoryShortLabel(category) }));
  return <Segmented label="Catégorie" options={options} value={active} onChange={onChange} />;
}
