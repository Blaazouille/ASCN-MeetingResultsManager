/**
 * Responsabilité : page du classement individuel (tous nageurs, filtre par genre).
 * Appelé par : App.tsx (route /individuels).
 * Suppression casserait : l'écran de classement individuel.
 */
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { computeIndividualRanking, filterByGender } from '@/lib/individual-ranking';
import { GenderTabs, type GenderFilter } from '@/components/ranking/GenderTabs';
import { IndividualRankingTable } from '@/components/ranking/IndividualRankingTable';

/** Number of top swimmers highlighted with a prize badge (1er Prix, 2e Prix…). */
const PRIZE_COUNT = 2;

export default function IndividualPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');

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
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Classement individuel</h1>
        <p className="text-neutral-600">{meeting.name}</p>
      </header>

      <GenderTabs active={genderFilter} onChange={setGenderFilter} />
      <IndividualRankingTable results={displayedResults} prizeCount={PRIZE_COUNT} />
    </div>
  );
}
