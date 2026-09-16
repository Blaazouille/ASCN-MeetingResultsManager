# Écran Paramètres (Phase 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Paramètres screen (meeting info + ranking rules) and wire its saved values into the Classement screen, per `docs/superpowers/specs/2026-09-16-settings-screen-design.md`.

**Architecture:** Extend the `meeting` SQLite row with three new columns (`default_top_n`, `min_swimmers`, `active_categories`) read/written through the existing `updateMeeting` IPC round-trip. `ranking-engine.ts` gains a `minSwimmers` filter and a category-list helper, both pure and unit-tested. `RankingPage` adopts the meeting's saved values as initial state and fixes a pre-existing hardcoded status badge. A new `SettingsForm` component under `src/components/settings/` provides the two-column form described in the design.

**Tech Stack:** React 18 + TypeScript (strict), better-sqlite3, Vitest. No new dependencies.

## Global Constraints

- TypeScript `strict: true`, no `any` — use `unknown` + type guards (CLAUDE.md).
- Components: `PascalCase.tsx`; hooks: `use-kebab-case.ts`; lib: `kebab-case.ts` (CLAUDE.md).
- UI entirely in French, French punctuation (espace insécable avant `:`, `;`, `!`, `?`) (CLAUDE.md).
- Points/numbers: `formatPoints`, `font-variant-numeric: tabular-nums` on numeric columns (CLAUDE.md) — not directly relevant to new numeric inputs here beyond following existing patterns.
- `cn()` (clsx + tailwind-merge) for conditional classes (CLAUDE.md).
- No comments explaining WHAT code does; only WHY when non-obvious (CLAUDE.md project convention, matches existing style in this repo).
- Run `npm run test` (Vitest) and `npm run lint` (`tsc -b --noEmit`) after each task; both must pass before committing.
- No new UI component/hook tests — this codebase only unit-tests `src/lib/*` pure functions (see `test/` — no jsdom/@testing-library setup). Verify UI changes by reading the code path and, where practical, `npm run dev`.

---

### Task 1: Extend the `meeting` schema and CRUD with ranking-rule columns

**Files:**
- Modify: `src/lib/db.ts`
- Test: `test/db.test.ts`

**Interfaces:**
- Produces: `Meeting.defaultTopN: number`, `Meeting.minSwimmers: number`, `Meeting.activeCategories: string[] | null`; `MeetingInput.defaultTopN?: number`, `MeetingInput.minSwimmers?: number`, `MeetingInput.activeCategories?: string[] | null`. `createMeeting`/`updateMeeting` read and persist these fields. Later tasks (2, 4, 5) consume `Meeting.defaultTopN`/`minSwimmers`/`activeCategories` by these exact names.

Current relevant code (`src/lib/db.ts`):

```typescript
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
```

```typescript
export function createDatabase(filePath: string): Database.Database {
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('user_version = 1');
  db.exec(SCHEMA_SQL);
  return db;
}
```

`db.pragma('user_version = 1')` runs unconditionally on every open — it does not track anything and there is no migration path in this codebase yet. This task introduces the first real one.

- [ ] **Step 1: Write the failing tests**

Add to `test/db.test.ts`, inside (or near) the existing `describe('meeting CRUD', ...)` block:

