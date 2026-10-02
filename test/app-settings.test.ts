/**
 * Responsabilité : vérifie la lecture et l'écriture de « Notre club » dans la table app_setting (issue #26).
 * Appelé par : Vitest.
 * Suppression casserait : le garde-fou sur la valeur par défaut et la persistance du réglage.
 */
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/lib/db-schema';
import { clearOurClub, getOurClub, setOurClub } from '../src/lib/app-settings';
import { DEFAULT_OUR_CLUB } from '../src/lib/our-club';

describe('our club setting', () => {
  it('is AS Cherbourg Natation until someone changes it', () => {
    expect(getOurClub(createDatabase(':memory:'))).toBe(DEFAULT_OUR_CLUB);
  });

  it('returns the club saved last, with its spaces tidied', () => {
    const db = createDatabase(':memory:');
    expect(setOurClub(db, ' EN   CAEN ')).toBe('EN CAEN');
    setOurClub(db, 'CN VIRY-CHÂTILLON');
    expect(getOurClub(db)).toBe('CN VIRY-CHÂTILLON');
  });

  it('refuses an empty name and keeps the previous club', () => {
    const db = createDatabase(':memory:');
    setOurClub(db, 'EN CAEN');
    expect(() => setOurClub(db, '   ')).toThrow('Indiquez le nom de notre club.');
    expect(getOurClub(db)).toBe('EN CAEN');
  });

  it('goes back to the default club once cleared', () => {
    const db = createDatabase(':memory:');
    setOurClub(db, 'EN CAEN');
    clearOurClub(db);
    expect(getOurClub(db)).toBe(DEFAULT_OUR_CLUB);
  });
});
