/**
 * Responsabilité : numéro de rang, aux couleurs de la médaille pour les trois premiers.
 * Appelé par : PodiumCards.tsx, TeamRankingTable.tsx, IndividualRankingTable.tsx.
 * Suppression casserait : l'affichage des rangs dans les classements.
 */
import { placeLabel } from '@/lib/ui-labels';
import { cn } from '@/lib/utils';

// Ink digits on the medal colours: white on gold was about 2:1.
const MEDAL_CLASSES: Record<number, string> = {
  1: 'bg-medal-gold text-ink',
  2: 'bg-medal-silver text-ink',
  3: 'bg-medal-bronze text-ink',
};

export interface RankChipProps {
  rank: number;
  size?: 'md' | 'lg';
}

export function RankChip({ rank, size = 'md' }: RankChipProps): JSX.Element {
  return (
    <span
      aria-label={placeLabel(rank)}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-display font-bold tabular-nums',
        size === 'lg' ? 'h-10 w-10 rounded-full text-[22px]' : 'h-[34px] w-[34px] rounded-sm text-[19px]',
        MEDAL_CLASSES[rank] ?? 'text-ink-soft'
      )}
    >
      {rank}
    </span>
  );
}
