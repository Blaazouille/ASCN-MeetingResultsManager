import Papa from 'papaparse';

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
  /** Rank in category, as printed in the source file. */
  place: number;
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
 * the database, not just on a freshly parsed file.
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

const PLAUSIBLE_POINTS_MIN = 0;
const PLAUSIBLE_POINTS_MAX = 1500;

/**
 * Extracts the numeric value out of a points cell formatted as "1274 Pts".
 * Throws if no numeric value can be found — an unparseable points cell
 * means the source file does not match the expected FFN extraNat format.
 */
export function parsePoints(raw: string): number {
  const match = raw.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) {
    throw new Error(`Cannot parse points: "${raw}"`);
  }
  return parseFloat(match[1]!.replace(',', '.'));
}

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
  for (const column of REQUIRED_COLUMNS) {
    if (!headerFields.includes(column)) {
      warnings.push(`Colonne manquante dans le fichier : « ${column} »`);
    }
  }

  const categories: string[] = [];
  const clubs = new Set<string>();
  const seenSwimmersByCategory = new Map<string, Set<string>>();
  // A swimmer typically appears once per category they're ranked in (once
  // in "Classement Mixte", again in their gender category), so this tracks
  // distinct swimmers across the whole file for swimmerCount, separately
  // from `rows.length` (which counts entries, not people).
  const uniqueSwimmers = new Set<string>();
  const rows: RawSwimmerRow[] = [];

  parsed.data.forEach((raw, index) => {
    const rowNumber = index + 2; // +1 for 0-index, +1 for header line

    // Field values are kept verbatim (no trimming): the source FFN export
    // occasionally has trailing spaces in club names (e.g. "EXOCET MASTER
    // CLUB "), and altering them would break exact matching against
    // downstream references (grouping, exports, reference fixtures).
    const name = raw.name ?? '';
    const club = raw.club ?? '';
    const lastname = raw.lastname ?? '';
    const firstname = raw.firstname ?? '';
    const birthyear = Number.parseInt(raw.birthyear ?? '', 10);
    const pointsRaw = raw.points ?? '';

    if (!name.trim()) {
      warnings.push(`Ligne ${rowNumber} : catégorie manquante`);
    }
    if (!club.trim()) {
      warnings.push(`Ligne ${rowNumber} : club manquant`);
    }
    if (!pointsRaw.trim()) {
      warnings.push(`Ligne ${rowNumber} : points manquants (ligne ignorée)`);
      return;
    }

    const points = parsePoints(pointsRaw);
    if (points < PLAUSIBLE_POINTS_MIN || points > PLAUSIBLE_POINTS_MAX) {
      warnings.push(`Ligne ${rowNumber} : nombre de points inhabituel (${points})`);
    }

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
    }
    seenInCategory.add(swimmerKey);

    rows.push({
      name,
      place: Number.parseInt(raw.place ?? '', 10),
      lastname,
      firstname,
      birthyear,
      nation: raw.nation ?? '',
      club,
      points,
      comment: raw.comment ?? '',
    });
  });

  return {
    rows,
    categories,
    clubCount: clubs.size,
    swimmerCount: uniqueSwimmers.size,
    encoding,
    delimiter: parsed.meta.delimiter,
    warnings,
  };
}
