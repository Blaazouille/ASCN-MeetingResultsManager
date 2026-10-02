/**
 * Responsabilité : compare deux états des résultats (avant/après un import) : mouvements de rang et résumé des changements.
 * Appelé par : ImportPage.tsx, RankingPage.tsx, IndividualPage.tsx.
 * Suppression casserait : les flèches de mouvement et le résumé « Depuis l'import de… ».
 */
import type { RawSwimmerRow } from './csv-parser';
import { computeTeamRanking, pickDefaultCategory } from './ranking-engine';

/** Places gained (> 0) or lost (< 0) since the previous import, or 'new' for an entry that wasn't ranked before. Stable entries have none. */
export type Movement = number | 'new';

/** One person, whatever the category — same identity as Meeting.swimmerCount and computeIndividualRanking. */
export function swimmerIdentity(row: Pick<RawSwimmerRow, 'lastname' | 'firstname' | 'birthyear' | 'club'>): string {
  return `${row.lastname}|${row.firstname}|${row.birthyear}|${row.club}`;
}

/**
 * Movement of each entry of `current` against `previous`, keyed by `key`; entries that kept their rank are left out.
 * When more than half of `current` is new (a first import in a category, a big file added), the « new » marks
 * are dropped: they would sit on most rows and tell nothing.
 */
export function rankMovements<T extends { rank: number }>(
  previous: T[],
  current: T[],
  key: (item: T) => string
): Map<string, Movement> {
  const previousRanks = new Map(previous.map((item) => [key(item), item.rank]));
  const movements = new Map<string, Movement>();
  for (const item of current) {
    const before = previousRanks.get(key(item));
    if (before === undefined) {
      movements.set(key(item), 'new');
    } else if (before !== item.rank) {
      movements.set(key(item), before - item.rank);
    }
  }
  const newCount = [...movements.values()].filter((movement) => movement === 'new').length;
  if (newCount * 2 > current.length) {
    for (const [id, movement] of movements) {
      if (movement === 'new') movements.delete(id);
    }
  }
  return movements;
}

export interface ImportChanges {
  addedSwimmers: number;
  removedSwimmers: number;
  /** Results (one per swimmer and category) present before and after with different points. */
  changedResults: number;
  /** Clubs whose rank moved (or that appeared) in the default category, with the meeting's own top N. */
  clubsMoved: number;
}

export interface ImportChangesParams {
  topN: number;
  minSwimmers?: number;
}

export function summarizeImportChanges(
  previous: RawSwimmerRow[],
  current: RawSwimmerRow[],
  params: ImportChangesParams
): ImportChanges {
  const before = new Set(previous.map(swimmerIdentity));
  const after = new Set(current.map(swimmerIdentity));
  const resultKey = (row: RawSwimmerRow): string => `${row.name}|${swimmerIdentity(row)}`;
  const previousPoints = new Map(previous.map((row) => [resultKey(row), row.points]));

  const category = pickDefaultCategory([...new Set(current.map((row) => row.name))]);
  const rankingParams = { category, topN: params.topN, minSwimmers: params.minSwimmers };
  const clubMovements = rankMovements(
    computeTeamRanking(previous, rankingParams),
    computeTeamRanking(current, rankingParams),
    (team) => team.club
  );

  return {
    addedSwimmers: [...after].filter((id) => !before.has(id)).length,
    removedSwimmers: [...before].filter((id) => !after.has(id)).length,
    changedResults: current.filter((row) => {
      const was = previousPoints.get(resultKey(row));
      return was !== undefined && was !== row.points;
    }).length,
    clubsMoved: clubMovements.size,
  };
}

export function hasChanges(changes: ImportChanges): boolean {
  return Object.values(changes).some((count) => count > 0);
}
