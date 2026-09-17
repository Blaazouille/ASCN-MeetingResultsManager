# Phase 2 — Écran Classement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "Classement" screen (team ranking table with category tabs, Top N selector, club search, and per-swimmer drill-down) and wire it into a routed AppShell, per the approved design in `docs/superpowers/specs/2026-09-15-phase-2-ranking-screen-design.md`.

**Architecture:** `App.tsx` becomes a thin `HashRouter` + `Routes` wrapper around an `AppShell` layout (Sidebar + Header + `Outlet`). `AppShell` owns the CSV import state (via `useImport`) and exposes it to child routes through React Router's `Outlet` context — no global store, no SQLite (that's Phase 4). `RankingPage` derives the team ranking from that shared state via `useRanking`, which wraps the already-tested `computeTeamRanking()`.

**Tech Stack:** React 18, react-router-dom v7 (`HashRouter` — required because Electron production builds load `index.html` via `file://`, which breaks `BrowserRouter`'s History API routing), `@tanstack/react-table` v8, Tailwind CSS, lucide-react icons. All already installed — no new dependencies.

## Global Constraints

- TypeScript `strict: true`, no `any` — use `unknown` + type guards (CLAUDE.md).
- Functional components only; business logic lives in hooks, not components (CLAUDE.md).
- Props interfaces named `{ComponentName}Props` (CLAUDE.md).
- File naming: components `PascalCase.tsx`, hooks `use-kebab-case.ts`, lib `kebab-case.ts` (CLAUDE.md).
- Tailwind utility classes in JSX; no inline `style` except dynamic values; use `cn()` (from `@/lib/utils`) for conditional classes (CLAUDE.md).
- Points formatted via `formatPoints()` (non-breaking-space thousands separator); `data-numeric` or `font-mono` + `tabular-nums` on all numeric columns (CLAUDE.md).
- UI entirely in French (CLAUDE.md).
- `MUST` use `HashRouter`, not `BrowserRouter` — confirmed by reading `electron/main.ts:32`, which loads the renderer via `mainWindow.loadFile(...)` (`file://`) in production, not an HTTP server.
- ASCN's own club, exactly as it appears in the source data: `AS CHERBOURG NATATION` (confirmed in `test/fixtures/expected-ranking.json`).
- Default category: `"Classement Mixte"` if present in the imported categories, else the first category. Default Top N: `5`. Top N options: `3, 5, 7, 10` (design spec, CLAUDE.md).
- `vitest.config.ts` runs tests in a Node environment with no DOM (`environment: 'node'`, no `jsdom`, no `@testing-library/react` installed). Only files under `test/**/*.test.ts` run. This plan therefore writes TDD tests only for new **pure, framework-free logic** (Task 1). Hooks and components are thin React wiring around already-tested logic (`computeTeamRanking`, `parseCsv`, `filterTeamResultsByClub`) — they are verified by type-checking (`npm run lint`) and by manual verification in the running app (Task 14), consistent with CLAUDE.md's guidance to test UI changes in a browser rather than claim coverage that doesn't exist.
- Existing components/lib this plan builds on, read before starting:
  - `src/lib/csv-parser.ts` — `parseCsv(input, options)`, `RawSwimmerRow`, `CsvParseResult` (`rows`, `categories`, `clubCount`, `swimmerCount`, `encoding`, `delimiter`, `warnings`).
  - `src/lib/ranking-engine.ts` — `computeTeamRanking(rows, params)`, `TeamResult` (`rank`, `club`, `totalPoints`, `swimmers`, `swimmerCount`), `SwimmerEntry` (`lastname`, `firstname`, `birthyear`, `points`, `rank`).
  - `src/lib/utils.ts` — `cn()`, `formatPoints()`.
  - `src/components/import/DropZone.tsx` — `DropZoneProps { onFileAccepted?, onFileRejected?, className? }`.
  - `src/App.tsx` — current import flow, to be replaced by this plan (its logic moves into `useImport` + `ImportPage`).

---

### Task 1: Club search filter in the ranking engine

**Files:**
- Modify: `src/lib/ranking-engine.ts`
- Test: `test/ranking-engine.test.ts`

**Interfaces:**
- Produces: `filterTeamResultsByClub(results: TeamResult[], query: string): TeamResult[]` — case-insensitive substring match on `club`; empty/whitespace-only `query` returns `results` unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `test/ranking-engine.test.ts` (after the existing `describe` blocks, same file, reusing the `loadRows()` helper already defined at the top):

```typescript
describe('filterTeamResultsByClub', () => {
  const rows = loadRows();
  const results = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });

  it('returns all results unchanged for an empty query', () => {
    expect(filterTeamResultsByClub(results, '')).toEqual(results);
  });

  it('returns all results unchanged for a whitespace-only query', () => {
    expect(filterTeamResultsByClub(results, '   ')).toEqual(results);
  });

  it('matches case-insensitively on a substring of the club name', () => {
    const filtered = filterTeamResultsByClub(results, 'cherbourg');
    expect(filtered.map((team) => team.club)).toEqual(
      expect.arrayContaining(['AS CHERBOURG NATATION', 'AC CHERBOURG EN COTENTIN'])
    );
    expect(filtered).toHaveLength(2);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterTeamResultsByClub(results, 'no-such-club-xyz')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const originalLength = results.length;
    filterTeamResultsByClub(results, 'viry');
    expect(results).toHaveLength(originalLength);
  });
});
```

Update the import line at the top of `test/ranking-engine.test.ts` to include the new function:

```typescript
import { computeTeamRanking, filterTeamResultsByClub, type TeamResult } from '../src/lib/ranking-engine';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- ranking-engine`
Expected: FAIL — `filterTeamResultsByClub is not a function` (or a TypeScript error that it doesn't exist).

- [ ] **Step 3: Implement the function**

Append to `src/lib/ranking-engine.ts` (after `computeTeamRanking`):

```typescript
/**
 * Filters team results to those whose club name contains the query,
 * case-insensitively. An empty or whitespace-only query returns all results.
 */
export function filterTeamResultsByClub(results: TeamResult[], query: string): TeamResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return results;
  }
  return results.filter((team) => team.club.toLowerCase().includes(normalized));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- ranking-engine`
Expected: PASS (all tests in the file, including the pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ranking-engine.ts test/ranking-engine.test.ts
git commit -m "feat: add club name search filter to ranking engine"
```

---

### Task 2: `useRanking` hook

**Files:**
- Create: `src/hooks/use-ranking.ts`

**Interfaces:**
- Consumes: `RawSwimmerRow` and `computeTeamRanking(rows, params)` from `@/lib/ranking-engine` and `@/lib/csv-parser`.
- Produces:
  ```typescript
  export const TOP_N_OPTIONS: readonly [3, 5, 7, 10];
  export type TopN = 3 | 5 | 7 | 10;
  export interface UseRankingResult {
    category: string;
    setCategory: (category: string) => void;
    topN: TopN;
    setTopN: (topN: TopN) => void;
    teamResults: TeamResult[];
  }
  export function useRanking(rows: RawSwimmerRow[], categories: string[]): UseRankingResult;
  ```

- [ ] **Step 1: Write the hook**

Create `src/hooks/use-ranking.ts`:

```typescript
import { useMemo, useState } from 'react';
import type { RawSwimmerRow } from '@/lib/csv-parser';
import { computeTeamRanking, type TeamResult } from '@/lib/ranking-engine';

export const TOP_N_OPTIONS = [3, 5, 7, 10] as const;
export type TopN = (typeof TOP_N_OPTIONS)[number];

const DEFAULT_CATEGORY = 'Classement Mixte';
const DEFAULT_TOP_N: TopN = 5;

export interface UseRankingResult {
  category: string;
  setCategory: (category: string) => void;
  topN: TopN;
  setTopN: (topN: TopN) => void;
  teamResults: TeamResult[];
}

/**
 * Owns the category/topN selection for the ranking screen and derives the
 * team ranking from it. Defaults to "Classement Mixte" when present in the
 * imported categories, otherwise the first available category.
 */
export function useRanking(rows: RawSwimmerRow[], categories: string[]): UseRankingResult {
  const [category, setCategory] = useState<string>(
    categories.includes(DEFAULT_CATEGORY) ? DEFAULT_CATEGORY : (categories[0] ?? '')
  );
  const [topN, setTopN] = useState<TopN>(DEFAULT_TOP_N);

  const teamResults = useMemo(
    () => computeTeamRanking(rows, { category, topN }),
    [rows, category, topN]
  );

  return { category, setCategory, topN, setTopN, teamResults };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-ranking.ts
git commit -m "feat: add useRanking hook for category/topN selection"
```

---

### Task 3: `useImport` hook

**Files:**
- Create: `src/hooks/use-import.ts`

**Interfaces:**
- Consumes: `parseCsv(input, options)` and `CsvParseResult` from `@/lib/csv-parser`.
- Produces:
  ```typescript
  export interface UseImportResult {
    result: CsvParseResult | null;
    fileName: string | null;
    error: string | null;
    handleFileAccepted: (file: File) => Promise<void>;
    handleFileRejected: () => void;
  }
  export function useImport(): UseImportResult;
  ```

- [ ] **Step 1: Write the hook**

Create `src/hooks/use-import.ts` (this is the exact logic currently inline in `src/App.tsx`, extracted verbatim plus a `handleFileRejected` that sets the same error message `App.tsx` currently passes inline):

```typescript
import { useCallback, useState } from 'react';
import { parseCsv, type CsvParseResult } from '@/lib/csv-parser';

export interface UseImportResult {
  result: CsvParseResult | null;
  fileName: string | null;
  error: string | null;
  handleFileAccepted: (file: File) => Promise<void>;
  handleFileRejected: () => void;
}

/** Owns the CSV import state: parsing the dropped file and surfacing errors. */
export function useImport(): UseImportResult {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileAccepted = useCallback(async (file: File): Promise<void> => {
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      setResult(parseCsv(buffer));
      setFileName(file.name);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleFileRejected = useCallback((): void => {
    setError('Fichier non supporté (.csv attendu)');
  }, []);

  return { result, fileName, error, handleFileAccepted, handleFileRejected };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-import.ts
git commit -m "feat: extract useImport hook from App.tsx"
```

---

### Task 4: AppShell layout (Sidebar, Header, AppShell)

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `useImport()` from `@/hooks/use-import` (Task 3).
- Produces:
  ```typescript
  export interface AppOutletContext {
    importState: UseImportResult;
  }
  export function AppShell(): JSX.Element;
  ```
  `AppOutletContext` is what every page reads via `useOutletContext<AppOutletContext>()` in Tasks 10–12.

- [ ] **Step 1: Write the Sidebar**

Create `src/components/layout/Sidebar.tsx`:

```typescript
import { NavLink } from 'react-router-dom';
import { Home, Printer, Settings, Trophy, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/classement', label: 'Classement', icon: Trophy },
  { to: '/impression', label: 'Impression', icon: Printer },
  { to: '/parametres', label: 'Paramètres', icon: Settings },
] as const;

export function Sidebar(): JSX.Element {
  return (
    <nav className="flex w-[220px] flex-shrink-0 flex-col bg-primary-800 text-neutral-0">
      <div className="px-4 py-6">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-neutral-0">
          AS Cherbourg Natation
        </p>
        <p className="text-xs text-primary-200">Meeting Results</p>
      </div>
      <ul className="flex flex-1 flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'border-accent-600 bg-primary-700 text-neutral-0'
                    : 'text-primary-100 hover:bg-primary-700'
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Write the Header**

Create `src/components/layout/Header.tsx`:

```typescript
export function Header(): JSX.Element {
  return (
    <header className="flex h-14 flex-shrink-0 items-center border-b border-neutral-200 bg-neutral-0 px-6">
      <p className="text-sm font-medium text-neutral-600">Meeting Results Manager</p>
    </header>
  );
}
```

- [ ] **Step 3: Write the AppShell**

Create `src/components/layout/AppShell.tsx`:

```typescript
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useImport, type UseImportResult } from '@/hooks/use-import';

export interface AppOutletContext {
  importState: UseImportResult;
}

export function AppShell(): JSX.Element {
  const importState = useImport();
  const context: AppOutletContext = { importState };

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

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/Header.tsx src/components/layout/AppShell.tsx
git commit -m "feat: add AppShell layout with sidebar navigation"
```

---

### Task 5: `SwimmerDetail` component

**Files:**
- Create: `src/components/ranking/SwimmerDetail.tsx`

**Interfaces:**
- Consumes: `SwimmerEntry` from `@/lib/ranking-engine`, `formatPoints` from `@/lib/utils`.
- Produces:
  ```typescript
  export interface SwimmerDetailProps {
    swimmers: SwimmerEntry[];
  }
  export function SwimmerDetail(props: SwimmerDetailProps): JSX.Element;
  ```

- [ ] **Step 1: Write the component**

Create `src/components/ranking/SwimmerDetail.tsx`:

```typescript
import { formatPoints } from '@/lib/utils';
import type { SwimmerEntry } from '@/lib/ranking-engine';

export interface SwimmerDetailProps {
  swimmers: SwimmerEntry[];
}

/** Sub-table shown when a club row is expanded: the topN retained swimmers. */
export function SwimmerDetail({ swimmers }: SwimmerDetailProps): JSX.Element {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left uppercase tracking-wide text-neutral-500">
          <th className="w-10 py-1 text-center">Rang</th>
          <th className="py-1">Nom</th>
          <th className="w-20 py-1 text-center">Année</th>
          <th className="w-20 py-1 text-right">Points</th>
        </tr>
      </thead>
      <tbody>
        {swimmers.map((swimmer) => (
          <tr key={`${swimmer.lastname}-${swimmer.firstname}`}>
            <td className="py-1 text-center font-mono" data-numeric>
              {swimmer.rank}
            </td>
            <td className="py-1">
              {swimmer.lastname.toUpperCase()} {swimmer.firstname}
            </td>
            <td className="py-1 text-center font-mono" data-numeric>
              {swimmer.birthyear}
            </td>
            <td className="py-1 text-right font-mono" data-numeric>
              {formatPoints(swimmer.points)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ranking/SwimmerDetail.tsx
git commit -m "feat: add SwimmerDetail sub-table component"
```

---

### Task 6: `TeamRow` component

**Files:**
- Create: `src/components/ranking/TeamRow.tsx`

**Interfaces:**
- Consumes: `Row<TeamResult>` and `flexRender` from `@tanstack/react-table`, `SwimmerDetail` (Task 5), `cn` from `@/lib/utils`.
- Produces:
  ```typescript
  export interface TeamRowProps {
    row: Row<TeamResult>;
    isAscn: boolean;
    isExpanded: boolean;
  }
  export function TeamRow(props: TeamRowProps): JSX.Element;
  ```
  Renders the club's `<tr>` (cells driven by whatever columns the parent table defines) plus, when `isExpanded`, a second `<tr>` containing `<SwimmerDetail>` spanning all columns. This is consumed by `TeamRankingTable` (Task 7), which owns the column definitions.

- [ ] **Step 1: Write the component**

Create `src/components/ranking/TeamRow.tsx`:

```typescript
import { Fragment } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import type { TeamResult } from '@/lib/ranking-engine';
import { SwimmerDetail } from './SwimmerDetail';

export interface TeamRowProps {
  row: Row<TeamResult>;
  isAscn: boolean;
  isExpanded: boolean;
}

/** One club row in the ranking table, plus its expandable swimmer-detail row. */
export function TeamRow({ row, isAscn, isExpanded }: TeamRowProps): JSX.Element {
  const cells = row.getVisibleCells();

  return (
    <Fragment>
      <tr className={cn('border-t border-neutral-100', isAscn && 'bg-secondary-50')}>
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

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ranking/TeamRow.tsx
git commit -m "feat: add TeamRow component with expandable swimmer detail"
```

---

### Task 7: `TeamRankingTable` component

**Files:**
- Create: `src/components/ranking/TeamRankingTable.tsx`

**Interfaces:**
- Consumes: `TeamResult`, `filterTeamResultsByClub` from `@/lib/ranking-engine` (Task 1); `TopN` from `@/hooks/use-ranking` (Task 2); `TeamRow` (Task 6); `formatPoints`, `cn` from `@/lib/utils`.
- Produces:
  ```typescript
  export interface TeamRankingTableProps {
    results: TeamResult[];
    topN: TopN;
    search: string;
    onSearchChange: (value: string) => void;
  }
  export function TeamRankingTable(props: TeamRankingTableProps): JSX.Element;
  ```
  Consumed by `RankingPage` (Task 10).

- [ ] **Step 1: Write the component**

Create `src/components/ranking/TeamRankingTable.tsx`:

```typescript
import { useMemo, useState } from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronRight, Search } from 'lucide-react';
import { cn, formatPoints } from '@/lib/utils';
import { filterTeamResultsByClub, type TeamResult } from '@/lib/ranking-engine';
import type { TopN } from '@/hooks/use-ranking';
import { TeamRow } from './TeamRow';

const ASCN_CLUB_NAME = 'AS CHERBOURG NATATION';

const PODIUM_STYLES: Record<number, string> = {
  1: 'bg-accent-600 text-neutral-0',
  2: 'bg-neutral-400 text-neutral-0',
  3: 'bg-accent-800 text-neutral-0',
};

export interface TeamRankingTableProps {
  results: TeamResult[];
  topN: TopN;
  search: string;
  onSearchChange: (value: string) => void;
}

const columnHelper = createColumnHelper<TeamResult>();

function buildColumns(topN: TopN, expanded: Set<string>, onToggle: (club: string) => void) {
  return [
    columnHelper.accessor('rank', {
      header: 'Rang',
      cell: (info) => {
        const rank = info.getValue();
        return (
          <span
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-sm font-mono text-sm font-bold',
              PODIUM_STYLES[rank] ?? 'text-neutral-700'
            )}
            data-numeric
          >
            {rank}
          </span>
        );
      },
    }),
    columnHelper.accessor('club', {
      header: 'Club',
      cell: (info) => {
        const club = info.getValue();
        return (
          <span className={cn('font-medium text-neutral-900', club === ASCN_CLUB_NAME && 'text-secondary-800')}>
            {club}
          </span>
        );
      },
    }),
    columnHelper.accessor('totalPoints', {
      header: 'Points',
      cell: (info) => (
        <span className="font-mono tabular-nums" data-numeric>
          {formatPoints(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor('swimmers', {
      id: 'swimmerBadge',
      header: 'Nageurs',
      cell: (info) => (
        <span className="rounded-sm bg-neutral-100 px-2 py-0.5 font-mono text-xs" data-numeric>
          {info.getValue().length}/{topN}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'expand',
      header: '',
      cell: (info) => {
        const club = info.row.original.club;
        const isExpanded = expanded.has(club);
        return (
          <button
            type="button"
            aria-label={isExpanded ? `Masquer le détail de ${club}` : `Afficher le détail de ${club}`}
            aria-expanded={isExpanded}
            onClick={() => onToggle(club)}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-neutral-500 transition-colors duration-150 hover:bg-neutral-100"
          >
            <ChevronRight className={cn('h-4 w-4 transition-transform duration-150', isExpanded && 'rotate-90')} />
          </button>
        );
      },
    }),
  ];
}

export function TeamRankingTable({ results, topN, search, onSearchChange }: TeamRankingTableProps): JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => filterTeamResultsByClub(results, search), [results, search]);

  function toggle(club: string): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(club)) {
        next.delete(club);
      } else {
        next.add(club);
      }
      return next;
    });
  }

  const columns = useMemo(() => buildColumns(topN, expanded, toggle), [topN, expanded]);

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (team) => team.club,
  });

  return (
    <div className="rounded-lg bg-neutral-0 shadow-card">
      <div className="flex items-center gap-2 border-b border-neutral-200 p-4">
        <Search className="h-4 w-4 text-neutral-400" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Filtrer par nom de club…"
          className="w-full max-w-xs rounded-md border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-secondary-400 focus:ring-1 focus:ring-secondary-400"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="p-8 text-center text-sm text-neutral-600">Aucun club ne correspond à la recherche.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="text-left text-xs uppercase tracking-wide text-neutral-500">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <TeamRow
                key={row.id}
                row={row}
                isAscn={row.original.club === ASCN_CLUB_NAME}
                isExpanded={expanded.has(row.original.club)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ranking/TeamRankingTable.tsx
git commit -m "feat: add TeamRankingTable with search and expandable rows"
```

---

### Task 8: `CategoryTabs` component

**Files:**
- Create: `src/components/ranking/CategoryTabs.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`.
- Produces:
  ```typescript
  export interface CategoryTabsProps {
    categories: string[];
    active: string;
    onChange: (category: string) => void;
  }
  export function CategoryTabs(props: CategoryTabsProps): JSX.Element;
  ```
  Consumed by `RankingPage` (Task 10).

- [ ] **Step 1: Write the component**

Create `src/components/ranking/CategoryTabs.tsx`:

```typescript
import { cn } from '@/lib/utils';

export interface CategoryTabsProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}

/** Strips the "Classement " prefix for the tab label, e.g. "Classement Mixte" -> "Mixte". */
function tabLabel(category: string): string {
  return category.replace(/^Classement\s+/i, '');
}

export function CategoryTabs({ categories, active, onChange }: CategoryTabsProps): JSX.Element {
  return (
    <div role="tablist" className="flex gap-1 border-b border-neutral-200">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={category === active}
          onClick={() => onChange(category)}
          className={cn(
            'border-b-2 px-4 py-2 text-sm font-medium transition-colors duration-150',
            category === active
              ? 'border-secondary-600 text-secondary-800'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          )}
        >
          {tabLabel(category)}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ranking/CategoryTabs.tsx
git commit -m "feat: add CategoryTabs component"
```

---

### Task 9: `RankingToolbar` component

**Files:**
- Create: `src/components/ranking/RankingToolbar.tsx`

**Interfaces:**
- Consumes: `TOP_N_OPTIONS`, `TopN` from `@/hooks/use-ranking` (Task 2).
- Produces:
  ```typescript
  export interface RankingToolbarProps {
    topN: TopN;
    onTopNChange: (topN: TopN) => void;
  }
  export function RankingToolbar(props: RankingToolbarProps): JSX.Element;
  ```
  Consumed by `RankingPage` (Task 10).

- [ ] **Step 1: Write the component**

Create `src/components/ranking/RankingToolbar.tsx`:

```typescript
import { TOP_N_OPTIONS, type TopN } from '@/hooks/use-ranking';

export interface RankingToolbarProps {
  topN: TopN;
  onTopNChange: (topN: TopN) => void;
}

/** Top N selector plus the (currently fixed) meeting status badge. */
export function RankingToolbar({ topN, onTopNChange }: RankingToolbarProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        Top N nageurs
        <select
          value={topN}
          onChange={(event) => onTopNChange(Number(event.target.value) as TopN)}
          className="rounded-md border border-neutral-200 px-2 py-1 font-mono text-sm outline-none focus:border-secondary-400 focus:ring-1 focus:ring-secondary-400"
        >
          {TOP_N_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <span className="rounded-sm bg-warning-light px-2 py-1 text-xs font-medium uppercase tracking-wide text-warning">
        Provisoire
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ranking/RankingToolbar.tsx
git commit -m "feat: add RankingToolbar with Top N selector and status badge"
```

---

### Task 10: `RankingPage`

**Files:**
- Create: `src/pages/RankingPage.tsx`

**Interfaces:**
- Consumes: `AppOutletContext` (Task 4), `useRanking` (Task 2), `CategoryTabs` (Task 8), `RankingToolbar` (Task 9), `TeamRankingTable` (Task 7), `useOutletContext`/`Navigate` from `react-router-dom`.
- Produces: `export default function RankingPage(): JSX.Element` — a route element mounted at `/classement` in Task 13.

- [ ] **Step 1: Write the page**

Create `src/pages/RankingPage.tsx`:

```typescript
import { useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useRanking } from '@/hooks/use-ranking';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';
import { RankingToolbar } from '@/components/ranking/RankingToolbar';
import { TeamRankingTable } from '@/components/ranking/TeamRankingTable';

export default function RankingPage(): JSX.Element {
  const { importState } = useOutletContext<AppOutletContext>();
  const [search, setSearch] = useState('');

  const rows = importState.result?.rows ?? [];
  const categories = importState.result?.categories ?? [];
  const ranking = useRanking(rows, categories);

  if (!importState.result) {
    return <Navigate to="/import" replace />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Classement par équipes</h1>
        <p className="text-neutral-600">{importState.fileName}</p>
      </header>

      <CategoryTabs categories={categories} active={ranking.category} onChange={ranking.setCategory} />
      <RankingToolbar topN={ranking.topN} onTopNChange={ranking.setTopN} />
      <TeamRankingTable
        results={ranking.teamResults}
        topN={ranking.topN}
        search={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}
```

Note: `useRanking` and `useState` are called unconditionally before the `if (!importState.result)` early return, so the Rules of Hooks are respected — the early return happens after every hook call, not between them.

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors (this task references `AppOutletContext` from Task 4 and all `ranking/` components from Tasks 7–9, so it must run after them).

- [ ] **Step 3: Commit**

```bash
git add src/pages/RankingPage.tsx
git commit -m "feat: add RankingPage wiring category/topN/search to the table"
```

---

### Task 11: `ImportPage`

**Files:**
- Create: `src/pages/ImportPage.tsx`
- Delete: nothing yet (`App.tsx` is rewritten in Task 13, which is when the old inline import UI is removed)

**Interfaces:**
- Consumes: `AppOutletContext` (Task 4), `DropZone` (existing, `src/components/import/DropZone.tsx`), `formatPoints` from `@/lib/utils`, `useNavigate`/`useOutletContext` from `react-router-dom`.
- Produces: `export default function ImportPage(): JSX.Element` — a route element mounted at `/import` in Task 13.

- [ ] **Step 1: Write the page**

Create `src/pages/ImportPage.tsx` (this reproduces the current `src/App.tsx` markup, reading/writing import state through the shared `useImport` instance instead of owning its own, and adds a "Voir le classement" button that navigates to `/classement` once a file is loaded):

```typescript
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { DropZone } from '@/components/import/DropZone';
import { formatPoints } from '@/lib/utils';

export default function ImportPage(): JSX.Element {
  const { importState } = useOutletContext<AppOutletContext>();
  const { result, fileName, error, handleFileAccepted, handleFileRejected } = importState;
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Import du fichier de cotations</h1>
        <p className="text-neutral-600">Fichier CSV extraNat (FFN)</p>
      </header>

      <DropZone onFileAccepted={handleFileAccepted} onFileRejected={handleFileRejected} />

      {error && <p className="text-sm text-error">{error}</p>}

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

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ImportPage.tsx
git commit -m "feat: add ImportPage using the shared import state"
```

---

### Task 12: Placeholder pages (Home, Print, Settings)

**Files:**
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/PrintPage.tsx`
- Create: `src/pages/SettingsPage.tsx`

**Interfaces:**
- Produces: `export default function HomePage(): JSX.Element`, `export default function PrintPage(): JSX.Element`, `export default function SettingsPage(): JSX.Element` — route elements mounted at `/`, `/impression`, `/parametres` in Task 13.

- [ ] **Step 1: Write the placeholder pages**

Create `src/pages/HomePage.tsx`:

```typescript
export default function HomePage(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
      <h1 className="text-xl font-semibold text-primary-800">Accueil</h1>
      <p className="text-neutral-600">
        La liste des meetings sera disponible en Phase 4, avec la persistance SQLite.
      </p>
    </div>
  );
}
```

Create `src/pages/PrintPage.tsx`:

```typescript
export default function PrintPage(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
      <h1 className="text-xl font-semibold text-primary-800">Impression</h1>
      <p className="text-neutral-600">L'aperçu d'impression et l'export PDF arriveront en Phase 3.</p>
    </div>
  );
}
```

Create `src/pages/SettingsPage.tsx`:

```typescript
export default function SettingsPage(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
      <h1 className="text-xl font-semibold text-primary-800">Paramètres</h1>
      <p className="text-neutral-600">La configuration du meeting et des règles de calcul arrivera en Phase 5.</p>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/PrintPage.tsx src/pages/SettingsPage.tsx
git commit -m "feat: add placeholder pages for Home, Print, and Settings"
```

---

### Task 13: Wire up routing in `App.tsx`

**Files:**
- Modify: `src/App.tsx` (full rewrite — replaces the current inline import UI, which now lives in `ImportPage`)

**Interfaces:**
- Consumes: `AppShell` (Task 4), `HomePage`/`ImportPage`/`RankingPage`/`PrintPage`/`SettingsPage` (Tasks 10–12), `HashRouter`/`Route`/`Routes` from `react-router-dom`.
- Produces: `export default function App(): JSX.Element` — unchanged export shape, so `src/main.tsx` needs no changes.

- [ ] **Step 1: Rewrite `App.tsx`**

Replace the entire contents of `src/App.tsx` with:

```typescript
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import HomePage from '@/pages/HomePage';
import ImportPage from '@/pages/ImportPage';
import RankingPage from '@/pages/RankingPage';
import PrintPage from '@/pages/PrintPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="classement" element={<RankingPage />} />
          <Route path="impression" element={<PrintPage />} />
          <Route path="parametres" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
```

`HashRouter` (not `BrowserRouter`) is required: `electron/main.ts` loads the production build via `mainWindow.loadFile(...)`, i.e. a `file://` URL, and `BrowserRouter`'s History API routing does not work reliably over `file://`.

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: PASS — all `ranking-engine.test.ts` and `csv-parser.test.ts` tests, including the new ones from Task 1.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire AppShell routing into App.tsx"
```

---

### Task 14: Manual verification in the running app

**Files:** none (verification only)

- [ ] **Step 1: Start the dev app**

Run: `npm run dev`

- [ ] **Step 2: Walk the golden path**

In the opened Electron window:
1. Confirm the Sidebar shows all 5 sections, with "Accueil" active by default and its placeholder text visible.
2. Click "Import". Drag `test/fixtures/sample.csv` onto the drop zone (or use "Parcourir").
3. Confirm the summary shows 211 nageurs, 38 clubs, 3 catégories (matching `docs/design-prompt.md`'s demo data), and no unexpected warnings.
4. Click "Voir le classement".
5. Confirm the "Mixte" tab is active by default, Top N is 5, and the table's first 5 rows exactly match the reference podium:
   `CN VIRY-CHÂTILLON (5 841)`, `BOULOGNE BILLANCOURT NATATION (5 364)`, `AC CHERBOURG EN COTENTIN (5 201)`, `UAS ST-CLOUD (5 191)`, `EN CAEN (5 155)`.
6. Confirm "AS CHERBOURG NATATION" is visually highlighted in the table.
7. Click a club row's expand chevron; confirm the swimmer sub-table appears with rank/name/year/points, and collapses again on a second click.
8. Change Top N to 3; confirm totals and the "x/N" badges update.
9. Switch to the "Dames" and "Messieurs" tabs; confirm the table updates and totals differ from "Mixte".
10. Type part of a club name (e.g. "cherbourg") into the search box; confirm the table filters to matching clubs only, and clearing the search restores the full list.
11. Click "Import", "Impression", "Paramètres" in the Sidebar; confirm each route renders without crashing (placeholders for the latter two).
12. Reload the window (Ctrl/Cmd+R) while on `/classement`; confirm the app doesn't blank out or error (this is the `HashRouter`-over-`file://` check — it matters most in a packaged build, but a dev-mode reload should still work cleanly).

- [ ] **Step 3: Report results**

If every point in Step 2 holds, the phase is done. If anything fails, fix it in the relevant task's file and re-run Steps 1–2 before considering the phase complete — do not report success without having actually walked this checklist.
