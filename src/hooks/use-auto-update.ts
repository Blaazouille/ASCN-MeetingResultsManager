/**
 * Responsabilité : état et actions pour le toast de mise à jour (écoute update:downloaded, déclenche le redémarrage).
 * Appelé par : UpdateToast.tsx.
 * Suppression casserait : le toast de mise à jour ne s'affiche plus jamais.
 */
import { useCallback, useEffect, useState } from 'react';

export interface UseAutoUpdateResult {
  isUpdateReady: boolean;
  restartToUpdate: () => void;
  dismiss: () => void;
}

/** Subscribes to the main process's update-downloaded notification for the lifetime of the component. */
export function useAutoUpdate(): UseAutoUpdateResult {
  const [isUpdateReady, setIsUpdateReady] = useState(false);

  useEffect(() => {
    return window.electronAPI.onUpdateDownloaded(() => setIsUpdateReady(true));
  }, []);

  const restartToUpdate = useCallback(() => {
    void window.electronAPI.quitAndInstallUpdate();
  }, []);

  const dismiss = useCallback(() => setIsUpdateReady(false), []);

  return { isUpdateReady, restartToUpdate, dismiss };
}
