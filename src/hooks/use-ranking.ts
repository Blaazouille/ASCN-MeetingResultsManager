import { useMemo, useState } from 'react';
import type { RawSwimmerRow } from '@/lib/csv-parser';
import { computeTeamRanking, type TeamResult } from '@/lib/ranking-engine';

export const TOP_N_OPTIONS = [3, 5, 7, 10] as const;
export type TopN = (typeof TOP_N_OPTIONS)[number];

const DEFAULT_CATEGORY = 'Classement Mixte';
const DEFAULT_TOP_N: TopN = 5;

export interface UseRankingResult {
  category: string;
  setCategory: (category: string) => void;
  topN: TopN;
  setTopN: (topN: TopN) => void;
  teamResults: TeamResult[];
}

/**
 * Owns the category/topN selection for the ranking screen and derives the
 * team ranking from it. Defaults to "Classement Mixte" when present in the
 * imported categories, otherwise the first available category.
 */
export function useRanking(rows: RawSwimmerRow[], categories: string[]): UseRankingResult {
  const [category, setCategory] = useState<string>(
    categories.includes(DEFAULT_CATEGORY) ? DEFAULT_CATEGORY : (categories[0] ?? '')
  );
  const [topN, setTopN] = useState<TopN>(DEFAULT_TOP_N);

  const teamResults = useMemo(
    () => computeTeamRanking(rows, { category, topN }),
    [rows, category, topN]
  );

  return { category, setCategory, topN, setTopN, teamResults };
}
