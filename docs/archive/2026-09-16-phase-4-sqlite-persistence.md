# Phase 4 — SQLite Persistence, Historique & Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current in-memory-only session (CSV parsed and ranked entirely in React state, lost on reload) with a persisted `meeting` history backed by SQLite in the Electron main process, and make the app installable via `electron-builder`.

**Architecture:** `src/lib/db.ts` owns the SQLite schema and all queries (`better-sqlite3`, synchronous), following the existing pattern where `src/lib/*` holds pure, unit-testable logic — this file is only ever imported from `electron/*.ts` (main process), never from renderer code, so it's never bundled into the browser build. `electron/main.ts` opens the database at `app.getPath('userData')` once the app is ready and hands it to `registerIpcHandlers(db)`. The renderer talks to it exclusively through the existing `window.electronAPI` bridge (`electron/preload.ts`), whose stub `unknown` types are replaced with the real `Meeting`/`RawSwimmerRow`/`TeamResult` types.

One deliberate deviation from `docs/technical-design.md` §5: `importCsv(meetingId, filePath)` becomes `importCsv(meetingId, rows: RawSwimmerRow[])`. The renderer already parses the dropped `File` with the well-tested `parseCsv()` (Latin-1 detection, validation, warnings) for the on-screen preview; sending a file *path* to the main process would mean re-parsing with a second, untested code path (and relies on Electron's non-standard `File.path`, which is fragile under `contextIsolation`). Sending the already-parsed rows keeps one parsing code path and lets `importCsv` do exactly one job: persist.

A second small addition beyond the documented IPC surface: `computeRanking(meetingId, params)` both computes *and* persists (via `saveTeamRanking`) in one step, so `saveRanking` becomes a no-op kept only so the channel exists (matches the documented bridge shape without asking the renderer to make two round-trips for one action).

"Historique" is deliberately minimal for this phase: the Accueil screen lists all meetings (create / open); opening one whose CSV was imported in a *previous* session hydrates the ranking screens from `swimmer_result` via `getSwimmerResults` instead of from the (now-empty) in-memory import state. Editing/deleting meetings, and configuring name/date/status from the Paramètres screen, stay Phase 5 per `CLAUDE.md`.

**Tech Stack:** `better-sqlite3` 11.x (main process only), Electron 44.x `contextBridge` IPC, React 18 + TypeScript strict, Vitest (`node` environment), `electron-builder` 26.x.

## Global Constraints

- TypeScript `strict: true`, no `any` (use `unknown` + narrowing where needed).
- `interface` for object shapes; explicit param/return types on every function.
- File naming: components `PascalCase.tsx`, hooks `use-kebab-case.ts`, lib/utils `kebab-case.ts`.
- Props interfaces named `{ComponentName}Props`; functional components returning `JSX.Element`.
- All UI text in French, French punctuation (non-breaking space before `:`, `;`, `!`, `?`).
- Points via `formatPoints()` from `src/lib/utils.ts`; `cn()` for conditional Tailwind classes.
- Path alias `@/*` → `src/*` (renderer only — `electron/*.ts` uses relative imports, e.g. `../src/lib/db`).
- `src/lib/db.ts` is imported only from `electron/*.ts`. Renderer code that needs its types uses `import type` (erased at build time) — never a value import.
- Test files: `.test.ts` under `test/`, `describe`/`it` from `vitest`, run via `npm run test`. Type-check via `npm run lint` (`tsc -b --noEmit`).

---

### Task 1: `db.ts` schema + Meeting CRUD

**Files:**
- Create: `src/lib/db.ts`
- Test: `test/db.test.ts`

**Interfaces:**
- Consumes: nothing beyond `better-sqlite3`.
- Produces (used by later tasks):
  - `export type MeetingStatus = 'provisional' | 'final'`
  - `export interface Meeting { id: number; name: string; date: string; location: string | null; status: MeetingStatus; createdAt: string; updatedAt: string }`
  - `export interface MeetingInput { name: string; date: string; location?: string | null; status?: MeetingStatus }`
  - `export function createDatabase(filePath: string): Database.Database`
  - `export function getAllMeetings(db: Database.Database): Meeting[]`
  - `export function createMeeting(db: Database.Database, input: MeetingInput): Meeting`
  - `export function updateMeeting(db: Database.Database, id: number, input: Partial<MeetingInput>): Meeting`
  - `export function deleteMeeting(db: Database.Database, id: number): void`

- [ ] **Step 1: Write the failing tests**

```typescript
// test/db.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/db.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/db'`

- [ ] **Step 3: Implement `db.ts` (schema + meeting CRUD)**

```typescript
// src/lib/db.ts
import Database from 'better-sqlite3';

export type MeetingStatus = 'provisional' | 'final';

export interface Meeting {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingInput {
  name: string;
  date: string;
  location?: string | null;
  status?: MeetingStatus;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meeting (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  date        TEXT NOT NULL,
  location    TEXT,
  status      TEXT NOT NULL DEFAULT 'provisional' CHECK(status IN ('provisional', 'final')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS swimmer_result (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id  INTEGER NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  rank        INTEGER,
  lastname    TEXT NOT NULL,
  firstname   TEXT NOT NULL,
  birthyear   INTEGER,
  nation      TEXT DEFAULT 'FRA',
  club        TEXT NOT NULL,
  points      REAL NOT NULL,
  raw_line    TEXT,
  UNIQUE(meeting_id, category, lastname, firstname)
);

CREATE TABLE IF NOT EXISTS team_ranking (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id  INTEGER NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  club        TEXT NOT NULL,
  rank        INTEGER NOT NULL,
  total_pts   REAL NOT NULL,
  top_n       INTEGER NOT NULL,
  swimmers    TEXT NOT NULL,
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(meeting_id, category, club)
);

CREATE INDEX IF NOT EXISTS idx_swimmer_meeting ON swimmer_result(meeting_id);
CREATE INDEX IF NOT EXISTS idx_swimmer_category ON swimmer_result(meeting_id, category);
CREATE INDEX IF NOT EXISTS idx_ranking_meeting ON team_ranking(meeting_id);
`;

/** Opens (creating if needed) the SQLite database at `filePath` and ensures the schema exists. Pass ':memory:' in tests. */
export function createDatabase(filePath: string): Database.Database {
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return db;
}

interface MeetingRow {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
}

function rowToMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    location: row.location,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllMeetings(db: Database.Database): Meeting[] {
  const rows = db.prepare('SELECT * FROM meeting ORDER BY date DESC, id DESC').all() as MeetingRow[];
  return rows.map(rowToMeeting);
}

export function createMeeting(db: Database.Database, input: MeetingInput): Meeting {
  const result = db
    .prepare('INSERT INTO meeting (name, date, location, status) VALUES (?, ?, ?, ?)')
    .run(input.name, input.date, input.location ?? null, input.status ?? 'provisional');
  const row = db.prepare('SELECT * FROM meeting WHERE id = ?').get(result.lastInsertRowid) as MeetingRow;
  return rowToMeeting(row);
}

export function updateMeeting(db: Database.Database, id: number, input: Partial<MeetingInput>): Meeting {
  const current = db.prepare('SELECT * FROM meeting WHERE id = ?').get(id) as MeetingRow | undefined;
  if (!current) {
    throw new Error(`Meeting ${id} not found`);
  }
  const merged = {
    name: input.name ?? current.name,
    date: input.date ?? current.date,
    location: input.location !== undefined ? input.location : current.location,
    status: input.status ?? current.status,
  };
  db.prepare(
    `UPDATE meeting SET name = ?, date = ?, location = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(merged.name, merged.date, merged.location, merged.status, id);
  const row = db.prepare('SELECT * FROM meeting WHERE id = ?').get(id) as MeetingRow;
  return rowToMeeting(row);
}

export function deleteMeeting(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM meeting WHERE id = ?').run(id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/db.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts test/db.test.ts
git commit -m "feat: add SQLite schema and meeting CRUD"
```

---

### Task 2: `db.ts` swimmer results + team ranking persistence

**Files:**
- Modify: `src/lib/db.ts`
- Test: `test/db.test.ts`

**Interfaces:**
- Consumes: `RawSwimmerRow` from `./csv-parser`, `TeamResult` from `./ranking-engine` (already defined, Phase 1/2).
- Produces:
  - `export function insertSwimmerResults(db: Database.Database, meetingId: number, rows: RawSwimmerRow[]): void`
  - `export function getSwimmerResults(db: Database.Database, meetingId: number, category?: string): RawSwimmerRow[]`
  - `export function saveTeamRanking(db: Database.Database, meetingId: number, category: string, topN: number, results: TeamResult[]): void`

- [ ] **Step 1: Write the failing tests**

Append to `test/db.test.ts`:

```typescript
import { computeTeamRanking } from '../src/lib/ranking-engine';
import {
  createDatabase,
  createMeeting,
  getSwimmerResults,
  insertSwimmerResults,
  saveTeamRanking,
} from '../src/lib/db';
import type { RawSwimmerRow } from '../src/lib/csv-parser';

function sampleRows(): RawSwimmerRow[] {
  return [
    { name: 'Classement Mixte', place: 1, lastname: 'DUPONT', firstname: 'Alice', birthyear: 2000, nation: 'FRA', club: 'AC CHERBOURG EN COTENTIN', points: 900, comment: '' },
    { name: 'Classement Mixte', place: 2, lastname: 'MARTIN', firstname: 'Bob', birthyear: 1999, nation: 'FRA', club: 'AC CHERBOURG EN COTENTIN', points: 850, comment: '' },
    { name: 'Classement Dames', place: 1, lastname: 'DUPONT', firstname: 'Alice', birthyear: 2000, nation: 'FRA', club: 'AC CHERBOURG EN COTENTIN', points: 900, comment: '' },
  ];
}

describe('swimmer results persistence', () => {
  it('round-trips inserted rows for a meeting', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'Test', date: '2026-01-01' });

    insertSwimmerResults(db, meeting.id, sampleRows());

    const all = getSwimmerResults(db, meeting.id);
    expect(all).toHaveLength(3);

    const mixte = getSwimmerResults(db, meeting.id, 'Classement Mixte');
    expect(mixte).toHaveLength(2);
    expect(mixte.map((r) => r.lastname)).toEqual(['DUPONT', 'MARTIN']);
  });

  it('re-importing the same swimmer updates rather than duplicates', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'Test', date: '2026-01-01' });

    insertSwimmerResults(db, meeting.id, sampleRows());
    const updatedRows = sampleRows();
    updatedRows[0]!.points = 950;
    insertSwimmerResults(db, meeting.id, updatedRows);

    const all = getSwimmerResults(db, meeting.id);
    expect(all).toHaveLength(3);
    expect(all.find((r) => r.lastname === 'DUPONT' && r.name === 'Classement Mixte')?.points).toBe(950);
  });

  it('scopes rows to their own meeting', () => {
    const db = createDatabase(':memory:');
    const meetingA = createMeeting(db, { name: 'A', date: '2026-01-01' });
    const meetingB = createMeeting(db, { name: 'B', date: '2026-01-02' });

    insertSwimmerResults(db, meetingA.id, sampleRows());

    expect(getSwimmerResults(db, meetingB.id)).toEqual([]);
  });
});

describe('team ranking persistence', () => {
  it('saves a computed ranking and replaces it on recompute', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'Test', date: '2026-01-01' });
    insertSwimmerResults(db, meeting.id, sampleRows());

    const rows = getSwimmerResults(db, meeting.id, 'Classement Mixte');
    const results = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });

    expect(() => saveTeamRanking(db, meeting.id, 'Classement Mixte', 5, results)).not.toThrow();
    // Recomputing and saving again must not throw a UNIQUE constraint error.
    expect(() => saveTeamRanking(db, meeting.id, 'Classement Mixte', 5, results)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/db.test.ts`
Expected: FAIL — `insertSwimmerResults is not a function` (etc.)

- [ ] **Step 3: Implement the swimmer/ranking functions**

Append to `src/lib/db.ts`:

```typescript
import type { RawSwimmerRow } from './csv-parser';
import type { TeamResult } from './ranking-engine';

interface SwimmerResultRow {
  category: string;
  rank: number | null;
  lastname: string;
  firstname: string;
  birthyear: number | null;
  nation: string | null;
  club: string;
  points: number;
  raw_line: string | null;
}

function rowToRawSwimmerRow(row: SwimmerResultRow): RawSwimmerRow {
  return {
    name: row.category,
    place: row.rank ?? 0,
    lastname: row.lastname,
    firstname: row.firstname,
    birthyear: row.birthyear ?? 0,
    nation: row.nation ?? '',
    club: row.club,
    points: row.points,
    comment: row.raw_line ?? '',
  };
}

/**
 * Bulk-inserts swimmer rows for a meeting. Re-importing the same file (or a
 * corrected export) updates the existing row for each (category, lastname,
 * firstname) instead of duplicating it, so importing twice is safe.
 */
export function insertSwimmerResults(db: Database.Database, meetingId: number, rows: RawSwimmerRow[]): void {
  const stmt = db.prepare(`
    INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points, raw_line)
    VALUES (@meetingId, @category, @rank, @lastname, @firstname, @birthyear, @nation, @club, @points, @rawLine)
    ON CONFLICT(meeting_id, category, lastname, firstname)
    DO UPDATE SET rank = excluded.rank, birthyear = excluded.birthyear, nation = excluded.nation,
      club = excluded.club, points = excluded.points, raw_line = excluded.raw_line
  `);
  const insertAll = db.transaction((rowsToInsert: RawSwimmerRow[]) => {
    for (const row of rowsToInsert) {
      stmt.run({
        meetingId,
        category: row.name,
        rank: row.place,
        lastname: row.lastname,
        firstname: row.firstname,
        birthyear: row.birthyear,
        nation: row.nation,
        club: row.club,
        points: row.points,
        rawLine: row.comment || null,
      });
    }
  });
  insertAll(rows);
}

export function getSwimmerResults(db: Database.Database, meetingId: number, category?: string): RawSwimmerRow[] {
  const rows = category
    ? (db
        .prepare('SELECT * FROM swimmer_result WHERE meeting_id = ? AND category = ? ORDER BY rank')
        .all(meetingId, category) as SwimmerResultRow[])
    : (db
        .prepare('SELECT * FROM swimmer_result WHERE meeting_id = ? ORDER BY category, rank')
        .all(meetingId) as SwimmerResultRow[]);
  return rows.map(rowToRawSwimmerRow);
}

/** Replaces the stored ranking for (meetingId, category) with the freshly computed one. */
export function saveTeamRanking(
  db: Database.Database,
  meetingId: number,
  category: string,
  topN: number,
  results: TeamResult[]
): void {
  const del = db.prepare('DELETE FROM team_ranking WHERE meeting_id = ? AND category = ?');
  const stmt = db.prepare(`
    INSERT INTO team_ranking (meeting_id, category, club, rank, total_pts, top_n, swimmers)
    VALUES (@meetingId, @category, @club, @rank, @totalPts, @topN, @swimmers)
  `);
  const saveAll = db.transaction((teams: TeamResult[]) => {
    del.run(meetingId, category);
    for (const team of teams) {
      stmt.run({
        meetingId,
        category,
        club: team.club,
        rank: team.rank,
        totalPts: team.totalPoints,
        topN,
        swimmers: JSON.stringify(team.swimmers),
      });
    }
  });
  saveAll(results);
}
```

Move the two new `import type` lines to the top of the file alongside the `better-sqlite3` import (TypeScript/ESLint import ordering — keep all imports together at the top, not mid-file).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/db.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts test/db.test.ts
git commit -m "feat: persist swimmer results and team rankings"
```

---

### Task 3: Wire IPC — `ipc-channels.ts`, `ipc-handlers.ts`, `preload.ts`, `main.ts`

**Files:**
- Modify: `electron/ipc-channels.ts`
- Modify: `electron/ipc-handlers.ts`
- Modify: `electron/preload.ts`
- Modify: `electron/main.ts`

**Interfaces:**
- Consumes: `Meeting`, `MeetingInput`, `createDatabase`, `getAllMeetings`, `createMeeting`, `updateMeeting`, `deleteMeeting`, `insertSwimmerResults`, `getSwimmerResults`, `saveTeamRanking` from `../src/lib/db` (Tasks 1–2); `RawSwimmerRow` from `../src/lib/csv-parser`; `computeTeamRanking`, `RankingParams`, `TeamResult` from `../src/lib/ranking-engine`.
- Produces: `window.electronAPI` fully typed (consumed by Tasks 4–7); `ElectronAPI` type exported from `electron/preload.ts` (already re-exported into `src/vite-env.d.ts`, no change needed there).

- [ ] **Step 1: Update channel doc comments**

```typescript
// electron/ipc-channels.ts
/**
 * Shared IPC channel names between the main process (ipc-handlers.ts)
 * and the renderer bridge (preload.ts). Keeping them in one place avoids
 * magic-string drift between the two sides of the bridge.
 */
export const IpcChannels = {
  getMeetings: 'meeting:getAll',
  createMeeting: 'meeting:create',
  updateMeeting: 'meeting:update',
  deleteMeeting: 'meeting:delete',

  // Persists already-parsed rows (the renderer parses the CSV itself via
  // src/lib/csv-parser.ts so the on-screen preview and the persisted data
  // always come from the exact same parse).
  importCsv: 'import:csv',
  getSwimmerResults: 'import:getSwimmerResults',

  // Computes AND persists (saveTeamRanking) in one round-trip.
  computeRanking: 'ranking:compute',
  // Kept registered for parity with the documented bridge shape; computeRanking
  // already persists, so this is a no-op.
  saveRanking: 'ranking:save',

  exportPdf: 'export:pdf',
  exportExcel: 'export:excel',

  openFileDialog: 'dialog:openFile',
  saveFileDialog: 'dialog:saveFile',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
```

- [ ] **Step 2: Implement the real handlers**

```typescript
// electron/ipc-handlers.ts
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
```

Note: `exportPdf`/`exportExcel` stay stubs here — Phase 3 delivered PDF/Excel export entirely in the renderer (`src/lib/pdf-export.tsx`, `src/lib/excel-export.ts`, triggered via `src/lib/download.ts`), so these two main-process channels were never wired up and are out of scope for Phase 4.

- [ ] **Step 3: Type the renderer bridge**

```typescript
// electron/preload.ts
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
```

- [ ] **Step 4: Open the database on app ready**

```typescript
// electron/main.ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc-handlers';
import { createDatabase } from '../src/lib/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    title: 'ASCN Meeting Results',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    mainWindow = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'ascn-meeting-results.sqlite3');
  const db = createDatabase(dbPath);
  registerIpcHandlers(db);
  createWindow();
});
```

- [ ] **Step 5: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add electron/ipc-channels.ts electron/ipc-handlers.ts electron/preload.ts electron/main.ts
git commit -m "feat: wire IPC handlers to SQLite persistence"
```

---

### Task 4: `use-meeting.ts` hook + `AppShell` context

**Files:**
- Create: `src/hooks/use-meeting.ts`
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `window.electronAPI.getMeetings/createMeeting` (Task 3); `Meeting`, `MeetingInput` types via `import type { Meeting, MeetingInput } from '@/lib/db'`.
- Produces: `export interface UseMeetingResult { meetings: Meeting[]; currentMeeting: Meeting | null; isLoading: boolean; error: string | null; refresh: () => Promise<void>; createMeeting: (input: MeetingInput) => Promise<Meeting>; selectMeeting: (id: number | null) => void }`, `export function useMeeting(): UseMeetingResult`. `AppOutletContext` gains `meetingState: UseMeetingResult` (consumed by Tasks 5–7).

No dedicated unit test for this task: hooks that wrap `window.electronAPI` aren't unit-tested elsewhere in this codebase either (`use-import.ts`, `use-ranking.ts` have none) — there's no jsdom/testing-library setup, only Vitest's `node` environment for pure `src/lib` logic. Verified manually in Task 5 once the UI consumes it.

- [ ] **Step 1: Implement the hook**

```typescript
// src/hooks/use-meeting.ts
import { useCallback, useEffect, useState } from 'react';
import type { Meeting, MeetingInput } from '@/lib/db';

export interface UseMeetingResult {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createMeeting: (input: MeetingInput) => Promise<Meeting>;
  selectMeeting: (id: number | null) => void;
}

/** Owns the meeting history: the full list (for Accueil) and which one is "open" for the Import/Classement/Impression screens. */
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
    const meeting = await window.electronAPI.createMeeting(input);
    setMeetings((current) => [meeting, ...current]);
    return meeting;
  }, []);

  const selectMeeting = useCallback((id: number | null): void => {
    setCurrentMeetingId(id);
  }, []);

  const currentMeeting = meetings.find((meeting) => meeting.id === currentMeetingId) ?? null;

  return { meetings, currentMeeting, isLoading, error, refresh, createMeeting, selectMeeting };
}
```

- [ ] **Step 2: Wire it into `AppShell`**

```typescript
// src/components/layout/AppShell.tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useImport, type UseImportResult } from '@/hooks/use-import';
import { useMeeting, type UseMeetingResult } from '@/hooks/use-meeting';

export interface AppOutletContext {
  importState: UseImportResult;
  meetingState: UseMeetingResult;
}

export function AppShell(): JSX.Element {
  const importState = useImport();
  const meetingState = useMeeting();
  const context: AppOutletContext = { importState, meetingState };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: no errors (HomePage/ImportPage/RankingPage/PrintPage still compile since `meetingState` is additive — Tasks 5–7 make use of it)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-meeting.ts src/components/layout/AppShell.tsx
git commit -m "feat: add useMeeting hook and wire it into AppShell context"
```

---

### Task 5: Meeting UI components + Accueil (HomePage)

**Files:**
- Create: `src/components/meeting/MeetingForm.tsx`
- Create: `src/components/meeting/MeetingCard.tsx`
- Create: `src/components/meeting/MeetingList.tsx`
- Modify: `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `Meeting`, `MeetingInput` (`@/lib/db`), `meetingState: UseMeetingResult` (Task 4), `formatPoints`/`cn` (`@/lib/utils`).
- Produces: `MeetingFormProps { onSubmit: (input: MeetingInput) => void | Promise<void>; onCancel: () => void }`, `MeetingCardProps { meeting: Meeting; onOpen: (meeting: Meeting) => void }`, `MeetingListProps { meetings: Meeting[]; onOpen: (meeting: Meeting) => void }`.

- [ ] **Step 1: `MeetingForm`**

```tsx
// src/components/meeting/MeetingForm.tsx
import { useState, type FormEvent } from 'react';
import type { MeetingInput } from '@/lib/db';

export interface MeetingFormProps {
  onSubmit: (input: MeetingInput) => void | Promise<void>;
  onCancel: () => void;
}

export function MeetingForm({ onSubmit, onCancel }: MeetingFormProps): JSX.Element {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name, date, location: location || null });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-neutral-0 p-6 shadow-card">
      <div>
        <label htmlFor="meeting-name" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
          Nom du meeting
        </label>
        <input
          id="meeting-name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
          placeholder="Meeting de la Mer 2026"
        />
      </div>
      <div>
        <label htmlFor="meeting-date" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
          Date
        </label>
        <input
          id="meeting-date"
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="meeting-location" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
          Lieu (optionnel)
        </label>
        <input
          id="meeting-location"
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
          placeholder="Cherbourg-en-Cotentin"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-accent-700 disabled:opacity-60"
        >
          Créer le meeting
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: `MeetingCard` + `MeetingList`**

