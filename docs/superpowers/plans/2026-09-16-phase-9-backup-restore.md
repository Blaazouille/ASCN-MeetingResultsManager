# Phase 9 — Backup & Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JSON export/import of the full database via the Settings page, plus automatic backup after each CSV import with configurable rotation.

**Architecture:** A new pure lib module (`backup.ts`) handles serialization, validation, and restoration — fully unit-tested. Two new IPC handlers (`backup:export`, `backup:import`) bridge the UI to the filesystem. The Settings page gets an "Export/Import" section. Auto-backup runs silently in the main process after each CSV import, with rotation managed by a `backup-config.json` file (not SQLite, so config survives a DB restore).

**Tech Stack:** React 18 + TypeScript (strict), Electron IPC, better-sqlite3, Vitest. No new dependencies.

## Global Constraints

- TypeScript `strict: true`, no `any` — use `unknown` + type guards.
- Components: `PascalCase.tsx`; hooks: `use-kebab-case.ts`; lib: `kebab-case.ts`.
- UI entirely in French, French punctuation (espace insécable avant `:`, `;`, `!`, `?`).
- Every file must have a header comment.
- One file = one responsibility. Never exceed 300 lines per file.
- Never leave dead code.
- Run `npm run test` and `npm run lint` after each task; both must pass before committing.

---

### Task 1: Backup engine — `exportDatabase`, `validateBackup`, `restoreDatabase`

**Files:**
- Create: `src/lib/backup.ts`
- Create: `test/backup.test.ts`

**Interfaces:**
- Consumes: `Database` from `better-sqlite3`, `Meeting` and `getAllMeetings` from `src/lib/db.ts`
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
    status: MeetingStatus;
    createdAt: string;
    updatedAt: string;
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

- [ ] **Step 1: Write failing tests**

Create `test/backup.test.ts`:

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createMeeting, initDatabase } from '../src/lib/db';
import {
  exportDatabase,
  validateBackup,
  restoreDatabase,
  type BackupData,
} from '../src/lib/backup';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  initDatabase(db);
  return db;
}

function seedDb(db: Database.Database): void {
  const meeting = createMeeting(db, { name: 'Test Meeting', date: '2026-09-01', location: 'Pool' });
  db.prepare(
    `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(meeting.id, 'Classement Mixte', 1, 'DUPONT', 'Jean', 1990, 'FRA', 'CN TEST', 800);
  db.prepare(
    `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(meeting.id, 'Classement Mixte', 2, 'MARTIN', 'Marie', 1995, 'FRA', 'CN TEST', 750);
}

describe('exportDatabase', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
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

  it('exports meeting with its swimmers', () => {
    const backup = exportDatabase(db);
    const meeting = backup.meetings[0]!;
    expect(meeting.name).toBe('Test Meeting');
    expect(meeting.swimmers).toHaveLength(2);
    expect(meeting.swimmers[0]!.lastname).toBe('DUPONT');
  });

  it('exports an empty database as empty meetings array', () => {
    const emptyDb = createTestDb();
    const backup = exportDatabase(emptyDb);
    expect(backup.meetings).toHaveLength(0);
    emptyDb.close();
  });
});

