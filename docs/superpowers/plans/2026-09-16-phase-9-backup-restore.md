# Phase 9 — Backup & Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JSON export/import of the full database via the Settings page, plus automatic backup after each CSV import with configurable rotation.

**Architecture:** A new pure lib module (`backup.ts`) handles serialization, validation, and restoration of the three SQLite tables (`meeting`, `swimmer_result`, `team_ranking`) — fully unit-tested, no Electron dependency. Three IPC handlers (`backup:export`, `backup:import`, `backup:confirm-import`) bridge the UI to the filesystem, following the existing `registerIpcHandlers(db)` pattern in `electron/ipc-handlers.ts`. The Settings page gets a `BackupSection` below the existing `SettingsForm`. Auto-backup runs silently in the main process after each CSV import (`import:csv` handler), with rotation managed by a `backup-config.json` file stored in `app.getPath('userData')` (not SQLite, so config survives a DB restore).

**Tech Stack:** React 18 + TypeScript (strict), Electron IPC, better-sqlite3, Vitest. No new dependencies.

## Global Constraints

- TypeScript `strict: true`, no `any` — use `unknown` + type guards.
- Components: `PascalCase.tsx`; hooks: `use-kebab-case.ts`; lib: `kebab-case.ts`.
- UI entirely in French, French punctuation (espace insécable avant `:`, `;`, `!`, `?`).
- Every file must have a header comment: what it does, who calls it, what breaks if deleted (see existing files for the "Responsabilité / Appelé par / Suppression casserait" format).
- One file = one responsibility. Never exceed 300 lines per file.
- Never leave dead code.
- Run `npm run test` and `npm run lint` after each task; both must pass before committing (`lint` runs `tsc -b --noEmit` — there is no ESLint step in this project).

---

### Task 1: Backup engine — `exportDatabase`, `validateBackup`, `restoreDatabase`

**Files:**
- Create: `src/lib/backup.ts`
- Create: `test/backup.test.ts`

**Interfaces:**
- Consumes: `Database.Database` from `better-sqlite3`, `createDatabase` from `src/lib/db-schema.ts` (tests only)
- Produces:
  ```typescript
  interface BackupData {
    version: 1;
    appName: string;
    exportedAt: string;
    meetings: MeetingBackup[];
  }

  interface MeetingBackup {
    name: string;
    date: string;
    location: string | null;
    status: 'provisional' | 'final';
    createdAt: string;
    updatedAt: string;
    defaultTopN: number;
    minSwimmers: number;
    activeCategories: string[] | null;
    swimmers: SwimmerBackup[];
    teamRankings: TeamRankingBackup[];
  }

  interface SwimmerBackup {
    category: string;
    rank: number | null;
    lastname: string;
    firstname: string;
    birthyear: number | null;
    nation: string | null;
    club: string;
    points: number;
    rawLine: string | null;
  }

  interface TeamRankingBackup {
    category: string;
    club: string;
    rank: number;
    totalPoints: number;
    topN: number;
    swimmers: string;
    computedAt: string;
  }

  interface RestoreResult {
    meetingsImported: number;
    meetingsSkipped: number;
    swimmersImported: number;
  }

  function exportDatabase(db: Database.Database): BackupData;
  function validateBackup(data: unknown): BackupData;
  function restoreDatabase(db: Database.Database, data: BackupData): RestoreResult;
  ```

**Note on scope:** only `meeting`, `swimmer_result`, and `team_ranking` are backed up — those are the only tables in `src/lib/db-schema.ts`. Individual ranking (`src/lib/individual-ranking.ts`) and fun awards (`src/lib/fun-awards.ts`) are computed client-side from `swimmer_result` and have no storage of their own, so nothing else needs to be captured.

- [ ] **Step 1: Write failing tests**

Create `test/backup.test.ts`:

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createDatabase } from '../src/lib/db-schema';
import { createMeeting } from '../src/lib/db';
import {
  exportDatabase,
  validateBackup,
  restoreDatabase,
} from '../src/lib/backup';

function freshDb(): Database.Database {
  return createDatabase(':memory:');
}

