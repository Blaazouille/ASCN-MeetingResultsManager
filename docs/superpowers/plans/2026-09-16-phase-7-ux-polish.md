# Phase 7 — UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify meeting creation (only name required), make sidebar/header fixed while content scrolls, hide Electron's menu bar, make table rows clickable to expand, and rename the application.

**Architecture:** UX-only changes across layout components, the meeting form, Electron config, and the ranking table. No new modules or dependencies. The app renaming is deferred until the user chooses a name — the plan includes a placeholder `{{APP_NAME}}` that must be replaced before executing Task 5.

**Tech Stack:** React 18 + TypeScript (strict), Tailwind CSS, Electron, Vitest. No new dependencies.

## Global Constraints

- TypeScript `strict: true`, no `any` — use `unknown` + type guards.
- Components: `PascalCase.tsx`; hooks: `use-kebab-case.ts`; lib: `kebab-case.ts`.
- UI entirely in French, French punctuation (espace insécable avant `:`, `;`, `!`, `?`).
- Every file must have a header comment (added in Phase 6).
- One file = one responsibility. Never exceed 300 lines per file.
- Run `npm run test` and `npm run lint` after each task; both must pass before committing.

---

### Task 1: Simplify meeting creation (date optional, defaults to today)

**Files:**
- Modify: `src/components/meeting/MeetingForm.tsx`
- Modify: `src/lib/db.ts`
- Test: `test/db.test.ts`

**Interfaces:**
- Consumes: `MeetingInput` from `src/lib/db.ts`
- Produces: `MeetingInput.date` becomes `date?: string` (optional). `createMeeting` defaults to today when `date` is absent or empty.

- [ ] **Step 1: Write failing test for meeting creation without date**

In `test/db.test.ts`, add a test:

```typescript
it('creates a meeting with today as default date when date is omitted', () => {
  const meeting = createMeeting(db, { name: 'Test sans date' });
  const today = new Date().toISOString().slice(0, 10);
  expect(meeting.date).toBe(today);
  expect(meeting.name).toBe('Test sans date');
});

it('creates a meeting with today as default date when date is empty string', () => {
  const meeting = createMeeting(db, { name: 'Test vide', date: '' });
  const today = new Date().toISOString().slice(0, 10);
  expect(meeting.date).toBe(today);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- test/db.test.ts`
Expected: FAIL — `date` is currently required in `MeetingInput`

- [ ] **Step 3: Make date optional in MeetingInput and update createMeeting**

In `src/lib/db.ts`:

Change `MeetingInput`:
```typescript
export interface MeetingInput {
  name: string;
  date?: string;
  location?: string | null;
  status?: MeetingStatus;
}
```

Update `createMeeting`:
```typescript
export function createMeeting(db: Database.Database, input: MeetingInput): Meeting {
  const date = input.date && input.date.trim() !== '' ? input.date : new Date().toISOString().slice(0, 10);
  const result = db
    .prepare('INSERT INTO meeting (name, date, location, status) VALUES (?, ?, ?, ?)')
    .run(input.name, date, input.location ?? null, input.status ?? 'provisional');
  const row = db.prepare('SELECT * FROM meeting WHERE id = ?').get(result.lastInsertRowid) as MeetingRow;
  return rowToMeeting(row);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- test/db.test.ts`
Expected: PASS

- [ ] **Step 5: Update MeetingForm to pre-fill date and remove required**

In `src/components/meeting/MeetingForm.tsx`:

Change the initial state:
```typescript
// Before:
const [date, setDate] = useState('');
// After:
const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
```

Remove `required` from the date input:
```typescript
// Before:
<input id="meeting-date" type="date" required ...>
// After:
<input id="meeting-date" type="date" ...>
```

- [ ] **Step 6: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/db.ts src/components/meeting/MeetingForm.tsx test/db.test.ts
git commit -m "feat: make meeting date optional, default to today"
```

---

### Task 2: Fixed layout (sidebar fixed, header sticky, content scrolls)

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Header.tsx`

