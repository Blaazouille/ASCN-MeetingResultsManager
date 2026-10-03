/**
 * Responsabilité : filtres du classement par équipes (catégorie, nageurs comptés par club, recherche), avec un créneau pour la ligne « Notre club ».
 * Appelé par : RankingPage.tsx.
 * Suppression casserait : le filtrage du classement.
 */
import type { ReactNode } from 'react';
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
  /** Our club's line (OurClubLine), shown in the free space left of the search; null hides it. */
  ourClub: ReactNode;
}

export function RankingToolbar({
  categories,
  category,
  onCategoryChange,
  topN,
  onTopNChange,
  search,
  onSearchChange,
  ourClub,
}: RankingToolbarProps): JSX.Element {
  return (
    <FilterBar>
      <CategoryTabs categories={categories} active={category} onChange={onCategoryChange} />
      <Segmented label="Nageurs comptés par club" options={TOP_N_SEGMENTS} value={topN} onChange={onTopNChange} />
      {/* The line and the search move as one block: the line stays left of the search,
          on the row the bar's free space allows (a second row at 1366 px); only a
          window narrower than the app's minimum would stack them. */}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-x-6 gap-y-3">
        {ourClub}
        <SearchField value={search} onChange={onSearchChange} placeholder="Rechercher un club" />
      </div>
    </FilterBar>
  );
}
