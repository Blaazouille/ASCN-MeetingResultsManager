/**
 * Responsabilité : tests du moteur de prix humoristiques.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de fun-awards.ts.
 */
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

  it('duo-mixte finds a club with exactly one female and one male swimmer', () => {
    const duo = findAward(awards, 'duo-mixte');
    if (duo) {
      expect(duo.winner.detail).toMatch(/\d+ \+ \d+ = \d+ pts/);
    }
  });

  it('photo-finish finds the smallest point gap', () => {
    const photo = findAward(awards, 'photo-finish');
    expect(photo).toBeDefined();
  });

  it('club-anciens finds the club with the highest average age (≥3 swimmers)', () => {
    const anciens = findAward(awards, 'club-anciens');
    expect(anciens).toBeDefined();
    expect(anciens!.winner.detail).toMatch(/Moyenne d'âge : \d+ ans \(\d+ nageurs\)/);
  });

  it('jeune-garde finds the club with the lowest average age (≥3 swimmers)', () => {
    const jeune = findAward(awards, 'jeune-garde');
    expect(jeune).toBeDefined();
    expect(jeune!.winner.detail).toMatch(/Moyenne d'âge : \d+ ans \(\d+ nageurs\)/);
  });

  it('club-anciens and jeune-garde are different clubs', () => {
    const anciens = findAward(awards, 'club-anciens');
    const jeune = findAward(awards, 'jeune-garde');
    if (anciens && jeune) {
      expect(anciens.winner.club).not.toBe(jeune.winner.club);
    }
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

  it('photo-finish shows ex-aequo text when gap is zero', () => {
    const rows: RawSwimmerRow[] = [
      { name: 'Classement Mixte', place: 1, lastname: 'A', firstname: 'B', birthyear: 1990, nation: 'FRA', club: 'CLUB A', points: 1000, comment: '' },
      { name: 'Classement Mixte', place: 2, lastname: 'C', firstname: 'D', birthyear: 1991, nation: 'FRA', club: 'CLUB B', points: 1000, comment: '' },
      { name: 'Classement Mixte', place: 3, lastname: 'E', firstname: 'F', birthyear: 1992, nation: 'FRA', club: 'CLUB C', points: 800, comment: '' },
    ];
    const awards = computeFunAwards(rows);
    const photo = awards.find((a) => a.id === 'photo-finish');
    expect(photo).toBeDefined();
    expect(photo!.winner.detail).toContain('Ex æquo');
    expect(photo!.winner.detail).toContain('rang 1');
    expect(photo!.winner.detail).toContain('1000 pts');
  });

  it('omits duo-mixte when no club has exactly one swimmer of each gender', () => {
    const rows: RawSwimmerRow[] = [
      { name: 'Classement Dames', place: 1, lastname: 'A', firstname: 'B', birthyear: 1990, nation: 'FRA', club: 'CLUB A', points: 800, comment: '' },
      { name: 'Classement Dames', place: 2, lastname: 'C', firstname: 'D', birthyear: 1995, nation: 'FRA', club: 'CLUB A', points: 700, comment: '' },
    ];
    const awards = computeFunAwards(rows);
    expect(findAward(awards, 'duo-mixte')).toBeUndefined();
  });

  it('finds duo-mixte when a club has exactly one female and one male swimmer', () => {
    const rows: RawSwimmerRow[] = [
      { name: 'Classement Dames', place: 1, lastname: 'MARTIN', firstname: 'Alice', birthyear: 1998, nation: 'FRA', club: 'PETIT CLUB', points: 900, comment: '' },
      { name: 'Classement Messieurs', place: 1, lastname: 'DURAND', firstname: 'Bob', birthyear: 1996, nation: 'FRA', club: 'PETIT CLUB', points: 950, comment: '' },
      { name: 'Classement Dames', place: 2, lastname: 'X', firstname: 'Y', birthyear: 2000, nation: 'FRA', club: 'GRAND CLUB', points: 800, comment: '' },
      { name: 'Classement Messieurs', place: 2, lastname: 'Z', firstname: 'W', birthyear: 2001, nation: 'FRA', club: 'GRAND CLUB', points: 810, comment: '' },
      { name: 'Classement Dames', place: 3, lastname: 'V', firstname: 'U', birthyear: 2002, nation: 'FRA', club: 'GRAND CLUB', points: 700, comment: '' },
    ];
    const awards = computeFunAwards(rows);
    const duo = findAward(awards, 'duo-mixte');
    expect(duo).toBeDefined();
    expect(duo!.winner.club).toBe('PETIT CLUB');
    expect(duo!.winner.detail).toContain('900');
    expect(duo!.winner.detail).toContain('950');
  });

  it('omits club-anciens and jeune-garde when no club has 3 or more swimmers', () => {
    const rows: RawSwimmerRow[] = [
      { name: 'Classement Mixte', place: 1, lastname: 'A', firstname: 'B', birthyear: 1980, nation: 'FRA', club: 'CLUB A', points: 900, comment: '' },
      { name: 'Classement Mixte', place: 2, lastname: 'C', firstname: 'D', birthyear: 1990, nation: 'FRA', club: 'CLUB A', points: 800, comment: '' },
      { name: 'Classement Mixte', place: 3, lastname: 'E', firstname: 'F', birthyear: 2000, nation: 'FRA', club: 'CLUB B', points: 700, comment: '' },
      { name: 'Classement Mixte', place: 4, lastname: 'G', firstname: 'H', birthyear: 2005, nation: 'FRA', club: 'CLUB B', points: 600, comment: '' },
    ];
    const awards = computeFunAwards(rows);
    expect(findAward(awards, 'club-anciens')).toBeUndefined();
    expect(findAward(awards, 'jeune-garde')).toBeUndefined();
  });

  it('includes club-anciens and jeune-garde when at least one club has 3+ swimmers', () => {
    const rows: RawSwimmerRow[] = [
      { name: 'Classement Mixte', place: 1, lastname: 'A', firstname: 'B', birthyear: 1970, nation: 'FRA', club: 'OLD CLUB', points: 900, comment: '' },
      { name: 'Classement Mixte', place: 2, lastname: 'C', firstname: 'D', birthyear: 1972, nation: 'FRA', club: 'OLD CLUB', points: 800, comment: '' },
      { name: 'Classement Mixte', place: 3, lastname: 'E', firstname: 'F', birthyear: 1975, nation: 'FRA', club: 'OLD CLUB', points: 700, comment: '' },
      { name: 'Classement Mixte', place: 4, lastname: 'G', firstname: 'H', birthyear: 2005, nation: 'FRA', club: 'YOUNG CLUB', points: 600, comment: '' },
      { name: 'Classement Mixte', place: 5, lastname: 'I', firstname: 'J', birthyear: 2007, nation: 'FRA', club: 'YOUNG CLUB', points: 500, comment: '' },
      { name: 'Classement Mixte', place: 6, lastname: 'K', firstname: 'L', birthyear: 2008, nation: 'FRA', club: 'YOUNG CLUB', points: 400, comment: '' },
    ];
    const awards = computeFunAwards(rows);
    const anciens = findAward(awards, 'club-anciens');
    const jeune = findAward(awards, 'jeune-garde');
    expect(anciens).toBeDefined();
    expect(anciens!.winner.club).toBe('OLD CLUB');
    expect(jeune).toBeDefined();
    expect(jeune!.winner.club).toBe('YOUNG CLUB');
  });
});
