import { useEffect, useMemo, useState } from 'react';
import type { RawSwimmerRow } from '@/lib/csv-parser';

export interface UseMeetingRowsResult {
  rows: RawSwimmerRow[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Loads the swimmer rows to rank for the current meeting, always from
 * SQLite (the single source of truth) rather than from the in-memory CSV
 * parse result. A meeting's persisted categories can include ones from an
 * earlier import that the most recently imported file didn't mention (a
 * re-import only touches the categories present in the file it's given —
 * see insertSwimmerResults), so trusting the just-parsed result here would
 * hide those older categories immediately after a partial re-import.
 *
 * `isLoading` and `rows` are derived rather than tracked as their own
 * pieces of state, so they're correct on every render — including the very
 * first one (no premature "no rows yet" redirect while the DB fetch is
 * still in flight) and the render right after `meetingId` changes to a
 * different meeting (no flash of the previous meeting's rows).
 */
export function useMeetingRows(meetingId: number | null): UseMeetingRowsResult {
  const [dbRows, setDbRows] = useState<RawSwimmerRow[] | null>(null);
  const [dbRowsMeetingId, setDbRowsMeetingId] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (meetingId === null) {
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
  }, [meetingId]);

  const hasFreshDbRows = meetingId !== null && dbRowsMeetingId === meetingId;
  // A failed fetch must stop "loading" too, or the error below is
  // unreachable: both consuming pages render a loading placeholder before
  // their error/redirect branches, so `isLoading` staying true forever on
  // failure would strand the user on an infinite spinner instead of ever
  // showing `error`.
  const isLoading = meetingId !== null && error === null && (isFetching || !hasFreshDbRows);
  const rows = hasFreshDbRows ? (dbRows ?? []) : [];
  const categories = useMemo(() => Array.from(new Set(rows.map((row) => row.name))), [rows]);

  return { rows, categories, isLoading, error };
}
