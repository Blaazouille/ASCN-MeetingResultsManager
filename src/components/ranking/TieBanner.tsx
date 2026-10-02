/**
 * Responsabilité : bandeau corail signalant une égalité sur le podium ou un prix, à départager par le gérant.
 * Appelé par : RankingPage.tsx, IndividualPage.tsx.
 * Suppression casserait : l'alerte d'égalité en haut des écrans de classement.
 */
import { AlertTriangle } from 'lucide-react';
import { tieAlertLabel } from '@/lib/ui-labels';

export interface TieBannerProps {
  /** Tied ranks within the podium/prizes; renders nothing when empty. */
  ranks: number[];
  category: string;
}

export function TieBanner({ ranks, category }: TieBannerProps): JSX.Element | null {
  if (ranks.length === 0) return null;
  return (
    <p
      role="alert"
      className="flex items-center gap-3 rounded-lg border border-corail-line bg-corail-wash px-5 py-3 text-base font-semibold text-corail-strong"
    >
      <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
      {tieAlertLabel(ranks, category)}
    </p>
  );
}
