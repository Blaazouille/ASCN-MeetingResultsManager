import type { Meeting } from '@/lib/db';
import { cn } from '@/lib/utils';

export interface MeetingCardProps {
  meeting: Meeting;
  onOpen: (meeting: Meeting) => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export function MeetingCard({ meeting, onOpen }: MeetingCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen(meeting)}
      className="flex w-full items-center justify-between rounded-lg bg-neutral-0 p-4 text-left shadow-card transition-shadow duration-150 hover:shadow-card-hover"
    >
      <div>
        <p className="font-display text-base font-semibold text-primary-800">{meeting.name}</p>
        <p className="text-sm text-neutral-600">
          {DATE_FORMATTER.format(new Date(meeting.date))}
          {meeting.location ? ` — ${meeting.location}` : ''}
        </p>
      </div>
      <span
        className={cn(
          'rounded-sm px-2 py-1 text-xs font-medium uppercase tracking-wide',
          meeting.status === 'final' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
        )}
      >
        {meeting.status === 'final' ? 'Définitif' : 'Provisoire'}
      </span>
    </button>
  );
}
