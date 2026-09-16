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
  it('returns a meeting name, a non-empty date, and a Provisoire status', () => {
    const meta = buildPrintMeta();
    expect(meta.meetingName).toBe('Meeting de la Mer 2026');
    expect(meta.status).toBe('Provisoire');
    expect(meta.date.length).toBeGreaterThan(0);
    expect(meta.computedAt.length).toBeGreaterThan(0);
  });

  it('formats the date in medium style (e.g. "16 nov. 2026")', () => {
    const meta = buildPrintMeta();
    // Verify format: day, abbreviated month with period, year (e.g. "16 nov. 2026")
    expect(meta.date).toMatch(/^\d{1,2}\s+\w+\.\s+\d{4}$/);
  });
});
