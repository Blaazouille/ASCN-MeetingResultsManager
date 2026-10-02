/**
 * Responsabilité : carte « Notre club » au-dessus du podium : rang, points, écarts et nageurs du club dans chaque catégorie active.
 * Appelé par : RankingPage.tsx.
 * Suppression casserait : la réponse en un coup d'œil à « on est où ? » sur l'écran Classement (issue #25).
 */
import { ChevronRight } from 'lucide-react';
import type { ClubSummary } from '@/lib/club-summary';
import { bestSwimmerLabel, clubGapLabels, clubRankLabel, clubSwimmersLabel } from '@/lib/club-summary-labels';
import { categoryShortLabel, readableClubName } from '@/lib/ui-labels';
import { cn, formatPoints } from '@/lib/utils';
import { ClubTag } from '@/components/ui/ClubTag';

export interface OurClubCardProps {
  summary: ClubSummary;
  /** Category whose tab is open: its line is marked so the card and the table read together. */
  category: string;
  /** Opens that category's tab and shows our club's row in the table. */
  onSelect: (category: string) => void;
}

export function OurClubCard({ summary, category, onSelect }: OurClubCardProps): JSX.Element {
  return (
    <section aria-labelledby="our-club-card-title" className="overflow-hidden rounded-lg border-l-4 border-corail bg-surface-raised shadow-card">
      <header className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-5">
        <h2 id="our-club-card-title" className="font-display text-2xl font-bold text-marine">
          {readableClubName(summary.club)}
        </h2>
        <ClubTag />
      </header>
      <ul>
        {summary.categories.map((line) => {
          const { status } = line;
          const current = line.category === category;
          return (
            <li key={line.category} className="border-t border-line">
              {/* One button per line: the whole line is the target, as in the ranking table (≥ 44 px high). */}
              <button
                type="button"
                aria-current={current ? 'true' : undefined}
                onClick={() => onSelect(line.category)}
                className={cn(
                  'grid min-h-[56px] w-full grid-cols-[100px_170px_100px_minmax(0,1fr)_20px] items-center gap-4 px-6 py-3 text-left transition-colors hover:bg-corail-wash',
                  current && 'bg-corail-wash'
                )}
              >
                <span className="text-[15px] font-semibold text-ink">{categoryShortLabel(line.category)}</span>
                <span className="font-display text-[22px] font-bold tabular-nums text-corail-strong">
                  {status.kind === 'ranked' ? clubRankLabel(status.rank, status.tied, status.clubCount) : '—'}
                </span>
                <span className="text-right font-display text-[22px] font-bold tabular-nums text-ink">
                  {status.kind === 'ranked' ? formatPoints(status.totalPoints) : '—'}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5 text-sm tabular-nums">
                  {clubGapLabels(status).map((label) => (
                    <span key={label} className={cn(status.kind === 'ranked' ? 'font-semibold text-ink' : 'text-ink-muted')}>
                      {label}
                    </span>
                  ))}
                  {line.entered > 0 && <span className="text-ink-muted">{clubSwimmersLabel(status, line.entered)}</span>}
                  {line.bestSwimmer && <span className="text-ink-muted">{bestSwimmerLabel(line.bestSwimmer, line.category)}</span>}
                </span>
                <ChevronRight className="h-5 w-5 text-ink-muted" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
