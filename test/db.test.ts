import { describe, expect, it } from 'vitest';
import {
  createDatabase,
  createMeeting,
  deleteMeeting,
  getAllMeetings,
  updateMeeting,
} from '../src/lib/db';

function freshDb() {
  return createDatabase(':memory:');
}

describe('meeting CRUD', () => {
  it('starts empty', () => {
    expect(getAllMeetings(freshDb())).toEqual([]);
  });

  it('creates a meeting with defaults', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'Meeting de la Mer 2026', date: '2026-11-16' });

    expect(meeting.id).toBeGreaterThan(0);
    expect(meeting.name).toBe('Meeting de la Mer 2026');
    expect(meeting.date).toBe('2026-11-16');
    expect(meeting.location).toBeNull();
    expect(meeting.status).toBe('provisional');
    expect(meeting.createdAt).toBeTruthy();
    expect(meeting.updatedAt).toBeTruthy();
  });

  it('lists meetings most recent date first', () => {
    const db = freshDb();
    createMeeting(db, { name: 'Ancien', date: '2025-01-01' });
    createMeeting(db, { name: 'Récent', date: '2026-11-16' });

    const meetings = getAllMeetings(db);
    expect(meetings.map((m) => m.name)).toEqual(['Récent', 'Ancien']);
  });

  it('updates only the given fields', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'Meeting de la Mer', date: '2026-11-16', location: 'Cherbourg' });

    const updated = updateMeeting(db, meeting.id, { status: 'final' });

    expect(updated.status).toBe('final');
    expect(updated.name).toBe('Meeting de la Mer');
    expect(updated.location).toBe('Cherbourg');
  });

  it('throws when updating a missing meeting', () => {
    const db = freshDb();
    expect(() => updateMeeting(db, 999, { status: 'final' })).toThrow('Meeting 999 not found');
  });

  it('deletes a meeting', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'À supprimer', date: '2026-01-01' });

    deleteMeeting(db, meeting.id);

    expect(getAllMeetings(db)).toEqual([]);
  });
});
