/**
 * Responsabilité : vérifie la situation de « Notre club » par catégorie (issue #25) : rang, ex æquo, écarts, seuil, absence, meilleur nageur.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de club-summary.ts.
 */
import { describe, expect, it } from 'vitest';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import { computeClubSummary, type ClubCategorySummary } from '../src/lib/club-summary';

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

const params = { categories: [MIXTE], topN: 2, minSwimmers: 0 };

function only(summary: ReturnType<typeof computeClubSummary>): ClubCategorySummary {
  expect(summary).not.toBeNull();
  return summary!.categories[0]!;
}

describe('computeClubSummary', () => {
  it('gives the rank among ranked clubs, the total of the top N and the gaps to both neighbours', () => {
    const rows = [
      ...club(MIXTE, 'A', 600, 500), // 1100
      ...club(MIXTE, OURS, 550, 400, 100), // 950, 2 retained out of 3
      ...club(MIXTE, 'C', 450, 420), // 870
    ];
    const summary = only(computeClubSummary(rows, OURS, params));
    expect(summary.entered).toBe(3);
    expect(summary.status).toEqual({
      kind: 'ranked',
      rank: 2,
      tied: false,
      clubCount: 3,
      totalPoints: 950,
      retained: 2,
      behind: { rank: 1, points: 150 },
      ahead: { rank: 3, points: 80 },
    });
  });

  it('uses the top N chosen on screen', () => {
    const rows = [...club(MIXTE, 'A', 500, 500), ...club(MIXTE, OURS, 600, 300, 300)];
    // Top 2: 900 < 1000, 2nd. Top 3: 1200 vs 1000, 1st.
    expect(only(computeClubSummary(rows, OURS, params)).status).toMatchObject({ rank: 2 });
    expect(only(computeClubSummary(rows, OURS, { ...params, topN: 3 })).status).toMatchObject({ rank: 1 });
  });

  it('has no gap above for the 1st, only its lead', () => {
    const rows = [...club(MIXTE, OURS, 600), ...club(MIXTE, 'B', 500)];
    expect(only(computeClubSummary(rows, OURS, params)).status).toMatchObject({
      rank: 1,
      behind: null,
      ahead: { rank: 2, points: 100 },
    });
  });

  it('has no lead for the last, only the gap above', () => {
    const rows = [...club(MIXTE, 'A', 600), ...club(MIXTE, OURS, 500)];
    expect(only(computeClubSummary(rows, OURS, params)).status).toMatchObject({
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
    expect(only(computeClubSummary(rows, OURS, params)).status).toMatchObject({
      rank: 2,
      tied: true,
      clubCount: 4,
      behind: { rank: 1, points: 200 },
      ahead: { rank: 4, points: 50 },
    });
  });

  it('says the club is not ranked when it entered fewer swimmers than the threshold', () => {
    const rows = [...club(MIXTE, 'A', 600, 500, 400), ...club(MIXTE, OURS, 900, 800)];
    const summary = only(computeClubSummary(rows, OURS, { ...params, minSwimmers: 3 }));
    expect(summary.entered).toBe(2);
    expect(summary.status).toEqual({ kind: 'below-threshold', minSwimmers: 3 });
  });

  it('says the club is absent from a category where it has no swimmer, and still covers the others', () => {
    const rows = [...club(MIXTE, OURS, 600), ...club(DAMES, 'A', 500)];
    const summary = computeClubSummary(rows, OURS, { ...params, categories: [DAMES, MIXTE] });
    expect(summary?.categories.map((c) => [c.category, c.status.kind, c.entered])).toEqual([
      [DAMES, 'absent', 0],
      [MIXTE, 'ranked', 1],
    ]);
    expect(summary?.categories[0]?.bestSwimmer).toBeNull();
  });

  it('names our best swimmer with their individual rank and points in the category', () => {
    const rows = [
      row(MIXTE, 'A', 700),
      { ...row(MIXTE, OURS, 650), firstname: 'Léa', lastname: 'MARTIN' },
      row(MIXTE, 'B', 650),
      row(MIXTE, OURS, 300),
    ];
    expect(only(computeClubSummary(rows, OURS, params)).bestSwimmer).toEqual({
      firstname: 'Léa',
      lastname: 'MARTIN',
      rank: 2,
      tied: true,
      points: 650,
    });
  });

  it('recognises the club whatever the case and keeps its spelling from the results', () => {
    const rows = club(MIXTE, 'As Cherbourg Natation', 600);
    expect(computeClubSummary(rows, OURS, params)?.club).toBe('As Cherbourg Natation');
  });

  it('returns null when the club has no swimmer in the categories shown', () => {
    const rows = [...club(MIXTE, 'A', 600), ...club(DAMES, OURS, 500)];
    expect(computeClubSummary(rows, OURS, params)).toBeNull();
  });
});
