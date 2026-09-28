/**
 * Responsabilité : ligne résumant un meeting (nom, date de création, nombre de résultats, statut) sur l'Accueil.
 * Appelé par : MeetingList.tsx.
 * Suppression casserait : l'affichage de la liste des meetings.
 */
import { ChevronRight } from 'lucide-react';
import type { Meeting } from '@/lib/db';
import { formatMeetingCreatedAt } from '@/lib/export-data';
import { meetingBadgeStatus, resultCountLabel } from '@/lib/ui-labels';
import { StatusBadge } from '@/components/ui/StatusBadge';

export interface MeetingCardProps {
  meeting: Meeting;
  onOpen: (meeting: Meeting) => void;
}

export function MeetingCard({ meeting, onOpen }: MeetingCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen(meeting)}
      className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface"
    >
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[17px] font-semibold text-ink">{meeting.name}</span>
        <span className="text-sm text-ink-muted">
          Créé le {formatMeetingCreatedAt(meeting)} · {resultCountLabel(meeting.resultCount)}
        </span>
      </span>
      <StatusBadge status={meetingBadgeStatus(meeting)} />
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
    </button>
  );
}
