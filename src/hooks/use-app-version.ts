/**
 * Responsabilité : récupère la version de l'application (package.json, via app.getVersion()).
 * Appelé par : Sidebar.tsx.
 * Suppression casserait : l'affichage de la version dans le menu latéral.
 */
import { useEffect, useState } from 'react';

export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    void window.electronAPI.getAppVersion().then(setVersion);
  }, []);

  return version;
}
