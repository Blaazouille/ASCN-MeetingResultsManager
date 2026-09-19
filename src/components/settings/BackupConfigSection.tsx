/**
 * Responsabilité : configuration du dossier et du nombre de sauvegardes automatiques conservées.
 * Appelé par : SettingsPage.tsx.
 * Suppression casserait : la configuration des sauvegardes automatiques (le comportement par défaut resterait actif).
 */
import { useEffect, useState } from 'react';
import { Folder, Save } from 'lucide-react';

export function BackupConfigSection(): JSX.Element {
  const [backupDir, setBackupDir] = useState('');
  const [maxBackups, setMaxBackups] = useState(5);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.electronAPI.getBackupConfig().then((result) => {
      if (result.success && result.config) {
        setBackupDir(result.config.backupDir);
        setMaxBackups(result.config.maxBackups);
      } else if (!result.success) {
        // loadBackupConfig can throw on a corrupted backup-config.json; fall
        // back to the empty/default form state and surface the error rather
        // than leaving an unhandled rejection.
        setError(result.error ?? 'Erreur inconnue');
      }
    });
  }, []);

  async function handleChooseDir(): Promise<void> {
    const chosen = await window.electronAPI.chooseBackupDir();
    if (chosen) {
      setBackupDir(chosen);
      setSavedAt(null);
    }
  }

  async function handleSave(): Promise<void> {
    setError(null);
    const result = await window.electronAPI.setBackupConfig({ backupDir, maxBackups });
    if (result.success) {
      setSavedAt(Date.now());
    } else {
      setError(result.error ?? 'Erreur inconnue');
    }
  }

  return (
    <div className="space-y-4 rounded-lg bg-neutral-0 p-6 shadow-card">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary-800">
        Sauvegardes automatiques
      </h2>
      <div>
        <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500">Dossier de sauvegarde</span>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex-1 truncate rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
            {backupDir || 'Dossier par défaut'}
          </span>
          <button
            type="button"
            onClick={handleChooseDir}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
          >
            <Folder className="h-4 w-4" aria-hidden="true" />
            Choisir
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="max-backups" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
          Nombre de sauvegardes automatiques conservées
        </label>
        <input
          id="max-backups"
          type="number"
          min={1}
          value={maxBackups}
          onChange={(event) => {
            // Clamp to a positive integer client-side: loadBackupConfig only
            // self-heals non-positive/non-numeric values, not fractional ones,
            // and a fractional value would otherwise flow into rotateBackups.
            // Number('') / Number('-') is NaN, which Math.max(1, NaN) leaves
            // as NaN (not 1) — guard explicitly so a mid-edit empty field
            // can't be saved as NaN (JSON.stringify turns it into `null`).
            const parsed = Math.round(Number(event.target.value));
            setMaxBackups(Number.isFinite(parsed) ? Math.max(1, parsed) : 1);
            setSavedAt(null);
          }}
          className="mt-1 w-32 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-md bg-secondary-600 px-4 py-2 text-sm font-medium text-neutral-0 hover:bg-secondary-700"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Enregistrer
        </button>
        {savedAt && <span className="text-sm text-success">Configuration enregistrée.</span>}
      </div>
      {error && <p className="text-sm text-error">Erreur : {error}</p>}
    </div>
  );
}
