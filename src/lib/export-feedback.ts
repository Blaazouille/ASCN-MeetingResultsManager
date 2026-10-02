/**
 * Responsabilité : messages affichés après un export PDF/Excel ou le pack « Tout exporter » (succès, échec avec sa cause).
 * Appelé par : use-export-status.ts, use-export-pack.ts.
 * Suppression casserait : le retour visible des exports sur les écrans Classement et Individuels.
 */

export type ExportFormat = 'pdf' | 'excel';

const FORMAT_LABELS: Record<ExportFormat, string> = { pdf: 'PDF', excel: 'Excel' };

/**
 * "Fichier PDF créé." — the file is handed to Electron's save dialog, which the
 * renderer cannot observe: saying "créé" rather than "enregistré" stays true
 * even if the volunteer cancels that dialog.
 */
export function exportSuccessMessage(format: ExportFormat): string {
  return `Fichier ${FORMAT_LABELS[format]} créé.`;
}

/**
 * "Échec de l'export PDF. Vous pouvez réessayer. Détail : cause" — the plain
 * sentence first for the volunteer, then the cause so that whoever helps
 * them knows what went wrong; a missing cause leaves just the sentence.
 */
export function exportErrorMessage(format: ExportFormat, error: unknown): string {
  return withCause(`Échec de l'export ${FORMAT_LABELS[format]}. Vous pouvez réessayer.`, error);
}

/** Same shape when « Tout exporter » cannot start (dialog failed, folder not created). */
export function exportPackErrorMessage(error: unknown): string {
  return withCause("Échec de l'export du meeting. Vous pouvez réessayer.", error);
}

/** Readable cause of an error (message of an Error, else its text); empty when there is none. */
export function errorCause(error: unknown): string {
  return (error instanceof Error ? error.message : String(error ?? '')).trim();
}

function withCause(sentence: string, error: unknown): string {
  const cause = errorCause(error);
  return cause ? `${sentence} Détail : ${cause}` : sentence;
}

/**
 * Headline after « Tout exporter »: every file, only some (the failed ones are
 * listed under it), or none. The volunteer must see at a glance whether the
 * pack is complete before sending it to the clubs.
 */
export function exportPackSummary(writtenCount: number, totalCount: number): string {
  if (writtenCount === 0) {
    return "Aucun fichier n'a pu être créé. Vous pouvez réessayer.";
  }
  if (writtenCount === totalCount) {
    return totalCount === 1 ? 'Le fichier du meeting est enregistré.' : `Les ${totalCount} fichiers du meeting sont enregistrés.`;
  }
  const written = writtenCount >= 2 ? `${writtenCount} fichiers sur ${totalCount} enregistrés.` : `1 fichier sur ${totalCount} enregistré.`;
  const missing = totalCount - writtenCount;
  const notCreated = missing >= 2 ? `${missing} fichiers n'ont pas pu être créés` : "1 fichier n'a pas pu être créé";
  return `${written} ${notCreated} :`;
}