**Interfaces:**
- No interface changes — CSS/layout only

- [ ] **Step 1: Make sidebar fixed**

In `src/components/layout/Sidebar.tsx`, update the `<nav>` classes:

```typescript
// Before:
<nav className="flex w-[220px] flex-shrink-0 flex-col bg-primary-800 text-neutral-0">
// After:
<nav className="fixed inset-y-0 left-0 z-20 flex w-[220px] flex-col bg-primary-800 text-neutral-0">
```

- [ ] **Step 2: Make header sticky**

In `src/components/layout/Header.tsx`, update the `<header>` classes:

```typescript
// Before:
<header className="flex h-14 flex-shrink-0 items-center border-b border-neutral-200 bg-neutral-0 px-6">
// After:
<header className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center border-b border-neutral-200 bg-neutral-0 px-6">
```

- [ ] **Step 3: Update AppShell layout to offset for fixed sidebar**

In `src/components/layout/AppShell.tsx`, update the outer layout:

```typescript
// Before:
<div className="flex min-h-screen bg-neutral-50">
  <Sidebar />
  <div className="flex flex-1 flex-col">
    <Header />
    <main className="flex-1 overflow-y-auto p-8">
// After:
<div className="flex min-h-screen bg-neutral-50">
  <Sidebar />
  <div className="ml-[220px] flex h-screen flex-1 flex-col">
    <Header />
    <main className="flex-1 overflow-y-auto p-8">
```

The key changes:
- `ml-[220px]` offsets for the fixed sidebar
- `h-screen` constrains the right column to viewport height
- `overflow-y-auto` on `<main>` makes only the content scroll

- [ ] **Step 4: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppShell.tsx src/components/layout/Sidebar.tsx src/components/layout/Header.tsx
git commit -m "feat: fix sidebar and header, only content area scrolls"
```

---

### Task 3: Hide Electron menu bar

**Files:**
- Modify: `electron/main.ts`

**Interfaces:**
- No interface changes

- [ ] **Step 1: Add autoHideMenuBar to BrowserWindow options**

In `electron/main.ts`, add `autoHideMenuBar: true` to the `BrowserWindow` constructor:

```typescript
mainWindow = new BrowserWindow({
  width: 1440,
  height: 900,
  minWidth: 1280,
  minHeight: 800,
  autoHideMenuBar: true,
  title: 'ASCN Meeting Results',
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),
    contextIsolation: true,
    nodeIntegration: false,
  },
});
```

- [ ] **Step 2: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts
git commit -m "feat: hide Electron menu bar by default"
```

---

### Task 4: Make full table row clickable to expand

**Files:**
- Modify: `src/components/ranking/TeamRow.tsx`
- Modify: `src/components/ranking/TeamRankingTable.tsx`

**Interfaces:**
- Consumes: `TeamRowProps` gains `onToggle: () => void`
- Produces: `TeamRowProps` with `onToggle`; expand column becomes a visual-only chevron

- [ ] **Step 1: Add onToggle prop to TeamRow and make row clickable**

In `src/components/ranking/TeamRow.tsx`:

Update the interface:
```typescript
export interface TeamRowProps {
  row: Row<TeamResult>;
  isAscn: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}
```

Update the component:
```typescript
function TeamRowComponent({ row, isAscn, isExpanded, onToggle }: TeamRowProps): JSX.Element {
  const cells = row.getVisibleCells();

  return (
    <Fragment>
      <tr
        onClick={onToggle}
        className={cn(
          'cursor-pointer border-t border-neutral-100 transition-colors duration-150 hover:bg-neutral-50',
          isAscn && 'bg-secondary-50 hover:bg-secondary-100'
        )}
      >
        {cells.map((cell) => (
          <td key={cell.id} className="px-3 py-2">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
      {isExpanded && (
        <tr className="bg-neutral-50">
          <td colSpan={cells.length} className="px-3 py-3">
            <SwimmerDetail swimmers={row.original.swimmers} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}
```

