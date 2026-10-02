/**
 * Responsabilité : résume la situation de « Notre club » dans chaque catégorie (rang, points, écarts, nageurs, meilleur nageur).
 * Appelé par : RankingPage.tsx (carte « Notre club ») et les tests.
 * Suppression casserait : la carte « Notre club » de l'écran Classement.
 */
import type { RawSwimmerRow } from './csv-parser';
import { computeTeamRanking, type TeamResult } from './ranking-engine';
import { computeCategoryRanking } from './individual-ranking';
import { isOurClub } from './our-club';

interface ClubSummaryParams {
  /** Categories to summarize, in display order: the active ones shown on the ranking screen. */
  categories: string[];
  /** Top N currently selected on screen, so the gaps match the table below the card. */
  topN: number;
  /** Clubs with fewer swimmers than this are left out of a category's ranking. */
  minSwimmers: number;
}

/** A club next to ours in the ranking: its rank and the points between us. */
export interface Neighbour {
  rank: number;
  points: number;
}

export interface BestSwimmer {
  firstname: string;
  lastname: string;
  rank: number;
  tied: boolean;
  points: number;
}

interface RankedStatus {
  kind: 'ranked';
  rank: number;
  tied: boolean;
  /** Ranked clubs in the category (the « / 38 »). */
  clubCount: number;
  totalPoints: number;
  /** Swimmers counted in the total (at most top N). */
  retained: number;
  /** Points missing to reach the next better total; null for the 1st. */
  behind: Neighbour | null;
  /** Points ahead of the next lower total; null for the last. */
  ahead: Neighbour | null;
}

export type ClubCategoryStatus =
  | RankedStatus
  | { kind: 'below-threshold'; minSwimmers: number }
  | { kind: 'absent' };

export interface ClubCategorySummary {
  category: string;
  /** Our swimmers entered in the category, retained or not. */
  entered: number;
  status: ClubCategoryStatus;
  /** Our best placed swimmer in the category's individual ranking; null when we have none there. */
  bestSwimmer: BestSwimmer | null;
}

export interface ClubSummary {
  /** The club's spelling in the results (it may differ in case from the setting). */
  club: string;
  categories: ClubCategorySummary[];
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
    retained: ours.swimmers.length,
    behind: above ? { rank: above.rank, points: above.totalPoints - ours.totalPoints } : null,
    ahead: below ? { rank: below.rank, points: ours.totalPoints - below.totalPoints } : null,
  };
}

function bestSwimmerOf(rows: RawSwimmerRow[], category: string, ourClub: string): BestSwimmer | null {
  const ranking = computeCategoryRanking(rows, category);
  const best = ranking.find((swimmer) => isOurClub(swimmer.club, ourClub));
  if (!best) return null;
  return {
    firstname: best.firstname,
    lastname: best.lastname,
    rank: best.rank,
    tied: ranking.filter((swimmer) => swimmer.rank === best.rank).length > 1,
    points: best.points,
  };
}

/**
 * Our club's situation in each category, reusing the team and individual
 * rankings as they are computed for the screen (no ranking of its own, so
 * the card can never disagree with the table). Null when the club has no
 * swimmer in any of the categories: the card then has nothing to say.
 */
export function computeClubSummary(rows: RawSwimmerRow[], ourClub: string, params: ClubSummaryParams): ClubSummary | null {
  const ourRows = rows.filter((row) => isOurClub(row.club, ourClub) && params.categories.includes(row.name));
  if (ourRows.length === 0) return null;

  const categories = params.categories.map((category): ClubCategorySummary => {
    const entered = ourRows.filter((row) => row.name === category).length;
    const ranking = computeTeamRanking(rows, { category, topN: params.topN, minSwimmers: params.minSwimmers });
    const ours = ranking.find((team) => isOurClub(team.club, ourClub));
    let status: ClubCategoryStatus;
    if (ours) {
      status = rankedStatus(ranking, ours);
    } else if (entered > 0) {
      status = { kind: 'below-threshold', minSwimmers: params.minSwimmers };
    } else {
      status = { kind: 'absent' };
    }
    return { category, entered, status, bestSwimmer: bestSwimmerOf(rows, category, ourClub) };
  });

  return { club: ourRows[0]!.club, categories };
}
