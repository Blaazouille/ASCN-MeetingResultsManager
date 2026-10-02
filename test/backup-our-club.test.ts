/**
 * Responsabilité : vérifie que « Notre club » (issue #26) voyage dans les sauvegardes JSON, dans les deux sens de compatibilité.
 * Appelé par : Vitest.
 * Suppression casserait : le garde-fou qui empêche une restauration de perdre le club choisi, ou une ancienne sauvegarde d'être refusée.
 */
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/lib/db-schema';
import { createMeeting } from '../src/lib/db';
import { exportDatabase, restoreDatabase, validateBackup } from '../src/lib/backup';
import { getOurClub, setOurClub } from '../src/lib/app-settings';
import { DEFAULT_OUR_CLUB } from '../src/lib/our-club';

/** A backup as written to disk, i.e. plain JSON with no TypeScript shape. */
function writtenBackup(ourClub?: string): Record<string, unknown> {
  const db = createDatabase(':memory:');
  createMeeting(db, { name: 'Meeting 2026' });
  if (ourClub !== undefined) setOurClub(db, ourClub);
  return JSON.parse(JSON.stringify(exportDatabase(db))) as Record<string, unknown>;
}

describe('our club in backups', () => {
  it('saves the configured club', () => {
    expect(writtenBackup('EN CAEN').ourClub).toBe('EN CAEN');
  });

  it('saves the default club when none was ever chosen', () => {
    expect(writtenBackup().ourClub).toBe(DEFAULT_OUR_CLUB);
  });

  it('keeps format version 1, the only one older app versions accept', () => {
    expect(writtenBackup('EN CAEN').version).toBe(1);
  });

  it('gives the saved club back on restore', () => {
    const target = createDatabase(':memory:');
    restoreDatabase(target, validateBackup(writtenBackup('EN CAEN')));
    expect(getOurClub(target)).toBe('EN CAEN');
  });

  it('restores a backup made before the setting existed, back to the default club', () => {
    const old = writtenBackup('EN CAEN');
    delete old.ourClub;
    const target = createDatabase(':memory:');
    setOurClub(target, 'CN VIRY-CHÂTILLON');

    const result = restoreDatabase(target, validateBackup(old));

    expect(result.meetingsImported).toBe(1);
    expect(getOurClub(target)).toBe(DEFAULT_OUR_CLUB);
  });

  it('refuses a backup whose club is empty or not text', () => {
    for (const ourClub of ['', '   ', 42, null]) {
      expect(() => validateBackup({ ...writtenBackup(), ourClub })).toThrow(
        'Format de backup invalide : ourClub doit être un nom de club non vide'
      );
    }
  });
});
