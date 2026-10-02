/**
 * Responsabilité : expose l'API IPC au renderer via contextBridge.
 * Appelé par : Electron (chargé avant le renderer).
 * Suppression casserait : toute communication renderer ↔ main process.
 */
import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from './ipc-channels';
import type { Meeting, MeetingInput } from '../src/lib/db';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import type { ImportSnapshot } from '../src/lib/import-snapshot';
import type { RestoreResult } from '../src/lib/backup';
import type { BackupConfig } from './auto-backup';
import type { UpdateStatus } from '../src/lib/update-status';

interface FileFilter {
  name: string;
  extensions: string[];
}

const electronAPI = {
  // Meetings
  getMeetings: (): Promise<Meeting[]> => ipcRenderer.invoke(IpcChannels.getMeetings),
  createMeeting: (data: MeetingInput): Promise<Meeting> => ipcRenderer.invoke(IpcChannels.createMeeting, data),
  updateMeeting: (id: number, data: Partial<MeetingInput>): Promise<Meeting> =>
    ipcRenderer.invoke(IpcChannels.updateMeeting, id, data),
  deleteMeeting: (id: number): Promise<void> => ipcRenderer.invoke(IpcChannels.deleteMeeting, id),

  // Import
  importCsv: (meetingId: number, rows: RawSwimmerRow[]): Promise<{ backupError: string | null }> =>
    ipcRenderer.invoke(IpcChannels.importCsv, meetingId, rows),
  getSwimmerResults: (meetingId: number, category?: string): Promise<RawSwimmerRow[]> =>
    ipcRenderer.invoke(IpcChannels.getSwimmerResults, meetingId, category),
  getImportSnapshot: (meetingId: number): Promise<ImportSnapshot | null> =>
    ipcRenderer.invoke(IpcChannels.getImportSnapshot, meetingId),

  // File dialogs
  openFileDialog: (filters?: FileFilter[]): Promise<string | null> => ipcRenderer.invoke(IpcChannels.openFileDialog, filters),
  saveFileDialog: (defaultName: string, filters?: FileFilter[]): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.saveFileDialog, defaultName, filters),

  // Backup
  exportBackup: (): Promise<{ success: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke(IpcChannels.backupExport),
  importBackup: (): Promise<{
    success: boolean;
    preview?: { meetingCount: number; swimmerCount: number; currentMeetingCount: number };
    error?: string;
  }> => ipcRenderer.invoke(IpcChannels.backupImport),
  confirmImport: (): Promise<{ success: boolean; result?: RestoreResult; safetyCopyPath?: string | null; error?: string }> =>
    ipcRenderer.invoke(IpcChannels.backupConfirmImport),
  cancelImport: (): Promise<{ success: boolean }> => ipcRenderer.invoke(IpcChannels.backupCancelImport),

  // Backup config (folder + rotation limit)
  getBackupConfig: (): Promise<{ success: boolean; config?: BackupConfig; error?: string }> =>
    ipcRenderer.invoke(IpcChannels.backupGetConfig),
  setBackupConfig: (config: BackupConfig): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IpcChannels.backupSetConfig, config),
  chooseBackupDir: (): Promise<string | null> => ipcRenderer.invoke(IpcChannels.backupChooseDir),
  // Auto-update
  onUpdateDownloaded: (callback: () => void): (() => void) => {
    const listener = (): void => callback();
    ipcRenderer.on(IpcChannels.updateDownloaded, listener);
    return () => ipcRenderer.removeListener(IpcChannels.updateDownloaded, listener);
  },
  quitAndInstallUpdate: (): Promise<void> => ipcRenderer.invoke(IpcChannels.quitAndInstallUpdate),
  getUpdateStatus: (): Promise<UpdateStatus | null> => ipcRenderer.invoke(IpcChannels.getUpdateStatus),
  checkForUpdatesNow: (): Promise<UpdateStatus> => ipcRenderer.invoke(IpcChannels.checkForUpdatesNow),

  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IpcChannels.getAppVersion),
};

export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