```typescript
  it('creates a meeting with ranking-rule defaults', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'Meeting de la Mer 2026', date: '2026-11-16' });

    expect(meeting.defaultTopN).toBe(5);
    expect(meeting.minSwimmers).toBe(0);
    expect(meeting.activeCategories).toBeNull();
  });

  it('creates a meeting with explicit ranking rules', () => {
    const db = freshDb();
    const meeting = createMeeting(db, {
      name: 'Test',
      date: '2026-01-01',
      defaultTopN: 7,
      minSwimmers: 3,
      activeCategories: ['Classement Mixte', 'Classement Dames'],
    });

    expect(meeting.defaultTopN).toBe(7);
    expect(meeting.minSwimmers).toBe(3);
    expect(meeting.activeCategories).toEqual(['Classement Mixte', 'Classement Dames']);
  });

  it('updates ranking rules independently of meeting info', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'Test', date: '2026-01-01' });

    const updated = updateMeeting(db, meeting.id, {
      defaultTopN: 10,
      minSwimmers: 2,
      activeCategories: ['Classement Mixte'],
    });

    expect(updated.defaultTopN).toBe(10);
    expect(updated.minSwimmers).toBe(2);
    expect(updated.activeCategories).toEqual(['Classement Mixte']);
    expect(updated.name).toBe('Test');
  });

  it('round-trips activeCategories back to null', () => {
    const db = freshDb();
    const meeting = createMeeting(db, {
      name: 'Test',
      date: '2026-01-01',
      activeCategories: ['Classement Mixte'],
    });

    const updated = updateMeeting(db, meeting.id, { activeCategories: null });

    expect(updated.activeCategories).toBeNull();
  });

  it('runs the schema migration idempotently on repeated opens', () => {
    const db = freshDb();
    createMeeting(db, { name: 'Test', date: '2026-01-01' });
    expect(() => createDatabase(':memory:')).not.toThrow();
  });
```

