/**
 * Responsabilité : noms de canaux IPC partagés entre main et renderer.
 * Appelé par : ipc-handlers.ts, preload.ts, auto-updater.ts et main.ts.
 * Suppression casserait : la correspondance des canaux entre les deux côtés du bridge.
 */
export const IpcChannels = {
  getMeetings: 'meeting:getAll',
  createMeeting: 'meeting:create',
  updateMeeting: 'meeting:update',
  deleteMeeting: 'meeting:delete',

  // Persists already-parsed rows (the renderer parses the CSV itself via
  // src/lib/csv-parser.ts so the on-screen preview and the persisted data
  // always come from the exact same parse).
  importCsv: 'import:csv',
  getSwimmerResults: 'import:getSwimmerResults',
  // Rows as they were before the latest import, for the movement arrows.
  getImportSnapshot: 'import:getSnapshot',

  openFileDialog: 'dialog:openFile',
  saveFileDialog: 'dialog:saveFile',

  backupExport: 'backup:export',
  backupImport: 'backup:import',
  backupConfirmImport: 'backup:confirm-import',
  // Clears the pending import held in main-process memory when the user
  // cancels the preview step without confirming (memory hygiene only — see
  // ipc-handlers.ts for why this isn't a correctness fix).
  backupCancelImport: 'backup:cancel-import',

  // Configuration des sauvegardes automatiques (dossier, nombre conservé) — voir electron/auto-backup.ts.
  backupGetConfig: 'backup:get-config',
  backupSetConfig: 'backup:set-config',
  backupChooseDir: 'backup:choose-dir',
  updateDownloaded: 'update:downloaded',
  quitAndInstallUpdate: 'update:quitAndInstall',

  getAppVersion: 'app:getVersion',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
