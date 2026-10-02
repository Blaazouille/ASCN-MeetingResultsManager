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
import { useIndividualExport } from '@/hooks/use-individual-export';
import { computeCategoryRanking } from '@/lib/individual-ranking';
import { findPodiumTies } from '@/lib/rank-ties';
import { categoryShortLabel } from '@/lib/ui-labels';
import { SearchField } from '@/components/ui/SearchField';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';
import { TieBanner } from '@/components/ranking/TieBanner';
import { IndividualRankingTable } from '@/components/ranking/IndividualRankingTable';
import { ExportActions } from '@/components/ranking/ExportActions';

/** Number of top swimmers highlighted with a prize badge (1er Prix, 2e Prix…). */
const PRIZE_COUNT = 2;

export default function IndividualPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const { isExporting, error: exportError, exportPdf, exportExcel } = useIndividualExport();

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, categories, isLoading, error } = useMeetingRows(meetingId);

  // Default to first available category; keep selection if still valid.
  const currentCategory = categories.includes(activeCategory) ? activeCategory : (categories[0] ?? '');

  const displayedResults = useMemo(() => computeCategoryRanking(rows, currentCategory), [rows, currentCategory]);

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
        subtitle={`${categoryShortLabel(currentCategory)} · ${displayedResults.length} nageurs`}
        actions={
          <ExportActions
            disabled={isExporting || displayedResults.length === 0}
            onExcel={() => void exportExcel(meeting, currentCategory, displayedResults)}
            onPdf={() => void exportPdf(meeting, currentCategory, displayedResults)}
          />
        }
      />
      <FilterBar>
        <CategoryTabs categories={categories} active={currentCategory} onChange={setActiveCategory} />
        <div className="ml-auto">
          <SearchField value={search} onChange={setSearch} placeholder="Rechercher un nageur ou un club" />
        </div>
      </FilterBar>
      {exportError && <p className="text-sm text-error">{exportError}</p>}
      <TieBanner ranks={findPodiumTies(displayedResults, PRIZE_COUNT)} category={currentCategory} />
      <IndividualRankingTable results={displayedResults} prizeCount={PRIZE_COUNT} search={search} />
    </div>
  );
}
