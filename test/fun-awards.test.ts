import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv, type RawSwimmerRow } from '../src/lib/csv-parser';
import { computeFunAwards, type FunAward } from '../src/lib/fun-awards';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function loadRows(): RawSwimmerRow[] {
  const buffer = readFileSync(path.join(FIXTURE_DIR, 'sample.csv'));
  return parseCsv(new Uint8Array(buffer)).rows;
}

function findAward(awards: FunAward[], id: string): FunAward | undefined {
  return awards.find((a) => a.id === id);
}

describe('computeFunAwards', () => {
  const rows = loadRows();
  const awards = computeFunAwards(rows);

  it('returns up to 6 awards', () => {
    expect(awards.length).toBeGreaterThanOrEqual(1);
    expect(awards.length).toBeLessThanOrEqual(6);
  });

  it('each award has required fields', () => {
    for (const award of awards) {
      expect(award.id).toBeTruthy();
      expect(award.title).toBeTruthy();
      expect(award.emoji).toBeTruthy();
      expect(award.winner.name).toBeTruthy();
      expect(award.winner.club).toBeTruthy();
      expect(award.winner.detail).toBeTruthy();
    }
  });

  it('doyen award picks the oldest swimmer (lowest birthyear)', () => {
    const doyen = findAward(awards, 'doyen');
    expect(doyen).toBeDefined();
    const minBirthyear = Math.min(...rows.map((r) => r.birthyear).filter((y) => y > 0));
    expect(doyen!.winner.detail).toContain(String(minBirthyear));
  });

  it('releve award picks the youngest swimmer (highest birthyear)', () => {
    const releve = findAward(awards, 'releve');
    expect(releve).toBeDefined();
    const maxBirthyear = Math.max(...rows.map((r) => r.birthyear));
    expect(releve!.winner.detail).toContain(String(maxBirthyear));
  });

  it('loup-solitaire finds a swimmer whose club has only one representative', () => {
    const loup = findAward(awards, 'loup-solitaire');
    if (loup) {
      const uniqueSwimmers = new Map<string, Set<string>>();
      for (const row of rows) {
        const key = `${row.lastname}|${row.firstname}|${row.birthyear}`;
        if (!uniqueSwimmers.has(row.club)) {
          uniqueSwimmers.set(row.club, new Set());
        }
        uniqueSwimmers.get(row.club)!.add(key);
      }
      const soloClubs = Array.from(uniqueSwimmers.entries())
        .filter(([, swimmers]) => swimmers.size === 1)
        .map(([club]) => club);
      expect(soloClubs).toContain(loup.winner.club);
    }
  });

  it('regulier finds the swimmer closest to the average', () => {
    const regulier = findAward(awards, 'regulier');
    expect(regulier).toBeDefined();
  });

  it('armada finds the club with the most swimmers', () => {
    const armada = findAward(awards, 'armada');
    expect(armada).toBeDefined();
  });

  it('photo-finish finds the smallest point gap', () => {
    const photo = findAward(awards, 'photo-finish');
    expect(photo).toBeDefined();
  });
});

describe('computeFunAwards edge cases', () => {
  it('handles a single swimmer', () => {
    const rows: RawSwimmerRow[] = [
      {
        name: 'Classement Mixte',
        place: 1,
        lastname: 'DUPONT',
        firstname: 'Jean',
        birthyear: 1990,
        nation: 'FRA',
        club: 'CN TEST',
        points: 800,
        comment: '',
      },
    ];
    const awards = computeFunAwards(rows);
    expect(awards.length).toBeGreaterThanOrEqual(1);
  });

  it('omits loup-solitaire when all swimmers share the same club', () => {
    const rows: RawSwimmerRow[] = [
      { name: 'Classement Mixte', place: 1, lastname: 'A', firstname: 'B', birthyear: 1990, nation: 'FRA', club: 'SAME', points: 800, comment: '' },
      { name: 'Classement Mixte', place: 2, lastname: 'C', firstname: 'D', birthyear: 1995, nation: 'FRA', club: 'SAME', points: 700, comment: '' },
    ];
    const awards = computeFunAwards(rows);
    const loup = findAward(awards, 'loup-solitaire');
    expect(loup).toBeUndefined();
  });
});
