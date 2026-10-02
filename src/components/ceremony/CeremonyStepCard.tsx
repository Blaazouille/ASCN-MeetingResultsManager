/**
 * Responsabilité : carte d'une annonce en grand caractères (intitulé, nom à lire, points, nageurs à appeler, écart).
 * Appelé par : CeremonyRun.tsx.
 * Suppression casserait : l'affichage de l'annonce courante pendant la cérémonie.
 */
import type { CeremonyStep } from '@/lib/ceremony-script';
import { gapLabel, stepContext, stepHeading, winnerLine } from '@/lib/ceremony-labels';
import { ASCN_CLUB_NAME } from '@/lib/utils';
import { ClubTag } from '@/components/ui/ClubTag';
import { RankChip } from '@/components/ui/RankChip';

export interface CeremonyStepCardProps {
  step: CeremonyStep;
}

// Sizes are larger than on the other screens: the manager reads this card
// standing, at arm's length, while announcing or prompting the speaker.
export function CeremonyStepCard({ step }: CeremonyStepCardProps): JSX.Element {
  const tied = step.winners.length > 1;
  return (
    <article aria-live="polite" className="flex flex-col gap-6 rounded-xl bg-surface-raised px-10 py-8 shadow-card">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold uppercase tracking-[0.08em] text-ink-muted">{stepContext(step)}</span>
        <div className="flex items-center gap-4">
          {step.rank !== null && <RankChip rank={step.rank} size="lg" tied={tied} />}
          <h2 className="font-display text-[56px] font-bold leading-none text-marine">{stepHeading(step)}</h2>
        </div>
        {tied && (
          <p className="text-base font-semibold text-corail-strong">
            Ex æquo&nbsp;: {step.winners.length} gagnants à annoncer ensemble.
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-5">
        {step.winners.map((winner) => (
          <li key={`${winner.name}|${winner.club}`} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-[44px] font-bold leading-tight text-ink">{winner.name}</span>
              {winner.club === ASCN_CLUB_NAME && <ClubTag />}
            </div>
            <span className="text-xl font-semibold tabular-nums text-ink-soft">{winnerLine(winner)}</span>
            {winner.swimmers.length > 0 && (
              <p className="text-lg text-ink-soft">
                <span className="font-semibold">Nageurs à appeler&nbsp;:</span> {winner.swimmers.join(', ')}
              </p>
            )}
          </li>
        ))}
      </ul>

      {step.gapToNext !== null && (
        <span className="self-start rounded-full bg-surface-sunken px-3 py-1 text-base font-semibold tabular-nums text-ink-soft">
          {gapLabel(step.gapToNext)}
        </span>
      )}
    </article>
  );
}
