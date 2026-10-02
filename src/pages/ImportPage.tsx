/**
 * Responsabilité : écran d'import CSV (drop, preview, validation, persistance).
 * Appelé par : App.tsx (route "import").
 * Suppression casserait : l'import de nouveaux fichiers CSV.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DropZone } from '@/components/import/DropZone';
import { StatTile } from '@/components/import/StatTile';
import { ImportGuardDialog } from '@/components/import/ImportGuardDialog';
import { ImportRemovalNotice } from '@/components/import/ImportRemovalNotice';
import { ImportChanges } from '@/components/import/ImportChanges';
import { DemoImportWarning } from '@/components/import/DemoImportWarning';
import { Button } from '@/components/ui/Button';
import { countRowsByCategory, type CsvParseResult } from '@/lib/csv-parser';
import { checkImportAgainstExisting, importConfirmation, noticesAfterWrite, type ImportWarning } from '@/lib/import-check';
import { summarizeImportChanges } from '@/lib/import-diff';
import { importCardState } from '@/lib/import-card-state';
import { categoryShortLabel, excludedSwimmersNotice, resultCountLabel } from '@/lib/ui-labels';
import { cn } from '@/lib/utils';
import type { ImportOutcome } from '@/hooks/use-import';

// The parser's encoding ids, as a volunteer would read them.
const ENCODING_LABELS = { latin1: 'ISO-8859-1', 'utf-8': 'UTF-8' } as const;

export default function ImportPage(): JSX.Element {
  const { importState, meetingState } = useOutletContext<AppOutletContext>();
  const { result, fileName, error, errorId, outcome, setOutcome, pending, setPending, handleFileAccepted, handleFileRejected } = importState;
  const { isPersisting, setIsPersisting, persistError, setPersistError, clearError, beginRun, reset: resetImport } = importState;
  const { refresh } = meetingState;
  const navigate = useNavigate();
  const resultRef = useRef<HTMLElement>(null);
  const browseRef = useRef<HTMLButtonElement>(null);
  // Where focus goes once the inline notice is answered (the guard modal hands it back to its opener itself).
  const focusAfterNotice = useRef<'result' | 'browse' | null>(null);

  const meeting = meetingState.currentMeeting;
  const meetingId = meeting?.id ?? null;

  // Writes the file to the database and computes the "since last import" summary.
  const persist = useCallback(
    async (parsed: CsvParseResult, warnings: ImportWarning[]): Promise<void> => {
      if (meetingId === null) return;
      // Every state update after an await is skipped once the meeting has changed: it would describe this meeting's file on another one's screen.
      const isCurrent = beginRun();
      setIsPersisting(true);
      const found = warnings.map((warning) => warning.message);
      try {
        const { backupError } = await window.electronAPI.importCsv(meetingId, parsed.rows);
        if (backupError) found.push(`La sauvegarde automatique a échoué. Vérifiez le dossier de sauvegarde dans les Paramètres.`);
      } catch (err) {
        if (!isCurrent()) return;
        setPersistError(err instanceof Error ? err.message : String(err));
        setIsPersisting(false);
        return;
      }
      // The data is saved from here on: a failure below must not read as a failed import.
      // The meetings are still reloaded when the screen has moved on, so the sidebar counts this import.
      let changes: ImportOutcome['changes'] = null;
      try {
        // Reload meetings so resultCount (sidebar ✓, Accueil) reflects the import.
        // refresh() reports its own failure only on Accueil, hence the notice here.
        if (!(await refresh())) {
          found.push("Les résultats sont enregistrés, mais la liste des meetings n'a pas pu être rechargée : la barre latérale et l'Accueil peuvent afficher l'état d'avant l'import. Redémarrez l'application si cela persiste.");
        }
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
          changes = { since: snapshot.importedAt, summary };
        }
      } catch {
        found.push("Les résultats sont enregistrés, mais le résumé des changements n'a pas pu être calculé.");
      }
      if (!isCurrent()) return;
      // A file refused during the question or the save is answered for once this one is saved:
      // its message next to the green check would read as this import's error.
      clearError();
      setOutcome({ changes, notices: found });
      setIsPersisting(false);
    },
    [meetingId, meeting, refresh, setOutcome, setIsPersisting, setPersistError, beginRun, clearError]
  );

  const handleAccepted = useCallback(
    async (file: File) => {
      // A second drop while a save is running would race it and mix up the notices.
      if (isPersisting) return;
      const isCurrent = beginRun();
      setPersistError(null);
      setOutcome(null);
      setPending(null);
      const parsed = await handleFileAccepted(file);
      if (!parsed || meetingId === null) return;
      // Checked before any write: nothing touches the database until the volunteer confirms.
      // isPersisting covers the check too, so the card never shows "importé" before the decision.
      setIsPersisting(true);
      let warnings: ImportWarning[];
      try {
        const existing = await window.electronAPI.getSwimmerResults(meetingId);
        warnings = checkImportAgainstExisting(existing, parsed.rows, meeting?.lastImportedAt ?? null, parsed.excludedSwimmers);
      } catch (err) {
        if (!isCurrent()) return;
        setPersistError(err instanceof Error ? err.message : String(err));
        setIsPersisting(false);
        return;
      }
      // Checked against the previous meeting's results: neither the question nor the save may reach the new one.
      if (!isCurrent()) return;
      if (importConfirmation(warnings) !== null) {
        setIsPersisting(false);
        setPending({ parsed, warnings });
        return;
      }
      await persist(parsed, warnings);
    },
    [handleFileAccepted, meetingId, meeting, persist, isPersisting, setOutcome, setPending, setIsPersisting, setPersistError, beginRun]
  );

  const confirmPending = (): void => {
    if (!pending) return;
    const { parsed, warnings } = pending;
    if (importConfirmation(warnings) === 'removals') focusAfterNotice.current = 'result';
    setPending(null);
    void persist(parsed, noticesAfterWrite(warnings));
  };

  const cancelPending = (): void => {
    if (pending && importConfirmation(pending.warnings) === 'removals') focusAfterNotice.current = 'browse';
    resetImport();
  };

  // Runs once the notice has left the page and the result card (or the full drop zone) has replaced it.
  useEffect(() => {
    const target = focusAfterNotice.current;
    if (target === null || pending !== null) return;
    focusAfterNotice.current = null;
    (target === 'result' ? resultRef : browseRef).current?.focus();
  }, [pending, result]);

  const categoryCounts = useMemo(() => (result ? countRowsByCategory(result.rows) : []), [result]);

  if (!meeting) {
    return <Navigate to="/" replace />;
  }

  // hasResult drives the card's visibility and the "résultats déjà importés" banner;
  // it stays true across the whole save window so the two don't appear together.
  // isDone gates the green check: only a finished save, never a file merely read.
  const card = importCardState({
    hasFile: result !== null,
    isPending: pending !== null,
    hasPersistError: persistError !== null,
    isPersisting,
    hasOutcome: outcome !== null,
  });
  const hasResult = card !== 'hidden';
  const isDone = card === 'done';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Importer les résultats"
        subtitle="Fichier CSV de cotations exporté depuis extraNat (FFN)."
      />

      {meeting.isDemo && <DemoImportWarning />}

      {persistError && <p className="text-sm text-error">Échec de l'enregistrement : {persistError}</p>}

      {/* result is re-checked only so TypeScript narrows it: hasResult already implies it. */}
      {hasResult && result && (
        <section ref={resultRef} tabIndex={-1} aria-label="Résultat de l'import" className="flex flex-col gap-6 rounded-xl bg-surface-raised px-8 py-7 shadow-card">
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

          {isDone && outcome?.changes && <ImportChanges since={outcome.changes.since} changes={outcome.changes.summary} />}

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

          {isDone && ((outcome?.notices.length ?? 0) > 0 || result.ignoredRowCount > 0 || result.excludedSwimmers.length > 0 || result.duplicateRowCount > 0) && (
            <div role="status" className="flex flex-col gap-1 rounded-lg bg-corail-soft px-5 py-4 text-[15px] text-ink">
              <p className="font-semibold">À savoir</p>
              <ul className="list-disc space-y-1 pl-5">
                {outcome?.notices.map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
                {result.ignoredRowCount > 0 && <li>Lignes sans points, non importées&nbsp;: {result.ignoredRowCount}.</li>}
                {result.excludedSwimmers.length > 0 && <li>{excludedSwimmersNotice(result.excludedSwimmers)}</li>}
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

      {pending &&
        (importConfirmation(pending.warnings) === 'guard' ? (
          <ImportGuardDialog warnings={pending.warnings} onConfirm={confirmPending} onCancel={cancelPending} />
        ) : (
          <ImportRemovalNotice fileName={fileName} warnings={pending.warnings} onConfirm={confirmPending} onCancel={cancelPending} />
        ))}

      <DropZone
        compact={hasResult}
        error={error}
        errorId={errorId}
        browseRef={browseRef}
        onFileAccepted={handleAccepted}
        onFileRejected={handleFileRejected}
      />
    </div>
  );
}
