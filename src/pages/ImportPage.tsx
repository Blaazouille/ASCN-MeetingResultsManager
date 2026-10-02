/**
 * Responsabilité : écran d'import CSV (drop, preview, validation, persistance).
 * Appelé par : App.tsx (route "import").
 * Suppression casserait : l'import de nouveaux fichiers CSV.
 */
import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DropZone } from '@/components/import/DropZone';
import { StatTile } from '@/components/import/StatTile';
import { ImportGuardDialog } from '@/components/import/ImportGuardDialog';
import { ImportChanges } from '@/components/import/ImportChanges';
import { Button } from '@/components/ui/Button';
import { countRowsByCategory, type CsvParseResult } from '@/lib/csv-parser';
import { checkImportAgainstExisting, type ImportWarning } from '@/lib/import-check';
import { summarizeImportChanges, type ImportChanges as ImportChangesData } from '@/lib/import-diff';
import { categoryShortLabel, resultCountLabel } from '@/lib/ui-labels';
import { cn } from '@/lib/utils';

// The parser's encoding ids, as a volunteer would read them.
const ENCODING_LABELS = { latin1: 'ISO-8859-1', 'utf-8': 'UTF-8' } as const;

export default function ImportPage(): JSX.Element {
  const { importState, meetingState } = useOutletContext<AppOutletContext>();
  const { result, fileName, error, handleFileAccepted, handleFileRejected, reset: resetImport } = importState;
  const { refresh } = meetingState;
  const [persistError, setPersistError] = useState<string | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [changes, setChanges] = useState<{ since: string | null; summary: ImportChangesData } | null>(null);
  // Things the volunteer should know after a save that went through (non-blocking warnings, failed backup, skipped rows).
  const [notices, setNotices] = useState<string[]>([]);
  const [pending, setPending] = useState<{ parsed: CsvParseResult; warnings: ImportWarning[] } | null>(null);
  const navigate = useNavigate();

  const meeting = meetingState.currentMeeting;
  const meetingId = meeting?.id ?? null;

  // Writes the file to the database and computes the "since last import" summary.
  const persist = useCallback(
    async (parsed: CsvParseResult, warnings: ImportWarning[]): Promise<void> => {
      if (meetingId === null) return;
      setIsPersisting(true);
      const found = warnings.map((warning) => warning.message);
      try {
        const { backupError } = await window.electronAPI.importCsv(meetingId, parsed.rows);
        if (backupError) found.push(`La sauvegarde automatique a échoué. Vérifiez le dossier de sauvegarde dans les Paramètres.`);
      } catch (err) {
        setPersistError(err instanceof Error ? err.message : String(err));
        setIsPersisting(false);
        return;
      }
      // The data is saved from here on: a failure below must not read as a failed import.
      try {
        // Reload meetings so resultCount (sidebar ✓, Accueil) reflects the import.
        await refresh();
        // No snapshot = first import of this meeting: nothing to compare with.
        const [snapshot, current] = await Promise.all([
          window.electronAPI.getImportSnapshot(meetingId),
          window.electronAPI.getSwimmerResults(meetingId),
        ]);
        if (snapshot && meeting) {
          const summary = summarizeImportChanges(snapshot.rows, current, {
            topN: meeting.defaultTopN,
            minSwimmers: meeting.minSwimmers,
          });
          setChanges({ since: snapshot.importedAt, summary });
        }
      } catch {
        found.push("Les résultats sont enregistrés, mais le résumé des changements n'a pas pu être calculé.");
      }
      setNotices(found);
      setIsPersisting(false);
    },
    [meetingId, meeting, refresh]
  );

  const handleAccepted = useCallback(
    async (file: File) => {
      // A second drop while a save is running would race it and mix up the notices.
      if (isPersisting) return;
      setPersistError(null);
      setChanges(null);
      setPending(null);
      setNotices([]);
      const parsed = await handleFileAccepted(file);
      if (!parsed || meetingId === null) return;
      // Checked before any write: nothing touches the database until the volunteer confirms.
      // isPersisting covers the check too, so the card never shows "importé" before the decision.
      setIsPersisting(true);
      let warnings: ImportWarning[];
      try {
        const existing = await window.electronAPI.getSwimmerResults(meetingId);
        warnings = checkImportAgainstExisting(existing, parsed.rows, meeting?.lastImportedAt ?? null);
      } catch (err) {
        setPersistError(err instanceof Error ? err.message : String(err));
        setIsPersisting(false);
        return;
      }
      if (warnings.some((warning) => warning.blocking)) {
        setIsPersisting(false);
        setPending({ parsed, warnings });
        return;
      }
      await persist(parsed, warnings);
    },
    [handleFileAccepted, meetingId, meeting, persist, isPersisting]
  );

  const confirmPending = (): void => {
    if (!pending) return;
    const { parsed, warnings } = pending;
    setPending(null);
    void persist(parsed, warnings.filter((warning) => !warning.blocking));
  };

  const cancelPending = (): void => {
    setPending(null);
    resetImport();
  };

  const categoryCounts = useMemo(() => (result ? countRowsByCategory(result.rows) : []), [result]);

  if (!meeting) {
    return <Navigate to="/" replace />;
  }

  // hasResult drives the card's visibility and the "résultats déjà importés" banner;
  // it stays true across the whole save window so the two don't appear together.
  const hasResult = result !== null && persistError === null && pending === null;
  // isDone only turns true once the save has genuinely finished — used to gate the
  // success (green/check) treatment so a volunteer can't mistake "still saving" for "done".
  const isDone = hasResult && !isPersisting;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Importer les résultats"
        subtitle="Fichier CSV de cotations exporté depuis extraNat (FFN)."
      />

      {error && <p className="text-sm text-error">{error}</p>}
      {persistError && <p className="text-sm text-error">Échec de l'enregistrement : {persistError}</p>}

      {hasResult && (
        <section aria-label="Résultat de l'import" className="flex flex-col gap-6 rounded-xl bg-surface-raised px-8 py-7 shadow-card">
          <div className="flex flex-wrap items-center gap-5">
            <span
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-full',
                isDone ? 'bg-success-light' : 'bg-surface-sunken'
              )}
            >
              {isDone ? (
                <Check className="h-7 w-7 text-success" strokeWidth={2.6} aria-hidden />
              ) : (
                <Loader2 className="h-7 w-7 animate-spin text-ink-muted" strokeWidth={2.6} aria-hidden />
              )}
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <p className={cn('font-display text-3xl font-bold leading-none', isDone ? 'text-success' : 'text-ink')}>
                {isDone ? 'Fichier importé et enregistré' : 'Enregistrement du fichier…'}
              </p>
              <p className="text-[15px] text-ink-muted">{fileName}</p>
            </div>
            <Button variant="primary" size="lg" iconAfter={ArrowRight} disabled={isPersisting} onClick={() => navigate('/classement')}>
              Voir le classement
            </Button>
          </div>

          {isDone && changes && <ImportChanges since={changes.since} changes={changes.summary} />}

          <div className="grid grid-cols-3 gap-4">
            <StatTile value={result.swimmerCount} label="nageurs" />
            <StatTile value={result.clubCount} label="clubs" />
            <StatTile value={result.categories.length} label="catégories">
              {categoryCounts.map(({ category, count }) => (
                <span key={category} className="rounded-full border border-line-strong bg-surface-raised px-2.5 py-0.5 text-sm text-ink">
                  {categoryShortLabel(category)} · {count}
                </span>
              ))}
            </StatTile>
          </div>

          {isDone && (notices.length > 0 || result.ignoredRowCount > 0 || result.duplicateRowCount > 0) && (
            <div role="status" className="flex flex-col gap-1 rounded-lg bg-corail-soft px-5 py-4 text-[15px] text-ink">
              <p className="font-semibold">À savoir</p>
              <ul className="list-disc space-y-1 pl-5">
                {notices.map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
                {result.ignoredRowCount > 0 && <li>Lignes sans points, non importées&nbsp;: {result.ignoredRowCount}.</li>}
                {result.duplicateRowCount > 0 && <li>Nageurs en double dans une catégorie (seul le dernier est gardé)&nbsp;: {result.duplicateRowCount}.</li>}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <details className="text-sm text-warning">
              <summary className="cursor-pointer font-semibold">
                {result.warnings.length} avertissement{result.warnings.length > 1 ? 's' : ''}
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                {result.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </details>
          )}

          <details className="text-sm text-ink-muted">
            <summary className="cursor-pointer font-semibold text-ink-soft">Détails techniques</summary>
            <p className="pt-2">
              Encodage détecté : {ENCODING_LABELS[result.encoding]} · séparateur : « {result.delimiter} » ·{' '}
              {result.rows.length} lignes lues
            </p>
          </details>
        </section>
      )}

      {!hasResult && meeting.resultCount > 0 && (
        <p className="rounded-lg bg-bassin-soft px-5 py-4 text-[15px] text-ink">
          {resultCountLabel(meeting.resultCount)} pour ce meeting. Un nouveau fichier les met à jour, sans doublons.
        </p>
      )}

      {pending && <ImportGuardDialog warnings={pending.warnings} onConfirm={confirmPending} onCancel={cancelPending} />}

      <DropZone compact={hasResult} onFileAccepted={handleAccepted} onFileRejected={handleFileRejected} />
    </div>
  );
}
