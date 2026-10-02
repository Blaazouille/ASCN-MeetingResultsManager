import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { countRowsByCategory, parseCsv, summarizeSwimmerRows } from '../src/lib/csv-parser';

const FIXTURE_PATH = path.join(__dirname, 'fixtures/sample.csv');

function loadFixture() {
  const buffer = readFileSync(FIXTURE_PATH);
  return parseCsv(new Uint8Array(buffer));
}

describe('parseCsv — real FFN extraNat fixture (Latin-1, semicolon)', () => {
  const result = loadFixture();

  it('detects Latin-1 encoding and semicolon delimiter', () => {
    expect(result.encoding).toBe('latin1');
    expect(result.delimiter).toBe(';');
  });

  it('extracts the three categories in file order', () => {
    expect(result.categories).toEqual(['Classement Dames', 'Classement Messieurs', 'Classement Mixte']);
  });

  it('counts 38 distinct clubs, 422 row entries, and 211 unique swimmers', () => {
    expect(result.clubCount).toBe(38);
    expect(result.rows).toHaveLength(422);
    // Each swimmer appears once in "Classement Mixte" and again in their
    // gender category, so swimmerCount (unique people) is roughly half of
    // rows.length (entries).
    expect(result.swimmerCount).toBe(211);
  });

  it('correctly decodes accented club names', () => {
    const schwing = result.rows.find(
      (row) => row.lastname === 'SCHWING' && row.name === 'Classement Dames'
    );
    expect(schwing?.club).toBe('CN VIRY-CHÂTILLON');
  });

  it('parses points, place and birthyear as numbers', () => {
    const schwing = result.rows.find(
      (row) => row.lastname === 'SCHWING' && row.name === 'Classement Dames'
    );
    expect(schwing).toMatchObject({
      place: 1,
      firstname: 'Pascale',
      birthyear: 1958,
      nation: 'FRA',
      points: 1274,
    });
  });

  it('splits rows per category matching the documented counts (90/121/211)', () => {
    const dames = result.rows.filter((row) => row.name === 'Classement Dames');
    const messieurs = result.rows.filter((row) => row.name === 'Classement Messieurs');
    const mixte = result.rows.filter((row) => row.name === 'Classement Mixte');
    expect(dames).toHaveLength(90);
    expect(messieurs).toHaveLength(121);
    expect(mixte).toHaveLength(211);
  });

  it('produces no warnings on the clean reference file', () => {
    expect(result.warnings).toEqual([]);
  });

  it('leaves no row out of the reference file', () => {
    expect([result.ignoredRowCount, result.duplicateRowCount]).toEqual([0, 0]);
    expect(result.excludedSwimmers).toEqual([]);
    expect(result.rows.every((row) => row.place !== null)).toBe(true);
  });
});

