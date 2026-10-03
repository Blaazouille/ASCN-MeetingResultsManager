/**
 * Responsabilité : situation de « Notre club » dans la catégorie affichée (rang, points, écarts avec les voisins).
 * Appelé par : RankingPage.tsx (ligne « Notre club » de la barre de filtres) et les tests.
 * Suppression casserait : la ligne « Notre club » de l'écran Classement.
 */
import type { RawSwimmerRow } from './csv-parser';
import { computeTeamRanking, type TeamResult } from './ranking-engine';
import { isOurClub } from './our-club';

interface ClubSummaryParams {
  /** Category whose tab is open: the line only speaks of what the table shows. */
  category: string;
  /** Top N currently selected on screen, so the gaps match the table. */
  topN: number;
  /** Clubs with fewer swimmers than this are left out of the ranking. */
  minSwimmers: number;
}

/** A club next to ours in the ranking: its rank and the points between us. */
interface Neighbour {
  rank: number;
  points: number;
}

interface RankedStatus {
  kind: 'ranked';
  rank: number;
  tied: boolean;
  /** Ranked clubs in the category (the « / 38 »). */
  clubCount: number;
  totalPoints: number;
  /** Points missing to reach the next better total; null for the 1st. */
  behind: Neighbour | null;
  /** Points ahead of the next lower total; null for the last. */
  ahead: Neighbour | null;
}

export type ClubCategoryStatus =
  | RankedStatus
  | { kind: 'below-threshold'; minSwimmers: number }
  | { kind: 'absent' };

export interface ClubSummary {
  /** The club's spelling in the results (it may differ in case from the setting): the key the table's rows use. */
  club: string;
  status: ClubCategoryStatus;
}

/**
 * Where our club stands against its neighbours. Tied clubs share our total,
 * so the neighbours are the nearest *different* totals: reaching the one above
 * is what earns a better place, the one below is the margin we have.
 */
function rankedStatus(ranking: TeamResult[], ours: TeamResult): RankedStatus {
  const above = ranking.filter((team) => team.totalPoints > ours.totalPoints).at(-1);
  const below = ranking.find((team) => team.totalPoints < ours.totalPoints);
  return {
    kind: 'ranked',
    rank: ours.rank,
    tied: ranking.some((team) => team !== ours && team.rank === ours.rank),
    clubCount: ranking.length,
    totalPoints: ours.totalPoints,
    behind: above ? { rank: above.rank, points: above.totalPoints - ours.totalPoints } : null,
    ahead: below ? { rank: below.rank, points: ours.totalPoints - below.totalPoints } : null,
  };
}

/**
 * Our club's situation in the displayed category, reusing the team ranking
 * as it is computed for the table (no ranking of its own, so the line can
 * never disagree with the table). Null when the club has no swimmer anywhere
 * in the meeting: the line then has nothing to say. A club entered in other
 * categories only still gets a line, saying it has no swimmer in this one.
 */
export function computeClubSummary(rows: RawSwimmerRow[], ourClub: string, params: ClubSummaryParams): ClubSummary | null {
  const ourRows = rows.filter((row) => isOurClub(row.club, ourClub));
  if (ourRows.length === 0) return null;

  const { category } = params;
  const ranking = computeTeamRanking(rows, { category, topN: params.topN, minSwimmers: params.minSwimmers });
  const ours = ranking.find((team) => isOurClub(team.club, ourClub));
  let status: ClubCategoryStatus;
  if (ours) {
    status = rankedStatus(ranking, ours);
  } else if (ourRows.some((row) => row.name === category)) {
    status = { kind: 'below-threshold', minSwimmers: params.minSwimmers };
  } else {
    status = { kind: 'absent' };
  }
  return { club: ours?.club ?? ourRows[0]!.club, status };
}
