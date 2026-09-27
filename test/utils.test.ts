/**
 * Responsabilité : tests des helpers de formatage partagés (formatRetainedSwimmers).
 * Appelé par : Vitest.
 * Suppression casserait : la vérification du libellé « N retenus sur M » du classement par équipes.
 */
import { describe, expect, it } from 'vitest';
import { formatRetainedSwimmers } from '../src/lib/utils';

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
