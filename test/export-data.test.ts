import { describe, expect, it } from 'vitest';
import { buildPrintMeta, formatMeetingCreatedAt, slugifyCategory } from '../src/lib/export-data';

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

describe('buildPrintMeta', () => {
  it('maps the meeting name and provisional status', () => {
    const meta = buildPrintMeta({
      id: 1,
      name: 'Meeting de la Mer 2026',
      status: 'provisional',
      createdAt: '2026-01-01 00:00:00',
      updatedAt: '2026-01-01 00:00:00',
      defaultTopN: 5,
      minSwimmers: 0,
      activeCategories: null,
    });

    expect(meta.meetingName).toBe('Meeting de la Mer 2026');
    expect(meta.status).toBe('Provisoire');
    expect(meta.computedAt.length).toBeGreaterThan(0);
  });

  it('maps a final meeting to "Définitif"', () => {
    const meta = buildPrintMeta({
      id: 2,
      name: 'Meeting de la Mer 2026',
      status: 'final',
      createdAt: '2026-01-01 00:00:00',
      updatedAt: '2026-01-01 00:00:00',
      defaultTopN: 5,
      minSwimmers: 0,
      activeCategories: null,
    });

    expect(meta.status).toBe('Définitif');
  });
});

describe('formatMeetingCreatedAt', () => {
  it('formats a SQLite UTC timestamp as a fr-FR long date', () => {
    const formatted = formatMeetingCreatedAt({
      id: 1,
      name: 'Meeting de la Mer 2026',
      status: 'provisional',
      createdAt: '2026-11-16 12:00:00',
      updatedAt: '2026-11-16 12:00:00',
      defaultTopN: 5,
      minSwimmers: 0,
      activeCategories: null,
    });

    expect(formatted).toMatch(/16 novembre 2026/);
  });
});
