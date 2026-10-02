/**
 * Responsabilité : tests de la progression dans le déroulé (Précédent / Suivant, annonces faites, clavier).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ceremony-navigation.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  goToStep,
  isCeremonyFinished,
  isStepDone,
  keyToMove,
  moveStep,
  START_PROGRESS,
} from '../src/lib/ceremony-navigation';

describe('moveStep', () => {
  it('goes forward and marks the previous announcement as read', () => {
    const progress = moveStep(START_PROGRESS, 'next', 5);
    expect(progress).toEqual({ current: 1, reached: 1 });
    expect(isStepDone(progress, 0, 5)).toBe(true);
    expect(isStepDone(progress, 1, 5)).toBe(false);
  });

  it('does not go before the first announcement', () => {
    expect(moveStep(START_PROGRESS, 'previous', 5)).toEqual(START_PROGRESS);
  });

  it('keeps read announcements ticked when going back to check one', () => {
    const progress = moveStep({ current: 3, reached: 3 }, 'previous', 5);
    expect(progress).toEqual({ current: 2, reached: 3 });
    expect(isStepDone(progress, 1, 5)).toBe(true);
    // The one on screen is being read again: not shown as done.
    expect(isStepDone(progress, 2, 5)).toBe(false);
  });

  it('ends the ceremony on "next" from the last announcement, without moving', () => {
    const progress = moveStep({ current: 4, reached: 4 }, 'next', 5);
    expect(progress).toEqual({ current: 4, reached: 5 });
    expect(isCeremonyFinished(progress, 5)).toBe(true);
    expect(isStepDone(progress, 4, 5)).toBe(true);
  });
});

describe('goToStep', () => {
  it('jumps to an announcement, ticking everything before it', () => {
    expect(goToStep(START_PROGRESS, 3, 5)).toEqual({ current: 3, reached: 3 });
  });

  it('stays within the script', () => {
    expect(goToStep(START_PROGRESS, 9, 5).current).toBe(4);
    expect(goToStep(START_PROGRESS, -2, 5).current).toBe(0);
    expect(goToStep(START_PROGRESS, 2, 0)).toEqual(START_PROGRESS);
  });
});

describe('isCeremonyFinished', () => {
  it('is false until the last announcement is read, and for an empty script', () => {
    expect(isCeremonyFinished({ current: 4, reached: 4 }, 5)).toBe(false);
    expect(isCeremonyFinished(START_PROGRESS, 0)).toBe(false);
  });
});

describe('keyToMove', () => {
  it('maps → and space to next, ← to previous, anything else to nothing', () => {
    expect(keyToMove('ArrowRight')).toBe('next');
    expect(keyToMove(' ')).toBe('next');
    expect(keyToMove('ArrowLeft')).toBe('previous');
    expect(keyToMove('Enter')).toBeNull();
  });
});
