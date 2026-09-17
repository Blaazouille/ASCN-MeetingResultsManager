import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../src/lib/csv-parser';
import {
  computeIndividualRanking,
  detectGender,
  filterByGender,
} from '../src/lib/individual-ranking';

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

describe('computeIndividualRanking', () => {
  const rows = loadRows();
  const results = computeIndividualRanking(rows);

  it('returns results sorted by points descending', () => {
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.points).toBeLessThanOrEqual(results[i - 1]!.points);
    }
  });

  it('assigns ranks starting at 1 with no gaps', () => {
    results.forEach((result, index) => {
      expect(result.rank).toBe(index + 1);
    });
  });

  it('deduplicates swimmers across categories (keeps best score)', () => {
    const keys = results.map(
      (r) => `${r.lastname}|${r.firstname}|${r.birthyear}|${r.club}`
    );
    const unique = new Set(keys);
    expect(keys.length).toBe(unique.size);
  });

  it('the top scorer has the highest points in the file', () => {
    const allPoints = rows.map((r) => r.points);
    expect(results[0]!.points).toBe(Math.max(...allPoints));
  });

  it('assigns gender based on category', () => {
    const dames = results.filter((r) => r.gender === 'F');
    const messieurs = results.filter((r) => r.gender === 'M');
    expect(dames.length).toBeGreaterThan(0);
    expect(messieurs.length).toBeGreaterThan(0);
  });
});

describe('filterByGender', () => {
  const rows = loadRows();
  const results = computeIndividualRanking(rows);

  it('returns only female swimmers for gender F', () => {
    const dames = filterByGender(results, 'F');
    expect(dames.every((r) => r.gender === 'F')).toBe(true);
    expect(dames.length).toBeGreaterThan(0);
  });

  it('returns only male swimmers for gender M', () => {
    const messieurs = filterByGender(results, 'M');
    expect(messieurs.every((r) => r.gender === 'M')).toBe(true);
    expect(messieurs.length).toBeGreaterThan(0);
  });

  it('re-ranks filtered results starting at 1', () => {
    const dames = filterByGender(results, 'F');
    dames.forEach((result, index) => {
      expect(result.rank).toBe(index + 1);
    });
  });
});
