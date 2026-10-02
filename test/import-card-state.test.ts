/**
 * Responsabilité : tests de la règle d'affichage de la carte de résultat de l'écran Import (import-card-state.ts).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de import-card-state.ts.
 */
import { describe, expect, it } from 'vitest';
import { importCardState, type ImportCardInput } from '../src/lib/import-card-state';

const saved: ImportCardInput = { hasFile: true, isPending: false, hasPersistError: false, isPersisting: false, hasOutcome: true };

describe('importCardState', () => {
  it('shows the green check once a save has finished', () => {
    expect(importCardState(saved)).toBe('done');
  });

  it('shows « en cours » while the check or the save runs', () => {
    expect(importCardState({ ...saved, isPersisting: true, hasOutcome: false })).toBe('saving');
  });

  it('hides the card while a file waits for an answer, even with an outcome from an earlier save', () => {
    expect(importCardState({ ...saved, isPending: true })).toBe('hidden');
  });

  it('never shows a check for a file read but not saved (second drop being analysed, back on the screen)', () => {
    expect(importCardState({ ...saved, hasOutcome: false })).toBe('hidden');
  });

  it('hides the card after a failed save, so the error is not read as a success', () => {
    expect(importCardState({ ...saved, hasPersistError: true, hasOutcome: false })).toBe('hidden');
  });

  it('hides the card when no file has been read', () => {
    expect(importCardState({ ...saved, hasFile: false })).toBe('hidden');
  });
});