describe('parseCsv — encoding and validation edge cases', () => {
  it('decodes a genuinely UTF-8 file as utf-8', () => {
    const csv = 'name;place;lastname;firstname;birthyear;nation;club;points;comment\nClassement Mixte;1;DUPONT;Léa;1990;FRA;CN TEST;100 Pts;\n';
    const bytes = new TextEncoder().encode(csv);
    const result = parseCsv(bytes);
    expect(result.encoding).toBe('utf-8');
    expect(result.rows[0]?.club).toBe('CN TEST');
    expect(result.rows[0]?.lastname).toBe('DUPONT');
  });

  it('flags duplicate swimmers within the same category', () => {
    const csv = [
      'name;place;lastname;firstname;birthyear;nation;club;points;comment',
      'Classement Mixte;1;DUPONT;Lea;1990;FRA;CN TEST;100 Pts;',
      'Classement Mixte;2;DUPONT;Lea;1990;FRA;CN TEST;90 Pts;',
    ].join('\n');
    const result = parseCsv(new TextEncoder().encode(csv));
    expect(result.warnings.some((w) => w.includes('apparaît deux fois'))).toBe(true);
  });

  it('counts rows left out for missing points and rows repeating a swimmer', () => {
    const csv = [
      'name;place;lastname;firstname;birthyear;nation;club;points;comment',
      'Classement Mixte;1;DUPONT;Lea;1990;FRA;CN TEST;100 Pts;',
      'Classement Mixte;2;DUPONT;Lea;1990;FRA;CN TEST;90 Pts;',
      'Classement Mixte;3;MARTIN;Bob;1999;FRA;CN TEST;;',
    ].join('\n');
    const result = parseCsv(new TextEncoder().encode(csv));
    expect(result.duplicateRowCount).toBe(1);
    expect(result.ignoredRowCount).toBe(1);
    expect(result.rows).toHaveLength(2);
  });

  it('does not flag two different swimmers who share a name but differ in birth year and club', () => {
    const csv = [
      'name;place;lastname;firstname;birthyear;nation;club;points;comment',
      'Classement Mixte;1;MARTIN;Bob;1999;FRA;AC CHERBOURG EN COTENTIN;900 Pts;',
      'Classement Mixte;2;MARTIN;Bob;1999;FRA;CN VIRY-CHÂTILLON;875 Pts;',
    ].join('\n');
    const result = parseCsv(new TextEncoder().encode(csv));
    expect(result.warnings.some((w) => w.includes('apparaît deux fois'))).toBe(false);
  });

  it('stops the import on unreadable points, naming the line in French', () => {
    const csv = [
      'name;place;lastname;firstname;birthyear;nation;club;points;comment',
      'Classement Mixte;1;DUPONT;Lea;1990;FRA;CN TEST;100 Pts;',
      'Classement Mixte;2;MARTIN;Bob;1999;FRA;CN TEST;N/A;',
    ].join('\n');
    expect(() => parseCsv(new TextEncoder().encode(csv))).toThrow(/^Ligne 3 : points illisibles \(« N\/A »\)/);
  });

  it('leaves out rows with an empty or unreadable birth year, naming each swimmer once', () => {
    const csv = [
      'name;place;lastname;firstname;birthyear;nation;club;points;comment',
      'Classement Mixte;1;DUPONT;Lea;1990;FRA;CN TEST;100 Pts;',
      'Classement Mixte;2;MARTIN;Bob;19XX;FRA;CN TEST;90 Pts;',
      'Classement Mixte;3;DURAND;Eve;;FRA;CN TEST;80 Pts;',
      'Classement Mixte;4;PETIT;Tom;1990.5;FRA;CN TEST;70 Pts;',
      'Classement Dames;1;DURAND;Eve;;FRA;CN TEST;95 Pts;',
    ].join('\n');
    const result = parseCsv(new TextEncoder().encode(csv));
    expect(result.rows.map((row) => row.lastname)).toEqual(['DUPONT']);
    expect(result.excludedSwimmers).toEqual(['Bob MARTIN', 'Eve DURAND', 'Tom PETIT']);
    expect(result.ignoredRowCount).toBe(0);
    expect(result.warnings).toEqual([
      'Ligne 3 : année de naissance illisible (« 19XX ») pour « Bob MARTIN » (nageur non importé)',
      'Ligne 4 : année de naissance vide pour « Eve DURAND » (nageur non importé)',
      'Ligne 5 : année de naissance illisible (« 1990.5 ») pour « Tom PETIT » (nageur non importé)',
      'Ligne 6 : année de naissance vide pour « Eve DURAND » (nageur non importé)',
    ]);
  });

  it('keeps rows with an empty or unreadable place, without a rank, and counts their points', () => {
    const csv = [
      'name;place;lastname;firstname;birthyear;nation;club;points;comment',
      'Classement Mixte;;DUPONT;Lea;1990;FRA;CN TEST;100 Pts;',
      'Classement Mixte;2e;MARTIN;Bob;1999;FRA;CN TEST;90 Pts;',
    ].join('\n');
    const result = parseCsv(new TextEncoder().encode(csv));
    expect(result.rows.map((row) => [row.lastname, row.place, row.points])).toEqual([
      ['DUPONT', null, 100],
      ['MARTIN', null, 90],
    ]);
    expect(result.excludedSwimmers).toEqual([]);
    expect(result.warnings).toEqual([
      'Ligne 2 : place vide pour « Lea DUPONT » (points comptés quand même)',
      'Ligne 3 : place illisible (« 2e ») pour « Bob MARTIN » (points comptés quand même)',
    ]);
  });

  it('imports a file without a place column, warning once about the missing column', () => {
    const csv = [
      'name;lastname;firstname;birthyear;nation;club;points;comment',
      'Classement Mixte;DUPONT;Lea;1990;FRA;CN TEST;100 Pts;',
      'Classement Mixte;MARTIN;Bob;1999;FRA;CN TEST;90 Pts;',
    ].join('\n');
    const result = parseCsv(new TextEncoder().encode(csv));
    expect(result.rows.map((row) => row.place)).toEqual([null, null]);
    expect(result.warnings).toEqual(['Colonne manquante dans le fichier : « place »']);
  });

  it('names the missing birthyear column when it leaves no usable row', () => {
    const csv = [
      'name;place;lastname;firstname;nation;club;points;comment',
      'Classement Mixte;1;DUPONT;Lea;FRA;CN TEST;100 Pts;',
    ].join('\n');
    expect(() => parseCsv(new TextEncoder().encode(csv))).toThrow('Aucune ligne exploitable dans ce fichier (colonne absente : birthyear)');
  });

  it('flags points outside the plausible FFN range', () => {
    const csv = [
      'name;place;lastname;firstname;birthyear;nation;club;points;comment',
      'Classement Mixte;1;DUPONT;Lea;1990;FRA;CN TEST;9999 Pts;',
    ].join('\n');
    const result = parseCsv(new TextEncoder().encode(csv));
    expect(result.warnings.some((w) => w.includes('nombre de points inhabituel'))).toBe(true);
  });
});

