/**
 * Responsabilité : messages d'erreur de la section « Sauvegardes automatiques » des Paramètres.
 * Appelé par : BackupConfigSection.tsx.
 * Suppression casserait : les erreurs de lecture, de choix du dossier et d'enregistrement de la configuration.
 */

export type BackupConfigAction = 'load' | 'chooseDir' | 'save';

const ACTION_MESSAGES: Record<BackupConfigAction, string> = {
  load: 'Impossible de lire la configuration des sauvegardes. Les valeurs par défaut sont affichées.',
  chooseDir: "Impossible d'ouvrir le choix du dossier. Vous pouvez réessayer.",
  save: "La configuration n'a pas été enregistrée. Vous pouvez réessayer.",
};

/**
 * What failed, in plain words, then the technical cause on a separate
 * "Détail" so the volunteer reads the useful part first. `cause` is either a
 * rejected IPC call (Error) or the `error` string of a `{ success: false }`
 * result; a missing cause leaves just the sentence.
 */
export function backupConfigErrorMessage(action: BackupConfigAction, cause: unknown): string {
  const detail = (cause instanceof Error ? cause.message : String(cause ?? '')).trim();
  return detail ? `${ACTION_MESSAGES[action]} Détail : ${detail}` : ACTION_MESSAGES[action];
}
