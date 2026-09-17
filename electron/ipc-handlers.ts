/**
 * Responsabilité : enregistre les handlers IPC pour les opérations DB et fichiers.
 * Appelé par : electron/main.ts au démarrage.
 * Suppression casserait : toutes les opérations de persistance (meetings, imports, exports).
 */
import { ipcMain, dialog, type OpenDialogOptions } from 'electron';
import type Database from 'better-sqlite3';
import { IpcChannels } from './ipc-channels';
import {
  createMeeting,
  deleteMeeting,
  getAllMeetings,
  getSwimmerResults,
  insertSwimmerResults,
  saveTeamRanking,
  updateMeeting,
  type MeetingInput,
} from '../src/lib/db';
import { computeTeamRanking, type RankingParams } from '../src/lib/ranking-engine';
import type { RawSwimmerRow } from '../src/lib/csv-parser';

/** Registers all IPC handlers used by the renderer via the contextBridge exposed in preload.ts. */
export function registerIpcHandlers(db: Database.Database): void {
  ipcMain.handle(IpcChannels.getMeetings, async () => getAllMeetings(db));

  ipcMain.handle(IpcChannels.createMeeting, async (_event, data: MeetingInput) => createMeeting(db, data));

  ipcMain.handle(IpcChannels.updateMeeting, async (_event, id: number, data: Partial<MeetingInput>) =>
    updateMeeting(db, id, data)
  );

  ipcMain.handle(IpcChannels.deleteMeeting, async (_event, id: number) => {
    deleteMeeting(db, id);
  });

  ipcMain.handle(IpcChannels.importCsv, async (_event, meetingId: number, rows: RawSwimmerRow[]) => {
    insertSwimmerResults(db, meetingId, rows);
  });

  ipcMain.handle(IpcChannels.getSwimmerResults, async (_event, meetingId: number, category?: string) =>
    getSwimmerResults(db, meetingId, category)
  );

  // computeRanking/saveRanking below: wired and tested but not currently invoked
  // by the renderer, which computes rankings client-side instead. See the
  // comment in ipc-channels.ts for why this is intentional, not dead code to
  // clean up.
  ipcMain.handle(IpcChannels.computeRanking, async (_event, meetingId: number, params: RankingParams) => {
    const rows = getSwimmerResults(db, meetingId, params.category);
    const results = computeTeamRanking(rows, params);
    saveTeamRanking(db, meetingId, params.category, params.topN, results);
    return results;
  });

  ipcMain.handle(IpcChannels.saveRanking, async () => {
    // No-op: computeRanking already persists via saveTeamRanking. Registered
    // so the renderer's saveRanking call never hits "no handler registered".
  });

  ipcMain.handle(IpcChannels.exportPdf, async (_event, _meetingId: number, _category: string) => {
    throw new Error('exportPdf: not implemented yet (Phase 3 — @react-pdf/renderer)');
  });

  ipcMain.handle(IpcChannels.exportExcel, async (_event, _meetingId: number, _category: string) => {
    throw new Error('exportExcel: not implemented yet (Phase 3 — ExcelJS)');
  });

  ipcMain.handle(IpcChannels.openFileDialog, async (_event, filters?: OpenDialogOptions['filters']) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters ?? [{ name: 'CSV', extensions: ['csv'] }],
    });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  ipcMain.handle(IpcChannels.saveFileDialog, async (_event, defaultName: string, filters?: OpenDialogOptions['filters']) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters,
    });
    return result.canceled ? null : (result.filePath ?? null);
  });
}
