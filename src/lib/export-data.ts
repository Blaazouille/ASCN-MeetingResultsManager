/**
 * Responsabilité : métadonnées et helpers pour les exports PDF/Excel.
 * Appelé par : use-print-export.ts, pdf-export.tsx, excel-export.ts, MeetingCard.tsx, ResumeMeetingCard.tsx, update-status.ts.
 * Suppression casserait : les exports PDF/Excel et l'affichage des cartes meeting.
 */
import type { Meeting } from './db';

export interface PrintMeta {
  meetingName: string;
  /** Timestamp of computation, formatted fr-FR date + time. */
  computedAt: string;
}

const CREATED_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

// Date and time are formatted apart and joined by hand: a single Intl call with
// dateStyle + timeStyle yields "14:32" or "à 14:32" depending on the ICU version,
// while the club reads "14 h 32".
const IMPORT_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const IMPORT_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/**
 * Parses a SQLite `datetime('now')` timestamp ("YYYY-MM-DD HH:MM:SS", always
 * UTC) into a Date. `new Date(...)` needs an explicit "Z" to treat the string
 * as UTC instead of local time.
 */
function parseSqliteTimestamp(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

/** Meeting creation date, formatted fr-FR (e.g. "16 novembre 2026") — shown on MeetingCard to tell entries with the same name apart. */
export function formatMeetingCreatedAt(meeting: Meeting): string {
  return CREATED_FORMATTER.format(parseSqliteTimestamp(meeting.createdAt));
}

/**
 * Date and time of the meeting's last CSV import, e.g. "27 sept. 2026 à 14 h 32",
 * or null when it was never imported. The time matters: volunteers re-import
 * several times on meeting day and need to tell which version is loaded.
 */
export function formatMeetingImportedAt(meeting: Meeting): string | null {
  return meeting.lastImportedAt === null ? null : formatImportTimestamp(meeting.lastImportedAt);
}

/** Same format for any SQLite import timestamp (e.g. the previous import's, kept in the snapshot). */
export function formatImportTimestamp(timestamp: string): string {
  return formatDateTimeFr(parseSqliteTimestamp(timestamp));
}

/** Any instant as "27 sept. 2026 à 14 h 32" (also used for the last update check in Paramètres). */
export function formatDateTimeFr(at: Date): string {
  // formatToParts rather than splitting "14:32" on ':' — no dependence on the ICU separator.
  const parts = IMPORT_TIME_FORMATTER.formatToParts(at);
  const hours = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minutes = parts.find((p) => p.type === 'minute')?.value ?? '00';
  // Non-breaking spaces keep "14 h 32" on one line when the card wraps.
  return `${IMPORT_DATE_FORMATTER.format(at)} à ${hours} h ${minutes}`;
}

/** Builds the print/export metadata from the persisted meeting record. */
export function buildPrintMeta(meeting: Meeting): PrintMeta {
  return {
    meetingName: meeting.name,
    computedAt: TIMESTAMP_FORMATTER.format(new Date()),
  };
}

/**
 * Derives a filename-safe slug from a category name, e.g.
 * "Classement Mixte" -> "classement-mixte". Strips accents so exported
 * filenames stay portable across filesystems.
 */
export function slugifyCategory(category: string): string {
  return category
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
