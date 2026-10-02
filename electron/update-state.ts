/**
 * Responsabilité : lit et écrit sous userData l'état de la dernière vérification de mise à jour (update-status.json) et son journal borné (update-log.txt).
 * Appelé par : electron/auto-updater.ts.
 * Suppression casserait : la mémorisation de la dernière vérification et le journal des échecs de mise à jour.
 */
import { app } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseUpdateStatus, type UpdateStatus } from '../src/lib/update-status';
import { appendBoundedLog, formatUpdateLogLine } from '../src/lib/update-log';

const STATUS_FILENAME = 'update-status.json';
const LOG_FILENAME = 'update-log.txt';

function userDataFile(name: string): string {
  return path.join(app.getPath('userData'), name);
}

/** Last recorded check, or null if none (first launch, missing or unreadable file). */
export function loadUpdateStatus(): UpdateStatus | null {
  try {
    const file = userDataFile(STATUS_FILENAME);
    return existsSync(file) ? parseUpdateStatus(JSON.parse(readFileSync(file, 'utf-8'))) : null;
  } catch {
    // A corrupted status file only means "never checked": the next check rewrites it.
    return null;
  }
}

/**
 * Persists the check outcome and appends it to the log. Never throws: the
 * update check runs in the background, so a full disk or a locked file must
 * not turn into a crash of the main process.
 */
export function recordUpdateCheck(status: UpdateStatus, detail: string | null): void {
  try {
    writeFileSync(userDataFile(STATUS_FILENAME), JSON.stringify(status, null, 2), 'utf-8');
    const logFile = userDataFile(LOG_FILENAME);
    const existing = existsSync(logFile) ? readFileSync(logFile, 'utf-8') : '';
    writeFileSync(logFile, appendBoundedLog(existing, formatUpdateLogLine(status, detail)), 'utf-8');
  } catch (error) {
    console.error('Update status could not be recorded:', error);
  }
}
