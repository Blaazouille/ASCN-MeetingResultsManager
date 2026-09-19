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
  refresh: () => Promise<void>;
  createMeeting: (input: MeetingInput) => Promise<Meeting>;
  updateMeeting: (id: number, input: Partial<MeetingInput>) => Promise<Meeting>;
  selectMeeting: (id: number | null) => void;
}

/** Owns the meeting history: the full list (for Accueil) and which one is "open" for the Import/Classement/Paramètres screens. */
export function useMeeting(): UseMeetingResult {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeetingId, setCurrentMeetingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      setMeetings(await window.electronAPI.getMeetings());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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

  const selectMeeting = useCallback((id: number | null): void => {
    setCurrentMeetingId(id);
  }, []);

  const currentMeeting = meetings.find((meeting) => meeting.id === currentMeetingId) ?? null;

  return { meetings, currentMeeting, isLoading, error, refresh, createMeeting, updateMeeting, selectMeeting };
}
