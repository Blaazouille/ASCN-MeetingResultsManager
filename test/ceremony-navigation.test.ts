/**
 * Responsabilité : tests de la progression dans le déroulé (Précédent / Suivant, annonces faites, clavier).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ceremony-navigation.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  doneCount,
  goToStep,
  isStepDone,
  isStepSkipped,
  moveStep,
  shortcutMove,
  START_PROGRESS,
  type ShortcutKey,
} from '../src/lib/ceremony-navigation';

describe('moveStep', () => {
  it('starts on the first announcement, not yet ticked', () => {
    expect(START_PROGRESS.current).toBe(0);
    expect(isStepDone(START_PROGRESS, 0)).toBe(false);
  });

  it('goes forward and ticks the announcement just read', () => {
    const progress = moveStep(START_PROGRESS, 'next', 5);
    expect(progress.current).toBe(1);
    expect(isStepDone(progress, 0)).toBe(true);
    expect(isStepDone(progress, 1)).toBe(false);
  });

  it('does not go before the first announcement', () => {
    expect(moveStep(START_PROGRESS, 'previous', 5)).toEqual(START_PROGRESS);
  });

  it('keeps read announcements ticked when going back to check one', () => {
    let progress = moveStep(START_PROGRESS, 'next', 5);
    progress = moveStep(progress, 'next', 5);
    progress = moveStep(progress, 'previous', 5);
    expect(progress.current).toBe(1);
    expect(isStepDone(progress, 0)).toBe(true);
    // The one on screen is being read again: not shown as done.
    expect(isStepDone(progress, 1)).toBe(false);
    expect(isStepDone(progress, 2)).toBe(true);
  });

  it('ends the ceremony on "next" from the last announcement, without moving', () => {
    let progress = START_PROGRESS;
    for (let i = 0; i < 5; i++) progress = moveStep(progress, 'next', 5);
    expect(progress.current).toBe(4);
    expect(progress.finished).toBe(true);
    expect(isStepDone(progress, 4)).toBe(true);
    expect(doneCount(progress, 5)).toBe(5);
  });
});

describe('goToStep', () => {
  it('does not tick the announcements skipped by a jump ahead', () => {
    const progress = moveStep(goToStep(START_PROGRESS, 3, 5), 'next', 5);
    expect(isStepDone(progress, 0)).toBe(true);
    expect(isStepDone(progress, 1)).toBe(false);
    expect(isStepDone(progress, 2)).toBe(false);
    expect(isStepDone(progress, 3)).toBe(true);
    expect(doneCount(progress, 5)).toBe(2);
  });

  it('marks the jumped-over announcements as not announced, and only those', () => {
    const progress = goToStep(START_PROGRESS, 3, 5);
    expect([0, 1, 2, 3, 4].map((index) => isStepSkipped(progress, index))).toEqual([false, true, true, false, false]);
  });

  it('ticks a skipped announcement once it has been shown', () => {
    const progress = goToStep(goToStep(START_PROGRESS, 3, 5), 1, 5);
    expect(isStepSkipped(progress, 1)).toBe(false);
    expect(isStepDone(goToStep(progress, 3, 5), 1)).toBe(true);
  });

  it('stays within the script', () => {
    expect(goToStep(START_PROGRESS, 9, 5).current).toBe(4);
    expect(goToStep(START_PROGRESS, -2, 5).current).toBe(0);
    expect(goToStep(START_PROGRESS, 2, 0)).toEqual(START_PROGRESS);
  });
});

describe('shortcutMove', () => {
  const press = (key: string, overrides: Partial<ShortcutKey> = {}): ReturnType<typeof shortcutMove> =>
    shortcutMove({ key, repeat: false, withModifier: false, inField: false, dialogOpen: false, ...overrides });

  it('maps → and space to next, ← to previous, anything else to nothing', () => {
    expect(press('ArrowRight')).toBe('next');
    expect(press(' ')).toBe('next');
    expect(press('ArrowLeft')).toBe('previous');
    expect(press('Enter')).toBeNull();
  });

  it('leaves the key alone while typing in a field or when a dialog is open', () => {
    expect(press(' ', { inField: true })).toBeNull();
    expect(press('ArrowRight', { dialogOpen: true })).toBeNull();
  });

  it('ignores held keys and shortcuts with Alt, Ctrl or Meta', () => {
    expect(press('ArrowRight', { repeat: true })).toBeNull();
    expect(press('ArrowLeft', { withModifier: true })).toBeNull();
  });
});
