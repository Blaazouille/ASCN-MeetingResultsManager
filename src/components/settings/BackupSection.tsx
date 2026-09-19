/**
 * Responsabilité : section de sauvegarde/restauration (export/import JSON) dans les paramètres.
 * Appelé par : SettingsPage.tsx.
 * Suppression casserait : l'interface de sauvegarde et restauration manuelle.
 */
import { useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';

type BackupState =
  | { step: 'idle' }
  | { step: 'busy' }
  | { step: 'export-success'; path: string }
  | { step: 'preview'; meetingCount: number; swimmerCount: number; existingCount: number }
  | { step: 'import-success'; meetingsImported: number; swimmersImported: number; meetingsSkipped: number }
  | { step: 'error'; error: string };

export interface BackupSectionProps {
  /** Called after a successful restore so the caller can refresh any renderer state (e.g. the meeting list) derived from the DB. */
  onRestored?: () => void | Promise<void>;
}

export function BackupSection({ onRestored }: BackupSectionProps): JSX.Element {
  const [state, setState] = useState<BackupState>({ step: 'idle' });

  async function handleExport(): Promise<void> {
    setState({ step: 'busy' });
    const result = await window.electronAPI.exportBackup();
    if (result.success && result.path) {
      setState({ step: 'export-success', path: result.path });
    } else if (result.error) {
      setState({ step: 'error', error: result.error });
    } else {
      setState({ step: 'idle' });
    }
  }

  async function handleImport(): Promise<void> {
    setState({ step: 'busy' });
    const result = await window.electronAPI.importBackup();
    if (result.success && result.preview) {
      setState({ step: 'preview', ...result.preview });
    } else if (result.error) {
      setState({ step: 'error', error: result.error });
    } else {
      setState({ step: 'idle' });
    }
  }

  async function handleConfirm(): Promise<void> {
    setState({ step: 'busy' });
    const result = await window.electronAPI.confirmImport();
    if (result.success && result.result) {
      setState({ step: 'import-success', ...result.result });
      // Refresh the renderer's meeting list after the restore actually wrote
      // to the DB, so restored meetings show up without an app restart.
      await onRestored?.();
    } else if (result.error) {
      setState({ step: 'error', error: result.error });
    } else {
      setState({ step: 'idle' });
    }
  }

  const isBusy = state.step === 'busy';

  return (
    <div className="space-y-4 rounded-lg bg-neutral-0 p-6 shadow-card">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary-800">
        Sauvegarde et restauration
      </h2>
      <p className="text-sm text-neutral-600">
        Exportez l'ensemble des meetings dans un fichier JSON, ou restaurez-les depuis une sauvegarde.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-md bg-secondary-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-secondary-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Exporter la sauvegarde
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-200 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Importer une sauvegarde
        </button>
      </div>

      {state.step === 'export-success' && (
        <p className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Sauvegarde enregistrée : {state.path}
        </p>
      )}

      {state.step === 'preview' && (
        <div className="space-y-3 rounded-md bg-warning-light p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
            {state.meetingCount} meeting(s), {state.swimmerCount} nageur(s) dans ce fichier.
            {state.existingCount > 0 && ` ${state.existingCount} meeting(s) déjà présent(s) seront ignorés.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isBusy}
              className="rounded-md bg-secondary-600 px-3 py-1.5 text-sm font-medium text-neutral-0 hover:bg-secondary-700 disabled:opacity-60"
            >
              Confirmer l'import
            </button>
            <button
              type="button"
              onClick={() => {
                // Fire-and-forget: releases the pending import held in the
                // main process; the renderer resets to idle immediately.
                void window.electronAPI.cancelImport();
                setState({ step: 'idle' });
              }}
              disabled={isBusy}
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-60"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {state.step === 'import-success' && (
        <p className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {state.meetingsImported} meeting(s) importé(s), {state.swimmersImported} nageur(s), {state.meetingsSkipped} déjà présent(s) ignoré(s).
        </p>
      )}

      {state.step === 'error' && <p className="text-sm text-error">Erreur : {state.error}</p>}
    </div>
  );
}
