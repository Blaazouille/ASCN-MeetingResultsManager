/**
 * Responsabilité : tests de wrapFocusIndex (piège à focus des modales).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de focus-trap.ts.
 */
import { describe, expect, it } from 'vitest';
import { wrapFocusIndex } from '../src/lib/focus-trap';

describe('wrapFocusIndex', () => {
  it('wraps Tab from the last element to the first', () => {
    expect(wrapFocusIndex(2, 3, false)).toBe(0);
  });

  it('wraps Shift+Tab from the first element to the last', () => {
    expect(wrapFocusIndex(0, 3, true)).toBe(2);
  });

  it('lets the browser move focus inside the modal', () => {
    expect(wrapFocusIndex(1, 3, false)).toBeNull();
    expect(wrapFocusIndex(1, 3, true)).toBeNull();
  });

  it('pulls focus back in when it is outside the modal', () => {
    expect(wrapFocusIndex(-1, 3, false)).toBe(0);
    expect(wrapFocusIndex(-1, 3, true)).toBe(2);
  });

  it('does nothing when the modal has no focusable element', () => {
    expect(wrapFocusIndex(-1, 0, false)).toBeNull();
    expect(wrapFocusIndex(-1, 0, true)).toBeNull();
  });
});
