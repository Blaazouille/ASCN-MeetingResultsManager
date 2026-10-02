/**
 * Responsabilité : messages affichés après un export PDF/Excel (succès discret, échec avec sa cause).
 * Appelé par : use-export-status.ts.
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
  const sentence = `Échec de l'export ${FORMAT_LABELS[format]}. Vous pouvez réessayer.`;
  const cause = (error instanceof Error ? error.message : String(error ?? '')).trim();
  return cause ? `${sentence} Détail : ${cause}` : sentence;
}
