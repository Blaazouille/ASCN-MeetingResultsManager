/**
 * Responsabilité : état du top N sélectionné et calcul du classement par équipes de la catégorie affichée.
 * Appelé par : RankingPage.tsx.
 * Suppression casserait : l'affichage et le filtrage du classement par équipes.
 */
import { useEffect, useMemo, useState } from 'react';
import type { RawSwimmerRow } from '@/lib/csv-parser';
import { computeTeamRanking, type TeamResult } from '@/lib/ranking-engine';

export const TOP_N_OPTIONS = [3, 5, 7, 10] as const;
export type TopN = (typeof TOP_N_OPTIONS)[number];

const DEFAULT_TOP_N: TopN = 5;

export interface UseRankingResult {
  topN: TopN;
  setTopN: (topN: TopN) => void;
  teamResults: TeamResult[];
}

export interface UseRankingOptions {
  /** Initial Top N value, from the meeting's saved default (falls back to 5 if not one of TOP_N_OPTIONS). */
  initialTopN?: number;
  /** Clubs with fewer than this many swimmers in the category are excluded entirely. */
  minSwimmers?: number;
}

/**
 * Owns the top N selection for the ranking screen and derives the team ranking of `category`.
 * The category is not owned here: it is shared with Individuels and Palmarès (use-selected-category.ts).
 */
export function useRanking(
  rows: RawSwimmerRow[],
  category: string,
  options: UseRankingOptions = {}
): UseRankingResult {
  const initialTopN = (TOP_N_OPTIONS as readonly number[]).includes(options.initialTopN ?? -1)
    ? (options.initialTopN as TopN)
    : DEFAULT_TOP_N;
  const [topN, setTopN] = useState<TopN>(initialTopN);

  // Re-adopts the meeting's default top N when it changes (e.g. switching to
  // another meeting without this hook's owning component unmounting): state
  // initialised from a prop would otherwise keep the previous meeting's value.
  useEffect(() => {
    setTopN(initialTopN);
  }, [initialTopN]);

  const teamResults = useMemo(
    () => computeTeamRanking(rows, { category, topN, minSwimmers: options.minSwimmers }),
    [rows, category, topN, options.minSwimmers]
  );

  return { topN, setTopN, teamResults };
}
