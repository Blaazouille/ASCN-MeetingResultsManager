/**
 * Responsabilité : état de la section « Mises à jour » (dernière vérification mémorisée, vérification à la demande).
 * Appelé par : UpdateSection.tsx.
 * Suppression casserait : la section « Mises à jour » de Paramètres.
 */
import { useCallback, useEffect, useState } from 'react';
import type { UpdateStatus } from '@/lib/update-status';

export interface UseUpdateStatusResult {
  status: UpdateStatus | null;
  isChecking: boolean;
  checkNow: () => Promise<void>;
}

export function useUpdateStatus(): UseUpdateStatusResult {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const load = (): void => {
      // getUpdateStatus waits for a check already in progress (startup check or
      // a click elsewhere), so "Vérification en cours…" is shown meanwhile.
      setIsChecking(true);
      void window.electronAPI
        .getUpdateStatus()
        .then(setStatus)
        .finally(() => setIsChecking(false));
    };
    load();
    // Paramètres opened in the first 5 s, before the startup check starts, read
    // the previous result: reload when that check ends with a download.
    return window.electronAPI.onUpdateDownloaded(load);
  }, []);

  const checkNow = useCallback(async (): Promise<void> => {
    setIsChecking(true);
    try {
      // Never rejects: the main process turns every failure into a 'failed' status.
      setStatus(await window.electronAPI.checkForUpdatesNow());
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { status, isChecking, checkNow };
}
