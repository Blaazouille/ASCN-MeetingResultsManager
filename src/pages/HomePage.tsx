/**
 * Responsabilité : écran d'accueil (liste des meetings, création, ouverture).
 * Appelé par : App.tsx (route index).
 * Suppression casserait : l'écran d'accueil de l'application.
 */
import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import type { Meeting } from '@/lib/db';
import { DeleteMeetingDialog } from '@/components/meeting/DeleteMeetingDialog';
import { MeetingForm } from '@/components/meeting/MeetingForm';
import { MeetingList } from '@/components/meeting/MeetingList';
import { ResumeMeetingCard } from '@/components/meeting/ResumeMeetingCard';

const STEPS = ['Créer le meeting', "Importer le CSV exporté d'extraNat", 'Consulter, puis exporter en PDF'] as const;

export default function HomePage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const navigate = useNavigate();
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  // getAllMeetings returns meetings by id DESC: the first one is the most recent.
  const latest = meetingState.meetings[0];

  // An existing meeting opens on its ranking (RankingPage redirects to /import
  // when it has no results); a new one goes straight to Import.
  const openAt = (meeting: Meeting, path: '/classement' | '/import'): void => {
    meetingState.selectMeeting(meeting.id);
    navigate(path);
  };

  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Meetings" subtitle="Reprenez là où vous en étiez, ou créez le meeting du jour." />

      {meetingState.error && <p className="text-sm text-error">{meetingState.error}</p>}

      {latest && (
        <ResumeMeetingCard
          meeting={latest}
          onOpenRanking={() => openAt(latest, '/classement')}
          onImport={() => openAt(latest, '/import')}
        />
      )}

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-6">
        <section aria-labelledby="all-meetings" className="flex flex-col gap-3">
          <h2 id="all-meetings" className="font-display text-2xl font-bold text-marine">
            Tous les meetings
          </h2>
          {meetingState.isLoading ? (
            <p className="text-[15px] text-ink-muted">Chargement des meetings…</p>
          ) : (
            <MeetingList
              meetings={meetingState.meetings}
              onOpen={(meeting) => openAt(meeting, '/classement')}
              onDelete={setMeetingToDelete}
            />
          )}
        </section>

        <section aria-labelledby="new-meeting" className="flex flex-col gap-3">
          <h2 id="new-meeting" className="font-display text-2xl font-bold text-marine">
            Nouveau meeting
          </h2>
          <MeetingForm
            onSubmit={async (input) => {
              const meeting = await meetingState.createMeeting(input);
              openAt(meeting, '/import');
            }}
          />
          {/* Numbered because it is a real sequence: the order is the information. */}
          <ol className="flex flex-col gap-2.5 pt-1">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-[15px] text-ink-soft">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bassin-soft font-bold text-bassin-strong">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {meetingToDelete && (
        <DeleteMeetingDialog
          meeting={meetingToDelete}
          onCancel={() => setMeetingToDelete(null)}
          onConfirm={async () => {
            await meetingState.deleteMeeting(meetingToDelete.id);
            setMeetingToDelete(null);
          }}
        />
      )}
    </div>
  );
}
