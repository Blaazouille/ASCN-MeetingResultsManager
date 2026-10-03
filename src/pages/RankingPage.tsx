/**
 * Responsabilité : écran de classement par équipes (tableau, filtres, exports PDF/Excel, « Tout exporter »).
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
import { useCategoryChoice } from '@/hooks/use-selected-category';
import { useRankingExport } from '@/hooks/use-ranking-export';
import { useExportPack } from '@/hooks/use-export-pack';
import { usePreviousRows } from '@/hooks/use-previous-rows';
import { findPodiumTies } from '@/lib/rank-ties';
import { rankMovements } from '@/lib/import-diff';
import { computeTeamRanking, countClubsBelowThreshold, resolveActiveCategories } from '@/lib/ranking-engine';
import { categoryShortLabel, unrankedClubsLabel } from '@/lib/ui-labels';
import { RankingToolbar } from '@/components/ranking/RankingToolbar';
import { TieBanner } from '@/components/ranking/TieBanner';
import { PodiumCards } from '@/components/ranking/PodiumCards';
import { TeamRankingTable } from '@/components/ranking/TeamRankingTable';
import { ExportActions } from '@/components/ranking/ExportActions';
import { ExportFeedback } from '@/components/ranking/ExportFeedback';
import { ExportPackFeedback } from '@/components/ranking/ExportPackFeedback';
import { ExportPackDialog } from '@/components/ranking/ExportPackDialog';
import { Button } from '@/components/ui/Button';
import { ComparisonUnavailableNote } from '@/components/ranking/ComparisonUnavailableNote';

export default function RankingPage(): JSX.Element {
  const { meetingState, categorySelection } = useOutletContext<AppOutletContext>();
  const [search, setSearch] = useState('');
  const [isPackDialogOpen, setIsPackDialogOpen] = useState(false);

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, categories: presentCategories, isLoading, error: rowsError } = useMeetingRows(meetingId);
  const categories = useMemo(
    () => resolveActiveCategories(presentCategories, meetingState.currentMeeting?.activeCategories ?? null),
    [presentCategories, meetingState.currentMeeting]
  );
  const minSwimmers = meetingState.currentMeeting?.minSwimmers ?? 0;
  const { category, setCategory } = useCategoryChoice(categorySelection, categories);
  const ranking = useRanking(rows, category, {
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
        computeTeamRanking(previousRows, { category, topN: ranking.topN, minSwimmers }),
        ranking.teamResults,
        (team) => team.club
      ),
    [previousRows, category, ranking.topN, ranking.teamResults, minSwimmers]
  );
  // computeTeamRanking drops these clubs silently: say so, or a volunteer looks for a club that seems lost.
  const unrankedCount = useMemo(
    () => countClubsBelowThreshold(rows, category, minSwimmers),
    [rows, category, minSwimmers]
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
  const packBlocked = pack.isExporting || categories.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Classement par équipes"
        subtitle={`${categoryShortLabel(category)} · ${ranking.topN} meilleurs nageurs par club · ${clubCount} ${clubCount >= 2 ? 'clubs classés' : 'club classé'}`}
        actions={
          <>
            {/* Secondary: the end-of-meeting pack (ticked categories, top N shown here), see use-export-pack.ts.
                aria-disabled rather than disabled: a disabled button drops the focus the dialog hands back to it
                when the export starts, and shows no tooltip. The click handler is the actual guard. */}
            <Button
              icon={FolderDown}
              aria-disabled={packBlocked}
              title={categories.length === 0 ? 'Aucune catégorie active à exporter (voir Paramètres).' : undefined}
              className="aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
              onClick={() => {
                if (!packBlocked) setIsPackDialogOpen(true);
              }}
            >
              {pack.isExporting ? 'Export en cours…' : 'Tout exporter'}
            </Button>
            <ExportActions
              disabled={isExporting}
              onExcel={() => exportExcel(meeting, category, ranking.teamResults)}
              onPdf={() => exportPdf(meeting, category, ranking.teamResults)}
            />
          </>
        }
      />
      <RankingToolbar
        categories={categories}
        category={category}
        onCategoryChange={setCategory}
        topN={ranking.topN}
        onTopNChange={ranking.setTopN}
        search={search}
        onSearchChange={setSearch}
      />
      <ExportFeedback error={error} notice={notice} />
      <ExportPackFeedback outcome={pack.outcome} error={pack.error} onOpenFolder={() => void pack.openFolder()} />
      {isPackDialogOpen && (
        <ExportPackDialog
          available={categories}
          topN={ranking.topN}
          onCancel={() => setIsPackDialogOpen(false)}
          onConfirm={(chosenCategories) => {
            setIsPackDialogOpen(false);
            void pack.exportAll({ meeting, rows, categories, chosenCategories, topN: ranking.topN });
          }}
        />
      )}
      {unrankedCount > 0 && (
        <p className="text-sm text-ink-muted">{unrankedClubsLabel(unrankedCount, minSwimmers)}</p>
      )}
      <ComparisonUnavailableNote show={previousRowsFailed} />
      {/* The tie banner stays right above the podium it is about. */}
      <TieBanner ranks={findPodiumTies(ranking.teamResults, 3)} category={category} />
      <PodiumCards results={ranking.teamResults} />
      <TeamRankingTable
        results={ranking.teamResults}
        category={category}
        search={search}
        movements={movements}
      />
    </div>
  );
}
