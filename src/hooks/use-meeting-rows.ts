import { useEffect, useMemo, useState } from 'react';
import type { CsvParseResult, RawSwimmerRow } from '@/lib/csv-parser';

export interface UseMeetingRowsResult {
  rows: RawSwimmerRow[];
  categories: string[];
  isLoading: boolean;
}

/**
 * Resolves the swimmer rows to rank for the current screen: the just-parsed
 * CSV when an import happened this session, otherwise the rows persisted
 * for this meeting — the "historique" path when reopening a meeting whose
 * import happened in a previous session (import state is in-memory only).
 */
export function useMeetingRows(
  meetingId: number | null,
  importResult: CsvParseResult | null
): UseMeetingRowsResult {
  const [dbRows, setDbRows] = useState<RawSwimmerRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (importResult || meetingId === null) {
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    window.electronAPI
      .getSwimmerResults(meetingId)
      .then((rows) => {
        if (!cancelled) {
          setDbRows(rows);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [importResult, meetingId]);

  const rows = importResult?.rows ?? dbRows ?? [];
  const categories = useMemo(
    () => importResult?.categories ?? Array.from(new Set(rows.map((row) => row.name))),
    [importResult, rows]
  );

  return { rows, categories, isLoading };
}
