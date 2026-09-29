/**
 * Responsabilité : modale de suppression d'un meeting en deux étapes (avertissement, puis saisie du nom).
 * Appelé par : HomePage.tsx.
 * Suppression casserait : la suppression de meeting depuis l'Accueil (le bouton corbeille n'ouvrirait plus rien).
 */
import { useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Meeting } from '@/lib/db';
import { isDeleteConfirmed, resultCountLabel } from '@/lib/ui-labels';
import { useModalKeyboard } from '@/hooks/use-modal-keyboard';
import { Button } from '@/components/ui/Button';

export interface DeleteMeetingDialogProps {
  meeting: Meeting;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

type Step = 'warning' | 'typeName';

export function DeleteMeetingDialog({ meeting, onConfirm, onCancel }: DeleteMeetingDialogProps): JSX.Element {
  const [step, setStep] = useState<Step>('warning');
  const [typed, setTyped] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape is disabled while deleting so the request is never orphaned mid-flight.
  useModalKeyboard(dialogRef, onCancel, !isDeleting);

  const confirmDelete = async (): Promise<void> => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirm();
    } catch (err) {
      // Shown here because the page-level error sits behind the backdrop; re-enable so the user can retry or cancel.
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-6">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-meeting-title"
        className="flex w-full max-w-md flex-col gap-5 rounded-xl bg-surface-raised p-6 shadow-raised"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-error" aria-hidden />
          <div className="flex flex-col gap-1.5">
            <h2 id="delete-meeting-title" className="font-display text-2xl font-bold text-ink">
              Supprimer «&nbsp;{meeting.name}&nbsp;»&nbsp;?
            </h2>
            <p className="text-[15px] text-ink-soft">
              {resultCountLabel(meeting.resultCount)}. Le meeting et tous ses résultats seront effacés.{' '}
              <strong>Cette action est irréversible.</strong>
            </p>
          </div>
        </div>

        {step === 'typeName' && (
          <label className="flex flex-col gap-1.5 text-[15px] font-semibold text-ink">
            Pour confirmer, saisissez le nom du meeting
            <input
              autoFocus
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={meeting.name}
              disabled={isDeleting}
              className="h-11 rounded-sm border-[1.5px] border-line-strong bg-surface-raised px-3 font-normal text-ink focus:border-bassin-strong focus:outline-none"
            />
          </label>
        )}

        {errorMessage && (
          <p role="alert" className="text-sm font-semibold text-error">
            La suppression a échoué&nbsp;: {errorMessage}
          </p>
        )}

        <div className="flex justify-end gap-3">
          {/* Safe default: Enter/Space on step 1 cancels rather than advances. */}
          <Button autoFocus={step === 'warning'} onClick={onCancel} disabled={isDeleting}>
            Annuler
          </Button>
          {step === 'warning' ? (
            <Button variant="primary" onClick={() => setStep('typeName')}>
              Continuer
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={isDeleting || !isDeleteConfirmed(typed, meeting.name)}
              className="inline-flex h-11 items-center justify-center rounded-sm bg-error px-5 text-[15px] font-semibold text-on-marine transition-colors hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Supprimer définitivement
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
