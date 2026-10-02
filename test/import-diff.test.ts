/**
 * Responsabilité : tests des mouvements de rang et du résumé de réimport (import-diff.ts).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de import-diff.ts.
 */
import { describe, expect, it } from 'vitest';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import { hasChanges, rankMovements, summarizeImportChanges, type Movement } from '../src/lib/import-diff';

function row(club: string, lastname: string, points: number, name = 'Classement Mixte'): RawSwimmerRow {
  return { name, place: 1, lastname, firstname: 'A', birthyear: 2000, nation: 'FRA', club, points, comment: '' };
}

describe('rankMovements', () => {
  const key = (item: { id: string }): string => item.id;

  it('reports places gained, places lost and new entries; leaves stable ones out', () => {
    const previous = [{ id: 'a', rank: 1 }, { id: 'b', rank: 2 }, { id: 'c', rank: 3 }];
    const current = [{ id: 'c', rank: 1 }, { id: 'a', rank: 2 }, { id: 'b', rank: 3 }, { id: 'd', rank: 4 }];
    expect(rankMovements(previous, current, key)).toEqual(
      new Map<string, Movement>([['c', 2], ['a', -1], ['b', -1], ['d', 'new']])
    );
  });

  it('is empty when nothing moved', () => {
    const ranking = [{ id: 'a', rank: 1 }, { id: 'b', rank: 2 }];
    expect(rankMovements(ranking, ranking, key).size).toBe(0);
  });
});

describe('summarizeImportChanges', () => {
  // Club A totals 190 (100 + 90) and club B 150: A is 1st, B 2nd.
  const before = [row('A', 'Un', 100), row('A', 'Deux', 90), row('B', 'Trois', 150)];

  it('finds no change when the same file is imported again', () => {
    const changes = summarizeImportChanges(before, before, { topN: 5 });
    expect(changes).toEqual({ addedSwimmers: 0, removedSwimmers: 0, changedResults: 0, clubsMoved: 0 });
    expect(hasChanges(changes)).toBe(false);
  });

  it('counts an added swimmer, and the clubs whose rank moves because of it', () => {
    const after = [...before, row('B', 'Quatre', 80)];
    // B: 150 + 80 = 230 passes A (190): B goes from 2nd to 1st, A drops.
    expect(summarizeImportChanges(before, after, { topN: 5 })).toEqual({
      addedSwimmers: 1,
      removedSwimmers: 0,
      changedResults: 0,
      clubsMoved: 2,
    });
  });

  it('counts removed swimmers and modified points', () => {
    const after = [row('A', 'Un', 120), row('B', 'Trois', 150)];
    expect(summarizeImportChanges(before, after, { topN: 5 })).toMatchObject({
      addedSwimmers: 0,
      removedSwimmers: 1,
      changedResults: 1,
    });
  });

  it('counts a swimmer once however many categories they are listed in', () => {
    const after = [...before, row('A', 'Cinq', 70, 'Classement Dames'), row('A', 'Cinq', 70)];
    expect(summarizeImportChanges(before, after, { topN: 5 }).addedSwimmers).toBe(1);
  });

  it('measures club moves with the given top N', () => {
    const after = [...before, row('B', 'Quatre', 80)];
    // Top 1: A's best (100) stays behind B's best (150) whatever the extra swimmer, so no one moves.
    expect(summarizeImportChanges(before, after, { topN: 1 }).clubsMoved).toBe(0);
  });
});
