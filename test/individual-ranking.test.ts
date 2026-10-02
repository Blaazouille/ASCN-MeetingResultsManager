import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../src/lib/csv-parser';
import { computeCategoryRanking, detectGender } from '../src/lib/individual-ranking';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function loadRows() {
  const buffer = readFileSync(path.join(FIXTURE_DIR, 'sample.csv'));
  return parseCsv(new Uint8Array(buffer)).rows;
}

describe('detectGender', () => {
  it('returns F for "Classement Dames"', () => {
    expect(detectGender('Classement Dames')).toBe('F');
  });

  it('returns M for "Classement Messieurs"', () => {
    expect(detectGender('Classement Messieurs')).toBe('M');
  });

  it('returns null for "Classement Mixte"', () => {
    expect(detectGender('Classement Mixte')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(detectGender('CLASSEMENT DAMES')).toBe('F');
  });
});

describe('computeCategoryRanking', () => {
  const rows = loadRows();
  const mixte = computeCategoryRanking(rows, 'Classement Mixte');

  it('lists every swimmer of the category, not only those whose best score is there', () => {
    expect(mixte).toHaveLength(rows.filter((r) => r.name === 'Classement Mixte').length);
    expect(mixte.every((r) => r.category === 'Classement Mixte')).toBe(true);
  });

  it('keeps a swimmer listed in two categories in both', () => {
    const same = (a: { lastname: string; firstname: string; club: string }, b: typeof a): boolean =>
      a.lastname === b.lastname && a.firstname === b.firstname && a.club === b.club;
    const dames = computeCategoryRanking(rows, 'Classement Dames');
    expect(dames.some((d) => mixte.some((m) => same(d, m)))).toBe(true);
  });

  it('sorts by points descending, ties sharing a rank', () => {
    mixte.forEach((result, index) => {
      if (index > 0) expect(result.points).toBeLessThanOrEqual(mixte[index - 1]!.points);
      expect(result.rank).toBe(1 + mixte.filter((other) => other.points > result.points).length);
    });
  });

  it('assigns the gender of the category', () => {
    expect(computeCategoryRanking(rows, 'Classement Dames').every((r) => r.gender === 'F')).toBe(true);
    expect(computeCategoryRanking(rows, 'Classement Messieurs').every((r) => r.gender === 'M')).toBe(true);
    expect(mixte.every((r) => r.gender === null)).toBe(true);
  });

  it('is empty for a category absent from the rows', () => {
    expect(computeCategoryRanking(rows, 'Classement Inconnu')).toEqual([]);
  });
});
