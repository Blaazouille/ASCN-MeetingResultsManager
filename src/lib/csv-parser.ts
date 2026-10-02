/**
 * Responsabilité : parse les fichiers CSV FFN extraNat en lignes structurées.
 * Appelé par : ImportPage (via use-import.ts) et les tests.
 * Suppression casserait : l'import de fichiers CSV.
 */
import Papa from 'papaparse';
import { readSwimmerRow } from './csv-row';

export interface CsvParseOptions {
  /** Character encoding used to decode the raw bytes. Default: 'auto'. */
  encoding?: 'latin1' | 'utf-8' | 'auto';
  /** Field delimiter. Default: auto-detected by Papa Parse. */
  delimiter?: string;
  /** Reserved for callers that want to record the ranking topN alongside the import. Not used by the parser itself. */
  topN?: number;
}

export interface RawSwimmerRow {
  /** Category name, e.g. "Classement Mixte". */
  name: string;
  /** Rank in category, as printed in the source file; null when that cell is empty or unreadable. */
  place: number | null;
  lastname: string;
  firstname: string;
  birthyear: number;
  nation: string;
  club: string;
  /** Numeric points parsed from the "1274 Pts" source format. */
  points: number;
  comment: string;
}

export interface CsvParseResult {
  rows: RawSwimmerRow[];
  /** Unique category names, in order of first appearance. */
  categories: string[];
  clubCount: number;
  /** Distinct swimmers (by lastname+firstname+birthyear+club) across the whole file — a swimmer counted once even if entered in multiple categories, not `rows.length`. */
  swimmerCount: number;
  /** Encoding actually used to decode the file. */
  encoding: 'latin1' | 'utf-8';
  /** Delimiter actually used to split fields. */
  delimiter: string;
  warnings: string[];
  /** Lines left out because their points cell was empty — they never reach the database. */
  ignoredRowCount: number;
  /** Rows repeating a swimmer already seen in the same category — the database keeps only the last one. */
  duplicateRowCount: number;
  /** Swimmers left out because their birth year is empty or not a whole number (those lines never reach the database), each listed once with every category they were left out of. */
  excludedSwimmers: ExcludedSwimmer[];
}

/**
 * A swimmer left out of one or more categories. Identified by name and club, not name alone:
 * two namesakes from different clubs are two swimmers. The categories are kept because the
 * same swimmer can be left out of one category and imported in another.
 */
export interface ExcludedSwimmer {
  firstname: string;
  lastname: string;
  club: string;
  categories: string[];
}

export interface SwimmerRowsSummary {
  categories: string[];
  clubCount: number;
  swimmerCount: number;
}

/**
 * Summarizes a set of swimmer rows the same way parseCsv() does (distinct
 * categories in first-appearance order, distinct clubs, distinct swimmers
 * by lastname+firstname+birthyear+club) — usable on rows loaded back from
 * the database, not just on a freshly parsed file. The club and swimmer
 * counts shown on Accueil are computed in SQL (SELECT_MEETING in db.ts) with
 * the same rules: keep both in sync.
 */
export function summarizeSwimmerRows(rows: RawSwimmerRow[]): SwimmerRowsSummary {
  const categories: string[] = [];
  const clubs = new Set<string>();
  const uniqueSwimmers = new Set<string>();

  for (const row of rows) {
    if (!categories.includes(row.name)) {
      categories.push(row.name);
    }
    if (row.club) {
      clubs.add(row.club);
    }
    uniqueSwimmers.add(`${row.lastname}|${row.firstname}|${row.birthyear}|${row.club}`);
  }

  return { categories, clubCount: clubs.size, swimmerCount: uniqueSwimmers.size };
}

/** Rows per category, in first-appearance order — shown as chips on the import summary. */
export function countRowsByCategory(rows: RawSwimmerRow[]): Array<{ category: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
  }
  return Array.from(counts, ([category, count]) => ({ category, count }));
}

const REQUIRED_COLUMNS = [
  'name',
  'place',
  'lastname',
  'firstname',
  'birthyear',
  'nation',
  'club',
  'points',
  'comment',
] as const;

/**
 * Decodes raw CSV bytes to text, auto-detecting the encoding when requested.
 * The FFN extraNat export is Latin-1; UTF-8 is attempted first (strict) so
 * that a genuinely UTF-8 file is not mis-decoded, and any decoding failure
 * falls back to Latin-1.
 */
function decodeBytes(
  bytes: Uint8Array,
  requested: CsvParseOptions['encoding']
): { text: string; encoding: 'latin1' | 'utf-8' } {
  if (requested === 'latin1') {
    return { text: new TextDecoder('iso-8859-1').decode(bytes), encoding: 'latin1' };
  }
  if (requested === 'utf-8') {
    return { text: new TextDecoder('utf-8').decode(bytes), encoding: 'utf-8' };
  }

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('�')) {
      throw new Error('UTF-8 decode produced replacement characters');
    }
    return { text, encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('iso-8859-1').decode(bytes), encoding: 'latin1' };
  }
}

