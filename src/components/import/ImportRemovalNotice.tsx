/**
 * Responsabilité : encart affiché sur l'écran Import, avant toute écriture, quand le fichier va retirer des nageurs sans autre alerte.
 * Appelé par : ImportPage.tsx.
 * Suppression casserait : l'annonce des nageurs retirés — un réimport les supprimerait sans prévenir.
 */
import { UserMinus } from 'lucide-react';
import type { ImportWarning } from '@/lib/import-check';
import { Button } from '@/components/ui/Button';

export interface ImportRemovalNoticeProps {
  warnings: ImportWarning[];
  onConfirm: () => void;
  onCancel: () => void;
}

// Inline rather than ImportGuardDialog: dropping a withdrawn swimmer is a normal FFN correction,
// not a suspicious file. The volunteer reads the count and goes on, without an alarm-style modal.
export function ImportRemovalNotice({ warnings, onConfirm, onCancel }: ImportRemovalNoticeProps): JSX.Element {
  return (
    <section
      aria-labelledby="import-removal-title"
      className="flex flex-col gap-4 rounded-xl bg-corail-soft px-6 py-5 text-[15px] text-ink"
    >
      <div className="flex items-start gap-3">
        <UserMinus className="mt-0.5 h-6 w-6 shrink-0 text-corail-strong" aria-hidden />
        <div className="flex flex-col gap-1">
          <h2 id="import-removal-title" className="font-semibold">
            Avant d'importer
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            {warnings.map((warning) => (
              <li key={warning.message}>{warning.message}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button onClick={onCancel}>Annuler</Button>
        {/* The volunteer dropped this file to import it: confirming is the expected next step. */}
        <Button autoFocus variant="primary" onClick={onConfirm}>
          Importer
        </Button>
      </div>
    </section>
  );
}