function seedDb(db: Database.Database): void {
  const meeting = createMeeting(db, {
    name: 'Test Meeting',
    date: '2026-09-01',
    location: 'Pool',
    defaultTopN: 5,
    minSwimmers: 3,
    activeCategories: ['Classement Mixte'],
  });
  db.prepare(
    `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points, raw_line)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(meeting.id, 'Classement Mixte', 1, 'DUPONT', 'Jean', 1990, 'FRA', 'CN TEST', 800, null);
  db.prepare(
    `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points, raw_line)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(meeting.id, 'Classement Mixte', 2, 'MARTIN', 'Marie', 1995, 'FRA', 'CN TEST', 750, null);
  db.prepare(
    `INSERT INTO team_ranking (meeting_id, category, club, rank, total_pts, top_n, swimmers)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(meeting.id, 'Classement Mixte', 'CN TEST', 1, 1550, 5, JSON.stringify(['DUPONT Jean', 'MARTIN Marie']));
}

describe('exportDatabase', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = freshDb();
    seedDb(db);
  });

  afterEach(() => {
    db.close();
  });

  it('exports version 1 with correct structure', () => {
    const backup = exportDatabase(db);
    expect(backup.version).toBe(1);
    expect(backup.appName).toBeTruthy();
    expect(backup.exportedAt).toBeTruthy();
    expect(backup.meetings).toHaveLength(1);
  });

  it('exports meeting with its swimmers, rankings, and ranking-rule columns', () => {
    const backup = exportDatabase(db);
    const meeting = backup.meetings[0]!;
    expect(meeting.name).toBe('Test Meeting');
    expect(meeting.defaultTopN).toBe(5);
    expect(meeting.minSwimmers).toBe(3);
    expect(meeting.activeCategories).toEqual(['Classement Mixte']);
    expect(meeting.swimmers).toHaveLength(2);
    expect(meeting.swimmers[0]!.lastname).toBe('DUPONT');
    expect(meeting.teamRankings).toHaveLength(1);
    expect(meeting.teamRankings[0]!.totalPoints).toBe(1550);
  });

  it('exports an empty database as empty meetings array', () => {
    const emptyDb = freshDb();
    const backup = exportDatabase(emptyDb);
    expect(backup.meetings).toHaveLength(0);
    emptyDb.close();
  });
});

describe('validateBackup', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = freshDb();
    seedDb(db);
  });

  afterEach(() => {
    db.close();
  });

  it('accepts a valid backup', () => {
    const backup = exportDatabase(db);
    const validated = validateBackup(backup);
    expect(validated.version).toBe(1);
  });

  it('rejects missing version', () => {
    expect(() => validateBackup({ meetings: [] })).toThrow();
  });

  it('rejects wrong version', () => {
    expect(() => validateBackup({ version: 99, meetings: [] })).toThrow();
  });

  it('rejects non-object input', () => {
    expect(() => validateBackup('not an object')).toThrow();
    expect(() => validateBackup(null)).toThrow();
    expect(() => validateBackup(42)).toThrow();
  });

  it('rejects missing meetings array', () => {
    expect(() => validateBackup({ version: 1 })).toThrow();
  });
});

describe('restoreDatabase', () => {
  let sourceDb: Database.Database;
  let targetDb: Database.Database;

  beforeEach(() => {
    sourceDb = freshDb();
    seedDb(sourceDb);
    targetDb = freshDb();
  });

  afterEach(() => {
    sourceDb.close();
    targetDb.close();
  });

  it('imports meetings, swimmers, and rankings into an empty database', () => {
    const backup = exportDatabase(sourceDb);
    const result = restoreDatabase(targetDb, backup);
    expect(result.meetingsImported).toBe(1);
    expect(result.meetingsSkipped).toBe(0);
    expect(result.swimmersImported).toBe(2);
  });

  it('skips meetings that already exist (same name + date)', () => {
    const backup = exportDatabase(sourceDb);
    restoreDatabase(targetDb, backup);
    const result = restoreDatabase(targetDb, backup);
    expect(result.meetingsImported).toBe(0);
    expect(result.meetingsSkipped).toBe(1);
  });

  it('round-trip preserves all data including ranking rules', () => {
    const backup = exportDatabase(sourceDb);
    restoreDatabase(targetDb, backup);
    const reExported = exportDatabase(targetDb);
    expect(reExported.meetings).toHaveLength(backup.meetings.length);
    expect(reExported.meetings[0]!.swimmers).toHaveLength(backup.meetings[0]!.swimmers.length);
    expect(reExported.meetings[0]!.name).toBe(backup.meetings[0]!.name);
    expect(reExported.meetings[0]!.defaultTopN).toBe(backup.meetings[0]!.defaultTopN);
    expect(reExported.meetings[0]!.activeCategories).toEqual(backup.meetings[0]!.activeCategories);
    expect(reExported.meetings[0]!.teamRankings[0]!.totalPoints).toBe(backup.meetings[0]!.teamRankings[0]!.totalPoints);
  });

  it('rolls back on error (transactional)', () => {
    const backup = exportDatabase(sourceDb);
    backup.meetings[0]!.swimmers.push({
      category: 'Classement Mixte',
      rank: 3,
      lastname: null as unknown as string,
      firstname: 'Bad',
      birthyear: 2000,
      nation: 'FRA',
      club: 'CN BAD',
      points: 500,
      rawLine: null,
    });
    expect(() => restoreDatabase(targetDb, backup)).toThrow();
    const check = targetDb.prepare('SELECT COUNT(*) as count FROM meeting').get() as { count: number };
    expect(check.count).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/backup.test.ts`
Expected: FAIL — module `../src/lib/backup` not found

- [ ] **Step 3: Implement backup.ts**

Create `src/lib/backup.ts`:

```typescript
/**
 * Responsabilité : export / import complet de la base de données en JSON.
 * Appelé par : electron/ipc-handlers.ts (export/import), electron/auto-backup.ts, tests.
 * Suppression casserait : la fonctionnalité de sauvegarde et restauration.
 */
import type Database from 'better-sqlite3';

export interface BackupData {
  version: 1;
  appName: string;
  exportedAt: string;
  meetings: MeetingBackup[];
}

export interface MeetingBackup {
  name: string;
  date: string;
  location: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  defaultTopN: number;
  minSwimmers: number;
  activeCategories: string[] | null;
  swimmers: SwimmerBackup[];
  teamRankings: TeamRankingBackup[];
}

export interface SwimmerBackup {
  category: string;
  rank: number | null;
  lastname: string;
  firstname: string;
  birthyear: number | null;
  nation: string | null;
  club: string;
  points: number;
  rawLine: string | null;
}

export interface TeamRankingBackup {
  category: string;
  club: string;
  rank: number;
  totalPoints: number;
  topN: number;
  swimmers: string;
  computedAt: string;
}

export interface RestoreResult {
  meetingsImported: number;
  meetingsSkipped: number;
  swimmersImported: number;
}

interface MeetingRow {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  default_top_n: number;
  min_swimmers: number;
  active_categories: string | null;
}

interface SwimmerRow {
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

interface TeamRankingRow {
  category: string;
  club: string;
  rank: number;
  total_pts: number;
  top_n: number;
  swimmers: string;
  computed_at: string;
}

export function exportDatabase(db: Database.Database): BackupData {
  const meetings = db.prepare('SELECT * FROM meeting ORDER BY id').all() as MeetingRow[];

  const meetingBackups: MeetingBackup[] = meetings.map((m) => {
    const swimmers = db
      .prepare(
        'SELECT category, rank, lastname, firstname, birthyear, nation, club, points, raw_line FROM swimmer_result WHERE meeting_id = ? ORDER BY id'
      )
      .all(m.id) as SwimmerRow[];

    const rankings = db
      .prepare(
        'SELECT category, club, rank, total_pts, top_n, swimmers, computed_at FROM team_ranking WHERE meeting_id = ? ORDER BY id'
      )
      .all(m.id) as TeamRankingRow[];

    return {
      name: m.name,
      date: m.date,
      location: m.location,
      status: m.status,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      defaultTopN: m.default_top_n,
      minSwimmers: m.min_swimmers,
      activeCategories: m.active_categories ? (JSON.parse(m.active_categories) as string[]) : null,
      swimmers: swimmers.map((s) => ({
        category: s.category,
        rank: s.rank,
        lastname: s.lastname,
        firstname: s.firstname,
        birthyear: s.birthyear,
        nation: s.nation,
        club: s.club,
        points: s.points,
        rawLine: s.raw_line,
      })),
      teamRankings: rankings.map((r) => ({
        category: r.category,
        club: r.club,
        rank: r.rank,
        totalPoints: r.total_pts,
        topN: r.top_n,
        swimmers: r.swimmers,
        computedAt: r.computed_at,
      })),
    };
  });

  return {
    version: 1,
    appName: 'MDLM Ranking',
    exportedAt: new Date().toISOString(),
    meetings: meetingBackups,
  };
}

export function validateBackup(data: unknown): BackupData {
  if (data === null || typeof data !== 'object') {
    throw new Error('Format de backup invalide : objet attendu');
  }

  const obj = data as Record<string, unknown>;

  if (obj.version !== 1) {
    throw new Error(`Version de backup non supportée : ${String(obj.version ?? 'manquante')}`);
  }

  if (!Array.isArray(obj.meetings)) {
    throw new Error('Format de backup invalide : tableau "meetings" manquant');
  }

  for (const meeting of obj.meetings) {
    if (typeof meeting !== 'object' || meeting === null) {
      throw new Error('Format de backup invalide : meeting doit être un objet');
    }
    const m = meeting as Record<string, unknown>;
    if (typeof m.name !== 'string' || typeof m.date !== 'string') {
      throw new Error('Format de backup invalide : meeting.name et meeting.date requis');
    }
    if (!Array.isArray(m.swimmers)) {
      throw new Error('Format de backup invalide : meeting.swimmers doit être un tableau');
    }
  }

  return data as BackupData;
}

export function restoreDatabase(db: Database.Database, data: BackupData): RestoreResult {
  const result: RestoreResult = { meetingsImported: 0, meetingsSkipped: 0, swimmersImported: 0 };

  const transaction = db.transaction(() => {
    for (const meeting of data.meetings) {
      const existing = db
        .prepare('SELECT id FROM meeting WHERE name = ? AND date = ?')
        .get(meeting.name, meeting.date) as { id: number } | undefined;

      if (existing) {
        result.meetingsSkipped++;
        continue;
      }

      const insertMeeting = db.prepare(
        `INSERT INTO meeting (name, date, location, status, created_at, updated_at, default_top_n, min_swimmers, active_categories)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const row = insertMeeting.run(
        meeting.name,
        meeting.date,
        meeting.location,
        meeting.status,
        meeting.createdAt,
        meeting.updatedAt,
        meeting.defaultTopN,
        meeting.minSwimmers,
        meeting.activeCategories ? JSON.stringify(meeting.activeCategories) : null
      );
      const meetingId = row.lastInsertRowid;
      result.meetingsImported++;

      const insertSwimmer = db.prepare(
        `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points, raw_line)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const s of meeting.swimmers) {
        insertSwimmer.run(meetingId, s.category, s.rank, s.lastname, s.firstname, s.birthyear, s.nation, s.club, s.points, s.rawLine);
        result.swimmersImported++;
      }

      if (meeting.teamRankings) {
        const insertRanking = db.prepare(
          `INSERT INTO team_ranking (meeting_id, category, club, rank, total_pts, top_n, swimmers, computed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const r of meeting.teamRankings) {
          insertRanking.run(meetingId, r.category, r.club, r.rank, r.totalPoints, r.topN, r.swimmers, r.computedAt);
        }
      }
    }
  });

  transaction();
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/backup.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/backup.ts test/backup.test.ts
git commit -m "feat: add backup engine with export, validate, and restore"
```

---

### Task 2: IPC handlers for backup export and import

**Files:**
- Modify: `electron/ipc-handlers.ts`
- Modify: `electron/ipc-channels.ts`
- Modify: `electron/preload.ts`

**Interfaces:**
- Consumes: `exportDatabase`, `validateBackup`, `restoreDatabase`, `type BackupData`, `type RestoreResult` from `src/lib/backup.ts`
- Produces:
  ```typescript
  // New IPC channels (added to IpcChannels in ipc-channels.ts)
  backupExport: 'backup:export'          // → { success: boolean; path?: string; error?: string }
  backupImport: 'backup:import'          // → { success: boolean; preview?: { meetingCount: number; swimmerCount: number; existingCount: number }; error?: string }
  backupConfirmImport: 'backup:confirm-import' // → { success: boolean; result?: RestoreResult; error?: string }

  // New preload API
  window.electronAPI.exportBackup(): Promise<{ success: boolean; path?: string; error?: string }>
  window.electronAPI.importBackup(): Promise<{ success: boolean; preview?: { meetingCount: number; swimmerCount: number; existingCount: number }; error?: string }>
  window.electronAPI.confirmImport(): Promise<{ success: boolean; result?: RestoreResult; error?: string }>
  ```

- [ ] **Step 1: Add new channel constants**

In `electron/ipc-channels.ts`, add inside the `IpcChannels` object (after `saveFileDialog`):

```typescript
  backupExport: 'backup:export',
  backupImport: 'backup:import',
  backupConfirmImport: 'backup:confirm-import',