function toUint8Array(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

/**
 * Why a file gave no row, in the volunteer's words: a bare « aucune ligne exploitable » leaves them
 * guessing whether the file is empty, cut short or of the wrong kind. A missing column comes first
 * because it explains every line at once.
 */
export function noUsableRowCause(missingColumns: readonly string[], hadLinesWithoutPoints: boolean, hadUnreadableBirthYears: boolean): string {
  if (missingColumns.length > 0) {
    const plural = missingColumns.length > 1 ? 's' : '';
    return `colonne${plural} absente${plural} : ${missingColumns.join(', ')}`;
  }
  if (hadLinesWithoutPoints && hadUnreadableBirthYears) return 'chaque ligne a des points manquants ou une année de naissance vide ou illisible';
  if (hadUnreadableBirthYears) return 'aucune année de naissance lisible';
  if (hadLinesWithoutPoints) return 'aucune ligne avec des points';
  return 'le fichier ne contient que la ligne des titres de colonnes';
}

/**
 * Parses raw FFN extraNat CSV bytes into structured swimmer rows.
 * Accepts raw bytes (not a pre-decoded string) because encoding detection
 * needs to happen on the byte stream itself.
 */
export function parseCsv(
  input: ArrayBuffer | Uint8Array,
  options: CsvParseOptions = {}
): CsvParseResult {
  const bytes = toUint8Array(input);
  const { text, encoding } = decodeBytes(bytes, options.encoding ?? 'auto');

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: options.delimiter ?? '',
  });

  const warnings: string[] = [];
  for (const err of parsed.errors) {
    warnings.push(`Ligne ${err.row ?? '?'} : erreur de lecture du fichier (${err.message})`);
  }

  const headerFields = parsed.meta.fields ?? [];
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headerFields.includes(column));
  for (const column of missingColumns) {
    warnings.push(`Colonne manquante dans le fichier : « ${column} »`);
  }
  // Without a place column every line would repeat the same warning: the one above is enough.
  const hasPlaceColumn = headerFields.includes('place');

  const categories: string[] = [];
  const clubs = new Set<string>();
  const seenSwimmersByCategory = new Map<string, Set<string>>();
  // A swimmer typically appears once per category they're ranked in (once
  // in "Classement Mixte", again in their gender category), so this tracks
  // distinct swimmers across the whole file for swimmerCount, separately
  // from `rows.length` (which counts entries, not people).
  const uniqueSwimmers = new Set<string>();
  const rows: RawSwimmerRow[] = [];
  let ignoredRowCount = 0;
  let duplicateRowCount = 0;
  const excludedSwimmers: ExcludedSwimmer[] = [];

  parsed.data.forEach((raw, index) => {
    const rowNumber = index + 2; // +1 for 0-index, +1 for header line

    const reading = readSwimmerRow(raw, rowNumber, hasPlaceColumn, warnings);
    if (reading.kind === 'no-points') {
      ignoredRowCount += 1;
      return;
    }
    if (reading.kind === 'no-birthyear') {
      const { category, firstname, lastname, club } = reading.line;
      const known = excludedSwimmers.find((s) => s.firstname === firstname && s.lastname === lastname && s.club === club);
      if (!known) excludedSwimmers.push({ firstname, lastname, club, categories: [category] });
      else if (!known.categories.includes(category)) known.categories.push(category);
      return;
    }
    const { row } = reading;
    const { name, club, lastname, firstname, birthyear } = row;

    if (!categories.includes(name)) {
      categories.push(name);
    }
    if (club) {
      clubs.add(club);
    }

    // Same name + birth year + club identifies the same swimmer; two
    // different swimmers who happen to share a name are common enough
    // (common French surnames, different clubs) that name alone would
    // false-positive on them.
    const swimmerKey = `${lastname}|${firstname}|${birthyear}|${club}`;
    uniqueSwimmers.add(swimmerKey);
    let seenInCategory = seenSwimmersByCategory.get(name);
    if (!seenInCategory) {
      seenInCategory = new Set<string>();
      seenSwimmersByCategory.set(name, seenInCategory);
    }
    if (seenInCategory.has(swimmerKey)) {
      warnings.push(`Ligne ${rowNumber} : « ${firstname} ${lastname} » apparaît deux fois dans « ${name} »`);
      duplicateRowCount += 1;
    }
    seenInCategory.add(swimmerKey);

    rows.push(row);
  });

  // A header-only file, or one missing the points or birthyear column, yields no row: importing it would change nothing yet look like a success.
  if (rows.length === 0) {
    const cause = noUsableRowCause(missingColumns, ignoredRowCount > 0, excludedSwimmers.length > 0);
    throw new Error(`Aucune ligne exploitable dans ce fichier (${cause}). Est-ce bien un export de cotations extraNat ?`);
  }

  return {
    rows,
    categories,
    clubCount: clubs.size,
    swimmerCount: uniqueSwimmers.size,
    encoding,
    delimiter: parsed.meta.delimiter,
    warnings,
    ignoredRowCount,
    duplicateRowCount,
    excludedSwimmers,
  };
}
