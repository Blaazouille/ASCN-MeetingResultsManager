/**
 * Responsabilité : métadonnées et helpers pour les exports PDF/Excel.
 * Appelé par : use-ranking-export.ts, use-individual-export.ts, use-ceremony-export.ts, pdf-export.tsx, excel-export.ts, individual-pdf-export.tsx, individual-excel-export.ts, ceremony-pdf-export.tsx, ceremony-warnings.ts, palmares-pdf-export.tsx, export-pack-files.ts, MeetingCard.tsx, ResumeMeetingCard.tsx.
 * Suppression casserait : les exports PDF/Excel et l'affichage des cartes meeting.
 */
import type { Worksheet } from 'exceljs';
import type { Meeting } from './db';
import { categoryShortLabel } from './ui-labels';
import { formatDateTimeFr } from './utils';

export interface ExportMeta {
  meetingName: string;
  /** Timestamp of computation, formatted fr-FR date + time. */
  computedAt: string;
  /** Warning printed on every export of the training meeting, so a sample sheet can't pass for official results; null for a real meeting. */
  notice: string | null;
  /** « Notre club » as configured in Paramètres: its rows are highlighted on paper too. */
  ourClub: string;
}

export const DEMO_EXPORT_NOTICE = 'EXEMPLE — non officiel';
/** Colour of that warning on paper and in Excel: the app's `warning` token, the same tone as the « Exemple » badge. */
export const EXPORT_NOTICE_COLOR = '#92400E';

/**
 * Writes the meeting's notice (if any) as the sheet's first line, above the
 * header row, so it is the first thing seen when the file opens. Call it once
 * the table is filled: the rows below simply shift down.
 */
export function addExportNotice(sheet: Worksheet, meta: ExportMeta): void {
  if (!meta.notice) {
    return;
  }
  sheet.spliceRows(1, 0, [meta.notice]);
  sheet.getRow(1).font = { bold: true, color: { argb: `FF${EXPORT_NOTICE_COLOR.slice(1)}` } };
}

/**
 * One category's results inside an export. Exports take a list of sections so
 * the single-category buttons and the full-meeting pack share one generator
 * (and therefore one layout) — the unit export is just a one-section list.
 */
export interface ExportSection<T> {
  category: string;
  results: T[];
}

const CREATED_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Parses a SQLite `datetime('now')` timestamp ("YYYY-MM-DD HH:MM:SS", always
 * UTC) into a Date. `new Date(...)` needs an explicit "Z" to treat the string
 * as UTC instead of local time.
 */
export function parseSqliteTimestamp(value: string): Date {
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

/**
 * Builds the export metadata from the persisted meeting record. `ourClub`
 * travels in the metadata, which every PDF generator already receives,
 * instead of being one more argument to each of them.
 */
export function buildExportMeta(meeting: Meeting, ourClub: string): ExportMeta {
  return {
    meetingName: meeting.name,
    computedAt: TIMESTAMP_FORMATTER.format(new Date()),
    notice: meeting.isDemo ? DEMO_EXPORT_NOTICE : null,
    ourClub,
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

/**
 * Excel sheet name for a category: "Classement Mixte" -> "Mixte". Excel rejects
 * names containing \ / ? * : [ ] or longer than 31 characters and fails the
 * whole export, so those characters become spaces and the name is cut.
 */
export function excelSheetName(category: string): string {
  return (
    categoryShortLabel(category)
      .replace(/[\\/?*:[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 31) || 'Classement'
  );
}

/**
 * Download filename of an individual ranking export, e.g.
 * "classement-individuel-dames-2026-11-16.pdf". The "Classement" prefix of the
 * category is dropped because the file name already starts with it.
 */
export function individualExportFileName(category: string, extension: 'pdf' | 'xlsx', date: Date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return `classement-individuel-${slugifyCategory(categoryShortLabel(category))}-${day}.${extension}`;
}
