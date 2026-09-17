/**
 * Responsabilité : métadonnées et helpers pour les exports PDF/Excel.
 * Appelé par : use-print-export.ts, pdf-export.tsx, excel-export.ts, MeetingCard.tsx.
 * Suppression casserait : les exports PDF/Excel et l'affichage des cartes meeting.
 */
import type { Meeting, MeetingStatus } from './db';

export interface PrintMeta {
  meetingName: string;
  /** Meeting date, formatted fr-FR (e.g. "16 nov. 2026"). */
  date: string;
  status: 'Provisoire' | 'Définitif';
  /** Timestamp of computation, formatted fr-FR date + time. */
  computedAt: string;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Parses a `Meeting.date` string ("YYYY-MM-DD") as local midnight rather
 * than UTC midnight. `new Date("YYYY-MM-DD")` alone is UTC, which shifts to
 * the previous day once formatted in a negative-UTC-offset timezone.
 */
export function parseMeetingDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

/** Maps a meeting's persisted status to its French display label. */
export function meetingStatusLabel(status: MeetingStatus): 'Provisoire' | 'Définitif' {
  return status === 'final' ? 'Définitif' : 'Provisoire';
}

/** Builds the print/export metadata from the persisted meeting record. */
export function buildPrintMeta(meeting: Meeting): PrintMeta {
  return {
    meetingName: meeting.name,
    date: DATE_FORMATTER.format(parseMeetingDate(meeting.date)),
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
