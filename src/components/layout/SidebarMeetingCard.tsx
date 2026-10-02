/**
 * Responsabilité : carte « Meeting ouvert » (nom + pastilles « À importer » / « Exemple ») ou « Aucun meeting ouvert » dans la barre latérale.
 * Appelé par : Sidebar.tsx.
 * Suppression casserait : l'indication permanente du meeting en cours.
 */
import type { Meeting } from '@/lib/db';
import { ImportPendingBadge } from '@/components/ui/ImportPendingBadge';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { cn } from '@/lib/utils';

const CARD_LABEL = 'text-xs font-semibold uppercase tracking-[0.08em] text-on-marine-muted';

export interface SidebarMeetingCardProps {
  meeting: Meeting | null;
}

export function SidebarMeetingCard({ meeting }: SidebarMeetingCardProps): JSX.Element {
  if (!meeting) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border-[1.5px] border-dashed border-marine-line p-3.5">
        <span className={CARD_LABEL}>Aucun meeting ouvert</span>
        <span className="text-sm leading-snug text-on-marine-subtle">
          Ouvrez ou créez un meeting pour accéder à l'import et aux résultats.
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg bg-marine-raised p-3.5',
        meeting.isDemo && 'border-2 border-dashed border-warning-light'
      )}
    >
      <span className={CARD_LABEL}>Meeting ouvert</span>
      <span className="text-base font-semibold leading-tight text-on-marine">{meeting.name}</span>
      {(meeting.isDemo || meeting.resultCount === 0) && (
        <span className="flex flex-wrap gap-1.5">
          {meeting.isDemo && <DemoBadge />}
          {meeting.resultCount === 0 && <ImportPendingBadge />}
        </span>
      )}
    </div>
  );
}
