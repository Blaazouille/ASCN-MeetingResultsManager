/**
 * Responsabilité : tests des helpers de formatage partagés (formatRetainedSwimmers).
 * Appelé par : Vitest.
 * Suppression casserait : la vérification du libellé « N retenus sur M » du classement par équipes.
 */
import { describe, expect, it } from 'vitest';
import { formatDateTimeFr, formatRetainedSwimmers } from '../src/lib/utils';

describe('formatDateTimeFr', () => {
  it('formats an instant as "2 oct. 2026 à 14 h 05" in local time, with non-breaking spaces around "h"', () => {
    // 10:05 UTC stays on the 2nd for local timezones from UTC-10 to UTC+13.
    const at = new Date('2026-10-02T10:05:00Z');
    const hh = String(at.getHours()).padStart(2, '0');
    const mm = String(at.getMinutes()).padStart(2, '0');
    expect(formatDateTimeFr(at)).toMatch(new RegExp(`^2\\s+oct\\.?\\s+2026 à ${hh}\\u00a0h\\u00a0${mm}$`));
  });
});

const NBSP = '\u00a0';

describe('formatRetainedSwimmers', () => {
  it('reads as swimmers counted out of swimmers entered (Viry, Mixte top 5)', () => {
    expect(formatRetainedSwimmers(5, 18)).toBe(`5${NBSP}retenus sur${NBSP}18`);
  });

  it('counts every swimmer when the club entered fewer than top N', () => {
    expect(formatRetainedSwimmers(2, 2)).toBe(`2${NBSP}retenus sur${NBSP}2`);
  });

  it('uses the French singular for one swimmer and for zero', () => {
    expect(formatRetainedSwimmers(1, 1)).toBe(`1${NBSP}retenu sur${NBSP}1`);
    expect(formatRetainedSwimmers(0, 3)).toBe(`0${NBSP}retenu sur${NBSP}3`);
  });
});
