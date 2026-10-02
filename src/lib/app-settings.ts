/**
 * Responsabilité : lit et écrit les réglages globaux de l'application dans la table app_setting (aujourd'hui : « Notre club »).
 * Appelé par : electron/ipc-handlers.ts, src/lib/backup.ts (export et restauration), tests.
 * Suppression casserait : le choix de « Notre club » dans Paramètres et sa présence dans les sauvegardes.
 */
import type Database from 'better-sqlite3';
import { DEFAULT_OUR_CLUB, tidyClubName } from './our-club';

const OUR_CLUB_KEY = 'our_club';

/** The configured club, or DEFAULT_OUR_CLUB when it was never set (fresh install, or a database from before migration 9). */
export function getOurClub(db: Database.Database): string {
  const row = db.prepare('SELECT value FROM app_setting WHERE key = ?').get(OUR_CLUB_KEY) as { value: string } | undefined;
  return row?.value ?? DEFAULT_OUR_CLUB;
}

/**
 * Stores the club with its spaces tidied (the match ignores them anyway) and
 * returns what was stored. An empty name is refused rather than saved: it
 * would match no club and the highlight would vanish without a word.
 */
export function setOurClub(db: Database.Database, club: string): string {
  const tidy = tidyClubName(club);
  if (tidy === '') {
    throw new Error('Indiquez le nom de notre club.');
  }
  db.prepare(
    'INSERT INTO app_setting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(OUR_CLUB_KEY, tidy);
  return tidy;
}

/** Back to the default club — what restoring a backup made before the setting existed means. */
export function clearOurClub(db: Database.Database): void {
  db.prepare('DELETE FROM app_setting WHERE key = ?').run(OUR_CLUB_KEY);
}
