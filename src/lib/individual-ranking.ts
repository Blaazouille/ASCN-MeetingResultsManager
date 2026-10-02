/**
 * Responsabilité : calcul du classement individuel d'une catégorie.
 * Appelé par : IndividualPage.tsx (via hook), ceremony-script.ts et les tests.
 * Suppression casserait : la page de classement individuel.
 */
import type { RawSwimmerRow } from './csv-parser';
import { assignCompetitionRanks } from './rank-ties';

export type Gender = 'F' | 'M' | null;

/** Number of top swimmers per category who get a prize (1er Prix, 2e Prix), shared by the Individuels screen and the ceremony. */
export const INDIVIDUAL_PRIZE_COUNT = 2;

export interface IndividualResult {
  rank: number;
  lastname: string;
  firstname: string;
  birthyear: number;
  club: string;
  points: number;
}

export function detectGender(categoryName: string): Gender {
  const lower = categoryName.toLowerCase();
  if (lower.includes('dames')) return 'F';
  if (lower.includes('messieurs')) return 'M';
  return null;
}

/**
 * Ranking of one category's swimmers by their points in that category. Each
 * category is ranked from its own rows: a swimmer listed in several categories
 * appears in each, because the Mixte table scores lower than Dames/Messieurs and
 * keeping only the best row across categories emptied the Mixte tab.
 */
export function computeCategoryRanking(rows: RawSwimmerRow[], category: string): IndividualResult[] {
  const inCategory = rows.filter((row) => row.name === category).sort((a, b) => b.points - a.points);
  const ranks = assignCompetitionRanks(inCategory, (row) => row.points);
  return inCategory.map((row, index) => ({
    rank: ranks[index]!,
    lastname: row.lastname,
    firstname: row.firstname,
    birthyear: row.birthyear,
    club: row.club,
    points: row.points,
  }));
}
