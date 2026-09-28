/**
 * Responsabilité : détail déplié d'un club : phrase de synthèse et cartes des nageurs comptés.
 * Appelé par : TeamRow.tsx.
 * Suppression casserait : le détail des nageurs affiché quand on déplie une ligne club.
 */
import type { SwimmerEntry } from '@/lib/ranking-engine';
import { detectGender } from '@/lib/individual-ranking';
import { birthLabel, countedSummary } from '@/lib/ui-labels';
import { cn, formatPoints } from '@/lib/utils';

export interface SwimmerDetailProps {
  /** The swimmers counted in the total (top N slice). */
  swimmers: SwimmerEntry[];
  /** Swimmers the club entered in this category. */
  entered: number;
  /** Category name, e.g. "Classement Dames": tells "Né" from "Née". */
  category: string;
  isOwnClub: boolean;
}

export function SwimmerDetail({ swimmers, entered, category, isOwnClub }: SwimmerDetailProps): JSX.Element {
  const gender = detectGender(category);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-muted">{countedSummary(swimmers.length, entered)}</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
        {/* Keyed on array index: swimmers is a fresh, stable slice built by computeTeamRanking
            for this render and is never sorted/filtered afterwards; rank and names can repeat. */}
        {swimmers.map((swimmer, index) => (
          <div
            key={index}
            className={cn(
              'flex flex-col gap-0.5 rounded-md border bg-surface-raised px-4 py-3',
              isOwnClub ? 'border-corail-line' : 'border-line'
            )}
          >
            <span className="text-[15px] font-semibold text-ink">
              {swimmer.lastname.toUpperCase()} {swimmer.firstname}
            </span>
            <span className="text-[13px] text-ink-muted">{birthLabel(swimmer.birthyear, gender)}</span>
            <span className="font-display text-[22px] font-bold tabular-nums text-marine">
              {formatPoints(swimmer.points)} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
