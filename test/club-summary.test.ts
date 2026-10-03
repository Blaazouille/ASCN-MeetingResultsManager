/**
 * Responsabilité : vérifie la situation de « Notre club » dans la catégorie affichée (issues #25, #64) : rang, ex æquo, écarts, seuil, absence.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de club-summary.ts.
 */
import { describe, expect, it } from 'vitest';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import { computeClubSummary, type ClubCategoryStatus } from '../src/lib/club-summary';

const MIXTE = 'Classement Mixte';
const DAMES = 'Classement Dames';
const OURS = 'AS CHERBOURG NATATION';

let counter = 0;
function row(category: string, club: string, points: number): RawSwimmerRow {
  counter += 1;
  return { name: category, place: null, lastname: `NOM${counter}`, firstname: `Prénom${counter}`, birthyear: 1990, nation: 'FRA', club, points, comment: '' };
}

/** One row per score: a club whose swimmers scored these points in the category. */
function club(category: string, name: string, ...points: number[]): RawSwimmerRow[] {
  return points.map((p) => row(category, name, p));
}

const params = { category: MIXTE, topN: 2, minSwimmers: 0 };

function statusOf(summary: ReturnType<typeof computeClubSummary>): ClubCategoryStatus {
  expect(summary).not.toBeNull();
  return summary!.status;
}

describe('computeClubSummary', () => {
  it('gives the rank among ranked clubs, the total of the top N and the gaps to both neighbours', () => {
    const rows = [
      ...club(MIXTE, 'A', 600, 500), // 1100
      ...club(MIXTE, OURS, 550, 400, 100), // 950 (top 2)
      ...club(MIXTE, 'C', 450, 420), // 870
    ];
    expect(statusOf(computeClubSummary(rows, OURS, params))).toEqual({
      kind: 'ranked',
      rank: 2,
      tied: false,
      clubCount: 3,
      totalPoints: 950,
      behind: { rank: 1, points: 150 },
      ahead: { rank: 3, points: 80 },
    });
  });

  it('only speaks of the category shown', () => {
    const rows = [...club(MIXTE, OURS, 300), ...club(MIXTE, 'A', 600), ...club(DAMES, OURS, 900), ...club(DAMES, 'B', 100)];
    expect(statusOf(computeClubSummary(rows, OURS, params))).toMatchObject({ rank: 2, totalPoints: 300 });
    expect(statusOf(computeClubSummary(rows, OURS, { ...params, category: DAMES }))).toMatchObject({ rank: 1, totalPoints: 900 });
  });

  it('uses the top N chosen on screen', () => {
    const rows = [...club(MIXTE, 'A', 500, 500), ...club(MIXTE, OURS, 600, 300, 300)];
    // Top 2: 900 < 1000, 2nd. Top 3: 1200 vs 1000, 1st.
    expect(statusOf(computeClubSummary(rows, OURS, params))).toMatchObject({ rank: 2 });
    expect(statusOf(computeClubSummary(rows, OURS, { ...params, topN: 3 }))).toMatchObject({ rank: 1 });
  });

  it('has no gap above for the 1st, only its lead', () => {
    const rows = [...club(MIXTE, OURS, 600), ...club(MIXTE, 'B', 500)];
    expect(statusOf(computeClubSummary(rows, OURS, params))).toMatchObject({
      rank: 1,
      behind: null,
      ahead: { rank: 2, points: 100 },
    });
  });

  it('has no lead for the last, only the gap above', () => {
    const rows = [...club(MIXTE, 'A', 600), ...club(MIXTE, OURS, 500)];
    expect(statusOf(computeClubSummary(rows, OURS, params))).toMatchObject({
      rank: 2,
      behind: { rank: 1, points: 100 },
      ahead: null,
    });
  });

  it('marks a shared rank and measures the gaps from the nearest different totals', () => {
    const rows = [
      ...club(MIXTE, 'A', 900),
      ...club(MIXTE, 'B', 700),
      ...club(MIXTE, OURS, 700),
      ...club(MIXTE, 'D', 650),
    ];
    expect(statusOf(computeClubSummary(rows, OURS, params))).toMatchObject({
      rank: 2,
      tied: true,
      clubCount: 4,
      behind: { rank: 1, points: 200 },
      ahead: { rank: 4, points: 50 },
    });
  });

  it('says the club is not ranked when it entered fewer swimmers than the threshold', () => {
    const rows = [...club(MIXTE, 'A', 600, 500, 400), ...club(MIXTE, OURS, 900, 800)];
    expect(statusOf(computeClubSummary(rows, OURS, { ...params, minSwimmers: 3 }))).toEqual({
      kind: 'below-threshold',
      minSwimmers: 3,
    });
  });

  it('says the club has no swimmer in the category shown when it only swims in others', () => {
    const rows = [...club(MIXTE, 'A', 600), ...club(DAMES, OURS, 500)];
    expect(statusOf(computeClubSummary(rows, OURS, params))).toEqual({ kind: 'absent' });
  });

  it('recognises the club whatever the case and keeps its spelling from the results, the key of its table row', () => {
    const rows = club(MIXTE, 'As Cherbourg Natation', 600);
    expect(computeClubSummary(rows, OURS, params)?.club).toBe('As Cherbourg Natation');
  });

  it('returns null when the club has no swimmer in the meeting', () => {
    const rows = [...club(MIXTE, 'A', 600), ...club(DAMES, 'B', 500)];
    expect(computeClubSummary(rows, OURS, params)).toBeNull();
  });
});
