/**
 * Responsabilité : configure electron-updater, vérifie les mises à jour au démarrage, notifie le renderer.
 * Appelé par : electron/main.ts (une fois au démarrage, après app.whenReady()).
 * Suppression casserait : l'app ne vérifie plus jamais de mise à jour ; elle reste fonctionnelle mais ne se met plus à jour automatiquement.
 */
import { autoUpdater } from 'electron-updater';
import { ipcMain } from 'electron';
import { IpcChannels } from './ipc-channels';

// Laisse le démarrage (fenêtre, DB) se terminer avant de solliciter le réseau.
const UPDATE_CHECK_DELAY_MS = 5000;

/**
 * Vérifie une seule fois les mises à jour au lancement (pas de polling — usage
 * occasionnel, jour de meeting) et appelle onUpdateDownloaded une fois la mise
 * à jour téléchargée silencieusement en arrière-plan.
 */
export function initAutoUpdater(onUpdateDownloaded: () => void): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // filet de sécurité si l'utilisateur ignore le prompt
  autoUpdater.on('update-downloaded', onUpdateDownloaded);
  autoUpdater.on('error', () => {}); // échec silencieux : vérification en arrière-plan, non bloquante

  ipcMain.handle(IpcChannels.quitAndInstallUpdate, () => {
    autoUpdater.quitAndInstall();
  });

  setTimeout(() => {
    // Hors ligne, checkForUpdates() rejette en plus d'émettre 'error' : on
    // absorbe explicitement ce rejet pour ne pas laisser une promesse non gérée.
    autoUpdater.checkForUpdates().catch(() => {});
  }, UPDATE_CHECK_DELAY_MS);
}
