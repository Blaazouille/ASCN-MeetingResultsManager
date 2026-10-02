/**
 * Responsabilité : résumé de ce qu'un réimport a changé (nageurs, résultats, clubs) dans la carte de succès.
 * Appelé par : ImportPage.tsx.
 * Suppression casserait : le résumé « Depuis l'import du… » après un réimport.
 */
import { Link } from 'react-router-dom';
import { formatImportTimestamp } from '@/lib/export-data';
import { hasChanges, type ImportChanges as ImportChangesData } from '@/lib/import-diff';
import { importChangeParts, sinceImportLabel } from '@/lib/ui-labels';

export interface ImportChangesProps {
  changes: ImportChangesData;
  /** SQLite timestamp of the previous import, null when unknown. */
  since: string | null;
}

export function ImportChanges({ changes, since }: ImportChangesProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-bassin-soft px-5 py-4">
      <p className="text-sm font-bold uppercase tracking-[0.06em] text-ink-muted">
        {sinceImportLabel(since === null ? null : formatImportTimestamp(since))}
      </p>
      {hasChanges(changes) ? (
        <p className="text-base text-ink">
          {importChangeParts(changes).join(' · ')}
          {changes.clubsMoved > 0 && (
            <>
              {' · '}
              <Link to="/classement" className="font-semibold text-bassin-strong underline">
                Voir le classement
              </Link>
            </>
          )}
        </p>
      ) : (
        <p className="text-base text-ink">Aucun changement par rapport à l'import précédent.</p>
      )}
    </div>
  );
}
