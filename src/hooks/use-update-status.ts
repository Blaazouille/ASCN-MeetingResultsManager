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
      void window.electronAPI.getUpdateStatus().then(setStatus);
    };
    load();
    // The startup check can finish while Paramètres is already open: reload
    // when a download completes so the section doesn't stay on a stale status.
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
