/**
 * Responsabilité : persiste et relit l'instantané des résultats d'avant le dernier import CSV (table import_snapshot).
 * Appelé par : db.ts (insertSwimmerResults), electron/ipc-handlers.ts.
 * Suppression casserait : les mouvements de classement et le résumé « Depuis l'import de… » après un réimport.
 */
import type Database from 'better-sqlite3';
import type { RawSwimmerRow } from './csv-parser';

export interface ImportSnapshot {
  /** SQLite UTC timestamp of the import that produced these rows; null if it predates last_imported_at. */
  importedAt: string | null;
  rows: RawSwimmerRow[];
}

/**
 * Keeps the rows as they were just before an import (only the latest, one per
 * meeting: the issue's "no full history" scope). Takes the rows as a parameter
 * rather than reading swimmer_result itself, so db.ts can import this file
 * without a circular dependency. No rows = first import: the snapshot is
 * dropped so no movement is shown against nothing.
 */
export function saveImportSnapshot(
  db: Database.Database,
  meetingId: number,
  rows: RawSwimmerRow[],
  importedAt: string | null
): void {
  if (rows.length === 0) {
    db.prepare('DELETE FROM import_snapshot WHERE meeting_id = ?').run(meetingId);
    return;
  }
  db.prepare('INSERT OR REPLACE INTO import_snapshot (meeting_id, imported_at, rows) VALUES (?, ?, ?)').run(
    meetingId,
    importedAt,
    JSON.stringify(rows)
  );
}

export function getImportSnapshot(db: Database.Database, meetingId: number): ImportSnapshot | null {
  const row = db.prepare('SELECT imported_at, rows FROM import_snapshot WHERE meeting_id = ?').get(meetingId) as
    | { imported_at: string | null; rows: string }
    | undefined;
  return row ? { importedAt: row.imported_at, rows: JSON.parse(row.rows) as RawSwimmerRow[] } : null;
}
