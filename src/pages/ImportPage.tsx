/**
 * Responsabilité : écran d'import CSV (drop, preview, validation, persistance).
 * Appelé par : App.tsx (route "import").
 * Suppression casserait : l'import de nouveaux fichiers CSV.
 */
import { useCallback, useState } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { DropZone } from '@/components/import/DropZone';
import { summarizeSwimmerRows, type SwimmerRowsSummary } from '@/lib/csv-parser';
import { formatPoints } from '@/lib/utils';

interface StatBlockProps {
  swimmerCount: number;
  clubCount: number;
  categoryCount: number;
}

function StatBlock({ swimmerCount, clubCount, categoryCount }: StatBlockProps): JSX.Element {
  return (
    <dl className="grid grid-cols-3 gap-4 text-center">
      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500">Nageurs</dt>
        <dd className="font-mono text-lg font-medium text-neutral-900">{formatPoints(swimmerCount)}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500">Clubs</dt>
        <dd className="font-mono text-lg font-medium text-neutral-900">{formatPoints(clubCount)}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500">Catégories</dt>
        <dd className="font-mono text-lg font-medium text-neutral-900">{formatPoints(categoryCount)}</dd>
      </div>
    </dl>
  );
}

export default function ImportPage(): JSX.Element {
  const { importState, meetingState } = useOutletContext<AppOutletContext>();
  const { result, fileName, error, handleFileAccepted, handleFileRejected } = importState;
  const [persistError, setPersistError] = useState<string | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState<SwimmerRowsSummary | null>(null);
  const navigate = useNavigate();

  const meetingId = meetingState.currentMeeting?.id ?? null;

  const handleAccepted = useCallback(
    async (file: File) => {
      setPersistError(null);
      setMeetingSummary(null);
      const parsed = await handleFileAccepted(file);
      if (parsed && meetingId !== null) {
        setIsPersisting(true);
        try {
          await window.electronAPI.importCsv(meetingId, parsed.rows);
          // Re-read the meeting's full persisted state rather than assuming
          // it now matches this file: a re-import only touches the
          // categories present in the file it's given, so an earlier
          // category not mentioned here can still be part of the meeting.
          const meetingRows = await window.electronAPI.getSwimmerResults(meetingId);
          setMeetingSummary(summarizeSwimmerRows(meetingRows));
        } catch (err) {
          setPersistError(err instanceof Error ? err.message : String(err));
        } finally {
          setIsPersisting(false);
        }
      }
    },
    [handleFileAccepted, meetingId]
  );

  if (!meetingState.currentMeeting) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Import du fichier de cotations</h1>
        <p className="text-neutral-600">{meetingState.currentMeeting.name}, CSV extraNat (FFN)</p>
      </header>

      <DropZone onFileAccepted={handleAccepted} onFileRejected={handleFileRejected} />

      {error && <p className="text-sm text-error">{error}</p>}
      {persistError && <p className="text-sm text-error">Échec de l'enregistrement : {persistError}</p>}

      {result && (
        <div className="rounded-lg bg-neutral-0 p-6 shadow-card">
          <p className="mb-3 text-sm text-neutral-600">
            {fileName}, encodage <span className="font-mono">{result.encoding}</span>, délimiteur{' '}
            <span className="font-mono">&quot;{result.delimiter}&quot;</span>
          </p>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Ce fichier
          </p>
          <StatBlock
            swimmerCount={result.swimmerCount}
            clubCount={result.clubCount}
            categoryCount={result.categories.length}
          />
          {result.warnings.length > 0 && (
            <details className="mt-3 text-sm text-warning">
              <summary className="cursor-pointer font-medium">
                {result.warnings.length} avertissement{result.warnings.length > 1 ? 's' : ''}
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                {result.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </details>
          )}

          {meetingSummary && (
            <div className="mt-6 border-t border-neutral-100 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Ce meeting, après cet import
              </p>
              <StatBlock
                swimmerCount={meetingSummary.swimmerCount}
                clubCount={meetingSummary.clubCount}
                categoryCount={meetingSummary.categories.length}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/classement')}
            disabled={isPersisting}
            className="mt-4 w-full rounded-md bg-secondary-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-secondary-700 disabled:opacity-60"
          >
            {isPersisting ? 'Enregistrement…' : 'Voir le classement'}
          </button>
        </div>
      )}
    </div>
  );
}
