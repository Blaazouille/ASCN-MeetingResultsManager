import { describe, expect, it } from 'vitest';
import { buildPrintMeta, slugifyCategory } from '../src/lib/print-data';

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
  it('maps the meeting name, date, and provisional status', () => {
    const meta = buildPrintMeta({
      id: 1,
      name: 'Meeting de la Mer 2026',
      date: '2026-11-16',
      location: 'Cherbourg',
      status: 'provisional',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(meta.meetingName).toBe('Meeting de la Mer 2026');
    expect(meta.status).toBe('Provisoire');
    expect(meta.date).toBe('16 nov. 2026');
    expect(meta.computedAt.length).toBeGreaterThan(0);
  });

  it('maps a final meeting to "Définitif"', () => {
    const meta = buildPrintMeta({
      id: 2,
      name: 'Meeting de la Mer 2026',
      date: '2026-11-16',
      location: null,
      status: 'final',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(meta.status).toBe('Définitif');
  });
});
