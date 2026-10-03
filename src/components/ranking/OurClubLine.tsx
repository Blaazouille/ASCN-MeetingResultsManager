/**
 * Responsabilité : ligne compacte « Notre club » de la barre de filtres : rang, points et écarts du club dans la catégorie affichée.
 * Appelé par : RankingPage.tsx (via le créneau `ourClub` de RankingToolbar).
 * Suppression casserait : la réponse en un coup d'œil à « on est où ? » sur l'écran Classement (issues #25, #64).
 */
import { ArrowRight } from 'lucide-react';
import type { ClubSummary } from '@/lib/club-summary';
import { clubRankLabel, clubStandingParts } from '@/lib/club-summary-labels';
import { ClubTag } from '@/components/ui/ClubTag';

export interface OurClubLineProps {
  summary: ClubSummary;
  /** Shows our club's row in the table (unfolded, scrolled to, focused). */
  onSelect: () => void;
}

export function OurClubLine({ summary, onSelect }: OurClubLineProps): JSX.Element {
  const { status } = summary;
  const details = clubStandingParts(status).join(' · ');

  // Only a ranked club has a row in the table: the other cases are plain
  // text, a button that leads nowhere would only puzzle the volunteer.
  if (status.kind !== 'ranked') {
    return (
      <p className="flex min-h-[44px] items-center gap-3 whitespace-nowrap px-3 text-[15px] text-ink-muted">
        <ClubTag />
        {details}
      </p>
    );
  }

  // nowrap: the line is read in one glance; the filter bar moves it to a row of its own rather than breaking it.
  return (
    <button
      type="button"
      onClick={onSelect}
      title="Voir notre club dans le tableau"
      className="flex min-h-[44px] items-center gap-3 whitespace-nowrap rounded-sm px-3 text-left tabular-nums transition-colors hover:bg-corail-wash"
    >
      <ClubTag />
      {/* One inline run so the « · » sits evenly between the rank and the rest, on a shared baseline. */}
      <span className="text-[15px] font-semibold text-ink">
        <span className="font-display text-xl font-bold text-corail-strong">
          {clubRankLabel(status.rank, status.tied, status.clubCount)}
        </span>
        {' · '}
        {details}
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
    </button>
  );
}
