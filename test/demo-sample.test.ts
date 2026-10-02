/**
 * Responsabilité : vérifie que le CSV d'exemple embarqué (resources/meeting-exemple.csv) est bien anonymisé et reste un vrai export extraNat exploitable.
 * Appelé par : Vitest.
 * Suppression casserait : le garde-fou qui empêche de distribuer des noms réels de nageurs avec l'application.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv, type RawSwimmerRow } from '../src/lib/csv-parser';
import { computeTeamRanking } from '../src/lib/ranking-engine';
import { computeCategoryRanking } from '../src/lib/individual-ranking';
import { tiedRanks } from '../src/lib/rank-ties';
import { DEFAULT_OUR_CLUB } from '../src/lib/our-club';
import { anonymizeSampleCsv } from '../scripts/anonymize-sample';

const root = path.resolve(__dirname, '..');
const realBytes = new Uint8Array(readFileSync(path.join(root, 'test', 'fixtures', 'sample.csv')));
const demoBytes = new Uint8Array(readFileSync(path.join(root, 'resources', 'meeting-exemple.csv')));
const real = parseCsv(realBytes);
const demo = parseCsv(demoBytes);

function identity(row: RawSwimmerRow): string {
  return `${row.lastname}|${row.firstname}`;
}

function identitiesIn(rows: RawSwimmerRow[], category: string): Set<string> {
  return new Set(rows.filter((row) => row.name === category).map(identity));
}

describe('embedded training CSV (resources/meeting-exemple.csv)', () => {
  it('contains no real swimmer last name or first name', () => {
    const realLastnames = new Set(real.rows.map((row) => row.lastname));
    const realFirstnames = new Set(real.rows.map((row) => row.firstname));

    expect(demo.rows.filter((row) => realLastnames.has(row.lastname))).toEqual([]);
    expect(demo.rows.filter((row) => realFirstnames.has(row.firstname))).toEqual([]);
  });

  it('keeps AS Cherbourg Natation and replaces every other club with a fictional one', () => {
    const realClubs = new Set(real.rows.map((row) => row.club));
    const demoClubs = new Set(demo.rows.map((row) => row.club));

    expect(demoClubs).toContain(DEFAULT_OUR_CLUB);
    expect([...demoClubs].filter((club) => club !== DEFAULT_OUR_CLUB && realClubs.has(club))).toEqual([]);
    // Same number of clubs: the team ranking keeps its shape.
    expect(demoClubs.size).toBe(realClubs.size);
  });

  it('is parsed by the real parser as a Latin-1, ";"-separated export, without any warning', () => {
    expect(demo.warnings).toEqual([]);
    expect(demo.encoding).toBe('latin1');
    expect(demo.delimiter).toBe(';');
    expect(new TextDecoder('iso-8859-1').decode(demoBytes)).toContain(';1274 Pts;');
  });

  it('keeps categories, places, birth years and points line by line', () => {
    const keep = (row: RawSwimmerRow): unknown[] => [row.name, row.place, row.birthyear, row.nation, row.points];
    expect(demo.rows.map(keep)).toEqual(real.rows.map(keep));
  });

  it('gives a swimmer the same fictional name in Mixte as in Dames/Messieurs, and keeps their gender', () => {
    const dames = identitiesIn(demo.rows, 'Classement Dames');
    const messieurs = identitiesIn(demo.rows, 'Classement Messieurs');
    const mixte = identitiesIn(demo.rows, 'Classement Mixte');

    expect(mixte).toEqual(new Set([...dames, ...messieurs]));
    // A first name is never shared by a woman and a man: each kept its gender.
    const femaleFirstnames = new Set(demo.rows.filter((r) => r.name === 'Classement Dames').map((r) => r.firstname));
    const maleFirstnames = demo.rows.filter((r) => r.name === 'Classement Messieurs').map((r) => r.firstname);
    expect(maleFirstnames.filter((firstname) => femaleFirstnames.has(firstname))).toEqual([]);
  });

  it('never merges two real swimmers into one fictional swimmer', () => {
    expect(demo.swimmerCount).toBe(real.swimmerCount);
  });

  it('still holds ties to settle, the case the rehearsal must show', () => {
    const tiedCategories = demo.categories.filter(
      (category) => tiedRanks(computeCategoryRanking(demo.rows, category)).size > 0
    );
    expect(tiedCategories.length).toBeGreaterThan(0);
  });

  it('gives the same team totals as the real meeting', () => {
    const totals = (rows: RawSwimmerRow[]): number[] =>
      computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 }).map((team) => team.totalPoints);
    expect(totals(demo.rows)).toEqual(totals(real.rows));
  });
});

describe('anonymizeSampleCsv', () => {
  it('is deterministic and matches the committed file (regenerate with npm run anonymize-sample)', () => {
    const first = anonymizeSampleCsv(realBytes);
    expect(anonymizeSampleCsv(realBytes)).toEqual(first);
    expect(first).toEqual(demoBytes);
  });
});