- [ ] **Step 2: Simplify expand column to a visual-only chevron**

In `src/components/ranking/TeamRankingTable.tsx`, replace `buildExpandColumn`:

```typescript
function buildExpandColumn(expanded: Set<string>): ColumnDef<TeamResult, any> {
  return columnHelper.display({
    id: 'expand',
    header: '',
    cell: (info) => {
      const club = info.row.original.club;
      const isExpanded = expanded.has(club);
      return (
        <ChevronRight
          className={cn('h-4 w-4 text-neutral-500 transition-transform duration-150', isExpanded && 'rotate-90')}
          aria-hidden
        />
      );
    },
  });
}
```

The `onToggle` parameter is removed from `buildExpandColumn` since the row itself handles the click now.

- [ ] **Step 3: Pass onToggle to TeamRow and update buildExpandColumn call**

In `TeamRankingTable`, update the `buildExpandColumn` call:
```typescript
// Before:
const expandColumn = useMemo(() => buildExpandColumn(expanded, toggle), [expanded]);
// After:
const expandColumn = useMemo(() => buildExpandColumn(expanded), [expanded]);
```

Pass `onToggle` to `TeamRow`:
```typescript
<TeamRow
  key={row.id}
  row={row}
  isAscn={row.original.club === ASCN_CLUB_NAME}
  isExpanded={expanded.has(row.original.club)}
  onToggle={() => toggle(row.original.club)}
/>
```

- [ ] **Step 4: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ranking/TeamRow.tsx src/components/ranking/TeamRankingTable.tsx
git commit -m "feat: click full table row to expand swimmer detail"
```

---

### Task 5: Rename the application

> **IMPORTANT:** Before executing this task, the user must choose a name. Replace all occurrences of `{{APP_NAME}}` with the chosen name, and `{{APP_SUBTITLE}}` with the chosen subtitle (if any). If no name has been chosen yet, skip this task and come back to it later.

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `package.json`
- Modify: `electron/main.ts`
- Modify: `CLAUDE.md` (first line / title)

**Interfaces:**
- No code interfaces

- [ ] **Step 1: Update Sidebar header**

In `src/components/layout/Sidebar.tsx`:
```typescript
// Before:
<p className="font-display text-sm font-bold uppercase tracking-wide text-neutral-0">
  AS Cherbourg Natation
</p>
<p className="text-xs text-primary-200">Meeting Results</p>
// After:
<p className="font-display text-sm font-bold uppercase tracking-wide text-neutral-0">
  {{APP_NAME}}
</p>
<p className="text-xs text-primary-200">{{APP_SUBTITLE}}</p>
```

- [ ] **Step 2: Update Header text**

In `src/components/layout/Header.tsx`:
```typescript
// Before:
<p className="text-sm font-medium text-neutral-600">Meeting Results Manager</p>
// After:
<p className="text-sm font-medium text-neutral-600">{{APP_NAME}}</p>
```

- [ ] **Step 3: Update package.json**

```json
{
  "name": "{{app-name-kebab}}",
  "productName": "{{APP_NAME}}",
  "description": "..."
}
```

Also update the `build.appId` if needed.

- [ ] **Step 4: Update Electron window title**

In `electron/main.ts`:
```typescript
title: '{{APP_NAME}}',
```

- [ ] **Step 5: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: rename application to {{APP_NAME}}"
```

---

### Task 6: Update living docs

**Files:**
- Modify: `docs/screens.md` (update for new UX behavior)
- Modify: `docs/architecture.md` (note autoHideMenuBar)

**Interfaces:**
- No code interfaces

- [ ] **Step 1: Update docs/screens.md**

Update the Accueil screen description to note that date is optional (defaults to today). Update the Classement screen to note rows are clickable to expand.

- [ ] **Step 2: Update docs/architecture.md**

Note `autoHideMenuBar: true` in the Electron config section. Note the fixed sidebar/sticky header layout.

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: update living docs for Phase 7 UX changes"
```
