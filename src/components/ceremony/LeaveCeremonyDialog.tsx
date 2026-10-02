/**
 * Responsabilité : confirmation avant d'abandonner le déroulé en cours (la progression serait perdue).
 * Appelé par : CeremonyPage.tsx.
 * Suppression casserait : le garde-fou contre un retour à la préparation par erreur pendant la cérémonie.
 */
import { useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useModalKeyboard } from '@/hooks/use-modal-keyboard';
import { Button } from '@/components/ui/Button';

export interface LeaveCeremonyDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function LeaveCeremonyDialog({ onConfirm, onCancel }: LeaveCeremonyDialogProps): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(dialogRef, onCancel, true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-6">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-ceremony-title"
        aria-describedby="leave-ceremony-text"
        className="flex w-full max-w-md flex-col gap-5 rounded-xl bg-surface-raised p-6 shadow-raised"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-corail-strong" aria-hidden />
          <div className="flex flex-col gap-1.5">
            <h2 id="leave-ceremony-title" className="font-display text-2xl font-bold text-ink">
              Abandonner le déroulé en cours&nbsp;?
            </h2>
            <p id="leave-ceremony-text" className="text-[15px] text-ink-soft">
              La progression sera perdue&nbsp;: il faudra relancer le déroulé depuis la première annonce.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button onClick={onConfirm}>Abandonner le déroulé</Button>
          {/* Safe default: Enter or Space on the focused button keeps the ceremony going. */}
          <Button variant="primary" autoFocus onClick={onCancel}>
            Continuer le déroulé
          </Button>
        </div>
      </div>
    </div>
  );
}
