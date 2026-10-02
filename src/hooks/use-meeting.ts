/**
 * Responsabilité : état et opérations CRUD sur les meetings (via IPC).
 * Appelé par : AppShell.tsx (contexte partagé à toutes les pages).
 * Suppression casserait : la liste, création, modification et suppression des meetings.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Meeting, MeetingInput } from '@/lib/db';

export interface UseMeetingResult {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  isLoading: boolean;
  error: string | null;
  /** Reloads the meeting list. Resolves to false when it failed (the message is in `error`), so a caller elsewhere than Accueil can say so where the volunteer is. */
  refresh: () => Promise<boolean>;
  createMeeting: (input: MeetingInput) => Promise<Meeting>;
  /** (Re)creates the training meeting from the embedded sample; replaces any previous one. */
  createDemoMeeting: () => Promise<Meeting>;
  updateMeeting: (id: number, input: Partial<MeetingInput>) => Promise<Meeting>;
  deleteMeeting: (id: number) => Promise<void>;
  selectMeeting: (id: number | null) => void;
}

/** Owns the meeting history: the full list (for Accueil) and which one is "open" for the Import/Classement/Paramètres screens. */
export function useMeeting(): UseMeetingResult {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeetingId, setCurrentMeetingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await window.electronAPI.getMeetings();
      setMeetings(fetched);
      // A restore replaces every meeting with fresh autoincrement ids, so the
      // previously-open meeting's id may no longer exist; without this, pages
      // reading currentMeeting would silently fall back to null with no
      // indication why the meeting they had open "disappeared".
      setCurrentMeetingId((current) => (current !== null && !fetched.some((m) => m.id === current) ? null : current));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createMeeting = useCallback(async (input: MeetingInput): Promise<Meeting> => {
    try {
      const meeting = await window.electronAPI.createMeeting(input);
      // Keep the same order getAllMeetings/refresh() produce (id DESC).
      setMeetings((current) => [meeting, ...current].sort((a, b) => b.id - a.id));
      setError(null);
      return meeting;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  const createDemoMeeting = useCallback(async (): Promise<Meeting> => {
    try {
      const meeting = await window.electronAPI.createDemoMeeting();
      // The main process deleted the previous training meeting: drop it here too.
      setMeetings((current) => [meeting, ...current.filter((existing) => !existing.isDemo)].sort((a, b) => b.id - a.id));
      setError(null);
      return meeting;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  const updateMeeting = useCallback(async (id: number, input: Partial<MeetingInput>): Promise<Meeting> => {
    try {
      const meeting = await window.electronAPI.updateMeeting(id, input);
      setMeetings((current) => current.map((existing) => (existing.id === id ? meeting : existing)));
      setError(null);
      return meeting;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  const deleteMeeting = useCallback(async (id: number): Promise<void> => {
    try {
      await window.electronAPI.deleteMeeting(id);
      // currentMeeting is derived from this list, so removing the open meeting
      // also closes it: no separate reset of currentMeetingId needed.
      setMeetings((current) => current.filter((existing) => existing.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  const selectMeeting = useCallback((id: number | null): void => {
    setCurrentMeetingId(id);
  }, []);

  const currentMeeting = meetings.find((meeting) => meeting.id === currentMeetingId) ?? null;

  return {
    meetings,
    currentMeeting,
    isLoading,
    error,
    refresh,
    createMeeting,
    createDemoMeeting,
    updateMeeting,
    deleteMeeting,
    selectMeeting,
  };
}
