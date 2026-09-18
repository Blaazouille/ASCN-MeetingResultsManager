/**
 * Responsabilité : page du classement individuel (tous nageurs, filtre par genre).
 * Appelé par : App.tsx (route /individuels).
 * Suppression casserait : l'écran de classement individuel.
 */
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { Download, FileSpreadsheet } from 'lucide-react';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { useIndividualExport } from '@/hooks/use-individual-export';
import { computeIndividualRanking, filterByGender } from '@/lib/individual-ranking';
import { GenderTabs, type GenderFilter } from '@/components/ranking/GenderTabs';
import { IndividualRankingTable } from '@/components/ranking/IndividualRankingTable';

/** Number of top swimmers highlighted with a prize badge (1er Prix, 2e Prix…). */
const PRIZE_COUNT = 2;

export default function IndividualPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const { isExporting, error: exportError, exportPdf, exportExcel } = useIndividualExport();

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, isLoading, error } = useMeetingRows(meetingId);

  // Compute the full ranking once, then apply the gender filter for display.
  // Keeping these two separate avoids recomputing the global ranking on every
  // filter change (only the filtering step re-runs).
  const allResults = useMemo(() => computeIndividualRanking(rows), [rows]);
  const displayedResults = useMemo(
    () => (genderFilter === 'all' ? allResults : filterByGender(allResults, genderFilter)),
    [allResults, genderFilter]
  );

  const meeting = meetingState.currentMeeting;
  if (!meeting) return <Navigate to="/" replace />;
  if (isLoading) return <p className="text-neutral-600">Chargement…</p>;
  if (error) return <p className="text-sm text-error">{error}</p>;
  if (rows.length === 0) return <Navigate to="/import" replace />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">Classement individuel</h1>
          <p className="text-neutral-600">{meeting.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void exportPdf(meeting, genderFilter, displayedResults)}
            disabled={isExporting || displayedResults.length === 0}
            className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => void exportExcel(meeting, genderFilter, displayedResults)}
            disabled={isExporting || displayedResults.length === 0}
            className="flex items-center gap-2 rounded-md bg-secondary-600 px-3 py-1.5 text-sm font-medium text-neutral-0 transition-colors duration-150 hover:bg-secondary-700 disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
            Export Excel
          </button>
        </div>
      </header>

      {exportError && <p className="text-sm text-error">{exportError}</p>}

      <GenderTabs active={genderFilter} onChange={setGenderFilter} />
      <IndividualRankingTable
        results={displayedResults}
        prizeCount={PRIZE_COUNT}
        showCategory={genderFilter === 'all'}
      />
    </div>
  );
}
