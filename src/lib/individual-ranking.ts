/**
 * Responsabilité : calcul du classement individuel tous nageurs confondus.
 * Appelé par : IndividualPage.tsx (via hook) et les tests.
 * Suppression casserait : la page de classement individuel.
 */
import type { RawSwimmerRow } from './csv-parser';

export type Gender = 'F' | 'M' | null;

export interface IndividualResult {
  rank: number;
  lastname: string;
  firstname: string;
  birthyear: number;
  club: string;
  points: number;
  category: string;
  gender: Gender;
}

export function detectGender(categoryName: string): Gender {
  const lower = categoryName.toLowerCase();
  if (lower.includes('dames')) return 'F';
  if (lower.includes('messieurs')) return 'M';
  return null;
}

export function computeIndividualRanking(rows: RawSwimmerRow[]): IndividualResult[] {
  const bestBySwimmer = new Map<string, { row: RawSwimmerRow; gender: Gender }>();

  for (const row of rows) {
    const key = `${row.lastname}|${row.firstname}|${row.birthyear}|${row.club}`;
    const gender = detectGender(row.name);
    const existing = bestBySwimmer.get(key);

    if (!existing) {
      bestBySwimmer.set(key, { row, gender });
    } else {
      if (row.points > existing.row.points) {
        bestBySwimmer.set(key, { row, gender: gender ?? existing.gender });
      } else if (gender !== null && existing.gender === null) {
        bestBySwimmer.set(key, { row: existing.row, gender });
      }
    }
  }

  const entries = Array.from(bestBySwimmer.values());
  entries.sort((a, b) => b.row.points - a.row.points);

  return entries.map(({ row, gender }, index) => ({
    rank: index + 1,
    lastname: row.lastname,
    firstname: row.firstname,
    birthyear: row.birthyear,
    club: row.club,
    points: row.points,
    category: row.name,
    gender,
  }));
}

export function filterByGender(results: IndividualResult[], gender: 'F' | 'M'): IndividualResult[] {
  return results
    .filter((r) => r.gender === gender)
    .map((r, index) => ({ ...r, rank: index + 1 }));
}
