/**
 * Responsabilité : tests des messages d'erreur de la configuration des sauvegardes (backup-config-messages.ts).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de backup-config-messages.ts.
 */
import { describe, expect, it } from 'vitest';
import { backupConfigErrorMessage } from '../src/lib/backup-config-messages';

const NBSP = '\u00a0';

describe('backupConfigErrorMessage', () => {
  it('says the defaults are shown when the configuration cannot be read', () => {
    expect(backupConfigErrorMessage('load', 'Unexpected token } in JSON')).toBe(
      `Impossible de lire la configuration des sauvegardes. Les valeurs par défaut sont affichées. Détail${NBSP}: Unexpected token } in JSON`
    );
  });

  it('reports a folder dialog failure as a failure, with the cause from a rejected call', () => {
    expect(backupConfigErrorMessage('chooseDir', new Error('IPC indisponible'))).toBe(
      `Impossible d'ouvrir le choix du dossier. Vous pouvez réessayer. Détail${NBSP}: IPC indisponible`
    );
  });

  it('says the configuration was not saved', () => {
    expect(backupConfigErrorMessage('save', 'EACCES')).toBe(
      `La configuration n'a pas été enregistrée. Vous pouvez réessayer. Détail${NBSP}: EACCES`
    );
  });

  it('leaves just the sentence when the cause is missing', () => {
    expect(backupConfigErrorMessage('save', undefined)).toBe("La configuration n'a pas été enregistrée. Vous pouvez réessayer.");
  });
});
