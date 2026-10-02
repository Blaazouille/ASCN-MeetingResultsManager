/**
 * Responsabilité : lit une ligne du CSV extraNat (cellules converties, avertissements de la ligne) et dit si elle est gardée, ignorée ou écartée.
 * Appelé par : csv-parser.ts (parseCsv), couvert par test/csv-parser.test.ts.
 * Suppression casserait : la validation de chaque ligne importée (points, année de naissance, place).
 */
import { describeCellProblem, parsePoints, parseWholeNumber } from './csv-cells';
import type { RawSwimmerRow } from './csv-parser';

const PLAUSIBLE_POINTS_MIN = 0;
const PLAUSIBLE_POINTS_MAX = 1500;

/** A line left out for its birth year: who and in which category, so the swimmer can be told apart from one absent from the file. */
export interface ExcludedLine {
  category: string;
  firstname: string;
  lastname: string;
  club: string;
}

/** What became of one line: kept as a row, ignored (no points), or left out (unreadable birth year, swimmer named). */
export type SwimmerRowReading =
  | { kind: 'row'; row: RawSwimmerRow }
  | { kind: 'no-points' }
  | { kind: 'no-birthyear'; line: ExcludedLine };

/**
 * Reads one parsed CSV line, pushing its warnings into `warnings` (shared
 * with the file-level ones so they stay in file order). Throws on a points
 * cell without any digit: see the comment below.
 */
export function readSwimmerRow(
  raw: Record<string, string | undefined>,
  rowNumber: number,
  hasPlaceColumn: boolean,
  warnings: string[]
): SwimmerRowReading {
  // Field values are kept verbatim (no trimming): the source FFN export
  // occasionally has trailing spaces in club names (e.g. "EXOCET MASTER
  // CLUB "), and altering them would break exact matching against
  // downstream references (grouping, exports, reference fixtures).
  const name = raw.name ?? '';
  const club = raw.club ?? '';
  const lastname = raw.lastname ?? '';
  const firstname = raw.firstname ?? '';
  const pointsRaw = raw.points ?? '';

  if (!name.trim()) {
    warnings.push(`Ligne ${rowNumber} : catégorie manquante`);
  }
  if (!club.trim()) {
    warnings.push(`Ligne ${rowNumber} : club manquant`);
  }
  if (!pointsRaw.trim()) {
    warnings.push(`Ligne ${rowNumber} : points manquants (ligne ignorée)`);
    return { kind: 'no-points' };
  }

  const points = parsePoints(pointsRaw);
  // Points are what the ranking is computed from: a non-numeric points cell
  // means the file is not the expected export, so the import stops here.
  if (points === null) {
    throw new Error(`Ligne ${rowNumber} : points illisibles (« ${pointsRaw} »). Est-ce bien un export de cotations extraNat ?`);
  }
  // The birth year is part of the swimmer's identity, the UNIQUE key of
  // swimmer_result: stored as NULL it would escape that key and duplicate the
  // swimmer at every re-import. The line is left out rather than blocking the
  // whole import, and the swimmer is named under « À savoir ».
  const birthyear = parseWholeNumber(raw.birthyear ?? '');
  if (birthyear === null) {
    const swimmer = `${firstname} ${lastname}`;
    warnings.push(`Ligne ${rowNumber} : année de naissance ${describeCellProblem(raw.birthyear)} pour « ${swimmer} » (nageur non importé)`);
    return { kind: 'no-birthyear', line: { category: name, firstname, lastname, club } };
  }
  // The place is displayed information only, outside any key: an unreadable
  // one is stored empty and the swimmer's points still count.
  const place = parseWholeNumber(raw.place ?? '');
  if (place === null && hasPlaceColumn) {
    warnings.push(`Ligne ${rowNumber} : place ${describeCellProblem(raw.place)} pour « ${firstname} ${lastname} » (points comptés quand même)`);
  }
  if (points < PLAUSIBLE_POINTS_MIN || points > PLAUSIBLE_POINTS_MAX) {
    warnings.push(`Ligne ${rowNumber} : nombre de points inhabituel (${points})`);
  }

  return {
    kind: 'row',
    row: { name, place, lastname, firstname, birthyear, nation: raw.nation ?? '', club, points, comment: raw.comment ?? '' },
  };
}
