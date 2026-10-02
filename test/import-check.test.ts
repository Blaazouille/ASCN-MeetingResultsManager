import { describe, expect, it } from 'vitest';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import { checkImportAgainstExisting } from '../src/lib/import-check';

function rows(category: string, count: number, offset = 0): RawSwimmerRow[] {
  return Array.from({ length: count }, (_, i) => ({
    name: category,
    place: i + 1,
    lastname: `NOM${i + offset}`,
    firstname: 'Prénom',
    birthyear: 2000,
    nation: 'FRA',
    club: 'CLUB',
    points: 1000 - i,
    comment: '',
  }));
}

const kinds = (existing: RawSwimmerRow[], incoming: RawSwimmerRow[]): string[] =>
  checkImportAgainstExisting(existing, incoming).map((w) => w.kind);

describe('checkImportAgainstExisting', () => {
  it('stays silent on the first import of a meeting', () => {
    expect(kinds([], rows('Classement Mixte', 10))).toEqual([]);
  });

  it('stays silent on a normal correction of the same file', () => {
    const existing = rows('Classement Mixte', 10);
    const incoming = rows('Classement Mixte', 9).map((r) => ({ ...r, points: r.points + 5 }));
    expect(kinds(existing, incoming)).toEqual([]);
  });

  it('flags a file identical to the existing results, naming the last import time', () => {
    const existing = rows('Classement Mixte', 5);
    const [warning] = checkImportAgainstExisting(existing, [...existing], '2026-10-02 12:32:00');
    expect(warning).toMatchObject({ kind: 'identical', blocking: true });
    expect(warning!.message).toMatch(/identique au dernier import \(.*h\s\d\d\)/);
  });

  it('flags a category that lost more than 20 % of its swimmers, with both counts', () => {
    const [warning] = checkImportAgainstExisting(rows('Classement Mixte', 211), rows('Classement Mixte', 52));
    expect(warning).toMatchObject({ kind: 'shrunk', blocking: true });
    expect(warning!.message).toContain('52 nageurs en Mixte, contre 211');
  });

  it('accepts a drop of exactly 20 %', () => {
    expect(kinds(rows('Classement Mixte', 10), rows('Classement Mixte', 8))).toEqual([]);
  });

  it('flags a file whose swimmers are mostly different', () => {
    expect(kinds(rows('Classement Mixte', 10), rows('Classement Mixte', 10, 100))).toEqual(['different']);
  });

  it('reports a missing category as non-blocking info', () => {
    const existing = [...rows('Classement Mixte', 10), ...rows('Classement Dames', 5)];
    const [warning] = checkImportAgainstExisting(existing, rows('Classement Mixte', 10).map((r) => ({ ...r, points: 1 })));
    expect(warning).toMatchObject({ kind: 'missing-category', blocking: false });
    expect(warning!.message).toContain('Dames');
  });

  it('does not call a file with only a new category "different"', () => {
    expect(kinds(rows('Classement Mixte', 10), rows('Classement Dames', 10))).toEqual(['missing-category']);
  });
});
