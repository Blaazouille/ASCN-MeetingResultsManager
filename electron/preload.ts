import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from './ipc-channels';

/**
 * Minimal shapes for the Phase 1 IPC skeleton. These mirror the interfaces
 * defined in docs/technical-design.md §5 and will be replaced by imports
 * from src/lib once the corresponding modules (db.ts, csv-parser.ts,
 * ranking-engine.ts) are implemented in later phases.
 */
interface FileFilter {
  name: string;
  extensions: string[];
}

const electronAPI = {
  // Meetings
  getMeetings: () => ipcRenderer.invoke(IpcChannels.getMeetings),
  createMeeting: (data: unknown) => ipcRenderer.invoke(IpcChannels.createMeeting, data),
  updateMeeting: (id: number, data: unknown) => ipcRenderer.invoke(IpcChannels.updateMeeting, id, data),
  deleteMeeting: (id: number) => ipcRenderer.invoke(IpcChannels.deleteMeeting, id),

  // Import
  importCsv: (meetingId: number, filePath: string) =>
    ipcRenderer.invoke(IpcChannels.importCsv, meetingId, filePath),
  getSwimmerResults: (meetingId: number, category?: string) =>
    ipcRenderer.invoke(IpcChannels.getSwimmerResults, meetingId, category),

  // Rankings
  computeRanking: (meetingId: number, params: unknown) =>
    ipcRenderer.invoke(IpcChannels.computeRanking, meetingId, params),
  saveRanking: (meetingId: number, results: unknown) =>
    ipcRenderer.invoke(IpcChannels.saveRanking, meetingId, results),

  // Export
  exportPdf: (meetingId: number, category: string) =>
    ipcRenderer.invoke(IpcChannels.exportPdf, meetingId, category),
  exportExcel: (meetingId: number, category: string) =>
    ipcRenderer.invoke(IpcChannels.exportExcel, meetingId, category),

  // File dialogs
  openFileDialog: (filters?: FileFilter[]) => ipcRenderer.invoke(IpcChannels.openFileDialog, filters),
  saveFileDialog: (defaultName: string, filters?: FileFilter[]) =>
    ipcRenderer.invoke(IpcChannels.saveFileDialog, defaultName, filters),
};

export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
