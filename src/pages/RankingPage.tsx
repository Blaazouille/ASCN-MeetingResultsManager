/**
 * Responsabilité : écran de classement par équipes (tableau, filtres, exports PDF/Excel).
 * Appelé par : App.tsx (route "classement").
 * Suppression casserait : l'écran de classement, cœur de l'application.
 */
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { useRanking } from '@/hooks/use-ranking';
import { usePrintExport } from '@/hooks/use-print-export';
import { findPodiumTies } from '@/lib/rank-ties';
import { resolveActiveCategories } from '@/lib/ranking-engine';
import { categoryShortLabel } from '@/lib/ui-labels';
import { RankingToolbar } from '@/components/ranking/RankingToolbar';
import { TieBanner } from '@/components/ranking/TieBanner';
import { PodiumCards } from '@/components/ranking/PodiumCards';
import { TeamRankingTable } from '@/components/ranking/TeamRankingTable';
import { ExportActions } from '@/components/ranking/ExportActions';

export default function RankingPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const [search, setSearch] = useState('');

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, categories: presentCategories, isLoading, error: rowsError } = useMeetingRows(meetingId);
  const categories = useMemo(
    () => resolveActiveCategories(presentCategories, meetingState.currentMeeting?.activeCategories ?? null),
    [presentCategories, meetingState.currentMeeting]
  );
  const ranking = useRanking(rows, categories, {
    initialTopN: meetingState.currentMeeting?.defaultTopN,
    minSwimmers: meetingState.currentMeeting?.minSwimmers,
  });
  const { isExporting, error, exportPdf, exportExcel } = usePrintExport();

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Classement par équipes"
        subtitle={`${categoryShortLabel(ranking.category)} · ${ranking.topN} meilleurs nageurs par club · ${clubCount} ${clubCount >= 2 ? 'clubs classés' : 'club classé'}`}
        actions={
          <ExportActions
            disabled={isExporting}
            onExcel={() => exportExcel(meeting, ranking.category, ranking.teamResults)}
            onPdf={() => exportPdf(meeting, ranking.category, ranking.teamResults)}
          />
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
      />
      {error && <p className="text-sm text-error">{error}</p>}
      <TieBanner ranks={findPodiumTies(ranking.teamResults, 3)} category={ranking.category} />
      <PodiumCards results={ranking.teamResults} />
      <TeamRankingTable results={ranking.teamResults} category={ranking.category} search={search} />
    </div>
  );
}
