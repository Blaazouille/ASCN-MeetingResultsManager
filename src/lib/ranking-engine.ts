import type { RawSwimmerRow } from './csv-parser';

/** The three FFN result categories this app supports, in the order they should be offered as UI options. */
export const ALL_CATEGORIES = ['Classement Dames', 'Classement Messieurs', 'Classement Mixte'] as const;

/**
 * Resolves which categories the ranking UI should offer: the intersection
 * of `present` (categories actually found in the imported data, in their
 * original order) and `active` (the meeting's configured active
 * categories). `active === null` means "all active" — the historical
 * behavior before Paramètres existed. Falls back to all present categories
 * if the configured active set doesn't overlap with what's present, so a
 * meeting never ends up with zero selectable categories.
 */
export function resolveActiveCategories(present: string[], active: string[] | null): string[] {
  if (active === null) {
    return present;
  }
  const activeSet = new Set(active);
  const intersection = present.filter((category) => activeSet.has(category));
  return intersection.length > 0 ? intersection : present;
}

export interface RankingParams {
  /** Category to compute, e.g. "Classement Mixte". */
  category: string;
  /** Number of top swimmers per club to retain. */
  topN: number;
  /** Clubs with fewer than this many swimmers in the category are excluded entirely. 0 or omitted = no threshold. */
  minSwimmers?: number;
}

export interface SwimmerEntry {
  lastname: string;
  firstname: string;
  birthyear: number;
  points: number;
  /** Individual rank in category (the source file's "place" column). */
  rank: number;
}

export interface TeamResult {
  rank: number;
  club: string;
  totalPoints: number;
  /** The topN swimmers retained for the total. */
  swimmers: SwimmerEntry[];
  /** Total swimmers from this club in the category (may exceed topN). */
  swimmerCount: number;
}

/**
 * Computes the team ranking for a category: group swimmers by club, keep
 * each club's topN highest scorers, sum their points, and rank clubs by
 * that total (descending, 1-indexed, no gaps).
 */
export function computeTeamRanking(
  rows: RawSwimmerRow[],
  params: RankingParams
): TeamResult[] {
  const categoryRows = rows.filter((row) => row.name === params.category);

  const byClub = new Map<string, RawSwimmerRow[]>();
  for (const row of categoryRows) {
    let clubRows = byClub.get(row.club);
    if (!clubRows) {
      clubRows = [];
      byClub.set(row.club, clubRows);
    }
    clubRows.push(row);
  }

  const minSwimmers = params.minSwimmers ?? 0;

  const unranked: Omit<TeamResult, 'rank'>[] = [];
  for (const [club, clubRows] of byClub) {
    if (clubRows.length < minSwimmers) {
      continue;
    }
    const sorted = [...clubRows].sort((a, b) => b.points - a.points);
    const retained = sorted.slice(0, Math.min(params.topN, sorted.length));

    unranked.push({
      club,
      totalPoints: retained.reduce((sum, swimmer) => sum + swimmer.points, 0),
      swimmers: retained.map((swimmer) => ({
        lastname: swimmer.lastname,
        firstname: swimmer.firstname,
        birthyear: swimmer.birthyear,
        points: swimmer.points,
        rank: swimmer.place,
      })),
      swimmerCount: clubRows.length,
    });
  }

  unranked.sort((a, b) => b.totalPoints - a.totalPoints);

  return unranked.map((team, index) => ({
    ...team,
    rank: index + 1,
  }));
}

/**
 * Filters team results to those whose club name contains the query,
 * case-insensitively. An empty or whitespace-only query returns all results.
 */
export function filterTeamResultsByClub(results: TeamResult[], query: string): TeamResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return results;
  }
  return results.filter((team) => team.club.toLowerCase().includes(normalized));
}
