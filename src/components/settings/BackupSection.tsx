/**
 * Responsabilité : section de sauvegarde/restauration (export/import JSON) dans les paramètres.
 * Appelé par : SettingsPage.tsx.
 * Suppression casserait : l'interface de sauvegarde et restauration manuelle.
 */
import { useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type BackupState =
  | { step: 'idle' }
  | { step: 'busy' }
  | { step: 'export-success'; path: string }
  | { step: 'preview'; meetingCount: number; swimmerCount: number; currentMeetingCount: number }
  | { step: 'import-success'; meetingsRemoved: number; meetingsImported: number; swimmersImported: number; safetyCopyPath: string | null }
  | { step: 'error'; error: string };

export interface BackupSectionProps {
  /** Called after a successful restore so the caller can refresh any renderer state (e.g. the meeting list) derived from the DB. */
  onRestored?: () => void | Promise<void>;
}

/** Maps a {success, error?} IPC result to the next state: `onSuccess` returning null falls through to 'idle' (a plain cancel, e.g. the user closed the file dialog). */
function resolveBackupState<T extends { success: boolean; error?: string }>(
  result: T,
  onSuccess: (result: T) => BackupState | null
): BackupState {
  if (result.success) {
    return onSuccess(result) ?? { step: 'idle' };
  }
  return result.error ? { step: 'error', error: result.error } : { step: 'idle' };
}

export function BackupSection({ onRestored }: BackupSectionProps): JSX.Element {
  const [state, setState] = useState<BackupState>({ step: 'idle' });

  async function handleExport(): Promise<void> {
    setState({ step: 'busy' });
    const result = await window.electronAPI.exportBackup();
    setState(resolveBackupState(result, (r) => (r.path ? { step: 'export-success', path: r.path } : null)));
  }

  async function handleImport(): Promise<void> {
    setState({ step: 'busy' });
    const result = await window.electronAPI.importBackup();
    setState(resolveBackupState(result, (r) => (r.preview ? { step: 'preview', ...r.preview } : null)));
  }

  async function handleConfirm(): Promise<void> {
    setState({ step: 'busy' });
    const result = await window.electronAPI.confirmImport();
    if (result.success && result.result) {
      setState({ step: 'import-success', ...result.result, safetyCopyPath: result.safetyCopyPath ?? null });
      // Refresh the renderer's meeting list after the restore actually wrote
      // to the DB, so restored meetings show up without an app restart.
      await onRestored?.();
    } else {
      setState(resolveBackupState(result, () => null));
    }
  }

  const isBusy = state.step === 'busy';

  return (
    <div className="space-y-4 rounded-lg bg-surface-raised p-6 shadow-card">
      <h2 className="font-display text-2xl font-bold text-marine">Sauvegarde et restauration</h2>
      <p className="text-sm text-ink-muted">
        Exportez l'ensemble des meetings dans un fichier JSON, ou restaurez la base exactement telle qu'elle
        était au moment d'une sauvegarde.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="primary" icon={Download} onClick={handleExport} disabled={isBusy}>
          Exporter la sauvegarde
        </Button>
        <Button type="button" icon={Upload} onClick={handleImport} disabled={isBusy}>
          Importer une sauvegarde
        </Button>
      </div>

      {state.step === 'export-success' && (
        <p className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Sauvegarde enregistrée{' '}: {state.path}
        </p>
      )}

      {state.step === 'preview' && (
        <div className="space-y-3 rounded-md bg-error-light p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <AlertTriangle className="h-4 w-4 text-error" aria-hidden="true" />
            Ce fichier contient {state.meetingCount} meeting(s) et {state.swimmerCount} ligne(s) de résultats
            {/* Un nageur compte une fois par catégorie (Dames/Messieurs + Mixte),
                donc ce nombre est plus élevé que le nombre réel de nageurs. */}
            {' '}
            (comptées par catégorie).
          </p>
          <p className="text-sm font-medium text-error">
            La restauration remplace toute la base actuelle par le contenu de ce fichier
            {state.currentMeetingCount > 0 &&
              ` — les ${state.currentMeetingCount} meeting(s) actuellement présents seront supprimés`}
            .
          </p>
          {state.currentMeetingCount > 0 && (
            <p className="text-sm text-ink">
              Une copie de la base actuelle sera d'abord enregistrée dans le dossier de sauvegarde.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isBusy}
              className="h-11 rounded-sm bg-error px-5 font-semibold text-on-marine hover:opacity-90 disabled:opacity-60"
            >
              Confirmer la restauration
            </button>
            <Button type="button" onClick={() => {
              // Fire-and-forget: releases the pending import held in the
              // main process; the renderer resets to idle immediately.
              void window.electronAPI.cancelImport();
              setState({ step: 'idle' });
            }} disabled={isBusy}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {state.step === 'import-success' && (
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Base restaurée{' '}: {state.meetingsImported} meeting(s), {state.swimmersImported} nageur(s)
            {state.meetingsRemoved > 0 && ` (${state.meetingsRemoved} ancien(s) meeting(s) remplacé(s))`}.
          </p>
          {/* Tells the volunteer where the way back is, in case the wrong file was
              restored. No path when the database was empty: nothing was copied. */}
          {state.safetyCopyPath && (
            <p className="text-sm text-ink-muted">
              Copie de la base d'avant la restauration{' '}: {state.safetyCopyPath}. Pour revenir en arrière,
              importez ce fichier.
            </p>
          )}
        </div>
      )}

      {state.step === 'error' && <p className="text-sm text-error">Erreur{' '}: {state.error}</p>}
    </div>
  );
}