```

- [ ] **Step 2: Add IPC handlers**

In `electron/ipc-handlers.ts`, add the imports:

```typescript
import { readFileSync, writeFileSync } from 'node:fs';
import { exportDatabase, validateBackup, restoreDatabase, type BackupData } from '../src/lib/backup';
```

Inside `registerIpcHandlers(db)`, add a closure-scoped variable to hold the validated backup between the `import` preview step and the `confirm-import` step, and the three handlers (after the existing `saveFileDialog` handler, before the closing brace):

```typescript
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
```

- [ ] **Step 3: Add preload API**

In `electron/preload.ts`, add the import:

```typescript
import type { RestoreResult } from '../src/lib/backup';
```

And add to the `electronAPI` object (after `saveFileDialog`):

```typescript
  // Backup
  exportBackup: (): Promise<{ success: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke(IpcChannels.backupExport),
  importBackup: (): Promise<{
    success: boolean;
    preview?: { meetingCount: number; swimmerCount: number; existingCount: number };
    error?: string;
  }> => ipcRenderer.invoke(IpcChannels.backupImport),
  confirmImport: (): Promise<{ success: boolean; result?: RestoreResult; error?: string }> =>
    ipcRenderer.invoke(IpcChannels.backupConfirmImport),
```

- [ ] **Step 4: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/ipc-handlers.ts electron/ipc-channels.ts electron/preload.ts
git commit -m "feat: add IPC handlers for backup export and import"
```

---

### Task 3: Settings page — backup UI

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Create: `src/components/settings/BackupSection.tsx`

**Interfaces:**
- Consumes: `window.electronAPI.exportBackup()`, `window.electronAPI.importBackup()`, `window.electronAPI.confirmImport()`
- Produces: `BackupSection` component, rendered in `SettingsPage.tsx` below `SettingsForm`

- [ ] **Step 1: Create BackupSection component**

Create `src/components/settings/BackupSection.tsx`:

```typescript
/**
 * Responsabilité : section de sauvegarde/restauration (export/import JSON) dans les paramètres.
 * Appelé par : SettingsPage.tsx.
 * Suppression casserait : l'interface de sauvegarde et restauration manuelle.
 */
import { useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type BackupState =
  | { step: 'idle' }
  | { step: 'busy' }
  | { step: 'export-success'; path: string }
  | { step: 'preview'; meetingCount: number; swimmerCount: number; existingCount: number }
  | { step: 'import-success'; meetingsImported: number; swimmersImported: number; meetingsSkipped: number }
  | { step: 'error'; error: string };

export function BackupSection(): JSX.Element {
  const [state, setState] = useState<BackupState>({ step: 'idle' });

  async function handleExport(): Promise<void> {
    setState({ step: 'busy' });
    const result = await window.electronAPI.exportBackup();
    if (result.success && result.path) {
      setState({ step: 'export-success', path: result.path });
    } else if (result.error) {
      setState({ step: 'error', error: result.error });
    } else {
      setState({ step: 'idle' });
    }
  }

  async function handleImport(): Promise<void> {
    setState({ step: 'busy' });
    const result = await window.electronAPI.importBackup();
    if (result.success && result.preview) {
      setState({ step: 'preview', ...result.preview });
    } else if (result.error) {
      setState({ step: 'error', error: result.error });
    } else {
      setState({ step: 'idle' });
    }
  }

  async function handleConfirm(): Promise<void> {
    setState({ step: 'busy' });
    const result = await window.electronAPI.confirmImport();
    if (result.success && result.result) {
      setState({ step: 'import-success', ...result.result });
    } else if (result.error) {
      setState({ step: 'error', error: result.error });
    } else {
      setState({ step: 'idle' });
    }
  }

  const isBusy = state.step === 'busy';

  return (
    <div className="space-y-4 rounded-lg bg-neutral-0 p-6 shadow-card">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary-800">
        Sauvegarde et restauration
      </h2>
      <p className="text-sm text-neutral-600">
        Exportez l'ensemble des meetings dans un fichier JSON, ou restaurez-les depuis une sauvegarde.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-md bg-secondary-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-secondary-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Exporter la sauvegarde
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-200 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Importer une sauvegarde
        </button>
      </div>

      {state.step === 'export-success' && (
        <p className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Sauvegarde enregistrée : {state.path}
        </p>
      )}

      {state.step === 'preview' && (
        <div className="space-y-3 rounded-md border border-warning bg-warning/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
            {state.meetingCount} meeting(s), {state.swimmerCount} nageur(s) dans ce fichier.
            {state.existingCount > 0 && ` ${state.existingCount} meeting(s) déjà présent(s) seront ignorés.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-md bg-secondary-600 px-3 py-1.5 text-sm font-medium text-neutral-0 hover:bg-secondary-700"
            >
              Confirmer l'import
            </button>
            <button
              type="button"
              onClick={() => setState({ step: 'idle' })}
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {state.step === 'import-success' && (
        <p className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {state.meetingsImported} meeting(s) importé(s), {state.swimmersImported} nageur(s), {state.meetingsSkipped} déjà présent(s) ignoré(s).
        </p>
      )}

      {state.step === 'error' && (
        <p className={cn('text-sm text-error')}>Erreur : {state.error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire BackupSection into SettingsPage**

In `src/pages/SettingsPage.tsx`, add the import and render `BackupSection` below `SettingsForm`:

```typescript
import { BackupSection } from '@/components/settings/BackupSection';
```

```typescript
      <SettingsForm
        meeting={meeting}
        onSave={async (input) => {
          await meetingState.updateMeeting(meeting.id, input);
        }}
      />
      <BackupSection />
```

- [ ] **Step 3: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/BackupSection.tsx src/pages/SettingsPage.tsx
git commit -m "feat: add backup export/import UI to settings page"
```

---

### Task 4: Auto-backup after CSV import, with rotation

**Files:**
- Modify: `electron/ipc-handlers.ts`
- Create: `electron/auto-backup.ts`
- Test: `test/auto-backup.test.ts`

**Interfaces:**
- Consumes: `exportDatabase` from `src/lib/backup.ts`
- Produces:
  ```typescript
  interface BackupConfig {
    backupDir: string;
    maxBackups: number;
  }

  function loadBackupConfig(): BackupConfig;
  function saveBackupConfig(config: BackupConfig): void;
  function performAutoBackup(db: Database.Database): void;
  function rotateBackups(dir: string, maxBackups: number): void;
  ```

- [ ] **Step 1: Write failing test for rotation logic**

Create `test/auto-backup.test.ts`:

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { rotateBackups } from '../electron/auto-backup';

describe('rotateBackups', () => {
  const tmpDir = path.join(os.tmpdir(), 'mdlm-backup-test-' + Date.now());

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('keeps only maxBackups most recent files, deleting the oldest', () => {
    for (let i = 0; i < 6; i++) {
      writeFileSync(path.join(tmpDir, `mdlm-auto-backup-2026-09-${String(10 + i).padStart(2, '0')}T12-00-00.json`), '{}');
    }

    rotateBackups(tmpDir, 5);

    const remaining = readdirSync(tmpDir).filter((f) => f.endsWith('.json')).sort();
    expect(remaining).toHaveLength(5);
    expect(remaining[0]).toBe('mdlm-auto-backup-2026-09-11T12-00-00.json');
    expect(existsSync(path.join(tmpDir, 'mdlm-auto-backup-2026-09-10T12-00-00.json'))).toBe(false);
  });

  it('does nothing when file count is at or below maxBackups', () => {
    writeFileSync(path.join(tmpDir, 'mdlm-auto-backup-2026-09-10T12-00-00.json'), '{}');
    rotateBackups(tmpDir, 5);
    expect(readdirSync(tmpDir)).toHaveLength(1);
  });

  it('ignores files that are not auto-backups', () => {
    writeFileSync(path.join(tmpDir, 'notes.txt'), 'hello');
    rotateBackups(tmpDir, 0);
    expect(readdirSync(tmpDir)).toEqual(['notes.txt']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- test/auto-backup.test.ts`
Expected: FAIL — module `../electron/auto-backup` not found

- [ ] **Step 3: Implement auto-backup.ts**

Create `electron/auto-backup.ts`:

```typescript
/**
 * Responsabilité : sauvegarde automatique après import CSV avec rotation des anciens fichiers.
 * Appelé par : ipc-handlers.ts après insertSwimmerResults.
 * Suppression casserait : la sauvegarde automatique des données après import.
 */
import { app } from 'electron';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { exportDatabase } from '../src/lib/backup';

export interface BackupConfig {
  backupDir: string;
  maxBackups: number;
}

const CONFIG_FILENAME = 'backup-config.json';
const DEFAULT_MAX_BACKUPS = 5;
const BACKUP_PREFIX = 'mdlm-auto-backup-';

function configPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILENAME);
}

function defaultBackupDir(): string {
  return path.join(app.getPath('userData'), 'backups');
}

export function loadBackupConfig(): BackupConfig {
  const cfgPath = configPath();
  if (existsSync(cfgPath)) {
    const raw = readFileSync(cfgPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BackupConfig>;
    return {
      backupDir: typeof parsed.backupDir === 'string' ? parsed.backupDir : defaultBackupDir(),
      maxBackups: typeof parsed.maxBackups === 'number' && parsed.maxBackups > 0 ? parsed.maxBackups : DEFAULT_MAX_BACKUPS,
    };
  }
  return { backupDir: defaultBackupDir(), maxBackups: DEFAULT_MAX_BACKUPS };
}

export function saveBackupConfig(config: BackupConfig): void {
  writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf-8');
}

/** Deletes the oldest `mdlm-auto-backup-*.json` files in `dir` until at most `maxBackups` remain. Filenames sort chronologically (ISO-based timestamp), so lexicographic order is chronological order. */
export function rotateBackups(dir: string, maxBackups: number): void {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.json'))
    .sort();

  const excess = files.length - maxBackups;
  for (let i = 0; i < excess; i++) {
    unlinkSync(path.join(dir, files[i]!));
  }
}

export function performAutoBackup(db: Database.Database): void {
  try {
    const config = loadBackupConfig();

    if (!existsSync(config.backupDir)) {
      mkdirSync(config.backupDir, { recursive: true });
    }

    const data = exportDatabase(db);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    writeFileSync(path.join(config.backupDir, `${BACKUP_PREFIX}${timestamp}.json`), JSON.stringify(data, null, 2), 'utf-8');

    rotateBackups(config.backupDir, config.maxBackups);
  } catch (error) {
    // Auto-backup must never block or fail the CSV import it runs after.
    console.error('Auto-backup failed:', error);
  }
}
```

- [ ] **Step 4: Run rotation test to verify it passes**

Run: `npm run test -- test/auto-backup.test.ts`
Expected: PASS

- [ ] **Step 5: Call auto-backup after CSV import**

In `electron/ipc-handlers.ts`, add the import:

```typescript
import { performAutoBackup } from './auto-backup';
```

Modify the `importCsv` handler to call it after persisting:

```typescript
  ipcMain.handle(IpcChannels.importCsv, async (_event, meetingId: number, rows: RawSwimmerRow[]) => {
    insertSwimmerResults(db, meetingId, rows);
    performAutoBackup(db);
  });
```

- [ ] **Step 6: Run full test suite and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add electron/auto-backup.ts electron/ipc-handlers.ts test/auto-backup.test.ts
git commit -m "feat: add auto-backup after CSV import with rotation"
```

---

### Task 5: Backup settings (folder and max backups count)

**Files:**
- Create: `src/components/settings/BackupConfigSection.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `electron/ipc-handlers.ts`
- Modify: `electron/ipc-channels.ts`
- Modify: `electron/preload.ts`

**Interfaces:**
- Consumes: `loadBackupConfig`, `saveBackupConfig`, `type BackupConfig` from `electron/auto-backup.ts`
- Produces:
  ```typescript
  // New IPC channels
  backupGetConfig: 'backup:get-config'   // → BackupConfig
  backupSetConfig: 'backup:set-config'   // → { success: boolean }
  backupChooseDir: 'backup:choose-dir'   // → string | null

  // New preload API
  window.electronAPI.getBackupConfig(): Promise<BackupConfig>
  window.electronAPI.setBackupConfig(config: BackupConfig): Promise<{ success: boolean }>
  window.electronAPI.chooseBackupDir(): Promise<string | null>
  ```

- [ ] **Step 1: Add IPC channels**

In `electron/ipc-channels.ts`, add inside `IpcChannels`:

```typescript
  backupGetConfig: 'backup:get-config',
  backupSetConfig: 'backup:set-config',
  backupChooseDir: 'backup:choose-dir',
```

- [ ] **Step 2: Add IPC handlers**

In `electron/ipc-handlers.ts`, add the import:

```typescript
import { loadBackupConfig, saveBackupConfig, type BackupConfig } from './auto-backup';
```

Add the handlers (after the backup handlers from Task 2):

```typescript
  ipcMain.handle(IpcChannels.backupGetConfig, async () => loadBackupConfig());

  ipcMain.handle(IpcChannels.backupSetConfig, async (_event, config: BackupConfig) => {
    saveBackupConfig(config);
    return { success: true };
  });

  ipcMain.handle(IpcChannels.backupChooseDir, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });
```

- [ ] **Step 3: Add preload API**

In `electron/preload.ts`, add the import:

```typescript
import type { BackupConfig } from './auto-backup';
```

Add to `electronAPI`:

```typescript
  getBackupConfig: (): Promise<BackupConfig> => ipcRenderer.invoke(IpcChannels.backupGetConfig),
  setBackupConfig: (config: BackupConfig): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IpcChannels.backupSetConfig, config),
  chooseBackupDir: (): Promise<string | null> => ipcRenderer.invoke(IpcChannels.backupChooseDir),
```

- [ ] **Step 4: Create BackupConfigSection component**

Create `src/components/settings/BackupConfigSection.tsx`:

```typescript
/**
 * Responsabilité : configuration du dossier et du nombre de sauvegardes automatiques conservées.
 * Appelé par : SettingsPage.tsx.
 * Suppression casserait : la configuration des sauvegardes automatiques (le comportement par défaut resterait actif).
 */
import { useEffect, useState } from 'react';
import { Folder, Save } from 'lucide-react';

export function BackupConfigSection(): JSX.Element {
  const [backupDir, setBackupDir] = useState('');
  const [maxBackups, setMaxBackups] = useState(5);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    void window.electronAPI.getBackupConfig().then((config) => {
      setBackupDir(config.backupDir);
      setMaxBackups(config.maxBackups);
    });
  }, []);

  async function handleChooseDir(): Promise<void> {
    const chosen = await window.electronAPI.chooseBackupDir();
    if (chosen) {
      setBackupDir(chosen);
      setSavedAt(null);
    }
  }

  async function handleSave(): Promise<void> {
    await window.electronAPI.setBackupConfig({ backupDir, maxBackups });
    setSavedAt(Date.now());
  }

  return (
    <div className="space-y-4 rounded-lg bg-neutral-0 p-6 shadow-card">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary-800">
        Sauvegardes automatiques
      </h2>
      <div>
        <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500">Dossier de sauvegarde</span>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex-1 truncate rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
            {backupDir || 'Dossier par défaut'}
          </span>
          <button
            type="button"
            onClick={handleChooseDir}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
          >
            <Folder className="h-4 w-4" aria-hidden="true" />
            Choisir
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="max-backups" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
          Nombre de sauvegardes automatiques conservées
        </label>
        <input
          id="max-backups"
          type="number"
          min={1}
          value={maxBackups}
          onChange={(event) => {
            setMaxBackups(Number(event.target.value));
            setSavedAt(null);
          }}
          className="mt-1 w-32 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-md bg-secondary-600 px-4 py-2 text-sm font-medium text-neutral-0 hover:bg-secondary-700"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Enregistrer
        </button>
        {savedAt && <span className="text-sm text-success">Configuration enregistrée.</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add to SettingsPage**

In `src/pages/SettingsPage.tsx`, import and render `BackupConfigSection` below `BackupSection`:

```typescript
import { BackupConfigSection } from '@/components/settings/BackupConfigSection';
```

```typescript
      <BackupSection />
      <BackupConfigSection />
```

- [ ] **Step 6: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/settings/BackupConfigSection.tsx src/pages/SettingsPage.tsx electron/ipc-handlers.ts electron/ipc-channels.ts electron/preload.ts
git commit -m "feat: add backup configuration UI (folder and rotation limit)"
```

---

### Task 6: Update living docs

**Files:**
- Modify: `docs/screens.md`
- Modify: `docs/architecture.md`
- Modify: `docs/data-model.md`

**Interfaces:**
- No code interfaces

- [ ] **Step 1: Update docs/screens.md**

Add to the Paramètres screen description:
- "Sauvegarde et restauration" section: export full database as JSON, import from JSON with a preview (meeting/swimmer counts, existing-meeting count) and explicit confirmation before writing.
- "Sauvegardes automatiques" section: backup folder path (choosable), max rotation count.
- Note that auto-backup runs silently after each CSV import and never blocks the import on failure.

- [ ] **Step 2: Update docs/architecture.md**

Add:
- Backup data flow: SQLite (`meeting`, `swimmer_result`, `team_ranking`) → `exportDatabase()` → JSON file; JSON file → `validateBackup()` → `restoreDatabase()` → SQLite.
- Auto-backup trigger point: inside the `import:csv` IPC handler, after `insertSwimmerResults` succeeds.
- `backup-config.json` is stored in `app.getPath('userData')`, outside SQLite, so it survives a full database restore.
- New IPC channels: `backup:export`, `backup:import`, `backup:confirm-import`, `backup:get-config`, `backup:set-config`, `backup:choose-dir`.

- [ ] **Step 3: Update docs/data-model.md**

Add:
- `BackupData` JSON schema (version, appName, exportedAt, meetings[] with swimmers[] and teamRankings[], including the `defaultTopN`/`minSwimmers`/`activeCategories` ranking-rule fields added in a later migration).
- Note that backup config (`backupDir`, `maxBackups`) is a plain JSON file, not a SQLite table.

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs: add backup and restore to living docs"
```
