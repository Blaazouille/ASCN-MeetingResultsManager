/**
 * Responsabilité : construit le déroulé de la remise des prix (liste ordonnée des annonces) à partir des résultats.
 * Appelé par : use-ceremony.ts, ceremony-warnings.ts, ceremony-session.ts, ceremony-pdf-export.tsx et les tests.
 * Suppression casserait : l'écran Cérémonie et la fiche de proclamation PDF.
 */
import type { RawSwimmerRow } from './csv-parser';
import type { Meeting } from './db';
import { computeFunAwards } from './fun-awards';
import { computeCategoryRanking, INDIVIDUAL_PRIZE_COUNT } from './individual-ranking';
import { computeTeamRanking, resolveActiveCategories } from './ranking-engine';

/** The three kinds of announcement, in their default order (lightest first, team podium last). */
export const CEREMONY_BLOCKS = ['fun-awards', 'individual-prizes', 'team-ranking'] as const;
export type CeremonyBlock = (typeof CEREMONY_BLOCKS)[number];

/** Team places announced per category by default: the podium. */
export const DEFAULT_TEAM_PLACES = 3;

/** The meeting settings the script depends on (categories and team ranking rules). */
export type CeremonyMeeting = Pick<Meeting, 'activeCategories' | 'defaultTopN' | 'minSwimmers'>;

export interface CeremonyOptions {
  /** Blocks to announce, in announcement order; a block left out is skipped. */
  blocks: CeremonyBlock[];
  /** Team places announced per category, from the Nth down to the 1st. */
  teamPlaces: number;
}

export interface CeremonyWinner {
  /** What the announcer reads: "DUPONT Marie", a club name, or both names of a duo. */
  name: string;
  club: string;
  /** Null for fun awards, which are not about points. */
  points: number | null;
  /** Fun award explanation ("Née en 1950 (76 ans)"); null otherwise. */
  detail: string | null;
  /** Team steps: the retained swimmers, so they can be called to the podium. Empty otherwise. */
  swimmers: string[];
}

export interface CeremonyStep {
  /** Unique within a script; stable across rebuilds of the same data. */
  id: string;
  block: CeremonyBlock;
  category: string;
  /** Announced place (teams) or prize rank (individuals); null for a fun award. */
  rank: number | null;
  /** Fun award title ("La Doyenne"); null for ranked steps. */
  awardTitle: string | null;
  /** Several winners = ex aequo, announced together on the same step. */
  winners: CeremonyWinner[];
  /** Points ahead of the next place down; null for fun awards or when nobody follows. */
  gapToNext: number | null;
}

interface Ranked {
  rank: number;
}

/**
 * Groups of results sharing a rank within the first `places` places, from the
 * lowest place to the 1st (suspense: 3rd, then 2nd, then 1st). Filtering on
 * rank rather than slicing keeps every tied result: they share one step.
 */
function countdownGroups<T extends Ranked>(results: T[], places: number): T[][] {
  const groups = new Map<number, T[]>();
  for (const result of results) {
    if (result.rank > places) continue;
    const group = groups.get(result.rank);
    if (group) group.push(result);
    else groups.set(result.rank, [result]);
  }
  return [...groups.values()].sort((a, b) => b[0]!.rank - a[0]!.rank);
}

/** Points ahead of the first result ranked below `rank`, or null when nobody is ranked below. */
function gapToNext<T extends Ranked>(results: T[], rank: number, points: number, score: (item: T) => number): number | null {
  const next = results.find((result) => result.rank > rank);
  return next === undefined ? null : points - score(next);
}

function teamSteps(rows: RawSwimmerRow[], category: string, meeting: CeremonyMeeting, places: number): CeremonyStep[] {
  const results = computeTeamRanking(rows, { category, topN: meeting.defaultTopN, minSwimmers: meeting.minSwimmers });
  return countdownGroups(results, places).map((group) => {
    const { rank, totalPoints } = group[0]!;
    return {
      id: `team-ranking|${category}|${rank}`,
      block: 'team-ranking',
      category,
      rank,
      awardTitle: null,
      winners: group.map((team) => ({
        name: team.club,
        club: team.club,
        points: team.totalPoints,
        detail: null,
        swimmers: team.swimmers.map((swimmer) => `${swimmer.lastname} ${swimmer.firstname}`),
      })),
      gapToNext: gapToNext(results, rank, totalPoints, (team) => team.totalPoints),
    };
  });
}

function individualSteps(rows: RawSwimmerRow[], category: string): CeremonyStep[] {
  const results = computeCategoryRanking(rows, category);
  return countdownGroups(results, INDIVIDUAL_PRIZE_COUNT).map((group) => {
    const { rank, points } = group[0]!;
    return {
      id: `individual-prizes|${category}|${rank}`,
      block: 'individual-prizes',
      category,
      rank,
      awardTitle: null,
      winners: group.map((swimmer) => ({
        name: `${swimmer.lastname} ${swimmer.firstname}`,
        club: swimmer.club,
        points: swimmer.points,
        detail: null,
        swimmers: [],
      })),
      gapToNext: gapToNext(results, rank, points, (swimmer) => swimmer.points),
    };
  });
}

// Fun awards are computed per category, exactly as the Palmarès screen shows
// them: some prizes depend on the category (Club des Grandes Dames vs Sages).
function funAwardSteps(rows: RawSwimmerRow[], category: string): CeremonyStep[] {
  const awards = computeFunAwards(rows.filter((row) => row.name === category));
  return awards.map((award) => ({
    id: `fun-awards|${category}|${award.id}`,
    block: 'fun-awards',
    category,
    rank: null,
    awardTitle: award.title,
    winners: [{ name: award.winner.name, club: award.winner.club, points: null, detail: award.winner.detail, swimmers: [] }],
    gapToNext: null,
  }));
}

const BLOCK_BUILDERS: Record<CeremonyBlock, (rows: RawSwimmerRow[], category: string, meeting: CeremonyMeeting, options: CeremonyOptions) => CeremonyStep[]> = {
  'fun-awards': (rows, category) => funAwardSteps(rows, category),
  'individual-prizes': (rows, category) => individualSteps(rows, category),
  'team-ranking': (rows, category, meeting, options) => teamSteps(rows, category, meeting, options.teamPlaces),
};

/** Active categories that have rows, in import order (same set as the ranking screens offer). */
export function ceremonyCategories(meeting: CeremonyMeeting, rows: RawSwimmerRow[]): string[] {
  const present = Array.from(new Set(rows.map((row) => row.name)));
  return resolveActiveCategories(present, meeting.activeCategories);
}

/**
 * The full announcement script: each enabled block in the chosen order, and
 * within a block each active category in turn. No ranking logic of its own:
 * every step comes from the same functions as the Classement, Individuels and
 * Palmarès screens, so the ceremony can never disagree with them.
 */
export function buildCeremonyScript(meeting: CeremonyMeeting, rows: RawSwimmerRow[], options: CeremonyOptions): CeremonyStep[] {
  const categories = ceremonyCategories(meeting, rows);
  return options.blocks.flatMap((block) =>
    categories.flatMap((category) => BLOCK_BUILDERS[block](rows, category, meeting, options))
  );
}
