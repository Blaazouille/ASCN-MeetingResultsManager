/**
 * Responsabilité : carte résumant un meeting (nom, date de création, statut) sur l'écran d'accueil.
 * Appelé par : MeetingList.tsx.
 * Suppression casserait : l'affichage de la liste des meetings.
 */
import type { Meeting } from '@/lib/db';
import { formatMeetingCreatedAt, meetingStatusLabel } from '@/lib/export-data';
import { cn } from '@/lib/utils';

export interface MeetingCardProps {
  meeting: Meeting;
  onOpen: (meeting: Meeting) => void;
}

export function MeetingCard({ meeting, onOpen }: MeetingCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen(meeting)}
      className="flex w-full items-center justify-between rounded-lg bg-neutral-0 p-4 text-left shadow-card transition-shadow duration-150 hover:shadow-card-hover"
    >
      <div>
        <p className="font-display text-base font-semibold text-primary-800">{meeting.name}</p>
        <p className="text-sm text-neutral-600">Créé le {formatMeetingCreatedAt(meeting)}</p>
      </div>
      <span
        className={cn(
          'rounded-sm px-2 py-1 text-xs font-medium uppercase tracking-wide',
          meeting.status === 'final' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
        )}
      >
        {meetingStatusLabel(meeting.status)}
      </span>
    </button>
  );
}
