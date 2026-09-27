import { describe, expect, it } from 'vitest';
import { formatRetainedSwimmers } from '../src/lib/utils';

describe('formatRetainedSwimmers', () => {
  it('reads as swimmers counted out of swimmers entered (Viry, Mixte top 5)', () => {
    expect(formatRetainedSwimmers(5, 18)).toBe('5 retenus sur 18');
  });

  it('counts every swimmer when the club entered fewer than top N', () => {
    expect(formatRetainedSwimmers(2, 2)).toBe('2 retenus sur 2');
  });

  it('uses the French singular for a single swimmer', () => {
    expect(formatRetainedSwimmers(1, 1)).toBe('1 retenu sur 1');
  });
});