describe('summarizeSwimmerRows', () => {
  it('matches parseCsv on its own rows', () => {
    const result = loadFixture();
    const summary = summarizeSwimmerRows(result.rows);
    expect(summary.categories).toEqual(result.categories);
    expect(summary.clubCount).toBe(result.clubCount);
    expect(summary.swimmerCount).toBe(result.swimmerCount);
  });

  it('reflects rows regardless of where they came from (e.g. loaded back from the database)', () => {
    const summary = summarizeSwimmerRows([
      { name: 'Classement Mixte', place: 1, lastname: 'DUPONT', firstname: 'Alice', birthyear: 2000, nation: 'FRA', club: 'AC CHERBOURG EN COTENTIN', points: 900, comment: '' },
      { name: 'Classement Mixte', place: 2, lastname: 'MARTIN', firstname: 'Bob', birthyear: 1999, nation: 'FRA', club: 'AC CHERBOURG EN COTENTIN', points: 850, comment: '' },
      { name: 'Classement Dames', place: 1, lastname: 'DUPONT', firstname: 'Alice', birthyear: 2000, nation: 'FRA', club: 'AC CHERBOURG EN COTENTIN', points: 900, comment: '' },
    ]);
    expect(summary.categories).toEqual(['Classement Mixte', 'Classement Dames']);
    expect(summary.clubCount).toBe(1);
    expect(summary.swimmerCount).toBe(2);
  });
});

describe('countRowsByCategory', () => {
  it('counts the fixture rows per category', () => {
    const { rows } = loadFixture();
    const counts = countRowsByCategory(rows);

    expect(counts).toHaveLength(3);
    expect(counts).toEqual(
      expect.arrayContaining([
        { category: 'Classement Dames', count: 90 },
        { category: 'Classement Messieurs', count: 121 },
        { category: 'Classement Mixte', count: 211 },
      ])
    );
  });
});

describe('parseCsv without usable rows', () => {
  it('rejects a header-only file instead of importing nothing', () => {
    const csv = 'name;place;lastname;firstname;birthyear;nation;club;points;comment\n';
    expect(() => parseCsv(new TextEncoder().encode(csv))).toThrow('Aucune ligne exploitable');
  });

  it('rejects a file whose rows all lack points', () => {
    const csv = ['name;place;lastname;firstname;birthyear;nation;club;points;comment', 'Classement Mixte;1;DUPONT;Lea;1990;FRA;CN TEST;;'].join('\n');
    expect(() => parseCsv(new TextEncoder().encode(csv))).toThrow('Aucune ligne exploitable');
  });
});
