import { describe, expect, it } from 'vitest';
import { parsePoints, parseWholeNumber } from '../src/lib/csv-cells';

describe('parsePoints', () => {
  it('extracts an integer value from "N Pts"', () => {
    expect(parsePoints('1274 Pts')).toBe(1274);
    expect(parsePoints('46 Pts')).toBe(46);
  });

  it('extracts a decimal value using either comma or dot', () => {
    expect(parsePoints('12,5 Pts')).toBe(12.5);
    expect(parsePoints('12.5 Pts')).toBe(12.5);
  });

  it('returns null when no numeric value is present', () => {
    expect(parsePoints('N/A')).toBeNull();
    expect(parsePoints('Pts')).toBeNull();
  });
});

describe('parseWholeNumber', () => {
  it('reads a place or a birth year, surrounding spaces allowed', () => {
    expect(parseWholeNumber('1')).toBe(1);
    expect(parseWholeNumber('1958')).toBe(1958);
    expect(parseWholeNumber(' 2004 ')).toBe(2004);
  });

  it('returns null for an empty cell', () => {
    expect(parseWholeNumber('')).toBeNull();
    expect(parseWholeNumber('   ')).toBeNull();
  });

  it('refuses half-numeric values instead of truncating them', () => {
    expect(parseWholeNumber('19XX')).toBeNull();
    expect(parseWholeNumber('1990abc')).toBeNull();
    expect(parseWholeNumber('12.5')).toBeNull();
    expect(parseWholeNumber('-3')).toBeNull();
    expect(parseWholeNumber('NC')).toBeNull();
  });
});
