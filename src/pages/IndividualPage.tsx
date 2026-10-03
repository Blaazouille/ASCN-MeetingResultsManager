/**
 * Responsabilité : page du classement individuel (tous nageurs, filtre par catégorie).
 * Appelé par : App.tsx (route /individuels).
 * Suppression casserait : l'écran de classement individuel.
 */
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/layout/FilterBar';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { useCategoryChoice } from '@/hooks/use-selected-category';
import { resolveActiveCategories } from '@/lib/ranking-engine';
import { useIndividualExport } from '@/hooks/use-individual-export';
import { usePreviousRows } from '@/hooks/use-previous-rows';
import { computeCategoryRanking, INDIVIDUAL_PRIZE_COUNT } from '@/lib/individual-ranking';
import { rankMovements, swimmerIdentity } from '@/lib/import-diff';
import { findPodiumTies } from '@/lib/rank-ties';
import { categoryShortLabel } from '@/lib/ui-labels';
import { SearchField } from '@/components/ui/SearchField';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';
import { TieBanner } from '@/components/ranking/TieBanner';
import { IndividualRankingTable } from '@/components/ranking/IndividualRankingTable';
import { ExportActions } from '@/components/ranking/ExportActions';
import { ExportFeedback } from '@/components/ranking/ExportFeedback';
import { ComparisonUnavailableNote } from '@/components/ranking/ComparisonUnavailableNote';

export default function IndividualPage(): JSX.Element {
  const { meetingState, categorySelection } = useOutletContext<AppOutletContext>();
  const [search, setSearch] = useState('');
  const { isExporting, error: exportError, notice: exportNotice, exportPdf, exportExcel } = useIndividualExport();

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, categories: presentCategories, isLoading, error } = useMeetingRows(meetingId);
  // Same offered categories as Classement: the selection is shared, so a category offered on one
  // screen and not on another would be reset to the default every time the volunteer switches screens.
  const categories = useMemo(
    () => resolveActiveCategories(presentCategories, meetingState.currentMeeting?.activeCategories ?? null),
    [presentCategories, meetingState.currentMeeting]
  );
  const { category, setCategory } = useCategoryChoice(categorySelection, categories);

  const displayedResults = useMemo(() => computeCategoryRanking(rows, category), [rows, category]);

  const { rows: previousRows, failed: previousRowsFailed } = usePreviousRows(meetingId, meetingState.currentMeeting?.lastImportedAt ?? null);
  const movements = useMemo(
    () =>
      previousRows &&
      rankMovements(
        computeCategoryRanking(previousRows, category),
        displayedResults,
        swimmerIdentity
      ),
    [previousRows, category, displayedResults]
  );

  const meeting = meetingState.currentMeeting;
  if (!meeting) return <Navigate to="/" replace />;
  if (isLoading) return <p className="text-[15px] text-ink-muted">Chargement…</p>;
  if (error) return <p className="text-sm text-error">{error}</p>;
  if (rows.length === 0) return <Navigate to="/import" replace />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Classement individuel"
        subtitle={`${categoryShortLabel(category)} · ${displayedResults.length} nageurs`}
        actions={
          <ExportActions
            disabled={isExporting || displayedResults.length === 0}
            onExcel={() => void exportExcel(meeting, category, displayedResults)}
            onPdf={() => void exportPdf(meeting, category, displayedResults)}
          />
        }
      />
      <FilterBar>
        <CategoryTabs categories={categories} active={category} onChange={setCategory} />
        <div className="ml-auto">
          <SearchField value={search} onChange={setSearch} placeholder="Rechercher un nageur ou un club" />
        </div>
      </FilterBar>
      <ExportFeedback error={exportError} notice={exportNotice} />
      <ComparisonUnavailableNote show={previousRowsFailed} />
      <TieBanner ranks={findPodiumTies(displayedResults, INDIVIDUAL_PRIZE_COUNT)} category={category} />
      <IndividualRankingTable results={displayedResults} prizeCount={INDIVIDUAL_PRIZE_COUNT} search={search} movements={movements} />
    </div>
  );
}
