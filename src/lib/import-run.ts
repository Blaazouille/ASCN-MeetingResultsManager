/**
 * Responsabilité : dit si une lecture, une vérification ou un enregistrement d'import lancé plus tôt concerne encore l'écran Import affiché.
 * Appelé par : use-import.ts (beginRun), utilisé par ImportPage.tsx après chaque attente.
 * Suppression casserait : la protection contre le résumé d'un import affiché sur un autre meeting après un changement de meeting.
 */

/**
 * useImport counts its resets (one per meeting change): an import step started under one count and
 * finishing under another belongs to a meeting that is no longer on screen, so its result must be dropped.
 * A counter rather than the meeting id: going from meeting A to B and back to A also resets the screen,
 * and the old step would otherwise land on a screen that no longer expects it.
 */
export function isCurrentImportRun(startedAtGeneration: number, currentGeneration: number): boolean {
  return startedAtGeneration === currentGeneration;
}
