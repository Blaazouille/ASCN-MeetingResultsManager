/**
 * Responsabilité : écran de paramètres (config meeting et règles de calcul).
 * Appelé par : App.tsx (route "parametres").
 * Suppression casserait : l'écran de paramètres.
 */
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { BackupSection } from '@/components/settings/BackupSection';

export default function SettingsPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const meeting = meetingState.currentMeeting;

  if (!meeting) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Paramètres</h1>
        <p className="text-neutral-600">{meeting.name}</p>
      </header>
      <SettingsForm
        meeting={meeting}
        onSave={async (input) => {
          await meetingState.updateMeeting(meeting.id, input);
        }}
      />
      <BackupSection />
    </div>
  );
}
