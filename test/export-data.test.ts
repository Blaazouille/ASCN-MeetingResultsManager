import { describe, expect, it } from 'vitest';
import {
  buildExportMeta,
  excelSheetName,
  formatMeetingCreatedAt,
  formatMeetingImportedAt,
  individualExportFileName,
  parseSqliteTimestamp,
  slugifyCategory,
} from '../src/lib/export-data';

describe('parseSqliteTimestamp', () => {
  it('reads a SQLite datetime as UTC, not local time', () => {
    expect(parseSqliteTimestamp('2026-11-16 14:32:05').toISOString()).toBe('2026-11-16T14:32:05.000Z');
  });
});

describe('slugifyCategory', () => {
  it('slugifies "Classement Mixte" to "classement-mixte"', () => {
    expect(slugifyCategory('Classement Mixte')).toBe('classement-mixte');
  });

  it('slugifies "Classement Dames" to "classement-dames"', () => {
    expect(slugifyCategory('Classement Dames')).toBe('classement-dames');
  });

  it('strips accents and non-alphanumeric characters', () => {
    expect(slugifyCategory('Été — Nage libre !')).toBe('ete-nage-libre');
  });

  it('collapses repeated separators and trims leading/trailing dashes', () => {
    expect(slugifyCategory('  Classement   Messieurs  ')).toBe('classement-messieurs');
  });
});

describe('buildExportMeta', () => {
  it('maps the meeting name, a computation timestamp and the configured club', () => {
    const meta = buildExportMeta({
      id: 1,
      name: 'Meeting de la Mer 2026',
      createdAt: '2026-01-01 00:00:00',
      updatedAt: '2026-01-01 00:00:00',
      defaultTopN: 5,
      minSwimmers: 0,
      activeCategories: null,
      resultCount: 0,
      lastImportedAt: null,
      clubCount: 0,
      swimmerCount: 0,
      isDemo: false,
    }, 'CN VIRY-CHÂTILLON');

    expect(meta.meetingName).toBe('Meeting de la Mer 2026');
    expect(meta.ourClub).toBe('CN VIRY-CHÂTILLON');
    expect(meta.computedAt.length).toBeGreaterThan(0);
  });
});

describe('formatMeetingCreatedAt', () => {
  it('formats a SQLite UTC timestamp as a fr-FR long date', () => {
    const formatted = formatMeetingCreatedAt({
      id: 1,
      name: 'Meeting de la Mer 2026',
      createdAt: '2026-11-16 12:00:00',
      updatedAt: '2026-11-16 12:00:00',
      defaultTopN: 5,
      minSwimmers: 0,
      activeCategories: null,
      resultCount: 0,
      lastImportedAt: null,
      clubCount: 0,
      swimmerCount: 0,
      isDemo: false,
    });

    expect(formatted).toMatch(/16 novembre 2026/);
  });
});

describe('formatMeetingImportedAt', () => {
  const base = {
    id: 1,
    name: 'Meeting de la Mer 2026',
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    defaultTopN: 5,
    minSwimmers: 0,
    activeCategories: null,
    resultCount: 0,
    clubCount: 0,
    swimmerCount: 0,
    isDemo: false,
  };

  it('is null when the meeting was never imported', () => {
    expect(formatMeetingImportedAt({ ...base, lastImportedAt: null })).toBeNull();
  });

  it('formats a SQLite UTC timestamp as "27 sept. 2026 à 14 h 32" (local time)', () => {
    // 10:30 UTC stays on the 27th for local timezones from UTC-10 to UTC+13.
    const formatted = formatMeetingImportedAt({ ...base, lastImportedAt: '2026-09-27 10:30:00' });

    // The expected time is the same instant read in the test machine's timezone,
    // so a wrong UTC-to-local conversion fails here. Non-breaking spaces around "h".
    const local = new Date('2026-09-27T10:30:00Z');
    const hh = String(local.getHours()).padStart(2, '0');
    const mm = String(local.getMinutes()).padStart(2, '0');
    expect(formatted).toMatch(new RegExp(`^27\\s+sept\\.?\\s+2026 à ${hh}\\u00a0h\\u00a0${mm}$`));
  });
});

describe('excelSheetName', () => {
  it('drops the "Classement" prefix', () => {
    expect(excelSheetName('Classement Mixte')).toBe('Mixte');
  });

  it('replaces the characters Excel forbids in sheet names', () => {
    expect(excelSheetName('Classement 100m [Dames]')).toBe('100m Dames');
    expect(excelSheetName('Classement A/B: C*D?')).toBe('A B C D');
  });

  it('cuts the name to the 31 characters Excel allows', () => {
    expect(excelSheetName(`Classement ${'x'.repeat(40)}`)).toHaveLength(31);
  });

  it('falls back to "Classement" when nothing is left', () => {
    expect(excelSheetName('Classement ???')).toBe('Classement');
  });
});

describe('individualExportFileName', () => {
  const day = new Date('2026-11-16T12:00:00Z');

  it('names the file after the category without its "Classement" prefix', () => {
    expect(individualExportFileName('Classement Dames', 'pdf', day)).toBe('classement-individuel-dames-2026-11-16.pdf');
    expect(individualExportFileName('Classement Mixte', 'xlsx', day)).toBe('classement-individuel-mixte-2026-11-16.xlsx');
  });

  it('strips accents and special characters from the category', () => {
    expect(individualExportFileName('Classement Été — Benjamins', 'pdf', day)).toBe(
      'classement-individuel-ete-benjamins-2026-11-16.pdf'
    );
  });
});
