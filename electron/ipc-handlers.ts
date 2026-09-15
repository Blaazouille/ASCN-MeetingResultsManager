import { ipcMain, dialog, type OpenDialogOptions } from 'electron';
import { IpcChannels } from './ipc-channels';

/**
 * Registers all IPC handlers used by the renderer via the contextBridge
 * exposed in preload.ts. Meeting/import/ranking/export handlers are stubs
 * for Phase 1 — they are wired up to real logic (SQLite, csv-parser,
 * ranking-engine, pdf/excel export) in later phases as those modules land
 * in src/lib.
 */
export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.getMeetings, async () => {
    return [];
  });

  ipcMain.handle(IpcChannels.createMeeting, async (_event, _data: unknown) => {
    throw new Error('createMeeting: not implemented yet (Phase 4 — SQLite persistence)');
  });

  ipcMain.handle(IpcChannels.updateMeeting, async (_event, _id: number, _data: unknown) => {
    throw new Error('updateMeeting: not implemented yet (Phase 4 — SQLite persistence)');
  });

  ipcMain.handle(IpcChannels.deleteMeeting, async (_event, _id: number) => {
    throw new Error('deleteMeeting: not implemented yet (Phase 4 — SQLite persistence)');
  });

  ipcMain.handle(IpcChannels.importCsv, async (_event, _meetingId: number, _filePath: string) => {
    throw new Error('importCsv: not implemented yet (Phase 1/2 — csv-parser wiring)');
  });

  ipcMain.handle(IpcChannels.getSwimmerResults, async (_event, _meetingId: number, _category?: string) => {
    return [];
  });

  ipcMain.handle(IpcChannels.computeRanking, async (_event, _meetingId: number, _params: unknown) => {
    throw new Error('computeRanking: not implemented yet (Phase 2 — ranking-engine wiring)');
  });

  ipcMain.handle(IpcChannels.saveRanking, async (_event, _meetingId: number, _results: unknown) => {
    throw new Error('saveRanking: not implemented yet (Phase 4 — SQLite persistence)');
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
