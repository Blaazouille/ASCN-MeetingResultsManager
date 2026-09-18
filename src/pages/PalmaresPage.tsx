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
  if (isLoading) return <p className="text-neutral-600">Chargement…</p>;
  if (error) return <p className="text-sm text-error">{error}</p>;
  if (rows.length === 0) return <Navigate to="/import" replace />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Palmarès des rigolos</h1>
        <p className="text-neutral-600">{meeting.name}</p>
      </header>

      <CategoryTabs categories={categories} active={currentTab} onChange={setActiveCategory} />

      {awards.length === 0 ? (
        <p className="text-sm text-neutral-600">Aucun prix disponible pour cette catégorie.</p>
      ) : (
        <FunAwardsGrid awards={awards} />
      )}
    </div>
  );
}