Add `createDatabase` to the existing import from `'../src/lib/db'` at the top of `test/db.test.ts` if not already imported (it already is, per the current file — confirm it's in the import list; it is: `createDatabase` is imported).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/db.test.ts`
Expected: FAIL — `defaultTopN`/`minSwimmers`/`activeCategories` are `undefined`, not the expected values (the columns and type fields don't exist yet).

- [ ] **Step 3: Implement the schema migration and type/CRUD changes**

In `src/lib/db.ts`, update the types:

```typescript
export interface Meeting {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
  defaultTopN: number;
  minSwimmers: number;
  activeCategories: string[] | null;
}

export interface MeetingInput {
  name: string;
  date: string;
  location?: string | null;
  status?: MeetingStatus;
  defaultTopN?: number;
  minSwimmers?: number;
  activeCategories?: string[] | null;
}
```

Replace `createDatabase` and add a migration function right after `SCHEMA_SQL`:

```typescript
/** Opens (creating if needed) the SQLite database at `filePath` and ensures the schema exists. Pass ':memory:' in tests. */
export function createDatabase(filePath: string): Database.Database {
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  migrateSchema(db);
  return db;
}

/**
 * Schema migrations, gated on `PRAGMA user_version`. A fresh (or `:memory:`)
 * database starts at version 0 and runs every migration in order; an
 * existing on-disk database only runs the ones it hasn't seen yet.
 */
function migrateSchema(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number;
  if (version < 2) {
    db.exec(`
      ALTER TABLE meeting ADD COLUMN default_top_n INTEGER NOT NULL DEFAULT 5;
      ALTER TABLE meeting ADD COLUMN min_swimmers INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE meeting ADD COLUMN active_categories TEXT;
    `);
    db.pragma('user_version = 2');
  }
}
```

Update `MeetingRow` and `rowToMeeting`:

```typescript
interface MeetingRow {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
  default_top_n: number;
  min_swimmers: number;
  active_categories: string | null;
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
    defaultTopN: row.default_top_n,
    minSwimmers: row.min_swimmers,
    activeCategories: row.active_categories ? (JSON.parse(row.active_categories) as string[]) : null,
  };
}
```

Update `createMeeting`:

```typescript
export function createMeeting(db: Database.Database, input: MeetingInput): Meeting {
  const result = db
    .prepare(
      `INSERT INTO meeting (name, date, location, status, default_top_n, min_swimmers, active_categories)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.date,
      input.location ?? null,
      input.status ?? 'provisional',
      input.defaultTopN ?? 5,
      input.minSwimmers ?? 0,
      input.activeCategories ? JSON.stringify(input.activeCategories) : null
    );
  const row = db.prepare('SELECT * FROM meeting WHERE id = ?').get(result.lastInsertRowid) as MeetingRow;
  return rowToMeeting(row);
}
```

Update `updateMeeting` — note `activeCategories` needs the same "explicitly provided, including `null`" handling as `location`:

```typescript
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
    defaultTopN: input.defaultTopN ?? current.default_top_n,
    minSwimmers: input.minSwimmers ?? current.min_swimmers,
    activeCategories:
      input.activeCategories !== undefined
        ? input.activeCategories
          ? JSON.stringify(input.activeCategories)
          : null
        : current.active_categories,
  };
  db.prepare(
    `UPDATE meeting
     SET name = ?, date = ?, location = ?, status = ?, default_top_n = ?, min_swimmers = ?, active_categories = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    merged.name,
    merged.date,
    merged.location,
    merged.status,
    merged.defaultTopN,
    merged.minSwimmers,
    merged.activeCategories,
    id
  );
  const row = db.prepare('SELECT * FROM meeting WHERE id = ?').get(id) as MeetingRow;
  return rowToMeeting(row);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/db.test.ts`
Expected: PASS, including the pre-existing tests in this file (e.g. `updates only the given fields`, the full historique round-trip test) — confirms the migration and the `Partial<MeetingInput>` merge logic don't regress the existing fields.

- [ ] **Step 5: Type-check and commit**

Run: `npm run lint`
Expected: no errors.

```bash
git add src/lib/db.ts test/db.test.ts
git commit -m "feat: persist default top N, min swimmers, active categories on meeting

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `minSwimmers` filter and category helpers in the ranking engine

**Files:**
- Modify: `src/lib/ranking-engine.ts`
- Test: `test/ranking-engine.test.ts`

**Interfaces:**
- Consumes: nothing new from Task 1 (pure function, takes primitives).
- Produces: `RankingParams.minSwimmers?: number`; `ALL_CATEGORIES: readonly ['Classement Dames', 'Classement Messieurs', 'Classement Mixte']`; `resolveActiveCategories(present: string[], active: string[] | null): string[]`. Task 4 (`useRanking`/`RankingPage`) and Task 5 (`SettingsForm`) consume these three exact names.

- [ ] **Step 1: Write the failing tests**

Add to `test/ranking-engine.test.ts`, inside `describe('computeTeamRanking', ...)`:

```typescript
  it('excludes clubs with fewer swimmers than minSwimmers', () => {
    const withoutThreshold = computeTeamRanking(rows, { category: 'Classement Dames', topN: 5 });
    const withThreshold = computeTeamRanking(rows, { category: 'Classement Dames', topN: 5, minSwimmers: 3 });

    expect(withThreshold.length).toBeLessThan(withoutThreshold.length);
    expect(withThreshold.every((team) => team.swimmerCount >= 3)).toBe(true);
  });

  it('ignores minSwimmers of 0 (no threshold)', () => {
    const a = computeTeamRanking(rows, { category: 'Classement Dames', topN: 5 });
    const b = computeTeamRanking(rows, { category: 'Classement Dames', topN: 5, minSwimmers: 0 });
    expect(b).toEqual(a);
  });
```

Add a new top-level `describe` block at the end of the file, after `describe('filterTeamResultsByClub', ...)`:

```typescript
describe('resolveActiveCategories', () => {
  it('returns all present categories when active is null', () => {
    expect(resolveActiveCategories(['Classement Mixte', 'Classement Dames'], null)).toEqual([
      'Classement Mixte',
      'Classement Dames',
    ]);
  });

  it('intersects present categories with the active list, preserving present order', () => {
    expect(
      resolveActiveCategories(
        ['Classement Mixte', 'Classement Dames', 'Classement Messieurs'],
        ['Classement Messieurs', 'Classement Mixte']
      )
    ).toEqual(['Classement Mixte', 'Classement Messieurs']);
  });

  it('falls back to all present categories when the intersection is empty', () => {
    expect(resolveActiveCategories(['Classement Mixte'], ['Classement Dames'])).toEqual(['Classement Mixte']);
  });

  it('returns an empty array when no categories are present', () => {
    expect(resolveActiveCategories([], ['Classement Mixte'])).toEqual([]);
  });
});
```

Update the test file's import line to include the two new exports:

```typescript
import { computeTeamRanking, filterTeamResultsByClub, resolveActiveCategories } from '../src/lib/ranking-engine';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/ranking-engine.test.ts`
Expected: FAIL — `resolveActiveCategories` is not exported, and `minSwimmers` has no effect yet (the two new `computeTeamRanking` tests fail because both calls return identical results).

- [ ] **Step 3: Implement**

In `src/lib/ranking-engine.ts`, update `RankingParams`:

```typescript
export interface RankingParams {
  /** Category to compute, e.g. "Classement Mixte". */
  category: string;
  /** Number of top swimmers per club to retain. */
  topN: number;
  /** Clubs with fewer than this many swimmers in the category are excluded entirely. 0 or omitted = no threshold. */
  minSwimmers?: number;
}
```

In `computeTeamRanking`, filter by total swimmer count (not the topN-truncated count) before the final sort. Insert right after the `byClub` grouping loop, before `const unranked: ... = [];`:

```typescript
  const minSwimmers = params.minSwimmers ?? 0;
```

And inside the `for (const [club, clubRows] of byClub)` loop, skip clubs under the threshold before building their entry:

```typescript
  for (const [club, clubRows] of byClub) {
    if (clubRows.length < minSwimmers) {
      continue;
    }
    const sorted = [...clubRows].sort((a, b) => b.points - a.points);
    // ...unchanged...
  }
```

Add near the top of the file, after the imports, the fixed category list and helper:

```typescript
/** The three FFN result categories this app supports, in the order they should be offered as UI options. */
export const ALL_CATEGORIES = ['Classement Dames', 'Classement Messieurs', 'Classement Mixte'] as const;

/**
 * Resolves which categories the ranking UI should offer: the intersection
 * of `present` (categories actually found in the imported data, in their
 * original order) and `active` (the meeting's configured active
 * categories). `active === null` means "all active" — the historical
 * behavior before Paramètres existed. Falls back to all present categories
 * if the configured active set doesn't overlap with what's present, so a
 * meeting never ends up with zero selectable categories.
 */
export function resolveActiveCategories(present: string[], active: string[] | null): string[] {
  if (active === null) {
    return present;
  }
  const activeSet = new Set(active);
  const intersection = present.filter((category) => activeSet.has(category));
  return intersection.length > 0 ? intersection : present;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/ranking-engine.test.ts`
Expected: PASS, all tests including pre-existing ones (e.g. `changes totals when topN changes`, the ex-aequo test).

- [ ] **Step 5: Type-check and commit**

Run: `npm run lint`
Expected: no errors.

```bash
git add src/lib/ranking-engine.ts test/ranking-engine.test.ts
git commit -m "feat: add minSwimmers threshold and active-category resolution to ranking engine

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Expose `updateMeeting` from `useMeeting`

**Files:**
- Modify: `src/hooks/use-meeting.ts`

**Interfaces:**
- Consumes: `window.electronAPI.updateMeeting(id: number, data: Partial<MeetingInput>): Promise<Meeting>` (already implemented and wired in `electron/preload.ts`/`electron/ipc-handlers.ts` — no changes needed there since `MeetingInput` grew new optional fields that pass through untouched).
- Produces: `UseMeetingResult.updateMeeting(id: number, input: Partial<MeetingInput>): Promise<Meeting>`. Task 5 (`SettingsForm`, via `SettingsPage`) consumes this exact signature.

No test file for hooks in this codebase (see Global Constraints) — verify via `npm run lint` and later, end-to-end, via Task 5's manual check.

- [ ] **Step 1: Implement**

In `src/hooks/use-meeting.ts`, add `updateMeeting` to the interface:

```typescript
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
```

Add the implementation, mirroring `createMeeting`'s error handling, right after `createMeeting`:

```typescript
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
```

Add `updateMeeting` to the returned object:

```typescript
  return { meetings, currentMeeting, isLoading, error, refresh, createMeeting, updateMeeting, selectMeeting };
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-meeting.ts
git commit -m "feat: expose updateMeeting from useMeeting

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Wire saved ranking rules and the status badge into the Classement screen

**Files:**
- Modify: `src/hooks/use-ranking.ts`
- Modify: `src/pages/RankingPage.tsx`
- Modify: `src/components/ranking/RankingToolbar.tsx`

**Interfaces:**
- Consumes: `Meeting.defaultTopN`, `Meeting.minSwimmers`, `Meeting.activeCategories` (Task 1); `resolveActiveCategories`, `ALL_CATEGORIES` unused here (Task 2, used by Task 5), `RankingParams.minSwimmers` (Task 2); `meetingStatusLabel(status: MeetingStatus): 'Provisoire' | 'Définitif'` (existing, `src/lib/print-data.ts`).
- Produces: `useRanking(rows, categories, options?: { initialTopN?: TopN; minSwimmers?: number }): UseRankingResult` (options is a new 3rd parameter); `RankingToolbarProps.status: MeetingStatus` (new required prop).

- [ ] **Step 1: Update `useRanking` to accept initial rule values**

In `src/hooks/use-ranking.ts`, change the signature and initial state. Current:

```typescript
export function useRanking(rows: RawSwimmerRow[], categories: string[]): UseRankingResult {
  const [category, setCategory] = useState<string>(
    categories.includes(DEFAULT_CATEGORY) ? DEFAULT_CATEGORY : (categories[0] ?? '')
  );
  const [topN, setTopN] = useState<TopN>(DEFAULT_TOP_N);
```

New:

```typescript
export interface UseRankingOptions {
  /** Initial Top N value, from the meeting's saved default (falls back to 5 if not one of TOP_N_OPTIONS). */
  initialTopN?: number;
  /** Clubs with fewer than this many swimmers in the category are excluded entirely. */
  minSwimmers?: number;
}

export function useRanking(
  rows: RawSwimmerRow[],
  categories: string[],
  options: UseRankingOptions = {}
): UseRankingResult {
  const [category, setCategory] = useState<string>(
    categories.includes(DEFAULT_CATEGORY) ? DEFAULT_CATEGORY : (categories[0] ?? '')
  );
  const initialTopN = TOP_N_OPTIONS.includes(options.initialTopN as TopN)
    ? (options.initialTopN as TopN)
    : DEFAULT_TOP_N;
  const [topN, setTopN] = useState<TopN>(initialTopN);
```

And update the `computeTeamRanking` call to pass `minSwimmers` through:

```typescript
  const teamResults = useMemo(
    () => computeTeamRanking(rows, { category, topN, minSwimmers: options.minSwimmers }),
    [rows, category, topN, options.minSwimmers]
  );
```

Note: `options.initialTopN` is deliberately read only once, into `useState`'s initializer — it seeds the starting value but must not fight the user's own `setTopN` calls on later renders (React's `useState` initializer already gives us this for free; do not add an effect that re-syncs `topN` from `options.initialTopN`).

- [ ] **Step 2: Fix the hardcoded status badge and thread rule values through `RankingPage`**

In `src/components/ranking/RankingToolbar.tsx`, replace the hardcoded badge. Current:

```typescript
export interface RankingToolbarProps {
  topN: TopN;
  onTopNChange: (topN: TopN) => void;
  onPrint: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  isExporting: boolean;
}
```

```typescript
        <span className="rounded-sm bg-warning-light px-2 py-1 text-xs font-medium uppercase tracking-wide text-warning">
          Provisoire
        </span>
```

New: add the import and prop, then replace the badge with one driven by `status`:

```typescript
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { TOP_N_OPTIONS, type TopN } from '@/hooks/use-ranking';
import type { MeetingStatus } from '@/lib/db';
import { meetingStatusLabel } from '@/lib/print-data';
import { cn } from '@/lib/utils';

export interface RankingToolbarProps {
  topN: TopN;
  onTopNChange: (topN: TopN) => void;
  status: MeetingStatus;
  onPrint: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  isExporting: boolean;
}
```

```typescript
export function RankingToolbar({
  topN,
  onTopNChange,
  status,
  onPrint,
  onExportPdf,
  onExportExcel,
  isExporting,
}: RankingToolbarProps): JSX.Element {
```

```typescript
        <span
          className={cn(
            'rounded-sm px-2 py-1 text-xs font-medium uppercase tracking-wide',
            status === 'final' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
          )}
        >
          {meetingStatusLabel(status)}
        </span>
```

In `src/pages/RankingPage.tsx`, pass the meeting's saved rules into `useRanking` and the status into `RankingToolbar`. Current:

```typescript
  const { rows, categories, isLoading, error: rowsError } = useMeetingRows(meetingId);
  const ranking = useRanking(rows, categories);
```

New:

```typescript
  const { rows, categories: presentCategories, isLoading, error: rowsError } = useMeetingRows(meetingId);
  const categories = useMemo(
    () => resolveActiveCategories(presentCategories, meetingState.currentMeeting?.activeCategories ?? null),
    [presentCategories, meetingState.currentMeeting]
  );
  const ranking = useRanking(rows, categories, {
    initialTopN: meetingState.currentMeeting?.defaultTopN,
    minSwimmers: meetingState.currentMeeting?.minSwimmers,
  });
```

Add the import:

```typescript
import { resolveActiveCategories } from '@/lib/ranking-engine';
```

And pass `status` to `RankingToolbar`:

```typescript
      <RankingToolbar
        topN={ranking.topN}
        onTopNChange={ranking.setTopN}
        status={meeting.status}
        onPrint={() => window.print()}
        onExportPdf={() => exportPdf(meeting, ranking.category, ranking.teamResults)}
        onExportExcel={() => exportExcel(meeting, ranking.category, ranking.teamResults)}
        isExporting={isExporting}
      />
```

`meeting` is already bound above (`const meeting = meetingState.currentMeeting;`) and the early `if (!meeting) return <Navigate ... />` guard runs before this JSX, so `meeting.status` is safe to read here without an extra null check — but `categories`/`ranking` are computed *before* that guard using `meetingState.currentMeeting?.` (optional chaining), consistent with how `rows`/`categories` were already fetched before the guard.

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: no errors. Pay attention to the `TOP_N_OPTIONS.includes(options.initialTopN as TopN)` cast in `use-ranking.ts` — `Array<T>.includes` requires an argument assignable to `T`; if `tsc` complains, use `(TOP_N_OPTIONS as readonly number[]).includes(options.initialTopN ?? -1)` instead.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: PASS — this task touches no `src/lib` file directly tested by Vitest, so this is a regression check on Tasks 1–2's tests.

- [ ] **Step 5: Manual smoke check**

Run: `npm run dev`, open a meeting with imported results, go to Classement. Confirm:
- The status badge reads "Provisoire" or "Définitif" matching the meeting's actual status (not always "Provisoire").
- Category tabs and Top N selector still work as before (no saved rules yet, so behavior is unchanged from before this task).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-ranking.ts src/pages/RankingPage.tsx src/components/ranking/RankingToolbar.tsx
git commit -m "fix: derive ranking status badge and initial rules from the meeting record

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Build the Paramètres screen

**Files:**
- Create: `src/components/settings/SettingsForm.tsx`
- Modify: `src/pages/SettingsPage.tsx`

**Interfaces:**
- Consumes: `useMeeting().updateMeeting` (Task 3); `Meeting`, `MeetingInput`, `MeetingStatus` (`@/lib/db`, Task 1); `ALL_CATEGORIES`, `TOP_N_OPTIONS` (`@/lib/ranking-engine` and `@/hooks/use-ranking`, Task 2); `AppOutletContext` (`@/components/layout/AppShell`, existing).
- Produces: `SettingsForm` — a self-contained page-level component, not consumed by any later task.

- [ ] **Step 1: Implement `SettingsForm`**

Create `src/components/settings/SettingsForm.tsx`:

```typescript
import { useState, type FormEvent } from 'react';
import type { Meeting, MeetingInput, MeetingStatus } from '@/lib/db';
import { ALL_CATEGORIES } from '@/lib/ranking-engine';
import { TOP_N_OPTIONS, type TopN } from '@/hooks/use-ranking';
import { cn } from '@/lib/utils';

export interface SettingsFormProps {
  meeting: Meeting;
  onSave: (input: Partial<MeetingInput>) => void | Promise<void>;
}

const DEFAULT_TOP_N: TopN = 5;

function categoryLabel(category: string): string {
  return category.replace(/^Classement\s+/i, '');
}

export function SettingsForm({ meeting, onSave }: SettingsFormProps): JSX.Element {
  const [name, setName] = useState(meeting.name);
  const [date, setDate] = useState(meeting.date);
  const [location, setLocation] = useState(meeting.location ?? '');
  const [status, setStatus] = useState<MeetingStatus>(meeting.status);
  const [defaultTopN, setDefaultTopN] = useState<TopN>(
    (TOP_N_OPTIONS as readonly number[]).includes(meeting.defaultTopN) ? (meeting.defaultTopN as TopN) : DEFAULT_TOP_N
  );
  const [activeCategories, setActiveCategories] = useState<string[]>(
    meeting.activeCategories ?? [...ALL_CATEGORIES]
  );
  const [minSwimmers, setMinSwimmers] = useState<string>(
    meeting.minSwimmers > 0 ? String(meeting.minSwimmers) : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (category: string): void => {
    setActiveCategories((current) =>
      current.includes(category) ? current.filter((entry) => entry !== category) : [...current, category]
    );
  };

  const resetRankingRules = (): void => {
    setDefaultTopN(DEFAULT_TOP_N);
    setMinSwimmers('');
    setActiveCategories([...ALL_CATEGORIES]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name,
        date,
        location: location || null,
        status,
        defaultTopN,
        minSwimmers: minSwimmers === '' ? 0 : Number(minSwimmers),
        activeCategories: activeCategories.length === ALL_CATEGORIES.length ? null : activeCategories,
      });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg bg-neutral-0 p-6 shadow-card">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary-800">
            Informations meeting
          </h2>
          <div>
            <label htmlFor="settings-name" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Nom du meeting
            </label>
            <input
              id="settings-name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="settings-date" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Date
            </label>
            <input
              id="settings-date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="settings-location" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Lieu (optionnel)
            </label>
            <input
              id="settings-location"
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
            />
          </div>
          <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500">Statut</span>
            <div className="mt-2 flex gap-2">
              {(['provisional', 'final'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150',
                    status === option
                      ? 'bg-secondary-600 text-neutral-0'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  )}
                >
                  {option === 'provisional' ? 'Provisoire' : 'Définitif'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg bg-neutral-0 p-6 shadow-card">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary-800">
            Règles de calcul
          </h2>
          <div>
            <label htmlFor="settings-top-n" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Top N nageurs par club
            </label>
            <select
              id="settings-top-n"
              value={defaultTopN}
              onChange={(event) => setDefaultTopN(Number(event.target.value) as TopN)}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
            >
              {TOP_N_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500">Catégories actives</span>
            <div className="mt-2 space-y-2">
              {ALL_CATEGORIES.map((category) => (
                <label key={category} className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={activeCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="h-4 w-4 rounded border-neutral-300 text-secondary-600 focus:ring-secondary-400"
                  />
                  {categoryLabel(category)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="settings-min-swimmers" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Seuil minimum de nageurs par club (optionnel)
            </label>
            <input
              id="settings-min-swimmers"
              type="number"
              min={0}
              value={minSwimmers}
              onChange={(event) => setMinSwimmers(event.target.value)}
              placeholder="Aucun seuil"
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {savedAt && !error && <p className="text-sm text-success">Paramètres enregistrés.</p>}

      <div className="flex items-center justify-between">
        <button type="button" onClick={resetRankingRules} className="text-sm font-medium text-secondary-700 hover:underline">
          Réinitialiser les valeurs par défaut
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-accent-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Wire `SettingsPage`**

Replace `src/pages/SettingsPage.tsx` entirely:

```typescript
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { SettingsForm } from '@/components/settings/SettingsForm';

export default function SettingsPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const meeting = meetingState.currentMeeting;

  if (!meeting) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Paramètres</h1>
        <p className="text-neutral-600">{meeting.name}</p>
      </header>
      <SettingsForm meeting={meeting} onSave={(input) => meetingState.updateMeeting(meeting.id, input)} />
    </div>
  );
}
```

This follows the same "redirect to `/` when no meeting is open" pattern as `RankingPage`/`PrintPage`.

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: PASS (no test file touches this task's files; this is a regression check).

- [ ] **Step 5: Manual smoke check**

Run: `npm run dev`. Open or create a meeting, go to Paramètres:
- Edit the name/date/location/status, click "Enregistrer" — confirm "Paramètres enregistrés." appears and the Sidebar/Header meeting name updates if the name changed.
- Change Top N to 7, uncheck "Dames", set seuil minimum to 3, save. Go to Classement — confirm the Top N selector starts at 7, the "Dames" tab is gone, and clubs with fewer than 3 swimmers in the visible categories are absent from the table.
- Go back to Paramètres, click "Réinitialiser les valeurs par défaut" — confirm Top N returns to 5, all 3 category checkboxes are checked, and the seuil field is empty, *without* an "Enregistrer" click having happened yet (reload the page or navigate away without saving to confirm the meeting's persisted values are unchanged).
- Uncheck all 3 categories and save — confirm Classement falls back to showing all present categories rather than an empty screen (the `resolveActiveCategories` fallback from Task 2).

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/SettingsForm.tsx src/pages/SettingsPage.tsx
git commit -m "feat: build the Paramètres screen for meeting info and ranking rules

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** Meeting info form (Task 5) ✓, ranking rules form (Task 5) ✓, Enregistrer/Réinitialiser (Task 5) ✓, DB columns + migration (Task 1) ✓, minSwimmers engine behavior (Task 2) ✓, active-categories resolution (Task 2, wired in Task 4) ✓, useMeeting.updateMeeting (Task 3) ✓, RankingPage adopts saved values as initial/still-adjustable (Task 4) ✓, status badge fix (Task 4) ✓, db.test.ts + ranking-engine.test.ts coverage (Tasks 1–2) ✓. No multi-classements/named-rankings work included, matching the spec's explicit exclusion.
- **Type consistency:** `Meeting`/`MeetingInput` fields (`defaultTopN`, `minSwimmers`, `activeCategories`) match across Tasks 1, 4, 5. `RankingParams.minSwimmers`, `ALL_CATEGORIES`, `resolveActiveCategories` (Task 2) match their call sites in Tasks 4–5. `UseRankingOptions` (Task 4) matches its call site in `RankingPage`. `RankingToolbarProps.status` (Task 4) matches the value passed from `RankingPage`.
