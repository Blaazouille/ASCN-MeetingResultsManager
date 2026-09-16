import type { Meeting } from '@/lib/db';
import { MeetingCard } from './MeetingCard';

export interface MeetingListProps {
  meetings: Meeting[];
  onOpen: (meeting: Meeting) => void;
}

export function MeetingList({ meetings, onOpen }: MeetingListProps): JSX.Element {
  if (meetings.length === 0) {
    return <p className="text-neutral-600">Aucun meeting pour l'instant — créez-en un pour commencer.</p>;
  }

  return (
    <ul className="space-y-3">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <MeetingCard meeting={meeting} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
