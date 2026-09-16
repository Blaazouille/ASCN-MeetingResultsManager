/**
 * Shared IPC channel names between the main process (ipc-handlers.ts)
 * and the renderer bridge (preload.ts). Keeping them in one place avoids
 * magic-string drift between the two sides of the bridge.
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

  // Computes AND persists (saveTeamRanking) in one round-trip.
  computeRanking: 'ranking:compute',
  // Kept registered for parity with the documented bridge shape; computeRanking
  // already persists, so this is a no-op.
  saveRanking: 'ranking:save',

  exportPdf: 'export:pdf',
  exportExcel: 'export:excel',

  openFileDialog: 'dialog:openFile',
  saveFileDialog: 'dialog:saveFile',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
