/**
 * Responsabilité : tests des messages de succès et d'échec des exports (export-feedback.ts).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de export-feedback.ts.
 */
import { describe, expect, it } from 'vitest';
import { exportErrorMessage, exportSuccessMessage } from '../src/lib/export-feedback';

const NBSP = '\u00a0';

describe('exportSuccessMessage', () => {
  it('names the file type that was created', () => {
    expect(exportSuccessMessage('pdf')).toBe('Fichier PDF créé.');
    expect(exportSuccessMessage('excel')).toBe('Fichier Excel créé.');
  });
});

describe('exportErrorMessage', () => {
  it('keeps the cause of the failure after the plain sentence', () => {
    expect(exportErrorMessage('pdf', new Error('Police introuvable'))).toBe(
      `Échec de l'export PDF. Vous pouvez réessayer. Détail${NBSP}: Police introuvable`
    );
  });

  it('accepts a non-Error rejection value as the cause', () => {
    expect(exportErrorMessage('excel', 'disque plein')).toBe(
      `Échec de l'export Excel. Vous pouvez réessayer. Détail${NBSP}: disque plein`
    );
  });

  it('falls back to the plain sentence when there is no cause to show', () => {
    expect(exportErrorMessage('pdf', new Error(''))).toBe("Échec de l'export PDF. Vous pouvez réessayer.");
    expect(exportErrorMessage('excel', undefined)).toBe("Échec de l'export Excel. Vous pouvez réessayer.");
  });
});
