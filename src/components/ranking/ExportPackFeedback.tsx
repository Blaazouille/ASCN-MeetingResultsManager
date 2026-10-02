/**
 * Responsabilité : compte rendu de « Tout exporter » (fichiers enregistrés, fichiers en échec, bouton « Ouvrir le dossier »).
 * Appelé par : RankingPage.tsx.
 * Suppression casserait : le bénévole ne saurait ni où est le pack, ni quels fichiers manquent.
 */
import { FolderOpen } from 'lucide-react';
import type { ExportPackOutcome } from '@/hooks/use-export-pack';
import { exportPackSummary } from '@/lib/export-feedback';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface ExportPackFeedbackProps {
  outcome: ExportPackOutcome | null;
  error: string | null;
  onOpenFolder: () => void;
}

export function ExportPackFeedback({ outcome, error, onOpenFolder }: ExportPackFeedbackProps): JSX.Element | null {
  if (!outcome && !error) return null;
  const complete = outcome !== null && outcome.failed.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {outcome && (
        // role="status" announces the result without stealing focus, like ExportFeedback.
        <section
          role="status"
          className={cn(
            'flex flex-wrap items-center justify-between gap-4 rounded-xl px-6 py-4 text-[15px] text-ink',
            complete ? 'bg-success-light' : 'bg-warning-light'
          )}
        >
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{exportPackSummary(outcome.writtenCount, outcome.totalCount)}</p>
            {outcome.failed.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {outcome.failed.map((file) => (
                  <li key={file.fileName}>
                    {file.fileName}
                    {file.error && <span className="text-ink-muted"> — {file.error}</span>}
                  </li>
                ))}
              </ul>
            )}
            {outcome.folderPath && <p className="break-all text-sm text-ink-muted">{outcome.folderPath}</p>}
          </div>
          {outcome.folderPath && (
            <Button icon={FolderOpen} onClick={onOpenFolder}>
              Ouvrir le dossier
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
