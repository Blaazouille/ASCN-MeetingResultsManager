/**
 * Responsabilité : enregistre les handlers IPC pour les opérations DB et fichiers.
 * Appelé par : electron/main.ts au démarrage.
 * Suppression casserait : toutes les opérations de persistance (meetings, imports, sauvegardes).
 */
import { app, ipcMain, dialog, type OpenDialogOptions } from 'electron';
import type Database from 'better-sqlite3';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { IpcChannels } from './ipc-channels';
import {
  createMeeting,
  deleteMeeting,
  getAllMeetings,
  getSwimmerResults,
  insertSwimmerResults,
  updateMeeting,
  type MeetingInput,
} from '../src/lib/db';
import { getImportSnapshot } from '../src/lib/import-snapshot';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import { exportDatabase, validateBackup, formatBackupTimestamp, type BackupData } from '../src/lib/backup';
import { performAutoBackup, loadBackupConfig, saveBackupConfig, type BackupConfig } from './auto-backup';
import { restoreWithSafetyCopy } from './pre-restore-backup';

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
    // Awaited (not deferred): the response carries the backup outcome so the
    // import screen can warn when no restore point was written.
    return { backupError: performAutoBackup(db) };
  });

  ipcMain.handle(IpcChannels.getSwimmerResults, async (_event, meetingId: number, category?: string) =>
    getSwimmerResults(db, meetingId, category)
  );

  ipcMain.handle(IpcChannels.getImportSnapshot, async (_event, meetingId: number) => getImportSnapshot(db, meetingId));

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
      const timestamp = formatBackupTimestamp();
      // Opens on the same folder auto-backups already land in, so a manual
      // export and a restore both start from the place the volunteer
      // already knows to look.
      const result = await dialog.showSaveDialog({
        defaultPath: path.join(loadBackupConfig().backupDir, `mdlm-backup-${timestamp}.json`),
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
        defaultPath: loadBackupConfig().backupDir,
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
      // A restore always replaces the whole database, so the preview warns
      // about everything currently there, not just meetings that happen to
      // share a name/date with the backup.
      const currentMeetingCount = getAllMeetings(db).length;

      pendingImport = validated;
      return {
        success: true,
        preview: { meetingCount: validated.meetings.length, swimmerCount, currentMeetingCount },
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
      // A restore wipes every meeting, so the current state is written to the
      // backup folder first; if that copy fails, nothing is restored.
      const { result, safetyCopyPath } = restoreWithSafetyCopy(db, pendingImport, () => loadBackupConfig().backupDir);
      pendingImport = null;
      return { success: true, result, safetyCopyPath };
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
      return { success: true, path: result.canceled ? null : (result.filePaths[0] ?? null) };
    } catch (error) {
      // {success, error} like the other backup handlers, not a bare null: a
      // dialog that fails to open must not look like the volunteer cancelling.
      return { success: false, error: error instanceof Error ? error.message : String(error) };
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

  ipcMain.handle(IpcChannels.getAppVersion, async () => app.getVersion());
}
