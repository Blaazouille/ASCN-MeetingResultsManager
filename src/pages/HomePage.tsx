/**
 * Responsabilité : écran d'accueil (liste des meetings, création, ouverture).
 * Appelé par : App.tsx (route index).
 * Suppression casserait : l'écran d'accueil de l'application.
 */
import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import type { Meeting } from '@/lib/db';
import { MeetingForm } from '@/components/meeting/MeetingForm';
import { MeetingList } from '@/components/meeting/MeetingList';

export default function HomePage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const openMeeting = (meeting: Meeting): void => {
    meetingState.selectMeeting(meeting.id);
    navigate('/import');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">Meetings</h1>
          <p className="text-neutral-600">Créez un meeting ou reprenez un précédent.</p>
        </div>
        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="rounded-md bg-secondary-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-secondary-700"
          >
            Nouveau meeting
          </button>
        )}
      </header>

      {meetingState.error && <p className="text-sm text-error">{meetingState.error}</p>}

      {isCreating && (
        <MeetingForm
          onCancel={() => setIsCreating(false)}
          onSubmit={async (input) => {
            const meeting = await meetingState.createMeeting(input);
            setIsCreating(false);
            openMeeting(meeting);
          }}
        />
      )}

      {meetingState.isLoading ? (
        <p className="text-neutral-600">Chargement des meetings…</p>
      ) : (
        <MeetingList meetings={meetingState.meetings} onOpen={openMeeting} />
      )}
    </div>
  );
}
