/**
 * Responsabilité : créer / réinitialiser le meeting d'entraînement (données anonymisées) et le reconnaître.
 * Appelé par : electron/ipc-handlers.ts (création depuis l'Accueil, import sans sauvegarde automatique), tests.
 * Suppression casserait : le bouton « S'entraîner avec un meeting d'exemple » de l'Accueil.
 */
import type Database from 'better-sqlite3';
import type { RawSwimmerRow } from './csv-parser';
import { createMeeting, getAllMeetings, insertSwimmerResults, type Meeting } from './db';

export const DEMO_MEETING_NAME = 'Entraînement';

/**
 * Replaces any existing training meeting with a fresh one holding `rows`.
 * There is only ever one: creating it again is how the volunteer starts the
 * rehearsal over. One transaction, so a failure leaves the previous training
 * meeting in place instead of none.
 */
export function resetDemoMeeting(db: Database.Database, rows: RawSwimmerRow[]): Meeting {
  const reset = db.transaction((): number => {
    // The cascade removes its swimmers and import snapshot with it.
    db.prepare('DELETE FROM meeting WHERE is_demo = 1').run();
    const { id } = createMeeting(db, { name: DEMO_MEETING_NAME });
    db.prepare('UPDATE meeting SET is_demo = 1 WHERE id = ?').run(id);
    insertSwimmerResults(db, id, rows);
    return id;
  });
  const id = reset();
  // Read back rather than patched by hand, so the counts match what Accueil shows for any meeting.
  return getAllMeetings(db).find((meeting) => meeting.id === id)!;
}

/** True for the training meeting; false for a real meeting or an unknown id. */
export function isDemoMeeting(db: Database.Database, meetingId: number): boolean {
  const row = db.prepare('SELECT is_demo FROM meeting WHERE id = ?').get(meetingId) as { is_demo: number } | undefined;
  return row?.is_demo === 1;
}
