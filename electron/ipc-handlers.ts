/**
 * Responsabilité : enregistre les handlers IPC pour les opérations DB et fichiers.
 * Appelé par : electron/main.ts au démarrage.
 * Suppression casserait : toutes les opérations de persistance (meetings, imports, exports).
 */
import { ipcMain, dialog, type OpenDialogOptions } from 'electron';
import type Database from 'better-sqlite3';
import { readFileSync, writeFileSync } from 'node:fs';
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
import { exportDatabase, validateBackup, restoreDatabase, type BackupData } from '../src/lib/backup';
import { performAutoBackup, loadBackupConfig, saveBackupConfig, type BackupConfig } from './auto-backup';

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
    performAutoBackup(db);
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

  // Holds the validated backup between the import preview step (backupImport)
  // and the confirm step (backupConfirmImport), so the renderer can show a
  // preview and let the user cancel before anything is written to the DB.
  let pendingImport: BackupData | null = null;

  ipcMain.handle(IpcChannels.backupExport, async () => {
    try {
      const data = exportDatabase(db);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const result = await dialog.showSaveDialog({
        defaultPath: `mdlm-backup-${timestamp}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (result.canceled || !result.filePath) {
        return { success: false };
      }
      writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IpcChannels.backupImport, async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (result.canceled || !result.filePaths[0]) {
        return { success: false };
      }
      const raw = readFileSync(result.filePaths[0], 'utf-8');
      const parsed: unknown = JSON.parse(raw);
      const validated = validateBackup(parsed);

      const swimmerCount = validated.meetings.reduce((sum, m) => sum + m.swimmers.length, 0);
      let existingCount = 0;
      for (const m of validated.meetings) {
        const found = db.prepare('SELECT id FROM meeting WHERE name = ? AND date = ?').get(m.name, m.date);
        if (found) existingCount++;
      }

      pendingImport = validated;
      return {
        success: true,
        preview: { meetingCount: validated.meetings.length, swimmerCount, existingCount },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IpcChannels.backupConfirmImport, async () => {
    try {
      if (!pendingImport) {
        return { success: false, error: 'Aucune sauvegarde en attente de confirmation' };
      }
      const result = restoreDatabase(db, pendingImport);
      pendingImport = null;
      return { success: true, result };
    } catch (error) {
      pendingImport = null;
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IpcChannels.backupGetConfig, async () => {
    try {
      // loadBackupConfig reads and JSON.parse's a hand-editable file, which
      // can throw (corrupted/malformed backup-config.json) — same try/catch
      // convention as the other backup handlers above.
      return { success: true, config: loadBackupConfig() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IpcChannels.backupSetConfig, async (_event, config: BackupConfig) => {
    try {
      saveBackupConfig(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IpcChannels.backupChooseDir, async () => {
    try {
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
      return result.canceled ? null : (result.filePaths[0] ?? null);
    } catch {
      // Contract matches openFileDialog: string | null, no {success, error}
      // shape, so a failure just resolves to null like a cancel.
      return null;
    }
  });

  ipcMain.handle(IpcChannels.backupCancelImport, async () => {
    // Not a correctness fix (every path into the preview UI step re-runs
    // backupImport first, which overwrites pendingImport) — just releases a
    // full backup's worth of JSON from main-process memory when the user
    // clicks "Annuler" instead of confirming.
    pendingImport = null;
    return { success: true };
  });
}
