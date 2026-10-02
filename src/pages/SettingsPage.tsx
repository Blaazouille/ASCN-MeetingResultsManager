/**
 * Responsabilité : écran de paramètres (config meeting et règles de calcul).
 * Appelé par : App.tsx (route "parametres").
 * Suppression casserait : l'écran de paramètres.
 */
import { useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { BackupSection } from '@/components/settings/BackupSection';
import { OurClubSection } from '@/components/settings/OurClubSection';
import { reloadOurClub } from '@/hooks/use-our-club';
import { BackupConfigSection } from '@/components/settings/BackupConfigSection';
import { UpdateSection } from '@/components/settings/UpdateSection';

export default function SettingsPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const meeting = meetingState.currentMeeting;

  // A restore replaces the club setting along with the meetings.
  const onRestored = async (): Promise<void> => {
    await Promise.all([meetingState.refresh(), reloadOurClub()]);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader overline={meeting?.name} title="Paramètres" />
      {meeting ? (
        <SettingsForm
          meeting={meeting}
          onSave={async (input) => {
            await meetingState.updateMeeting(meeting.id, input);
          }}
        />
      ) : (
        <p className="text-[15px] text-ink-muted">
          Ouvrez un meeting pour accéder à ses règles de calcul. La sauvegarde et la restauration
          ci-dessous fonctionnent sans meeting ouvert.
        </p>
      )}
      {/* Outside SettingsForm: the club is app-wide, the same from one meeting to the next, and settable with no meeting open. */}
      <OurClubSection meeting={meeting} />
      <BackupSection onRestored={onRestored} />
      <BackupConfigSection />
      <UpdateSection />
    </div>
  );
}
