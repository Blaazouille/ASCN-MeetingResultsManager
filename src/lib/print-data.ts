import type { Meeting } from './db';

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

/** Builds the print/export metadata from the persisted meeting record. */
export function buildPrintMeta(meeting: Meeting): PrintMeta {
  return {
    meetingName: meeting.name,
    date: DATE_FORMATTER.format(new Date(meeting.date)),
    status: meeting.status === 'final' ? 'Définitif' : 'Provisoire',
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
