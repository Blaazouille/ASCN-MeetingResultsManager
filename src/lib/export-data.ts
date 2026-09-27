/**
 * Responsabilité : métadonnées et helpers pour les exports PDF/Excel.
 * Appelé par : use-print-export.ts, pdf-export.tsx, excel-export.ts, MeetingCard.tsx.
 * Suppression casserait : les exports PDF/Excel et l'affichage des cartes meeting.
 */
import type { Meeting, MeetingStatus } from './db';

export interface PrintMeta {
  meetingName: string;
  status: 'Provisoire' | 'Définitif';
  /** Timestamp of computation, formatted fr-FR date + time. */
  computedAt: string;
}

const CREATED_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Parses a SQLite `datetime('now')` timestamp ("YYYY-MM-DD HH:MM:SS", always
 * UTC) into a Date. `new Date(...)` needs an explicit "Z" to treat the string
 * as UTC instead of local time.
 */
function parseSqliteTimestamp(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

/** Maps a meeting's persisted status to its French display label. */
export function meetingStatusLabel(status: MeetingStatus): 'Provisoire' | 'Définitif' {
  return status === 'final' ? 'Définitif' : 'Provisoire';
}

/** Meeting creation date, formatted fr-FR (e.g. "16 novembre 2026") — shown on MeetingCard to tell entries with the same name apart. */
export function formatMeetingCreatedAt(meeting: Meeting): string {
  return CREATED_FORMATTER.format(parseSqliteTimestamp(meeting.createdAt));
}

/** Builds the print/export metadata from the persisted meeting record. */
export function buildPrintMeta(meeting: Meeting): PrintMeta {
  return {
    meetingName: meeting.name,
    status: meetingStatusLabel(meeting.status),
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
