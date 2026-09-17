/**
 * Responsabilité : grille d'affichage des prix humoristiques (palmarès des rigolos).
 * Appelé par : IndividualPage.tsx.
 * Suppression casserait : la section "Palmarès des rigolos" de la page individuelle.
 */
import type { FunAward } from '@/lib/fun-awards';

export interface FunAwardsGridProps {
  awards: FunAward[];
}

export function FunAwardsGrid({ awards }: FunAwardsGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {awards.map((award) => (
        <div
          key={award.id}
          className="rounded-lg border border-neutral-200 bg-neutral-0 p-4 shadow-card"
        >
          {/* Title row */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              {award.emoji}
            </span>
            <h3 className="text-sm font-semibold text-primary-800">{award.title}</h3>
          </div>

          {/* Winner info */}
          <p className="font-medium text-neutral-900">{award.winner.name}</p>
          <p className="text-xs text-secondary-700">{award.winner.club}</p>
          <p className="mt-1 text-xs text-neutral-600">{award.winner.detail}</p>
        </div>
      ))}
    </div>
  );
}
