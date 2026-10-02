/**
 * Responsabilité : les trois premiers clubs en cartes au-dessus du tableau, dans l'ordre de lecture 1-2-3.
 * Appelé par : RankingPage.tsx.
 * Suppression casserait : le résumé du podium sur l'écran de classement.
 */
import type { TeamResult } from '@/lib/ranking-engine';
import { tiedRanks } from '@/lib/rank-ties';
import { formatGap, placeLabel } from '@/lib/ui-labels';
import { cn, formatPoints } from '@/lib/utils';
import { RankChip } from '@/components/ui/RankChip';

export interface PodiumCardsProps {
  /** The full ranking (not the search-filtered view): the podium never changes while searching. */
  results: TeamResult[];
}

// Left to right 1-2-3, not the 2-1-3 podium shape: people read left to right.
// The 1st card is wider and navy so it still stands out.
export function PodiumCards({ results }: PodiumCardsProps): JSX.Element | null {
  // Filter on rank, not slice: tied clubs all stay on the podium, side by side.
  const podium = results.filter((team) => team.rank <= 3);
  const tied = tiedRanks(podium);
  if (podium.length === 0) return null;
  // noUncheckedIndexedAccess can't see the length guard above; the non-null assertion is safe here.
  const leaderPoints = podium[0]!.totalPoints;

  return (
    <section aria-label="Podium" className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4">
      {podium.map((team) => {
        const featured = team.rank === 1;
        return (
          <article
            key={team.club}
            className={cn(
              'flex min-w-0 flex-col gap-2.5 rounded-lg px-6 py-5',
              featured ? 'bg-marine text-on-marine shadow-raised' : 'bg-surface-raised text-ink shadow-card'
            )}
          >
            <div className="flex items-center gap-3">
              <RankChip rank={team.rank} size="lg" tied={tied.has(team.rank)} />
              <span
                className={cn(
                  'text-[13px] font-bold uppercase tracking-[0.08em]',
                  featured ? 'text-on-marine-muted' : 'text-ink-muted'
                )}
              >
                {placeLabel(team.rank)}
              </span>
            </div>
            {/* min-h reserves space for 2 lines at text-lg (1.75rem × 2 = 3.5rem) so the points row
                below stays aligned across cards whether the club name wraps to 1 or 2 lines. */}
            <span className="line-clamp-2 min-h-[3.5rem] break-words text-lg font-semibold">{team.club}</span>
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className={cn(
                  'font-display text-5xl font-bold leading-none tabular-nums',
                  featured ? 'text-on-marine' : 'text-marine'
                )}
              >
                {formatPoints(team.totalPoints)}
              </span>
              <span className={cn('text-[15px]', featured ? 'text-on-marine-muted' : 'text-ink-muted')}>
                {featured ? 'points' : `points · ${formatGap(team.totalPoints, leaderPoints)} du 1er`}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
