/**
 * Responsabilité : page du palmarès des rigolos (prix humoristiques).
 * Appelé par : App.tsx (route /palmares).
 * Suppression casserait : l'écran des prix humoristiques.
 */
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { computeFunAwards } from '@/lib/fun-awards';
import { FunAwardsGrid } from '@/components/ranking/FunAwardsGrid';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/layout/FilterBar';
import { categoryShortLabel } from '@/lib/ui-labels';

export default function PalmaresPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const [activeCategory, setActiveCategory] = useState('');

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, categories, isLoading, error } = useMeetingRows(meetingId);

  // Default to first available category; keep selection if still valid.
  const currentTab = categories.includes(activeCategory) ? activeCategory : (categories[0] ?? '');

  const filteredRows = useMemo(
    () => rows.filter((r) => r.name === currentTab),
    [rows, currentTab]
  );

  const awards = useMemo(() => computeFunAwards(filteredRows), [filteredRows]);

  const meeting = meetingState.currentMeeting;
  if (!meeting) return <Navigate to="/" replace />;
  if (isLoading) return <p className="text-[15px] text-ink-muted">Chargement…</p>;
  if (error) return <p className="text-sm text-error">{error}</p>;
  if (rows.length === 0) return <Navigate to="/import" replace />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Palmarès des rigolos"
        // "prix" is invariable in French, so no singular/plural helper is needed.
        subtitle={`${categoryShortLabel(currentTab)} · ${awards.length} prix`}
      />
      <FilterBar>
        <CategoryTabs categories={categories} active={currentTab} onChange={setActiveCategory} />
      </FilterBar>
      {awards.length === 0 ? (
        <p className="text-[15px] text-ink-muted">Aucun prix disponible pour cette catégorie.</p>
      ) : (
        <FunAwardsGrid awards={awards} />
      )}
    </div>
  );
}
