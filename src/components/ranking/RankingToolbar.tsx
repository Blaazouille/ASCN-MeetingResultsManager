/**
 * Responsabilité : filtres du classement par équipes (catégorie, nageurs comptés par club, recherche).
 * Appelé par : RankingPage.tsx.
 * Suppression casserait : le filtrage du classement.
 */
import { TOP_N_OPTIONS, type TopN } from '@/hooks/use-ranking';
import { FilterBar } from '@/components/layout/FilterBar';
import { Segmented } from '@/components/ui/Segmented';
import { SearchField } from '@/components/ui/SearchField';
import { CategoryTabs } from './CategoryTabs';

const TOP_N_SEGMENTS = TOP_N_OPTIONS.map((value) => ({ value, label: String(value) }));

export interface RankingToolbarProps {
  categories: string[];
  category: string;
  onCategoryChange: (category: string) => void;
  topN: TopN;
  onTopNChange: (topN: TopN) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function RankingToolbar({
  categories,
  category,
  onCategoryChange,
  topN,
  onTopNChange,
  search,
  onSearchChange,
}: RankingToolbarProps): JSX.Element {
  return (
    <FilterBar>
      <CategoryTabs categories={categories} active={category} onChange={onCategoryChange} />
      <Segmented label="Nageurs comptés par club" options={TOP_N_SEGMENTS} value={topN} onChange={onTopNChange} />
      {/* Flexible slot: the search shrinks to 200px so it shares the first row at 1366px wide, and only wraps on narrower windows. */}
      <div className="ml-auto flex min-w-[200px] flex-1 justify-end">
        <SearchField value={search} onChange={onSearchChange} placeholder="Rechercher un club" />
      </div>
    </FilterBar>
  );
}
