/**
 * Responsabilité : points à vérifier avant la cérémonie (ex æquo annoncés, import ancien, catégorie sans annonce).
 * Appelé par : use-ceremony.ts et les tests.
 * Suppression casserait : l'encart « À vérifier avant de commencer » de l'écran Cérémonie.
 */
import type { RawSwimmerRow } from './csv-parser';
import type { Meeting } from './db';
import { ceremonyCategories, type CeremonyMeeting, type CeremonyStep } from './ceremony-script';
import { parseSqliteTimestamp } from './export-data';

export type CeremonyWarning =
  | { kind: 'tie'; step: CeremonyStep }
  | { kind: 'stale-import'; minutes: number }
  | { kind: 'empty-category'; category: string };

/**
 * Past this age the last import may miss results published since. A starting
 * value, not a measured one: long enough not to nag right after an import.
 */
export const STALE_IMPORT_MINUTES = 30;

/**
 * Everything the manager should settle before starting. Categories are
 * checked against the meeting settings, not just the data, so a category
 * ticked in Paramètres but missing from the file is flagged too.
 */
export function ceremonyWarnings(
  meeting: CeremonyMeeting & Pick<Meeting, 'lastImportedAt'>,
  rows: RawSwimmerRow[],
  steps: CeremonyStep[],
  now: Date
): CeremonyWarning[] {
  const warnings: CeremonyWarning[] = steps
    .filter((step) => step.rank !== null && step.winners.length > 1)
    .map((step) => ({ kind: 'tie', step }));

  if (meeting.lastImportedAt !== null) {
    const minutes = Math.floor((now.getTime() - parseSqliteTimestamp(meeting.lastImportedAt).getTime()) / 60_000);
    if (minutes > STALE_IMPORT_MINUTES) warnings.push({ kind: 'stale-import', minutes });
  }

  const present = new Set(rows.map((row) => row.name));
  const missing = (meeting.activeCategories ?? []).filter((category) => !present.has(category));
  // Only meaningful once a block is ticked: with nothing to announce, every category would be flagged.
  const silent = steps.length === 0 ? [] : ceremonyCategories(meeting, rows).filter((category) => !steps.some((step) => step.category === category));
  for (const category of [...missing, ...silent]) {
    warnings.push({ kind: 'empty-category', category });
  }
  return warnings;
}
