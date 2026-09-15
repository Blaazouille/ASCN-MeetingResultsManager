export interface PrintMeta {
  meetingName: string;
  /** Meeting date, formatted fr-FR (e.g. "16 nov. 2026"). */
  date: string;
  status: 'Provisoire' | 'Définitif';
  /** Timestamp of computation, formatted fr-FR date + time. */
  computedAt: string;
}

const MEETING_NAME = 'Meeting de la Mer 2026';

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Placeholder meeting metadata until Phase 5 (Paramètres) makes the meeting
 * name, date, and status configurable and Phase 4 (SQLite) persists them.
 */
export function buildPrintMeta(): PrintMeta {
  const now = new Date();
  return {
    meetingName: MEETING_NAME,
    date: DATE_FORMATTER.format(now),
    status: 'Provisoire',
    computedAt: TIMESTAMP_FORMATTER.format(now),
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
