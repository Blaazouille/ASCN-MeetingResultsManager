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

  it('stays silent on a correction that changes points without removing anyone', () => {
    const existing = rows('Classement Mixte', 10);
    const incoming = rows('Classement Mixte', 10).map((r) => ({ ...r, points: r.points + 5 }));
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

  it('does not block a drop of exactly 20 %, only announces it', () => {
    expect(kinds(rows('Classement Mixte', 10), rows('Classement Mixte', 8))).toEqual(['removed']);
  });

  it('flags a file whose swimmers are mostly different', () => {
    expect(kinds(rows('Classement Mixte', 10), rows('Classement Mixte', 10, 100))).toEqual(['removed', 'different']);
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

describe('checkImportAgainstExisting — wrong file and blocking', () => {
  it('reports both a shrunk category and different swimmers for a wrong file', () => {
    expect(kinds(rows('Classement Mixte', 20), rows('Classement Mixte', 5, 100))).toEqual(['shrunk', 'removed', 'different']);
  });

  it('has no blocking warning when only a category is missing', () => {
    const existing = [...rows('Classement Mixte', 10), ...rows('Classement Dames', 5)];
    const warnings = checkImportAgainstExisting(existing, rows('Classement Mixte', 10).map((r) => ({ ...r, points: 1 })));
    expect(warnings.some((w) => w.blocking)).toBe(false);
  });
});

describe('checkImportAgainstExisting — swimmers removed by the import', () => {
  it('announces, without blocking, the swimmers a 19 % drop will remove', () => {
    const warnings = checkImportAgainstExisting(rows('Classement Mixte', 100), rows('Classement Mixte', 81));
    expect(warnings).toEqual([
      { kind: 'removed', blocking: false, message: '19 nageurs absents du nouveau fichier seront retirés du classement Mixte.' },
    ]);
  });

  it('uses the singular for a single removed swimmer', () => {
    const [warning] = checkImportAgainstExisting(rows('Classement Mixte', 10), rows('Classement Mixte', 9));
    expect(warning!.message).toBe('1 nageur absent du nouveau fichier sera retiré du classement Mixte.');
  });

  it('counts removed swimmers per category', () => {
    const existing = [...rows('Classement Mixte', 10), ...rows('Classement Dames', 5)];
    const incoming = [...rows('Classement Mixte', 8), ...rows('Classement Dames', 4)];
    const messages = checkImportAgainstExisting(existing, incoming).map((w) => w.message);
    expect(messages).toEqual([
      '2 nageurs absents du nouveau fichier seront retirés du classement Mixte.',
      '1 nageur absent du nouveau fichier sera retiré du classement Dames.',
    ]);
  });

  it('counts a swimmer whose identity changed (another club) as removed, since the database deletes the old row', () => {
    const existing = rows('Classement Mixte', 10);
    const incoming = existing.map((r, i) => (i === 0 ? { ...r, club: 'AUTRE CLUB' } : r));
    expect(kinds(existing, incoming)).toEqual(['removed']);
  });

  it('does not announce removals for a category absent from the file, which is kept', () => {
    const existing = [...rows('Classement Mixte', 10), ...rows('Classement Dames', 5)];
    expect(kinds(existing, rows('Classement Mixte', 10).map((r) => ({ ...r, points: 1 })))).toEqual(['missing-category']);
  });

  it('does not announce removals when swimmers are only added', () => {
    expect(kinds(rows('Classement Mixte', 10), rows('Classement Mixte', 12))).toEqual([]);
  });
});

describe('checkImportAgainstExisting — duplicate lines in a file', () => {
  it('still sees the same file as identical when it repeats a swimmer line', () => {
    const existing = rows('Classement Mixte', 5);
    expect(kinds(existing, [...existing, existing[0]!])).toEqual(['identical']);
  });

  it('does not call a file identical when a swimmer is missing, even if another line is repeated', () => {
    const existing = rows('Classement Mixte', 5);
    expect(kinds(existing, [...existing.slice(0, 4), existing[0]!])).not.toContain('identical');
  });
});
