/**
 * Responsabilité : carte « Meeting ouvert » (nom + statut) ou « Aucun meeting ouvert » dans la barre latérale.
 * Appelé par : Sidebar.tsx.
 * Suppression casserait : l'indication permanente du meeting en cours et de son statut.
 */
import type { Meeting } from '@/lib/db';
import { meetingBadgeStatus } from '@/lib/ui-labels';
import { StatusBadge } from '@/components/ui/StatusBadge';

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
    <div className="flex flex-col gap-2 rounded-lg bg-marine-raised p-3.5">
      <span className={CARD_LABEL}>Meeting ouvert</span>
      <span className="text-base font-semibold leading-tight text-on-marine">{meeting.name}</span>
      <span>
        <StatusBadge status={meetingBadgeStatus(meeting)} />
      </span>
    </div>
  );
}
