/**
 * Responsabilité : tests des messages de succès et d'échec des exports unitaires et du pack « Tout exporter » (export-feedback.ts).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de export-feedback.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  errorCause,
  exportErrorMessage,
  exportPackErrorMessage,
  exportPackSummary,
  exportSuccessMessage,
} from '../src/lib/export-feedback';

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

describe('exportPackSummary', () => {
  it('says the whole pack is saved when every file was written', () => {
    expect(exportPackSummary(5, 5)).toBe('Les 5 fichiers du meeting sont enregistrés.');
  });

  it('says how many files are missing when only some were written, before they are listed', () => {
    expect(exportPackSummary(4, 5)).toBe(`4 fichiers sur 5 enregistrés. 1 fichier n'a pas pu être créé${NBSP}:`);
    expect(exportPackSummary(1, 5)).toBe(`1 fichier sur 5 enregistré. 4 fichiers n'ont pas pu être créés${NBSP}:`);
  });

  it('invites the volunteer to retry when no file could be written', () => {
    expect(exportPackSummary(0, 5)).toBe("Aucun fichier n'a pu être créé. Vous pouvez réessayer.");
  });
});

describe('exportPackErrorMessage', () => {
  it('keeps the cause after the plain sentence', () => {
    expect(exportPackErrorMessage(new Error('EACCES'))).toBe(
      `Échec de l'export du meeting. Vous pouvez réessayer. Détail${NBSP}: EACCES`
    );
  });

  it('falls back to the plain sentence when there is no cause to show', () => {
    expect(exportPackErrorMessage(undefined)).toBe("Échec de l'export du meeting. Vous pouvez réessayer.");
  });
});

describe('errorCause', () => {
  it('reads the message of an Error or the text of any other value, trimmed', () => {
    expect(errorCause(new Error(' disque plein '))).toBe('disque plein');
    expect(errorCause('refusé')).toBe('refusé');
    expect(errorCause(null)).toBe('');
  });
});
