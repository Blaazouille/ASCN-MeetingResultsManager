/**
 * Responsabilité : charge les résultats d'avant le dernier import (instantané) pour calculer les mouvements.
 * Appelé par : RankingPage.tsx, IndividualPage.tsx.
 * Suppression casserait : les flèches de mouvement des classements.
 */
import { useEffect, useState } from 'react';
import type { RawSwimmerRow } from '@/lib/csv-parser';

export interface PreviousRows {
  /** Rows before the latest import, or null (first import, still loading, or failed). */
  rows: RawSwimmerRow[] | null;
  /**
   * True when the snapshot could not be loaded. The arrows are an extra, so a
   * failure only hides them, but the screen says so: otherwise "no arrows"
   * would read as "nothing moved".
   */
  failed: boolean;
}

interface Loaded extends PreviousRows {
  key: string;
}

const NOT_LOADED: PreviousRows = { rows: null, failed: false };

/**
 * Keyed on `importedAt` so a re-import refetches, and the result only counts
 * for the key it was fetched with: no stale arrows (or stale failure notice)
 * from another meeting while the next fetch is in flight.
 */
export function usePreviousRows(meetingId: number | null, importedAt: string | null): PreviousRows {
  const key = `${meetingId}|${importedAt}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (meetingId === null) return;
    let cancelled = false;
    window.electronAPI
      .getImportSnapshot(meetingId)
      .then((snapshot) => !cancelled && setLoaded({ key, rows: snapshot?.rows ?? null, failed: false }))
      .catch((err: unknown) => {
        console.error(err);
        if (!cancelled) setLoaded({ key, rows: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [meetingId, key]);

  return loaded?.key === key ? { rows: loaded.rows, failed: loaded.failed } : NOT_LOADED;
}
