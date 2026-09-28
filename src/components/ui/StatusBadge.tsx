/**
 * Responsabilité : pastille de statut d'un meeting (Provisoire, Définitif, À importer).
 * Appelé par : SidebarMeetingCard.tsx, MeetingCard.tsx, ResumeMeetingCard.tsx.
 * Suppression casserait : l'affichage du statut des meetings.
 */
import { meetingStatusLabel } from '@/lib/export-data';
import type { BadgeStatus } from '@/lib/ui-labels';
import { cn } from '@/lib/utils';

// Dark text on a light tint of the same family: never yellow on yellow.
const BADGE_CLASSES: Record<BadgeStatus, string> = {
  provisional: 'bg-warning-light text-warning',
  final: 'bg-success-light text-success',
  pending: 'bg-surface-sunken text-ink-soft',
};

export interface StatusBadgeProps {
  status: BadgeStatus;
}

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[13px] font-semibold leading-[18px]',
        BADGE_CLASSES[status]
      )}
    >
      {status === 'pending' ? 'À importer' : meetingStatusLabel(status)}
    </span>
  );
}