```tsx
// src/components/meeting/MeetingCard.tsx
import type { Meeting } from '@/lib/db';
import { cn } from '@/lib/utils';

export interface MeetingCardProps {
  meeting: Meeting;
  onOpen: (meeting: Meeting) => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export function MeetingCard({ meeting, onOpen }: MeetingCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen(meeting)}
      className="flex w-full items-center justify-between rounded-lg bg-neutral-0 p-4 text-left shadow-card transition-shadow duration-150 hover:shadow-card-hover"
    >
      <div>
        <p className="font-display text-base font-semibold text-primary-800">{meeting.name}</p>
        <p className="text-sm text-neutral-600">
          {DATE_FORMATTER.format(new Date(meeting.date))}
          {meeting.location ? ` — ${meeting.location}` : ''}
        </p>
      </div>
      <span
        className={cn(
          'rounded-sm px-2 py-1 text-xs font-medium uppercase tracking-wide',
          meeting.status === 'final' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
        )}
      >
        {meeting.status === 'final' ? 'Définitif' : 'Provisoire'}
      </span>
    </button>
  );
}
```

```tsx
// src/components/meeting/MeetingList.tsx
import type { Meeting } from '@/lib/db';
import { MeetingCard } from './MeetingCard';

export interface MeetingListProps {
  meetings: Meeting[];
  onOpen: (meeting: Meeting) => void;
}

export function MeetingList({ meetings, onOpen }: MeetingListProps): JSX.Element {
  if (meetings.length === 0) {
    return <p className="text-neutral-600">Aucun meeting pour l'instant — créez-en un pour commencer.</p>;
  }

  return (
    <ul className="space-y-3">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <MeetingCard meeting={meeting} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Rewrite `HomePage`**

```tsx
// src/pages/HomePage.tsx
import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import type { Meeting } from '@/lib/db';
import { MeetingForm } from '@/components/meeting/MeetingForm';
import { MeetingList } from '@/components/meeting/MeetingList';

