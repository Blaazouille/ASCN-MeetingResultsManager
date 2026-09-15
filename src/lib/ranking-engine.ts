import type { RawSwimmerRow } from './csv-parser';

export interface RankingParams {
  /** Category to compute, e.g. "Classement Mixte". */
  category: string;
  /** Number of top swimmers per club to retain. */
  topN: number;
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

  const unranked: Omit<TeamResult, 'rank'>[] = [];
  for (const [club, clubRows] of byClub) {
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
