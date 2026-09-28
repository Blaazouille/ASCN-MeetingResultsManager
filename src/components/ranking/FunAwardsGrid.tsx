/**
 * Responsabilité : grille d'affichage des prix humoristiques (palmarès des rigolos).
 * Appelé par : PalmaresPage.tsx.
 * Suppression casserait : la section "Palmarès des rigolos" de PalmaresPage.tsx.
 */
import { Camera, Crown, Hourglass, Sprout, UsersRound, Zap, type LucideIcon } from 'lucide-react';
import type { FunAward, FunAwardIcon } from '@/lib/fun-awards';
import { cn } from '@/lib/utils';

const ICONS: Record<FunAwardIcon, { Icon: LucideIcon; tone: string }> = {
  hourglass: { Icon: Hourglass, tone: 'bg-corail-wash text-corail-strong' },
  sprout: { Icon: Sprout, tone: 'bg-success-light text-success' },
  duo: { Icon: UsersRound, tone: 'bg-bassin-soft text-bassin-strong' },
  camera: { Icon: Camera, tone: 'bg-bassin-soft text-bassin-strong' },
  crown: { Icon: Crown, tone: 'bg-warning-light text-warning' },
  zap: { Icon: Zap, tone: 'bg-marine-soft text-marine' },
};

export interface FunAwardsGridProps {
  awards: FunAward[];
}

export function FunAwardsGrid({ awards }: FunAwardsGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
      {awards.map((award) => {
        const { Icon, tone } = ICONS[award.icon];
        return (
          <article key={award.id} className="flex flex-col gap-3.5 rounded-xl bg-surface-raised p-6 shadow-card">
            <div className="flex items-center gap-3.5">
              <span className={cn('flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px]', tone)}>
                <Icon className="h-[26px] w-[26px]" aria-hidden />
              </span>
              <h2 className="font-display text-[28px] font-bold leading-tight text-marine">{award.title}</h2>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-semibold text-ink">{award.winner.name}</span>
              {/* Club prizes use the club as the winner's name: don't print it twice. */}
              {award.winner.club !== award.winner.name && (
                <span className="text-[15px] font-medium text-bassin-strong">{award.winner.club}</span>
              )}
            </div>
            <span className="self-start rounded-full bg-surface-sunken px-3 py-1 text-sm font-semibold text-ink-soft">
              {award.winner.detail}
            </span>
          </article>
        );
      })}
    </div>
  );
}
