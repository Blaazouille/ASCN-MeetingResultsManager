/**
 * Responsabilité : accès secondaire au meeting d'entraînement sur l'Accueil (le créer, télécharger son CSV d'exemple).
 * Appelé par : HomePage.tsx.
 * Suppression casserait : la possibilité de répéter le parcours avant le jour J sans toucher aux vrais meetings.
 */
import { useState } from 'react';
import { Download, GraduationCap } from 'lucide-react';
import { downloadBlob } from '@/lib/download';

// Same name as resources/meeting-exemple.csv, so the volunteer recognises it among their downloads.
const DEMO_CSV_FILENAME = 'meeting-exemple.csv';

export interface TrainingSectionProps {
  onStart: () => Promise<void>;
}

const LINK_CLASSES =
  'inline-flex min-h-11 items-center gap-2 text-left text-[15px] font-semibold text-bassin-strong underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60';

export function TrainingSection({ onStart }: TrainingSectionProps): JSX.Element {
  const [isStarting, setIsStarting] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const start = async (): Promise<void> => {
    setIsStarting(true);
    try {
      await onStart();
    } catch {
      // Already shown at the top of Accueil by useMeeting: nothing more to say here.
    } finally {
      setIsStarting(false);
    }
  };

  // The file comes from the main process (embedded in the app): no network, no file to look for.
  const downloadCsv = async (): Promise<void> => {
    setDownloadError(null);
    try {
      const bytes = await window.electronAPI.getDemoCsv();
      downloadBlob(new Blob([bytes], { type: 'text/csv' }), DEMO_CSV_FILENAME);
    } catch {
      setDownloadError("Le fichier d'exemple n'a pas pu être téléchargé. Vous pouvez réessayer.");
    }
  };

  return (
    <section aria-labelledby="training" className="flex flex-col gap-1 border-t border-line pt-4">
      <h2 id="training" className="sr-only">
        Entraînement
      </h2>
      <button type="button" onClick={() => void start()} disabled={isStarting} className={LINK_CLASSES}>
        <GraduationCap className="h-5 w-5 shrink-0" aria-hidden />
        S'entraîner avec un meeting d'exemple
      </button>
      <p className="text-sm text-ink-muted">
        Des nageurs et des clubs fictifs, pour répéter tout le parcours sans toucher aux vrais résultats. Le relancer
        remet l'exemple à zéro.
      </p>
      <button type="button" onClick={() => void downloadCsv()} className={LINK_CLASSES}>
        <Download className="h-5 w-5 shrink-0" aria-hidden />
        Télécharger le CSV d'exemple (pour s'exercer à l'import)
      </button>
      {downloadError && <p className="text-sm text-error">{downloadError}</p>}
    </section>
  );
}
