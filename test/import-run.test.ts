/**
 * Responsabilité : tests de la règle qui écarte le résultat d'un import lancé avant un changement de meeting (import-run.ts).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de import-run.ts.
 */
import { describe, expect, it } from 'vitest';
import { isCurrentImportRun } from '../src/lib/import-run';

describe('isCurrentImportRun', () => {
  it('keeps the result of an import that finishes on the meeting it started on', () => {
    expect(isCurrentImportRun(3, 3)).toBe(true);
  });

  it('drops the result of an import that finishes after a meeting change', () => {
    expect(isCurrentImportRun(3, 4)).toBe(false);
  });

  it('drops it too after going to another meeting and back, since the screen was reset in between', () => {
    expect(isCurrentImportRun(3, 5)).toBe(false);
  });
});
