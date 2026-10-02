/**
 * Responsabilité : tests de wrapFocusIndex (piège à focus) et restoreFocus (retour du focus) des modales.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de focus-trap.ts.
 */
import { describe, expect, it } from 'vitest';
import { restoreFocus, wrapFocusIndex, type FocusTarget } from '../src/lib/focus-trap';

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

describe('restoreFocus', () => {
  const fakeElement = (isConnected: boolean): FocusTarget & { focused: number } => ({
    isConnected,
    focused: 0,
    focus() {
      this.focused += 1;
    },
  });

  it('gives focus back to the element that opened the modal once the modal is gone', () => {
    const trashButton = fakeElement(true);
    restoreFocus(trashButton, null);
    expect(trashButton.focused).toBe(1);
  });

  it('also restores when the modal node is still referenced but detached from the page', () => {
    const dropZone = fakeElement(true);
    restoreFocus(dropZone, { isConnected: false });
    expect(dropZone.focused).toBe(1);
  });

  it('keeps focus in the modal while it is still shown', () => {
    const trashButton = fakeElement(true);
    restoreFocus(trashButton, { isConnected: true });
    expect(trashButton.focused).toBe(0);
  });

  it('leaves focus alone when the opener has left the page', () => {
    const deletedMeetingButton = fakeElement(false);
    restoreFocus(deletedMeetingButton, null);
    expect(deletedMeetingButton.focused).toBe(0);
  });

  it('does nothing when no element had focus at opening', () => {
    expect(() => restoreFocus(null, null)).not.toThrow();
  });
});