export default function HomePage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const openMeeting = (meeting: Meeting): void => {
    meetingState.selectMeeting(meeting.id);
    navigate('/import');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">Meetings</h1>
          <p className="text-neutral-600">Créez un meeting ou reprenez un précédent.</p>
        </div>
        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-accent-700"
          >
            Nouveau meeting
          </button>
        )}
      </header>

      {meetingState.error && <p className="text-sm text-error">{meetingState.error}</p>}

      {isCreating && (
        <MeetingForm
          onCancel={() => setIsCreating(false)}
          onSubmit={async (input) => {
            const meeting = await meetingState.createMeeting(input);
            setIsCreating(false);
            openMeeting(meeting);
          }}
        />
      )}

      {meetingState.isLoading ? (
        <p className="text-neutral-600">Chargement des meetings…</p>
      ) : (
        <MeetingList meetings={meetingState.meetings} onOpen={openMeeting} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check and manual smoke test**

Run: `npm run lint` — expected: no errors.

Run: `npm run dev`, in the Electron window: create a meeting via "Nouveau meeting", confirm it appears in the list, quit and relaunch the app (`npm run dev` again), confirm the meeting is still listed (proves it survived to `%APPDATA%/ascn-meeting-results/ascn-meeting-results.sqlite3` rather than living only in memory).

- [ ] **Step 5: Commit**

```bash
git add src/components/meeting src/pages/HomePage.tsx
git commit -m "feat: add meeting history screen (create/list meetings)"
```

---

### Task 6: Persist the import — `use-import.ts` + `ImportPage`

**Files:**
- Modify: `src/hooks/use-import.ts`
- Modify: `src/pages/ImportPage.tsx`

**Interfaces:**
- Consumes: `meetingState: UseMeetingResult` (Task 4), `window.electronAPI.importCsv` (Task 3).
- Produces: `UseImportResult.handleFileAccepted` now returns `Promise<CsvParseResult | null>` (was `Promise<void>`) — the parsed result, so the caller can persist it.

- [ ] **Step 1: Return the parsed result from `handleFileAccepted`**

```typescript
// src/hooks/use-import.ts
import { useCallback, useState } from 'react';
import { parseCsv, type CsvParseResult } from '@/lib/csv-parser';

export interface UseImportResult {
  result: CsvParseResult | null;
  fileName: string | null;
  error: string | null;
  handleFileAccepted: (file: File) => Promise<CsvParseResult | null>;
  handleFileRejected: () => void;
}

/** Owns the CSV import state: parsing the dropped file and surfacing errors. */
export function useImport(): UseImportResult {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileAccepted = useCallback(async (file: File): Promise<CsvParseResult | null> => {
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseCsv(buffer);
      setResult(parsed);
      setFileName(file.name);
      return parsed;
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const handleFileRejected = useCallback((): void => {
    setError('Fichier non supporté (.csv attendu)');
  }, []);

  return { result, fileName, error, handleFileAccepted, handleFileRejected };
}
```

- [ ] **Step 2: Persist to the current meeting from `ImportPage`**

```tsx
// src/pages/ImportPage.tsx
import { useCallback, useState } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { DropZone } from '@/components/import/DropZone';
import { formatPoints } from '@/lib/utils';

export default function ImportPage(): JSX.Element {
  const { importState, meetingState } = useOutletContext<AppOutletContext>();
  const { result, fileName, error, handleFileAccepted, handleFileRejected } = importState;
  const [persistError, setPersistError] = useState<string | null>(null);
  const navigate = useNavigate();

  const meetingId = meetingState.currentMeeting?.id ?? null;

  const handleAccepted = useCallback(
    async (file: File) => {
      setPersistError(null);
      const parsed = await handleFileAccepted(file);
      if (parsed && meetingId !== null) {
        try {
          await window.electronAPI.importCsv(meetingId, parsed.rows);
        } catch (err) {
          setPersistError(err instanceof Error ? err.message : String(err));
        }
      }
    },
    [handleFileAccepted, meetingId]
  );

  if (!meetingState.currentMeeting) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Import du fichier de cotations</h1>
        <p className="text-neutral-600">{meetingState.currentMeeting.name} — CSV extraNat (FFN)</p>
      </header>

      <DropZone onFileAccepted={handleAccepted} onFileRejected={handleFileRejected} />

      {error && <p className="text-sm text-error">{error}</p>}
      {persistError && <p className="text-sm text-error">Échec de l'enregistrement : {persistError}</p>}

      {result && (
        <div className="rounded-lg bg-neutral-0 p-6 shadow-card">
          <p className="mb-3 text-sm text-neutral-600">
            {fileName} — encodage <span className="font-mono">{result.encoding}</span>, délimiteur{' '}
            <span className="font-mono">&quot;{result.delimiter}&quot;</span>
          </p>
          <dl className="grid grid-cols-3 gap-4 text-center">
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Nageurs</dt>
              <dd className="font-mono text-lg font-medium text-neutral-900">
                {formatPoints(result.swimmerCount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Clubs</dt>
              <dd className="font-mono text-lg font-medium text-neutral-900">{formatPoints(result.clubCount)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Catégories</dt>
              <dd className="font-mono text-lg font-medium text-neutral-900">
                {formatPoints(result.categories.length)}
              </dd>
            </div>
          </dl>
          {result.warnings.length > 0 && (
            <p className="mt-3 text-sm text-warning">{result.warnings.length} avertissement(s)</p>
          )}
          <button
            type="button"
            onClick={() => navigate('/classement')}
            className="mt-4 w-full rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-accent-700"
          >
            Voir le classement
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 4: Manual smoke test**

`npm run dev` → open a meeting from Accueil → import `test/fixtures/sample.csv` → confirm the preview shows as before and no `persistError` appears.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-import.ts src/pages/ImportPage.tsx
git commit -m "feat: persist imported swimmer results to the current meeting"
```

---

### Task 7: Historique on Classement/Impression — `use-meeting-rows.ts` + page updates

**Files:**
- Create: `src/hooks/use-meeting-rows.ts`
- Modify: `src/pages/RankingPage.tsx`
- Modify: `src/pages/PrintPage.tsx`
- Modify: `src/lib/print-data.ts`
- Modify: `test/print-data.test.ts`

**Interfaces:**
- Consumes: `window.electronAPI.getSwimmerResults` (Task 3), `Meeting` type (`@/lib/db`), `CsvParseResult`/`RawSwimmerRow` (`@/lib/csv-parser`).
- Produces: `export interface UseMeetingRowsResult { rows: RawSwimmerRow[]; categories: string[]; isLoading: boolean }`, `export function useMeetingRows(meetingId: number | null, importResult: CsvParseResult | null): UseMeetingRowsResult`. `buildPrintMeta` signature changes from `(): PrintMeta` to `(meeting: Meeting): PrintMeta`.

- [ ] **Step 1: `useMeetingRows`**

```typescript
// src/hooks/use-meeting-rows.ts
import { useEffect, useMemo, useState } from 'react';
import type { CsvParseResult, RawSwimmerRow } from '@/lib/csv-parser';

export interface UseMeetingRowsResult {
  rows: RawSwimmerRow[];
  categories: string[];
  isLoading: boolean;
}

/**
 * Resolves the swimmer rows to rank for the current screen: the just-parsed
 * CSV when an import happened this session, otherwise the rows persisted
 * for this meeting — the "historique" path when reopening a meeting whose
 * import happened in a previous session (import state is in-memory only).
 */
export function useMeetingRows(
  meetingId: number | null,
  importResult: CsvParseResult | null
): UseMeetingRowsResult {
  const [dbRows, setDbRows] = useState<RawSwimmerRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (importResult || meetingId === null) {
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    window.electronAPI
      .getSwimmerResults(meetingId)
      .then((rows) => {
        if (!cancelled) {
          setDbRows(rows);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [importResult, meetingId]);

  const rows = importResult?.rows ?? dbRows ?? [];
  const categories = useMemo(
    () => importResult?.categories ?? Array.from(new Set(rows.map((row) => row.name))),
    [importResult, rows]
  );

  return { rows, categories, isLoading };
}
```

- [ ] **Step 2: `buildPrintMeta` takes the real meeting**

```typescript
// src/lib/print-data.ts
import type { Meeting } from './db';

export interface PrintMeta {
  meetingName: string;
  /** Meeting date, formatted fr-FR (e.g. "16 nov. 2026"). */
  date: string;
  status: 'Provisoire' | 'Définitif';
  /** Timestamp of computation, formatted fr-FR date + time. */
  computedAt: string;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/** Builds the print/export metadata from the persisted meeting record. */
export function buildPrintMeta(meeting: Meeting): PrintMeta {
  return {
    meetingName: meeting.name,
    date: DATE_FORMATTER.format(new Date(meeting.date)),
    status: meeting.status === 'final' ? 'Définitif' : 'Provisoire',
    computedAt: TIMESTAMP_FORMATTER.format(new Date()),
  };
}

/**
 * Derives a filename-safe slug from a category name, e.g.
 * "Classement Mixte" -> "classement-mixte". Strips accents so exported
 * filenames stay portable across filesystems.
 */
export function slugifyCategory(category: string): string {
  return category
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

Note: `import type { Meeting } from './db'` is safe even though `print-data.ts` is imported by renderer code — it's type-only and erased at build time, same reasoning as the Global Constraints note on `db.ts`.

- [ ] **Step 3: Update the existing test for the new signature**

```typescript
// test/print-data.test.ts — replace the buildPrintMeta describe block
describe('buildPrintMeta', () => {
  it('maps the meeting name, date, and provisional status', () => {
    const meta = buildPrintMeta({
      id: 1,
      name: 'Meeting de la Mer 2026',
      date: '2026-11-16',
      location: 'Cherbourg',
      status: 'provisional',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(meta.meetingName).toBe('Meeting de la Mer 2026');
    expect(meta.status).toBe('Provisoire');
    expect(meta.date).toBe('16 nov. 2026');
    expect(meta.computedAt.length).toBeGreaterThan(0);
  });

  it('maps a final meeting to "Définitif"', () => {
    const meta = buildPrintMeta({
      id: 2,
      name: 'Meeting de la Mer 2026',
      date: '2026-11-16',
      location: null,
      status: 'final',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(meta.status).toBe('Définitif');
  });
});
```

Keep the existing `slugifyCategory` describe block unchanged, and update the `import` line at the top of the file to also import `buildPrintMeta` (already imported) — no other change needed there.

Run: `npm run test -- test/print-data.test.ts`
Expected: PASS

- [ ] **Step 4: Rewire `RankingPage`**

```tsx
// src/pages/RankingPage.tsx
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { useRanking } from '@/hooks/use-ranking';
import { usePrintExport } from '@/hooks/use-print-export';
import { buildPrintMeta } from '@/lib/print-data';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';
import { RankingToolbar } from '@/components/ranking/RankingToolbar';
import { TeamRankingTable } from '@/components/ranking/TeamRankingTable';
import { A4Page } from '@/components/print/A4Page';

export default function RankingPage(): JSX.Element {
  const { importState, meetingState } = useOutletContext<AppOutletContext>();
  const [search, setSearch] = useState('');

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, categories, isLoading } = useMeetingRows(meetingId, importState.result);
  const ranking = useRanking(rows, categories);
  const meta = useMemo(
    () => (meetingState.currentMeeting ? buildPrintMeta(meetingState.currentMeeting) : null),
    [meetingState.currentMeeting]
  );
  const { isExporting, error, exportPdf, exportExcel } = usePrintExport();

  if (!meetingState.currentMeeting) {
    return <Navigate to="/" replace />;
  }
  if (isLoading) {
    return <p className="text-neutral-600">Chargement du classement…</p>;
  }
  if (rows.length === 0) {
    return <Navigate to="/import" replace />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Classement par équipes</h1>
        <p className="text-neutral-600">{meetingState.currentMeeting.name}</p>
      </header>

      <CategoryTabs categories={categories} active={ranking.category} onChange={ranking.setCategory} />
      <RankingToolbar
        topN={ranking.topN}
        onTopNChange={ranking.setTopN}
        onPrint={() => window.print()}
        onExportPdf={() => exportPdf(ranking.category, ranking.teamResults)}
        onExportExcel={() => exportExcel(ranking.category, ranking.teamResults)}
        isExporting={isExporting}
      />
      {error && <p className="text-sm text-error">{error}</p>}
      <TeamRankingTable
        results={ranking.teamResults}
        topN={ranking.topN}
        search={search}
        onSearchChange={setSearch}
      />

      {meta && (
        <div className="fixed -left-[9999px] top-0 print:static print:left-auto print:top-auto">
          <A4Page meta={meta} category={ranking.category} results={ranking.teamResults} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Rewire `PrintPage`**

```tsx
// src/pages/PrintPage.tsx
import { useMemo } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { useRanking } from '@/hooks/use-ranking';
import { usePrintExport } from '@/hooks/use-print-export';
import { buildPrintMeta } from '@/lib/print-data';
import { PrintControls } from '@/components/print/PrintControls';
import { PrintPreview } from '@/components/print/PrintPreview';

export default function PrintPage(): JSX.Element {
  const { importState, meetingState } = useOutletContext<AppOutletContext>();

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, categories, isLoading } = useMeetingRows(meetingId, importState.result);
  const ranking = useRanking(rows, categories);
  const meta = useMemo(
    () => (meetingState.currentMeeting ? buildPrintMeta(meetingState.currentMeeting) : null),
    [meetingState.currentMeeting]
  );
  const { isExporting, error, exportPdf } = usePrintExport();

  if (!meetingState.currentMeeting) {
    return <Navigate to="/" replace />;
  }
  if (isLoading) {
    return <p className="text-neutral-600">Chargement…</p>;
  }
  if (rows.length === 0) {
    return <Navigate to="/import" replace />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Impression</h1>
        <p className="text-neutral-600">{meetingState.currentMeeting.name}</p>
      </header>

      <PrintControls
        categories={categories}
        category={ranking.category}
        onCategoryChange={ranking.setCategory}
        onPrint={() => window.print()}
        onDownloadPdf={() => exportPdf(ranking.category, ranking.teamResults)}
        isExporting={isExporting}
      />
      {error && <p className="text-sm text-error">{error}</p>}

      {meta && <PrintPreview meta={meta} category={ranking.category} results={ranking.teamResults} />}
    </div>
  );
}
```

- [ ] **Step 6: Full test suite + type-check**

Run: `npm run test`
Expected: PASS (all files, including the updated `print-data.test.ts`)

Run: `npm run lint`
Expected: no errors

- [ ] **Step 7: Manual smoke test — the actual "historique" path**

`npm run dev` → open a meeting → import `test/fixtures/sample.csv` → go to Classement (confirm ranking matches `test/fixtures/expected-ranking.json`) → quit the app → relaunch → open the same meeting from Accueil → navigate straight to `/classement` (not `/import`) → confirm the ranking reappears without re-importing.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/use-meeting-rows.ts src/pages/RankingPage.tsx src/pages/PrintPage.tsx src/lib/print-data.ts test/print-data.test.ts
git commit -m "feat: reload ranking from persisted swimmer results when reopening a meeting"
```

---

### Task 8: Electron packaging

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `npm run build` (`tsc -b && vite build`, already produces `dist/` + `dist-electron/`).
- Produces: `npm run build:win` / `npm run build:mac` produce an installable app under `release/`.

- [ ] **Step 1: Add the `electron-builder` config and native-module rebuild hook**

Edit `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc -b --noEmit",
    "postinstall": "electron-builder install-app-deps",
    "build:win": "npm run build && electron-builder --win",
    "build:mac": "npm run build && electron-builder --mac"
  },
  "build": {
    "appId": "fr.ascn.meeting-results",
    "productName": "ASCN Meeting Results",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*"
    ],
    "win": {
      "target": "nsis"
    },
    "mac": {
      "target": "dmg"
    }
  }
}
```

`better-sqlite3` is a native module compiled against Node's ABI by default; Electron ships its own Node build with a different ABI, so `postinstall: electron-builder install-app-deps` rebuilds it against Electron's ABI after every `npm install`. Without this, the packaged app would crash on `require('better-sqlite3')` with a `NODE_MODULE_VERSION` mismatch. No `icon` field is set — `electron-builder` falls back to its default icon; add `resources/icon.ico` / `resources/icon.icns` and an `icon` entry per platform later (design asset, not in scope here).

- [ ] **Step 2: Rebuild native deps for the current Electron version**

Run: `npm run postinstall` (or `npx electron-builder install-app-deps`)
Expected: exits 0, rebuilds `better-sqlite3`

- [ ] **Step 3: Verify the dev app still runs against the rebuilt native module**

Run: `npm run dev`, confirm the Electron window opens and the Accueil meeting list loads without a native-module error in the terminal.

- [ ] **Step 4: Verify packaging produces an app (unpacked, faster than the full installer)**

Run (Windows): `npm run build && npx electron-builder --win --dir`
Expected: exits 0, produces `release/win-unpacked/ASCN Meeting Results.exe`

This `--dir` run validates the whole pipeline (build, native module packaging, resource copying) without paying for the slower NSIS installer step; running `npm run build:win` for the actual installer is a manual follow-up once this passes.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "feat: configure electron-builder packaging for Windows/macOS"
```

---

## Self-Review Notes

- **Spec coverage**: `meeting`/`swimmer_result`/`team_ranking` schema (Tasks 1–2) ✅; IPC bridge fully typed and wired (Task 3) ✅; meeting history UI — the "historique" deliverable (Tasks 4–5, 7) ✅; import persistence (Task 6) ✅; packaging (Task 8) ✅. Editing/deleting meetings and the Paramètres screen are explicitly Phase 5 per `CLAUDE.md` and out of scope here.
- **Deviations from `docs/technical-design.md` §5** (both explained in Architecture above): `importCsv(meetingId, filePath)` → `importCsv(meetingId, rows)`; `saveRanking` is a registered no-op because `computeRanking` persists directly.
- **Type consistency checked**: `Meeting`/`MeetingInput` (Task 1) flow unchanged through `ipc-handlers.ts`/`preload.ts` (Task 3) → `use-meeting.ts` (Task 4) → `MeetingForm`/`MeetingCard`/`MeetingList`/`HomePage` (Task 5). `RawSwimmerRow` (existing) flows through `insertSwimmerResults`/`getSwimmerResults` (Task 2) → IPC (Task 3) → `ImportPage` (Task 6) and `useMeetingRows` (Task 7) without reshaping. `TeamResult` (existing) flows through `saveTeamRanking` (Task 2) and `computeRanking`'s IPC handler (Task 3) unchanged.
