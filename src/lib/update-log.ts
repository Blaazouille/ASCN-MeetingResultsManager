/**
 * Responsabilité : format d'une ligne du journal des mises à jour et troncature du journal à ses dernières lignes.
 * Appelé par : electron/update-state.ts.
 * Suppression casserait : le journal update-log.txt (plus aucune trace des échecs de mise à jour).
 */
import type { UpdateStatus } from './update-status';

// One check per launch writes one line, so 200 lines cover roughly the last
// 200 launches (several seasons of meetings) — enough to see when updates
// started failing. With lines capped below, the file never exceeds ~100 KB.
export const MAX_UPDATE_LOG_LINES = 200;

// electron-updater can put a whole HTTP response (headers included) in an
// error message; 500 characters keep the useful start of it.
const MAX_LINE_LENGTH = 500;

/**
 * One line per check, e.g. "2026-10-02T14:05:00.000Z failed net::ERR_INTERNET_DISCONNECTED".
 * `detail` is the full error text (status.message is cut short for the screen;
 * the log is where the whole reason is kept for whoever investigates).
 */
export function formatUpdateLogLine(status: UpdateStatus, detail: string | null): string {
  // Newlines are flattened so that one check can never span (and later be
  // half-cut by) several log lines.
  const suffix = detail === null ? '' : ` ${detail.replace(/\s+/g, ' ').trim()}`;
  return `${status.checkedAt} ${status.outcome}${suffix}`.slice(0, MAX_LINE_LENGTH);
}

/** Appends `line` to the log content and keeps only the last `maxLines` lines. */
export function appendBoundedLog(existing: string, line: string, maxLines: number = MAX_UPDATE_LOG_LINES): string {
  const lines = existing.split(/\r?\n/).filter((l) => l !== '');
  lines.push(line);
  return `${lines.slice(-maxLines).join('\n')}\n`;
}
