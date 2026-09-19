/**
 * Responsabilité : noms de canaux IPC partagés entre main et renderer.
 * Appelé par : ipc-handlers.ts et preload.ts.
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

  // Computes AND persists (saveTeamRanking) in one round-trip.
  //
  // NOT CURRENTLY CALLED BY THE RENDERER: RankingPage computes the
  // ranking client-side via useRanking()/computeTeamRanking() instead, which
  // is correct and simpler for the MVP (no round-trip needed to react to a
  // topN/category change). These channels are wired up and unit-tested
  // (test/db.test.ts) but sit unused — reserved for a future phase where a
  // persisted/historical ranking snapshot becomes useful (e.g. an audit
  // trail, or diffing a ranking across sessions). Do not remove; do not wire
  // into the renderer without a reason to actually persist rankings.
  computeRanking: 'ranking:compute',
  // Kept registered for parity with the documented bridge shape; computeRanking
  // already persists, so this is a no-op. Same "reserved, not invoked" status
  // as computeRanking above.
  saveRanking: 'ranking:save',

  exportPdf: 'export:pdf',
  exportExcel: 'export:excel',

  openFileDialog: 'dialog:openFile',
  saveFileDialog: 'dialog:saveFile',

  backupExport: 'backup:export',
  backupImport: 'backup:import',
  backupConfirmImport: 'backup:confirm-import',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
