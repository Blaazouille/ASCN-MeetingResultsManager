import { useEffect, useMemo, useState } from 'react';
import type { CsvParseResult, RawSwimmerRow } from '@/lib/csv-parser';

export interface UseMeetingRowsResult {
  rows: RawSwimmerRow[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Resolves the swimmer rows to rank for the current screen: the just-parsed
 * CSV when an import happened this session, otherwise the rows persisted
 * for this meeting — the "historique" path when reopening a meeting whose
 * import happened in a previous session (import state is in-memory only).
 *
 * `isLoading` and `rows` are derived rather than tracked as their own pieces
 * of state, so they're correct on every render — including the very first
 * one (no premature "no rows yet" redirect while the DB fetch is still in
 * flight) and the render right after `meetingId` changes to a different,
 * already-loaded meeting (no flash of the previous meeting's rows).
 */
export function useMeetingRows(
  meetingId: number | null,
  importResult: CsvParseResult | null
): UseMeetingRowsResult {
  const [dbRows, setDbRows] = useState<RawSwimmerRow[] | null>(null);
  const [dbRowsMeetingId, setDbRowsMeetingId] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (importResult || meetingId === null) {
      return;
    }
    let cancelled = false;
    setIsFetching(true);
    setError(null);
    window.electronAPI
      .getSwimmerResults(meetingId)
      .then((rows) => {
        if (!cancelled) {
          setDbRows(rows);
          setDbRowsMeetingId(meetingId);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFetching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [importResult, meetingId]);

  const willFetchFromDb = importResult === null && meetingId !== null;
  const hasFreshDbRows = dbRowsMeetingId === meetingId;
  // A failed fetch must stop "loading" too, or the error below is
  // unreachable: both consuming pages render a loading placeholder before
  // their error/redirect branches, so `isLoading` staying true forever on
  // failure would strand the user on an infinite spinner instead of ever
  // showing `error`.
  const isLoading = willFetchFromDb && error === null && (isFetching || !hasFreshDbRows);
  const rows = importResult?.rows ?? (hasFreshDbRows ? (dbRows ?? []) : []);
  const categories = useMemo(
    () => importResult?.categories ?? Array.from(new Set(rows.map((row) => row.name))),
    [importResult, rows]
  );

  return { rows, categories, isLoading, error };
}
