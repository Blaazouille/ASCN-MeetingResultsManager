/**
 * Responsabilité : écran de paramètres (config meeting et règles de calcul).
 * Appelé par : App.tsx (route "parametres").
 * Suppression casserait : l'écran de paramètres.
 */
import { useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { BackupSection } from '@/components/settings/BackupSection';
import { BackupConfigSection } from '@/components/settings/BackupConfigSection';

export default function SettingsPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const meeting = meetingState.currentMeeting;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Paramètres</h1>
        {meeting && <p className="text-neutral-600">{meeting.name}</p>}
      </header>
      {meeting ? (
        <SettingsForm
          meeting={meeting}
          onSave={async (input) => {
            await meetingState.updateMeeting(meeting.id, input);
          }}
        />
      ) : (
        <p className="text-sm text-neutral-600">
          Ouvrez un meeting pour accéder à ses règles de calcul. La sauvegarde et la restauration
          ci-dessous fonctionnent sans meeting ouvert.
        </p>
      )}
      <BackupSection onRestored={meetingState.refresh} />
      <BackupConfigSection />
    </div>
  );
}
