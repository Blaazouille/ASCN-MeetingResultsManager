import { useCallback, useState } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { DropZone } from '@/components/import/DropZone';
import { formatPoints } from '@/lib/utils';

export default function ImportPage(): JSX.Element {
  const { importState, meetingState } = useOutletContext<AppOutletContext>();
  const { result, fileName, error, handleFileAccepted, handleFileRejected } = importState;
  const [persistError, setPersistError] = useState<string | null>(null);
  const navigate = useNavigate();

  const meetingId = meetingState.currentMeeting?.id ?? null;

  const handleAccepted = useCallback(
    async (file: File) => {
      setPersistError(null);
      const parsed = await handleFileAccepted(file);
      if (parsed && meetingId !== null) {
        try {
          await window.electronAPI.importCsv(meetingId, parsed.rows);
        } catch (err) {
          setPersistError(err instanceof Error ? err.message : String(err));
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
        <p className="text-neutral-600">{meetingState.currentMeeting.name} — CSV extraNat (FFN)</p>
      </header>

      <DropZone onFileAccepted={handleAccepted} onFileRejected={handleFileRejected} />

      {error && <p className="text-sm text-error">{error}</p>}
      {persistError && <p className="text-sm text-error">Échec de l'enregistrement : {persistError}</p>}

      {result && (
        <div className="rounded-lg bg-neutral-0 p-6 shadow-card">
          <p className="mb-3 text-sm text-neutral-600">
            {fileName} — encodage <span className="font-mono">{result.encoding}</span>, délimiteur{' '}
            <span className="font-mono">&quot;{result.delimiter}&quot;</span>
          </p>
          <dl className="grid grid-cols-3 gap-4 text-center">
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Nageurs</dt>
              <dd className="font-mono text-lg font-medium text-neutral-900">
                {formatPoints(result.swimmerCount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Clubs</dt>
              <dd className="font-mono text-lg font-medium text-neutral-900">{formatPoints(result.clubCount)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Catégories</dt>
              <dd className="font-mono text-lg font-medium text-neutral-900">
                {formatPoints(result.categories.length)}
              </dd>
            </div>
          </dl>
          {result.warnings.length > 0 && (
            <p className="mt-3 text-sm text-warning">{result.warnings.length} avertissement(s)</p>
          )}
          <button
            type="button"
            onClick={() => navigate('/classement')}
            className="mt-4 w-full rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-accent-700"
          >
            Voir le classement
          </button>
        </div>
      )}
    </div>
  );
}
