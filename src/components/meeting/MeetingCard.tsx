/**
 * Responsabilité : ligne résumant un meeting (nom, création, clubs, nageurs, dernier import, pastilles « À importer » / « Exemple ») sur l'Accueil, avec ouverture et suppression.
 * Appelé par : MeetingList.tsx.
 * Suppression casserait : l'affichage de la liste des meetings.
 */
import { ChevronRight, Trash2 } from 'lucide-react';
import type { Meeting } from '@/lib/db';
import { formatMeetingCreatedAt, formatMeetingImportedAt } from '@/lib/export-data';
import { lastImportLabel, meetingStatsLabel } from '@/lib/ui-labels';
import { ImportPendingBadge } from '@/components/ui/ImportPendingBadge';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { cn } from '@/lib/utils';

export interface MeetingCardProps {
  meeting: Meeting;
  onOpen: (meeting: Meeting) => void;
  onDelete: (meeting: Meeting) => void;
}

export function MeetingCard({ meeting, onOpen, onDelete }: MeetingCardProps): JSX.Element {
  const hasResults = meeting.resultCount > 0;
  // Null for a meeting imported before the date was tracked: show no line rather than a wrong one.
  const importedAt = formatMeetingImportedAt(meeting);

  // Two sibling buttons rather than a button inside a button (invalid HTML, and
  // the trash click would also open the meeting).
  return (
    // Dashed outline + badge: the training meeting must never pass for a real one.
    <div
      className={cn(
        'flex items-center transition-colors hover:bg-surface',
        meeting.isDemo && 'm-1 rounded-md border-2 border-dashed border-warning'
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(meeting)}
        className="flex flex-1 items-center gap-4 py-4 pl-5 text-left"
      >
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2 text-[17px] font-semibold text-ink">
            {meeting.name}
            {meeting.isDemo && <DemoBadge />}
          </span>
          <span className="text-sm text-ink-muted">
            Créé le {formatMeetingCreatedAt(meeting)}
            {hasResults && ` · ${meetingStatsLabel(meeting.clubCount, meeting.swimmerCount)}`}
          </span>
          {hasResults && importedAt && (
            <span className="text-[13px] text-ink-muted">{lastImportLabel(importedAt)}</span>
          )}
        </span>
        {!hasResults && <ImportPendingBadge />}
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
