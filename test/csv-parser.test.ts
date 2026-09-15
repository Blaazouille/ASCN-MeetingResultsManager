import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv, parsePoints } from '../src/lib/csv-parser';

const FIXTURE_PATH = path.join(__dirname, 'fixtures/sample.csv');

function loadFixture() {
  const buffer = readFileSync(FIXTURE_PATH);
  return parseCsv(new Uint8Array(buffer));
}

describe('parsePoints', () => {
  it('extracts an integer value from "N Pts"', () => {
    expect(parsePoints('1274 Pts')).toBe(1274);
    expect(parsePoints('46 Pts')).toBe(46);
  });

  it('extracts a decimal value using either comma or dot', () => {
    expect(parsePoints('12,5 Pts')).toBe(12.5);
    expect(parsePoints('12.5 Pts')).toBe(12.5);
  });

  it('throws when no numeric value is present', () => {
    expect(() => parsePoints('N/A')).toThrow(/Cannot parse points/);
  });
});

describe('parseCsv — real FFN extraNat fixture (Latin-1, semicolon)', () => {
  const result = loadFixture();

  it('detects Latin-1 encoding and semicolon delimiter', () => {
    expect(result.encoding).toBe('latin1');
    expect(result.delimiter).toBe(';');
  });

  it('extracts the three categories in file order', () => {
    expect(result.categories).toEqual(['Classement Dames', 'Classement Messieurs', 'Classement Mixte']);
  });

  it('counts 38 distinct clubs and 422 swimmer entries', () => {
    expect(result.clubCount).toBe(38);
    expect(result.swimmerCount).toBe(422);
    expect(result.rows).toHaveLength(422);
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
    expect(result.warnings.some((w) => w.includes('duplicate swimmer'))).toBe(true);
  });

  it('flags points outside the plausible FFN range', () => {
    const csv = [
      'name;place;lastname;firstname;birthyear;nation;club;points;comment',
      'Classement Mixte;1;DUPONT;Lea;1990;FRA;CN TEST;9999 Pts;',
    ].join('\n');
    const result = parseCsv(new TextEncoder().encode(csv));
    expect(result.warnings.some((w) => w.includes('out of plausible range'))).toBe(true);
  });
});
