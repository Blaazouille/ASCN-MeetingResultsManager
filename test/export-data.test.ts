import { describe, expect, it } from 'vitest';
import { buildExportMeta, formatMeetingCreatedAt, formatMeetingImportedAt, slugifyCategory } from '../src/lib/export-data';

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
  it('maps the meeting name and a computation timestamp', () => {
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
    });

    expect(meta.meetingName).toBe('Meeting de la Mer 2026');
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
