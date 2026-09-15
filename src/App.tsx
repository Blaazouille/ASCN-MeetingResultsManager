import { useState } from 'react';
import { DropZone } from './components/import/DropZone';
import { parseCsv, type CsvParseResult } from './lib/csv-parser';
import { formatPoints } from './lib/utils';

export default function App(): JSX.Element {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileAccepted(file: File): Promise<void> {
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      setResult(parseCsv(buffer));
      setFileName(file.name);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-primary-800">ASCN Meeting Results</h1>
        <p className="text-neutral-600">Import du fichier de cotations FFN (extraNat)</p>
      </header>
      <main className="mx-auto max-w-2xl space-y-4">
        <DropZone onFileAccepted={handleFileAccepted} onFileRejected={() => setError('Fichier non supporté (.csv attendu)')} />

        {error && <p className="text-sm text-error">{error}</p>}

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
          </div>
        )}
      </main>
    </div>
  );
}
