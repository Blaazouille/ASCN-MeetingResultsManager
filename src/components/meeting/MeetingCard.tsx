/**
 * Responsabilité : ligne résumant un meeting (nom, date de création, nombre de résultats, statut) sur l'Accueil, avec ouverture et suppression.
 * Appelé par : MeetingList.tsx.
 * Suppression casserait : l'affichage de la liste des meetings.
 */
import { ChevronRight, Trash2 } from 'lucide-react';
import type { Meeting } from '@/lib/db';
import { formatMeetingCreatedAt } from '@/lib/export-data';
import { meetingBadgeStatus, resultCountLabel } from '@/lib/ui-labels';
import { StatusBadge } from '@/components/ui/StatusBadge';

export interface MeetingCardProps {
  meeting: Meeting;
  onOpen: (meeting: Meeting) => void;
  onDelete: (meeting: Meeting) => void;
}

export function MeetingCard({ meeting, onOpen, onDelete }: MeetingCardProps): JSX.Element {
  // Two sibling buttons rather than a button inside a button (invalid HTML, and
  // the trash click would also open the meeting).
  return (
    <div className="flex items-center transition-colors hover:bg-surface">
      <button
        type="button"
        onClick={() => onOpen(meeting)}
        className="flex flex-1 items-center gap-4 py-4 pl-5 text-left"
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
      <button
        type="button"
        onClick={() => onDelete(meeting)}
        aria-label={`Supprimer le meeting ${meeting.name}`}
        className="mx-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-error-light hover:text-error"
      >
        <Trash2 className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
