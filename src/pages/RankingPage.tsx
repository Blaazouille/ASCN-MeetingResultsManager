/**
 * Responsabilité : écran de classement par équipes (ligne « Notre club », tableau, filtres, exports PDF/Excel, « Tout exporter »).
 * Appelé par : App.tsx (route "classement").
 * Suppression casserait : l'écran de classement, cœur de l'application.
 */
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { FolderDown } from 'lucide-react';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { useRanking } from '@/hooks/use-ranking';
import { useRankingExport } from '@/hooks/use-ranking-export';
import { useExportPack } from '@/hooks/use-export-pack';
import { usePreviousRows } from '@/hooks/use-previous-rows';
import { useOurClub } from '@/hooks/use-our-club';
import { computeClubSummary } from '@/lib/club-summary';
import { findPodiumTies } from '@/lib/rank-ties';
import { rankMovements } from '@/lib/import-diff';
import { computeTeamRanking, countClubsBelowThreshold, resolveActiveCategories } from '@/lib/ranking-engine';
import { categoryShortLabel, unrankedClubsLabel } from '@/lib/ui-labels';
import { RankingToolbar } from '@/components/ranking/RankingToolbar';
import { TieBanner } from '@/components/ranking/TieBanner';
import { OurClubLine } from '@/components/ranking/OurClubLine';
import { PodiumCards } from '@/components/ranking/PodiumCards';
import { TeamRankingTable } from '@/components/ranking/TeamRankingTable';
import { ExportActions } from '@/components/ranking/ExportActions';
import { ExportFeedback } from '@/components/ranking/ExportFeedback';
import { ExportPackFeedback } from '@/components/ranking/ExportPackFeedback';
import { Button } from '@/components/ui/Button';
import { ComparisonUnavailableNote } from '@/components/ranking/ComparisonUnavailableNote';

export default function RankingPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const [search, setSearch] = useState('');
  const [reveal, setReveal] = useState<{ club: string } | null>(null);

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, categories: presentCategories, isLoading, error: rowsError } = useMeetingRows(meetingId);
  const categories = useMemo(
    () => resolveActiveCategories(presentCategories, meetingState.currentMeeting?.activeCategories ?? null),
    [presentCategories, meetingState.currentMeeting]
  );
  const minSwimmers = meetingState.currentMeeting?.minSwimmers ?? 0;
  const ranking = useRanking(rows, categories, {
    initialTopN: meetingState.currentMeeting?.defaultTopN,
    minSwimmers,
  });
  const { isExporting, error, notice, exportPdf, exportExcel } = useRankingExport();
  const pack = useExportPack(meetingId);
  const { rows: previousRows, failed: previousRowsFailed } = usePreviousRows(meetingId, meetingState.currentMeeting?.lastImportedAt ?? null);
  // Same category, top N and threshold as the displayed ranking, or the arrows would compare different things.
  const movements = useMemo(
    () =>
      previousRows &&
      rankMovements(
        computeTeamRanking(previousRows, { category: ranking.category, topN: ranking.topN, minSwimmers }),
        ranking.teamResults,
        (team) => team.club
      ),
    [previousRows, ranking.category, ranking.topN, ranking.teamResults, minSwimmers]
  );
  // computeTeamRanking drops these clubs silently: say so, or a volunteer looks for a club that seems lost.
  const unrankedCount = useMemo(
    () => countClubsBelowThreshold(rows, ranking.category, minSwimmers),
    [rows, ranking.category, minSwimmers]
  );
  const ourClub = useOurClub();
  // Same category, top N and threshold as the table, so the line's gaps are the ones the table shows.
  const clubSummary = useMemo(
    () => computeClubSummary(rows, ourClub, { category: ranking.category, topN: ranking.topN, minSwimmers }),
    [rows, ourClub, ranking.category, ranking.topN, minSwimmers]
  );

  const meeting = meetingState.currentMeeting;
  if (!meeting) {
    return <Navigate to="/" replace />;
  }
  if (isLoading) {
    return <p className="text-[15px] text-ink-muted">Chargement du classement…</p>;
  }
  if (rowsError) {
    return <p className="text-sm text-error">{rowsError}</p>;
  }
  if (rows.length === 0) {
    return <Navigate to="/import" replace />;
  }

  const clubCount = ranking.teamResults.length;

  function showOurClub(club: string): void {
    // A search for another club would hide our row; clear it so the row is there to unfold.
    setSearch('');
    // A new object each time: clicking again scrolls back to the row even if the club is the same.
    setReveal({ club });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Classement par équipes"
        subtitle={`${categoryShortLabel(ranking.category)} · ${ranking.topN} meilleurs nageurs par club · ${clubCount} ${clubCount >= 2 ? 'clubs classés' : 'club classé'}`}
        actions={
          <>
            {/* Secondary: the end-of-meeting pack (every active category, top N shown here), see use-export-pack.ts. */}
            <Button
              icon={FolderDown}
              disabled={pack.isExporting}
              onClick={() => void pack.exportAll({ meeting, rows, categories, topN: ranking.topN })}
            >
              {pack.isExporting ? 'Export en cours…' : 'Tout exporter'}
            </Button>
            <ExportActions
              disabled={isExporting}
              onExcel={() => exportExcel(meeting, ranking.category, ranking.teamResults)}
              onPdf={() => exportPdf(meeting, ranking.category, ranking.teamResults)}
            />
          </>
        }
      />
      <RankingToolbar
        categories={categories}
        category={ranking.category}
        onCategoryChange={ranking.setCategory}
        topN={ranking.topN}
        onTopNChange={ranking.setTopN}
        search={search}
        onSearchChange={setSearch}
        ourClub={clubSummary && <OurClubLine summary={clubSummary} onSelect={() => showOurClub(clubSummary.club)} />}
      />
      <ExportFeedback error={error} notice={notice} />
      <ExportPackFeedback outcome={pack.outcome} error={pack.error} onOpenFolder={() => void pack.openFolder()} />
      {unrankedCount > 0 && (
        <p className="text-sm text-ink-muted">{unrankedClubsLabel(unrankedCount, minSwimmers)}</p>
      )}
      <ComparisonUnavailableNote show={previousRowsFailed} />
      {/* The tie banner stays right above the podium it is about. */}
      <TieBanner ranks={findPodiumTies(ranking.teamResults, 3)} category={ranking.category} />
      <PodiumCards results={ranking.teamResults} />
      <TeamRankingTable
        results={ranking.teamResults}
        category={ranking.category}
        search={search}
        movements={movements}
        reveal={reveal}
      />
    </div>
  );
}