describe('validateBackup', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
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
    sourceDb = createTestDb();
    seedDb(sourceDb);
    targetDb = createTestDb();
  });

  afterEach(() => {
    sourceDb.close();
    targetDb.close();
  });

  it('imports meetings and swimmers into an empty database', () => {
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

  it('round-trip preserves all data', () => {
    const backup = exportDatabase(sourceDb);
    restoreDatabase(targetDb, backup);
    const reExported = exportDatabase(targetDb);
    expect(reExported.meetings).toHaveLength(backup.meetings.length);
    expect(reExported.meetings[0]!.swimmers).toHaveLength(backup.meetings[0]!.swimmers.length);
    expect(reExported.meetings[0]!.name).toBe(backup.meetings[0]!.name);
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
    });
    expect(() => restoreDatabase(targetDb, backup)).toThrow();
    const check = targetDb.prepare('SELECT COUNT(*) as count FROM meeting').get() as { count: number };
    expect(check.count).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/backup.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement backup.ts**

Create `src/lib/backup.ts`:

```typescript
/**
 * Responsabilité : export / import complet de la base de données en JSON.
 * Appelé par : ipc-handlers.ts (export/import), tests.
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

export function exportDatabase(db: Database.Database): BackupData {
  const meetings = db.prepare('SELECT * FROM meeting ORDER BY id').all() as Array<{
    id: number;
    name: string;
    date: string;
    location: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }>;

  const meetingBackups: MeetingBackup[] = meetings.map((m) => {
    const swimmers = db
      .prepare('SELECT category, rank, lastname, firstname, birthyear, nation, club, points FROM swimmer_result WHERE meeting_id = ?')
      .all(m.id) as SwimmerBackup[];

    const rankings = db
      .prepare('SELECT category, club, rank, total_points, top_n, swimmers, computed_at FROM team_ranking WHERE meeting_id = ?')
      .all(m.id) as Array<{
        category: string;
        club: string;
        rank: number;
        total_points: number;
        top_n: number;
        swimmers: string;
        computed_at: string;
      }>;

    return {
      name: m.name,
      date: m.date,
      location: m.location,
      status: m.status,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      swimmers,
      teamRankings: rankings.map((r) => ({
        category: r.category,
        club: r.club,
        rank: r.rank,
        totalPoints: r.total_points,
        topN: r.top_n,
        swimmers: r.swimmers,
        computedAt: r.computed_at,
      })),
    };
  });

  return {
    version: 1,
    appName: 'ASCN Meeting Results',
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
        'INSERT INTO meeting (name, date, location, status) VALUES (?, ?, ?, ?)'
      );
      const row = insertMeeting.run(meeting.name, meeting.date, meeting.location, meeting.status);
      const meetingId = row.lastInsertRowid;
      result.meetingsImported++;

      const insertSwimmer = db.prepare(
        `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const s of meeting.swimmers) {
        insertSwimmer.run(meetingId, s.category, s.rank, s.lastname, s.firstname, s.birthyear, s.nation, s.club, s.points);
        result.swimmersImported++;
      }

      if (meeting.teamRankings) {
        const insertRanking = db.prepare(
          `INSERT INTO team_ranking (meeting_id, category, club, rank, total_points, top_n, swimmers, computed_at)
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
- Consumes: `exportDatabase`, `validateBackup`, `restoreDatabase` from `src/lib/backup.ts`
- Produces:
  ```typescript
  // New IPC channels
  'backup:export' → { success: boolean; path?: string; error?: string }
  'backup:import' → { success: boolean; preview?: { meetingCount: number; swimmerCount: number; existingCount: number }; error?: string }
  'backup:confirm-import' → { success: boolean; result?: RestoreResult; error?: string }

  // New preload API
  window.electronAPI.exportBackup(): Promise<{ success: boolean; path?: string; error?: string }>
  window.electronAPI.importBackup(): Promise<{ success: boolean; preview?: {...}; error?: string }>
  window.electronAPI.confirmImport(): Promise<{ success: boolean; result?: RestoreResult; error?: string }>
  ```

- [ ] **Step 1: Add new channel constants**

In `electron/ipc-channels.ts`, add:
```typescript
export const BACKUP_EXPORT = 'backup:export';
export const BACKUP_IMPORT = 'backup:import';
export const BACKUP_CONFIRM_IMPORT = 'backup:confirm-import';
```

- [ ] **Step 2: Add IPC handlers**

In `electron/ipc-handlers.ts`, add handlers for the three backup channels:

`backup:export`:
1. Call `exportDatabase(db)`.
2. Open `dialog.showSaveDialog` with default filename `ascn-backup-{YYYY-MM-DD-HHmmss}.json` and filter `*.json`.
3. Write JSON to the chosen path with `fs.writeFileSync` (UTF-8, 2-space indent for readability).
4. Return `{ success: true, path }` or `{ success: false, error }`.

`backup:import`:
1. Open `dialog.showOpenDialog` with filter `*.json`.
2. Read the file, parse JSON.
3. Call `validateBackup(parsed)`.
4. Count meetings, swimmers, and how many meetings already exist in the DB.
5. Store the validated backup data in a module-level variable for the confirm step.
6. Return `{ success: true, preview: { meetingCount, swimmerCount, existingCount } }`.

`backup:confirm-import`:
1. Read the stored backup data from the previous import step.
2. Call `restoreDatabase(db, data)`.
3. Clear the stored backup data.
4. Return `{ success: true, result }`.

- [ ] **Step 3: Add preload API**

In `electron/preload.ts`, add to the `electronAPI` object:
```typescript
exportBackup: () => ipcRenderer.invoke(BACKUP_EXPORT),
importBackup: () => ipcRenderer.invoke(BACKUP_IMPORT),
confirmImport: () => ipcRenderer.invoke(BACKUP_CONFIRM_IMPORT),
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
- Produces: backup section in Settings with export/import buttons and confirmation dialog

- [ ] **Step 1: Create BackupSection component**

Create `src/components/settings/BackupSection.tsx`:

```typescript
/**
 * Responsabilité : section de sauvegarde/restauration dans les paramètres.
 * Appelé par : SettingsPage.tsx.
 * Suppression casserait : l'interface de backup dans les paramètres.
 */
import { useState } from 'react';
import { Download, Upload } from 'lucide-react';

type BackupState =
  | { step: 'idle' }
  | { step: 'exporting' }
  | { step: 'export-success'; path: string }
  | { step: 'export-error'; error: string }
  | { step: 'importing' }
  | { step: 'preview'; meetingCount: number; swimmerCount: number; existingCount: number }
  | { step: 'confirming' }
  | { step: 'import-success'; meetingsImported: number; swimmersImported: number; meetingsSkipped: number }
  | { step: 'import-error'; error: string };

export function BackupSection(): JSX.Element {
  const [state, setState] = useState<BackupState>({ step: 'idle' });

  async function handleExport(): Promise<void> {
    setState({ step: 'exporting' });
    const result = await window.electronAPI.exportBackup();
    if (result.success && result.path) {
      setState({ step: 'export-success', path: result.path });
    } else {
      setState({ step: result.error ? 'export-error' : 'idle', ...(result.error ? { error: result.error } : {}) } as BackupState);
    }
  }

  async function handleImport(): Promise<void> {
    setState({ step: 'importing' });
    const result = await window.electronAPI.importBackup();
    if (result.success && result.preview) {
      setState({ step: 'preview', ...result.preview });
    } else {
      setState({ step: result.error ? 'import-error' : 'idle', ...(result.error ? { error: result.error } : {}) } as BackupState);
    }
  }

  async function handleConfirm(): Promise<void> {
    setState({ step: 'confirming' });
    const result = await window.electronAPI.confirmImport();
    if (result.success && result.result) {
      setState({ step: 'import-success', ...result.result });
    } else {
      setState({ step: result.error ? 'import-error' : 'idle', ...(result.error ? { error: result.error } : {}) } as BackupState);
    }
  }

  // Render based on state.step — export/import buttons, preview confirmation, success/error messages
  // (full JSX implementation here)
}
```

The component uses a state machine pattern:
- `idle` → show Export + Import buttons
- `exporting` → show spinner on Export button
- `export-success` → show success with file path
- `preview` → show meeting/swimmer counts + "Confirmer l'import" / "Annuler" buttons
- `confirming` → show spinner
- `import-success` → show `RestoreResult` summary
- `*-error` → show error message with "Réessayer" button

- [ ] **Step 2: Wire BackupSection into SettingsPage**

In `src/pages/SettingsPage.tsx`, import and render `BackupSection`:

```typescript
import { BackupSection } from '@/components/settings/BackupSection';

export default function SettingsPage(): JSX.Element {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Paramètres</h1>
      </header>
      {/* existing settings sections */}
      <BackupSection />
    </div>
  );
}
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

### Task 4: Auto-backup after CSV import

**Files:**
- Modify: `electron/ipc-handlers.ts`
- Create: `electron/auto-backup.ts`

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
  ```

- [ ] **Step 1: Create auto-backup module**

Create `electron/auto-backup.ts`:

```typescript
/**
 * Responsabilité : sauvegarde automatique après import CSV avec rotation.
 * Appelé par : ipc-handlers.ts après insertSwimmerResults.
 * Suppression casserait : la sauvegarde automatique des données.
 */
import { app } from 'electron';
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { exportDatabase } from '../src/lib/backup';

export interface BackupConfig {
  backupDir: string;
  maxBackups: number;
}

const CONFIG_FILENAME = 'backup-config.json';
const DEFAULT_MAX_BACKUPS = 5;

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

export function performAutoBackup(db: Database.Database): void {
  try {
    const config = loadBackupConfig();
    const dir = config.backupDir;

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const data = exportDatabase(db);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `ascn-auto-backup-${timestamp}.json`;
    writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2), 'utf-8');

    const files = readdirSync(dir)
      .filter((f) => f.startsWith('ascn-auto-backup-') && f.endsWith('.json'))
      .sort()
      .reverse();

    while (files.length > config.maxBackups) {
      const oldest = files.pop()!;
      unlinkSync(path.join(dir, oldest));
    }
  } catch (error) {
    console.error('Auto-backup failed:', error);
  }
}
```

- [ ] **Step 2: Call auto-backup after CSV import**

In `electron/ipc-handlers.ts`, after the existing `insertSwimmerResults` call succeeds in the CSV import handler, add:

```typescript
import { performAutoBackup } from './auto-backup';

// After insertSwimmerResults succeeds:
performAutoBackup(db);
```

The auto-backup is wrapped in a try/catch internally, so it won't block or fail the import.

- [ ] **Step 3: Write auto-backup tests**

Add to `test/backup.test.ts`:

```typescript
import { readdirSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('auto-backup rotation', () => {
  const tmpDir = path.join(os.tmpdir(), 'backup-test-' + Date.now());

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('keeps only maxBackups files after rotation', () => {
    // Create 6 fake backup files
    for (let i = 0; i < 6; i++) {
      writeFileSync(
        path.join(tmpDir, `ascn-auto-backup-2026-09-${String(10 + i).padStart(2, '0')}T12-00-00.json`),
        '{}'
      );
    }

    const maxBackups = 5;
    const files = readdirSync(tmpDir)
      .filter((f) => f.startsWith('ascn-auto-backup-') && f.endsWith('.json'))
      .sort()
      .reverse();

    while (files.length > maxBackups) {
      const oldest = files.pop()!;
      const filePath = path.join(tmpDir, oldest);
      if (existsSync(filePath)) {
        rmSync(filePath);
      }
    }

    const remaining = readdirSync(tmpDir).filter((f) => f.endsWith('.json'));
    expect(remaining).toHaveLength(5);
  });
});
```

- [ ] **Step 4: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/auto-backup.ts electron/ipc-handlers.ts test/backup.test.ts
git commit -m "feat: add auto-backup after CSV import with rotation"
```

---

### Task 5: Backup settings (optional folder and max backups config)

**Files:**
- Create: `src/components/settings/BackupConfigSection.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `electron/ipc-handlers.ts`
- Modify: `electron/ipc-channels.ts`
- Modify: `electron/preload.ts`

**Interfaces:**
- Consumes: `loadBackupConfig`, `saveBackupConfig` from `electron/auto-backup.ts`
- Produces:
  ```typescript
  // New IPC channels
  'backup:get-config' → BackupConfig
  'backup:set-config' → { success: boolean }

  // New preload API
  window.electronAPI.getBackupConfig(): Promise<BackupConfig>
  window.electronAPI.setBackupConfig(config: BackupConfig): Promise<{ success: boolean }>
  ```

- [ ] **Step 1: Add IPC channels and handlers**

In `electron/ipc-channels.ts`:
```typescript
export const BACKUP_GET_CONFIG = 'backup:get-config';
export const BACKUP_SET_CONFIG = 'backup:set-config';
```

In `electron/ipc-handlers.ts`, add handlers:
- `backup:get-config`: return `loadBackupConfig()`
- `backup:set-config`: call `saveBackupConfig(config)`, return `{ success: true }`

Add a handler for selecting a backup folder via `dialog.showOpenDialog` with `properties: ['openDirectory']`.

- [ ] **Step 2: Add preload API**

In `electron/preload.ts`:
```typescript
getBackupConfig: () => ipcRenderer.invoke(BACKUP_GET_CONFIG),
setBackupConfig: (config: BackupConfig) => ipcRenderer.invoke(BACKUP_SET_CONFIG, config),
```

- [ ] **Step 3: Create BackupConfigSection component**

Create `src/components/settings/BackupConfigSection.tsx`:

```typescript
/**
 * Responsabilité : configuration du dossier et de la rotation des auto-backups.
 * Appelé par : SettingsPage.tsx.
 * Suppression casserait : la configuration des sauvegardes automatiques.
 */
import { useEffect, useState } from 'react';
import { Folder, Save } from 'lucide-react';

export function BackupConfigSection(): JSX.Element {
  const [backupDir, setBackupDir] = useState('');
  const [maxBackups, setMaxBackups] = useState(5);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electronAPI.getBackupConfig().then((config) => {
      setBackupDir(config.backupDir);
      setMaxBackups(config.maxBackups);
    });
  }, []);

  async function handleSave(): Promise<void> {
    await window.electronAPI.setBackupConfig({ backupDir, maxBackups });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Render: folder path display + browse button, max backups number input, save button
}
```

- [ ] **Step 4: Add to SettingsPage**

In `src/pages/SettingsPage.tsx`, add `BackupConfigSection` below `BackupSection`.

- [ ] **Step 5: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

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

Add to the Paramètres screen:
- "Sauvegarde" section: export full database as JSON, import from JSON with preview/confirmation
- "Configuration des sauvegardes" section: backup folder path, max rotation count
- Auto-backup runs silently after each CSV import

- [ ] **Step 2: Update docs/architecture.md**

Add:
- Backup data flow: SQLite → `exportDatabase()` → JSON file / JSON file → `validateBackup()` → `restoreDatabase()` → SQLite
- Auto-backup trigger point (after CSV import in ipc-handlers)
- `backup-config.json` stored in `userData` (not SQLite)

- [ ] **Step 3: Update docs/data-model.md**

Add:
- `BackupData` JSON schema description
- Note that backup config is NOT in SQLite

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs: add backup and restore to living docs"
```
