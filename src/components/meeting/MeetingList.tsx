/**
 * Responsabilité : liste des meetings (grille de MeetingCard).
 * Appelé par : HomePage.tsx.
 * Suppression casserait : l'affichage de la liste des meetings sur l'accueil.
 */
import type { Meeting } from '@/lib/db';
import { MeetingCard } from './MeetingCard';

export interface MeetingListProps {
  meetings: Meeting[];
  onOpen: (meeting: Meeting) => void;
}

export function MeetingList({ meetings, onOpen }: MeetingListProps): JSX.Element {
  if (meetings.length === 0) {
    return (
      <p className="rounded-lg bg-surface-raised p-5 text-[15px] text-ink-muted shadow-card">
        Aucun meeting pour l'instant. Créez-en un pour commencer.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg bg-surface-raised shadow-card">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <MeetingCard meeting={meeting} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
