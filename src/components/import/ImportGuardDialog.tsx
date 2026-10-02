/**
 * Responsabilité : modale de confirmation affichée avant qu'un import ne remplace des résultats existants, quand le fichier paraît suspect.
 * Appelé par : ImportPage.tsx.
 * Suppression casserait : le garde-fou avant import — un mauvais fichier écraserait les résultats sans avertissement.
 */
import { useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ImportWarning } from '@/lib/import-check';
import { useModalKeyboard } from '@/hooks/use-modal-keyboard';
import { Button } from '@/components/ui/Button';

export interface ImportGuardDialogProps {
  warnings: ImportWarning[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportGuardDialog({ warnings, onConfirm, onCancel }: ImportGuardDialogProps): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(dialogRef, onCancel, true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-6">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="import-guard-title"
        aria-describedby="import-guard-details"
        className="flex w-full max-w-lg flex-col gap-5 rounded-xl bg-surface-raised p-6 shadow-raised"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-corail-strong" aria-hidden />
          <div className="flex flex-col gap-2">
            <h2 id="import-guard-title" className="font-display text-2xl font-bold text-ink">
              Ce fichier est-il le bon&nbsp;?
            </h2>
            <ul id="import-guard-details" className="flex flex-col gap-1.5 text-[15px] text-ink-soft">
              {warnings.map((warning) => (
                <li key={warning.message}>{warning.message}</li>
              ))}
            </ul>
            <p className="text-[15px] text-ink-soft">Si la dernière sauvegarde automatique a réussi, elle contient les résultats actuels.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          {/* Safe default: Enter/Space cancels rather than overwrites. */}
          <Button autoFocus variant="primary" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={onConfirm}>Importer quand même</Button>
        </div>
      </div>
    </div>
  );
}
