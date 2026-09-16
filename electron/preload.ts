import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from './ipc-channels';
import type { Meeting, MeetingInput } from '../src/lib/db';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import type { RankingParams, TeamResult } from '../src/lib/ranking-engine';

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
  importCsv: (meetingId: number, rows: RawSwimmerRow[]): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.importCsv, meetingId, rows),
  getSwimmerResults: (meetingId: number, category?: string): Promise<RawSwimmerRow[]> =>
    ipcRenderer.invoke(IpcChannels.getSwimmerResults, meetingId, category),

  // Rankings
  computeRanking: (meetingId: number, params: RankingParams): Promise<TeamResult[]> =>
    ipcRenderer.invoke(IpcChannels.computeRanking, meetingId, params),
  saveRanking: (meetingId: number, results: TeamResult[]): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.saveRanking, meetingId, results),

  // Export
  exportPdf: (meetingId: number, category: string): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.exportPdf, meetingId, category),
  exportExcel: (meetingId: number, category: string): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.exportExcel, meetingId, category),

  // File dialogs
  openFileDialog: (filters?: FileFilter[]): Promise<string | null> => ipcRenderer.invoke(IpcChannels.openFileDialog, filters),
  saveFileDialog: (defaultName: string, filters?: FileFilter[]): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.saveFileDialog, defaultName, filters),
};

export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
