/**
 * Responsabilité : compare un fichier CSV à analyser avec les résultats déjà en base, avant toute écriture, pour repérer un mauvais fichier.
 * Appelé par : ImportPage.tsx.
 * Suppression casserait : les alertes avant import (mauvais fichier, export partiel, fichier identique, nageurs retirés) — un import écraserait les résultats sans prévenir.
 */
import type { RawSwimmerRow } from './csv-parser';
import { formatImportTimestamp } from './export-data';
import { categoryShortLabel, swimmerCountLabel } from './ui-labels';

export interface ImportWarning {
  kind: 'identical' | 'shrunk' | 'different' | 'missing-category' | 'removed';
  /** Info-only warnings (a missing category is kept as is) never trigger the confirmation screen on their own. */
  blocking: boolean;
  message: string;
}

// A category losing a fifth of its swimmers is more than FFN corrections
// (a few withdrawals) but typical of an export taken mid-competition.
const SHRINK_THRESHOLD = 0.2;
// Below half in common, the file is more likely another meeting or edition
// than a corrected version of this one.
const MIN_COMMON_RATIO = 0.5;

// Same identity as the UNIQUE constraint of swimmer_result.
const rowKey = (row: RawSwimmerRow): string =>
  `${row.name}|${row.lastname}|${row.firstname}|${row.birthyear}|${row.club}`;
// Includes rank and points: a corrected file is not "identical", only a re-drop of the same one is.
const fullKey = (row: RawSwimmerRow): string => `${rowKey(row)}|${row.place}|${row.points}`;

function countByCategory(rows: RawSwimmerRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
  return counts;
}

/**
 * Warnings to show before an import replaces `existing` with `incoming`.
 * No existing results = first import: nothing to compare, no warning.
 * `lastImportedAt` (SQLite timestamp) only feeds the "identical" message.
 */
export function checkImportAgainstExisting(
  existing: RawSwimmerRow[],
  incoming: RawSwimmerRow[],
  lastImportedAt: string | null = null
): ImportWarning[] {
  if (existing.length === 0 || incoming.length === 0) return [];

  // Compared as sets: the database keeps one row per swimmer and category, so duplicate lines in a file must not count.
  const existingFull = new Set(existing.map(fullKey));
  const incomingFull = new Set(incoming.map(fullKey));
  if (existingFull.size === incomingFull.size && [...incomingFull].every((key) => existingFull.has(key))) {
    const when = lastImportedAt === null ? '' : ` (${formatImportTimestamp(lastImportedAt)})`;
    return [{ kind: 'identical', blocking: true, message: `Ce fichier est identique au dernier import${when}. Rien ne changera.` }];
  }

  const warnings: ImportWarning[] = [];
  const before = countByCategory(existing);
  const after = countByCategory(incoming);

  for (const [category, count] of before) {
    const label = categoryShortLabel(category);
    const now = after.get(category);
    if (now === undefined) {
      warnings.push({
        kind: 'missing-category',
        blocking: false,
        message: `Le classement ${label} n'est plus dans ce fichier : il est conservé tel quel.`,
      });
    } else if (now < count * (1 - SHRINK_THRESHOLD)) {
      warnings.push({
        kind: 'shrunk',
        blocking: true,
        message: `Ce fichier contient ${now} nageurs en ${label}, contre ${count} actuellement. Il pourrait s'agir d'un export incomplet.`,
      });
    }
  }

  // Announced before the write: insertSwimmerResults deletes these rows, and a drop under
  // SHRINK_THRESHOLD (a few withdrawals) would otherwise only show up in the summary, after the fact.
  // Not blocking: a corrected FFN export routinely drops a withdrawn swimmer.
  const incomingKeys = new Set(incoming.map(rowKey));
  const removed = countByCategory(existing.filter((row) => after.has(row.name) && !incomingKeys.has(rowKey(row))));
  for (const [category, count] of removed) {
    const verb = count < 2 ? 'absent du nouveau fichier sera retiré' : 'absents du nouveau fichier seront retirés';
    warnings.push({
      kind: 'removed',
      blocking: false,
      message: `${swimmerCountLabel(count)} ${verb} du classement ${categoryShortLabel(category)}.`,
    });
  }

  // Only categories present on both sides: a file bringing a new category says nothing about the others.
  const existingKeys = new Set(existing.map(rowKey));
  const shared = incoming.filter((row) => before.has(row.name));
  const common = shared.filter((row) => existingKeys.has(rowKey(row))).length;
  if (shared.length > 0 && common < shared.length * MIN_COMMON_RATIO) {
    warnings.push({
      kind: 'different',
      blocking: true,
      message: 'La plupart des nageurs de ce fichier sont différents de ceux déjà importés. S\'agit-il bien du même meeting ?',
    });
  }

  return warnings;
}
