/**
 * Responsabilité : charge les résultats d'avant le dernier import (instantané) pour calculer les mouvements.
 * Appelé par : RankingPage.tsx, IndividualPage.tsx.
 * Suppression casserait : les flèches de mouvement des classements.
 */
import { useEffect, useState } from 'react';
import type { RawSwimmerRow } from '@/lib/csv-parser';

/**
 * Rows as they were before the meeting's latest import, or null when there is
 * none (first import, still loading, or failed: the arrows are an extra, so a
 * failure just hides them). Keyed on `importedAt` so a re-import refetches, and
 * the result only counts for the key it was fetched with: no stale arrows from
 * another meeting while the next fetch is in flight.
 */
export function usePreviousRows(meetingId: number | null, importedAt: string | null): RawSwimmerRow[] | null {
  const key = `${meetingId}|${importedAt}`;
  const [loaded, setLoaded] = useState<{ key: string; rows: RawSwimmerRow[] | null } | null>(null);

  useEffect(() => {
    if (meetingId === null) return;
    let cancelled = false;
    window.electronAPI
      .getImportSnapshot(meetingId)
      .then((snapshot) => !cancelled && setLoaded({ key, rows: snapshot?.rows ?? null }))
      .catch(() => !cancelled && setLoaded({ key, rows: null }));
    return () => {
      cancelled = true;
    };
  }, [meetingId, key]);

  return loaded?.key === key ? loaded.rows : null;
}
