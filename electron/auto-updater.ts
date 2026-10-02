/**
 * Responsabilité : configure electron-updater, vérifie les mises à jour (au démarrage et à la demande), mémorise le résultat, notifie le renderer.
 * Appelé par : electron/main.ts (une fois au démarrage, après app.whenReady()).
 * Suppression casserait : l'app ne vérifie plus jamais de mise à jour ; elle reste fonctionnelle mais ne se met plus à jour automatiquement.
 */
import { autoUpdater } from 'electron-updater';
import { ipcMain } from 'electron';
import { IpcChannels } from './ipc-channels';
import { loadUpdateStatus, recordUpdateCheck } from './update-state';
import { summarizeUpdateError, type UpdateCheckOutcome, type UpdateStatus } from '../src/lib/update-status';

// Laisse le démarrage (fenêtre, DB) se terminer avant de solliciter le réseau.
const UPDATE_CHECK_DELAY_MS = 5000;

// Un clic sur « Vérifier maintenant » pendant la vérification du démarrage
// réutilise la même promesse au lieu de lancer un second téléchargement.
let inFlightCheck: Promise<UpdateStatus> | null = null;

function record(outcome: UpdateCheckOutcome, error: unknown): UpdateStatus {
  const status: UpdateStatus = {
    checkedAt: new Date().toISOString(),
    outcome,
    message: error === null ? null : summarizeUpdateError(error),
  };
  const detail = error === null ? null : error instanceof Error ? (error.stack ?? error.message) : String(error);
  recordUpdateCheck(status, detail);
  return status;
}

/**
 * Vérifie puis attend la fin du téléchargement éventuel, pour que le statut
 * mémorisé dise « prête » seulement quand l'installeur est vraiment sur le
 * disque. Ne rejette jamais : tout échec (hors ligne, release cassée,
 * téléchargement interrompu) devient un statut 'failed' journalisé.
 */
async function runCheck(): Promise<UpdateStatus> {
  try {
    const result = await autoUpdater.checkForUpdates();
    // null = updater inactif (app non packagée, `npm run dev`) : rien n'a été vérifié.
    if (result === null) {
      return record('failed', new Error('Mises à jour désactivées hors version installée'));
    }
    if (result.isUpdateAvailable && result.downloadPromise) {
      await result.downloadPromise;
      return record('downloaded', null);
    }
    return record('up-to-date', null);
  } catch (error) {
    return record('failed', error);
  }
}

function checkOnce(): Promise<UpdateStatus> {
  inFlightCheck ??= runCheck().finally(() => {
    inFlightCheck = null;
  });
  return inFlightCheck;
}

/**
 * Vérifie une seule fois les mises à jour au lancement (pas de polling — usage
 * occasionnel, jour de meeting) et appelle onUpdateDownloaded une fois la mise
 * à jour téléchargée silencieusement en arrière-plan. Hors ligne, rien ne
 * s'affiche : le statut est seulement visible dans Paramètres, car c'est le
 * cas normal au bord du bassin et un toast d'erreur inquiéterait pour rien.
 */
export function initAutoUpdater(onUpdateDownloaded: () => void): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // filet de sécurité si l'utilisateur ignore le prompt
  autoUpdater.on('update-downloaded', onUpdateDownloaded);
  // Un EventEmitter sans écouteur 'error' lève une exception : l'écouteur doit
  // exister. Il ne fait rien car chaque erreur fait aussi rejeter
  // checkForUpdates() ou downloadPromise, journalisées dans runCheck().
  autoUpdater.on('error', () => {});

  ipcMain.handle(IpcChannels.quitAndInstallUpdate, () => {
    autoUpdater.quitAndInstall();
  });
  // Pendant une vérification, le fichier contient encore l'ancien résultat :
  // on renvoie celui de la vérification en cours pour que Paramètres n'affiche
  // jamais un statut périmé (ex. « À jour » alors qu'un téléchargement s'achève).
  ipcMain.handle(
    IpcChannels.getUpdateStatus,
    (): Promise<UpdateStatus> | UpdateStatus | null => inFlightCheck ?? loadUpdateStatus()
  );
  ipcMain.handle(IpcChannels.checkForUpdatesNow, (): Promise<UpdateStatus> => checkOnce());

  setTimeout(() => {
    void checkOnce();
  }, UPDATE_CHECK_DELAY_MS);
}
