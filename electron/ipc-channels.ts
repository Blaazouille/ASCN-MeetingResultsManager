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

  importCsv: 'import:csv',
  getSwimmerResults: 'import:getSwimmerResults',

  computeRanking: 'ranking:compute',
  saveRanking: 'ranking:save',

  exportPdf: 'export:pdf',
  exportExcel: 'export:excel',

  openFileDialog: 'dialog:openFile',
  saveFileDialog: 'dialog:saveFile',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
