/**
 * Responsabilité : configuration du dossier et du nombre de sauvegardes automatiques conservées.
 * Appelé par : SettingsPage.tsx.
 * Suppression casserait : la configuration des sauvegardes automatiques (le comportement par défaut resterait actif).
 */
import { useEffect, useState } from 'react';
import { Folder, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
    <div className="space-y-4 rounded-lg bg-surface-raised p-6 shadow-card">
      <h2 className="font-display text-2xl font-bold text-marine">Sauvegardes automatiques</h2>
      <div>
        <span className="block text-sm font-semibold text-ink">Dossier de sauvegarde</span>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="h-11 flex-1 truncate rounded-sm border-[1.5px] border-line-strong px-3.5 text-base leading-[44px] text-ink">
            {backupDir || 'Dossier par défaut'}
          </span>
          <Button type="button" icon={Folder} onClick={handleChooseDir}>
            Choisir
          </Button>
        </div>
      </div>
      <div>
        <label htmlFor="max-backups" className="block text-sm font-semibold text-ink">
          Nombre de sauvegardes automatiques conservées
        </label>
        <input
          id="max-backups"
          type="number"
          min={3}
          value={maxBackups}
          onChange={(event) => {
            // Clamp to an integer of at least 3 (the floor saveBackupConfig enforces) client-side: loadBackupConfig only
            // self-heals non-positive/non-numeric values, not fractional ones,
            // and a fractional value would otherwise flow into rotateBackups.
            // Number('') / Number('-') is NaN, which Math.max(3, NaN) leaves
            // as NaN (not 3) — guard explicitly so a mid-edit empty field
            // can't be saved as NaN (JSON.stringify turns it into `null`).
            const parsed = Math.round(Number(event.target.value));
            setMaxBackups(Number.isFinite(parsed) ? Math.max(3, parsed) : 3);
            setSavedAt(null);
          }}
          className="mt-1.5 h-11 w-32 rounded-sm border-[1.5px] border-line-strong px-3.5 text-base text-ink outline-none focus:border-bassin-strong"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="primary" icon={Save} onClick={handleSave}>
          Enregistrer
        </Button>
        {savedAt && <span className="text-sm text-success">Configuration enregistrée.</span>}
      </div>
      {error && <p className="text-sm text-error">Erreur : {error}</p>}
    </div>
  );
}
