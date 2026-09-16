# Phase 8 — Individual Ranking & Fun Awards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an individual swimmer ranking page (all swimmers sorted by points, filterable by gender) and a fun awards section with auto-generated humorous prizes based on the data.

**Architecture:** Two new pure lib modules (`individual-ranking.ts`, `fun-awards.ts`) handle computation, fully unit-tested. A new `IndividualPage.tsx` page displays both features. The page reads swimmer data from SQLite via the existing `useMeetingRows` hook and computes rankings client-side (same pattern as `RankingPage`). A new sidebar entry and route are added.

**Tech Stack:** React 18 + TypeScript (strict), TanStack Table, Tailwind CSS, Vitest. No new dependencies.

## Global Constraints

- TypeScript `strict: true`, no `any` — use `unknown` + type guards.
- Components: `PascalCase.tsx`; hooks: `use-kebab-case.ts`; lib: `kebab-case.ts`.
- UI entirely in French, French punctuation (espace insécable avant `:`, `;`, `!`, `?`).
- Every file must have a header comment.
- One file = one responsibility. Never exceed 300 lines per file.
- Never leave dead code.
- Run `npm run test` and `npm run lint` after each task; both must pass before committing.
- The test fixture file is `test/fixtures/sample.csv` (Latin-1, semicolon delimiter, FFN extraNat format).

---

### Task 1: Individual ranking engine — `computeIndividualRanking` and `detectGender`

**Files:**
- Create: `src/lib/individual-ranking.ts`
- Create: `test/individual-ranking.test.ts`

**Interfaces:**
- Consumes: `RawSwimmerRow` from `src/lib/csv-parser.ts`
- Produces:
  ```typescript
  type Gender = 'F' | 'M' | null;

  interface IndividualResult {
    rank: number;
    lastname: string;
    firstname: string;
    birthyear: number;
    club: string;
    points: number;
    category: string;
    gender: Gender;
  }

  function detectGender(categoryName: string): Gender;
  function computeIndividualRanking(rows: RawSwimmerRow[]): IndividualResult[];
  function filterByGender(results: IndividualResult[], gender: 'F' | 'M'): IndividualResult[];
  ```

- [ ] **Step 1: Write failing tests**

Create `test/individual-ranking.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../src/lib/csv-parser';
import {
  computeIndividualRanking,
  detectGender,
  filterByGender,
} from '../src/lib/individual-ranking';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function loadRows() {
  const buffer = readFileSync(path.join(FIXTURE_DIR, 'sample.csv'));
  return parseCsv(new Uint8Array(buffer)).rows;
}

describe('detectGender', () => {
  it('returns F for "Classement Dames"', () => {
    expect(detectGender('Classement Dames')).toBe('F');
  });

  it('returns M for "Classement Messieurs"', () => {
    expect(detectGender('Classement Messieurs')).toBe('M');
  });

  it('returns null for "Classement Mixte"', () => {
    expect(detectGender('Classement Mixte')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(detectGender('CLASSEMENT DAMES')).toBe('F');
  });
});

describe('computeIndividualRanking', () => {
  const rows = loadRows();
  const results = computeIndividualRanking(rows);

  it('returns results sorted by points descending', () => {
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.points).toBeLessThanOrEqual(results[i - 1]!.points);
    }
  });

  it('assigns ranks starting at 1 with no gaps', () => {
    results.forEach((result, index) => {
      expect(result.rank).toBe(index + 1);
    });
  });

  it('deduplicates swimmers across categories (keeps best score)', () => {
    const keys = results.map(
      (r) => `${r.lastname}|${r.firstname}|${r.birthyear}|${r.club}`
    );
    const unique = new Set(keys);
    expect(keys.length).toBe(unique.size);
  });

  it('the top scorer has the highest points in the file', () => {
    const allPoints = rows.map((r) => r.points);
    expect(results[0]!.points).toBe(Math.max(...allPoints));
  });

  it('assigns gender based on category', () => {
    const dames = results.filter((r) => r.gender === 'F');
    const messieurs = results.filter((r) => r.gender === 'M');
    expect(dames.length).toBeGreaterThan(0);
    expect(messieurs.length).toBeGreaterThan(0);
  });
});

describe('filterByGender', () => {
  const rows = loadRows();
  const results = computeIndividualRanking(rows);

  it('returns only female swimmers for gender F', () => {
    const dames = filterByGender(results, 'F');
    expect(dames.every((r) => r.gender === 'F')).toBe(true);
    expect(dames.length).toBeGreaterThan(0);
  });

  it('returns only male swimmers for gender M', () => {
    const messieurs = filterByGender(results, 'M');
    expect(messieurs.every((r) => r.gender === 'M')).toBe(true);
    expect(messieurs.length).toBeGreaterThan(0);
  });

  it('re-ranks filtered results starting at 1', () => {
    const dames = filterByGender(results, 'F');
    dames.forEach((result, index) => {
      expect(result.rank).toBe(index + 1);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/individual-ranking.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement individual-ranking.ts**

Create `src/lib/individual-ranking.ts`:

```typescript
/**
 * Responsabilité : calcul du classement individuel tous nageurs confondus.
 * Appelé par : IndividualPage.tsx (via hook) et les tests.
 * Suppression casserait : la page de classement individuel.
 */
import type { RawSwimmerRow } from './csv-parser';

export type Gender = 'F' | 'M' | null;

export interface IndividualResult {
  rank: number;
  lastname: string;
  firstname: string;
  birthyear: number;
  club: string;
  points: number;
  category: string;
  gender: Gender;
}

export function detectGender(categoryName: string): Gender {
  const lower = categoryName.toLowerCase();
  if (lower.includes('dames')) return 'F';
  if (lower.includes('messieurs')) return 'M';
  return null;
}

export function computeIndividualRanking(rows: RawSwimmerRow[]): IndividualResult[] {
  const bestBySwimmer = new Map<string, { row: RawSwimmerRow; gender: Gender }>();

  for (const row of rows) {
    const key = `${row.lastname}|${row.firstname}|${row.birthyear}|${row.club}`;
    const gender = detectGender(row.name);
    const existing = bestBySwimmer.get(key);

    if (!existing) {
      bestBySwimmer.set(key, { row, gender });
    } else {
      if (row.points > existing.row.points) {
        bestBySwimmer.set(key, { row, gender: gender ?? existing.gender });
      } else if (gender !== null && existing.gender === null) {
        bestBySwimmer.set(key, { row: existing.row, gender });
      }
    }
  }

  const entries = Array.from(bestBySwimmer.values());
  entries.sort((a, b) => b.row.points - a.row.points);

  return entries.map(({ row, gender }, index) => ({
    rank: index + 1,
    lastname: row.lastname,
    firstname: row.firstname,
    birthyear: row.birthyear,
    club: row.club,
    points: row.points,
    category: row.name,
    gender,
  }));
}

export function filterByGender(results: IndividualResult[], gender: 'F' | 'M'): IndividualResult[] {
  return results
    .filter((r) => r.gender === gender)
    .map((r, index) => ({ ...r, rank: index + 1 }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/individual-ranking.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/individual-ranking.ts test/individual-ranking.test.ts
git commit -m "feat: add individual ranking engine with gender detection"
```

---

### Task 2: Fun awards engine — `computeFunAwards`

**Files:**
- Create: `src/lib/fun-awards.ts`
- Create: `test/fun-awards.test.ts`

**Interfaces:**
- Consumes: `RawSwimmerRow` from `src/lib/csv-parser.ts`
- Produces:
  ```typescript
  interface FunAward {
    id: string;
    title: string;
    emoji: string;
    winner: {
      name: string;
      club: string;
      detail: string;
    };
  }

  function computeFunAwards(rows: RawSwimmerRow[]): FunAward[];
  ```

- [ ] **Step 1: Write failing tests**

Create `test/fun-awards.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv, type RawSwimmerRow } from '../src/lib/csv-parser';
import { computeFunAwards, type FunAward } from '../src/lib/fun-awards';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function loadRows(): RawSwimmerRow[] {
  const buffer = readFileSync(path.join(FIXTURE_DIR, 'sample.csv'));
  return parseCsv(new Uint8Array(buffer)).rows;
}

function findAward(awards: FunAward[], id: string): FunAward | undefined {
  return awards.find((a) => a.id === id);
}

describe('computeFunAwards', () => {
  const rows = loadRows();
  const awards = computeFunAwards(rows);

  it('returns up to 6 awards', () => {
    expect(awards.length).toBeGreaterThanOrEqual(1);
    expect(awards.length).toBeLessThanOrEqual(6);
  });

  it('each award has required fields', () => {
    for (const award of awards) {
      expect(award.id).toBeTruthy();
      expect(award.title).toBeTruthy();
      expect(award.emoji).toBeTruthy();
      expect(award.winner.name).toBeTruthy();
      expect(award.winner.club).toBeTruthy();
      expect(award.winner.detail).toBeTruthy();
    }
  });

  it('doyen award picks the oldest swimmer (lowest birthyear)', () => {
    const doyen = findAward(awards, 'doyen');
    expect(doyen).toBeDefined();
    const minBirthyear = Math.min(...rows.map((r) => r.birthyear).filter((y) => y > 0));
    expect(doyen!.winner.detail).toContain(String(minBirthyear));
  });

  it('releve award picks the youngest swimmer (highest birthyear)', () => {
    const releve = findAward(awards, 'releve');
    expect(releve).toBeDefined();
    const maxBirthyear = Math.max(...rows.map((r) => r.birthyear));
    expect(releve!.winner.detail).toContain(String(maxBirthyear));
  });

  it('loup-solitaire finds a swimmer whose club has only one representative', () => {
    const loup = findAward(awards, 'loup-solitaire');
    if (loup) {
      const uniqueSwimmers = new Map<string, Set<string>>();
      for (const row of rows) {
        const key = `${row.lastname}|${row.firstname}|${row.birthyear}`;
        if (!uniqueSwimmers.has(row.club)) {
          uniqueSwimmers.set(row.club, new Set());
        }
        uniqueSwimmers.get(row.club)!.add(key);
      }
      const soloClubs = Array.from(uniqueSwimmers.entries())
        .filter(([, swimmers]) => swimmers.size === 1)
        .map(([club]) => club);
      expect(soloClubs).toContain(loup.winner.club);
    }
  });

  it('regulier finds the swimmer closest to the average', () => {
    const regulier = findAward(awards, 'regulier');
    expect(regulier).toBeDefined();
  });

  it('armada finds the club with the most swimmers', () => {
    const armada = findAward(awards, 'armada');
    expect(armada).toBeDefined();
  });

  it('photo-finish finds the smallest point gap', () => {
    const photo = findAward(awards, 'photo-finish');
    expect(photo).toBeDefined();
  });
});

describe('computeFunAwards edge cases', () => {
  it('handles a single swimmer', () => {
    const rows: RawSwimmerRow[] = [
      {
        name: 'Classement Mixte',
        place: 1,
        lastname: 'DUPONT',
        firstname: 'Jean',
        birthyear: 1990,
        nation: 'FRA',
        club: 'CN TEST',
        points: 800,
        comment: '',
      },
    ];
    const awards = computeFunAwards(rows);
    expect(awards.length).toBeGreaterThanOrEqual(1);
  });

  it('omits loup-solitaire when all swimmers share the same club', () => {
    const rows: RawSwimmerRow[] = [
      { name: 'Classement Mixte', place: 1, lastname: 'A', firstname: 'B', birthyear: 1990, nation: 'FRA', club: 'SAME', points: 800, comment: '' },
      { name: 'Classement Mixte', place: 2, lastname: 'C', firstname: 'D', birthyear: 1995, nation: 'FRA', club: 'SAME', points: 700, comment: '' },
    ];
    const awards = computeFunAwards(rows);
    const loup = findAward(awards, 'loup-solitaire');
    expect(loup).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/fun-awards.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement fun-awards.ts**

Create `src/lib/fun-awards.ts`:

```typescript
/**
 * Responsabilité : calcul des prix humoristiques à partir des données nageurs.
 * Appelé par : IndividualPage.tsx et les tests.
 * Suppression casserait : la section "Palmarès des rigolos".
 */
import type { RawSwimmerRow } from './csv-parser';

export interface FunAward {
  id: string;
  title: string;
  emoji: string;
  winner: {
    name: string;
    club: string;
    detail: string;
  };
}

interface UniqueSwimmer {
  lastname: string;
  firstname: string;
  birthyear: number;
  club: string;
  points: number;
}

function deduplicateSwimmers(rows: RawSwimmerRow[]): UniqueSwimmer[] {
  const best = new Map<string, UniqueSwimmer>();
  for (const row of rows) {
    const key = `${row.lastname}|${row.firstname}|${row.birthyear}|${row.club}`;
    const existing = best.get(key);
    if (!existing || row.points > existing.points) {
      best.set(key, {
        lastname: row.lastname,
        firstname: row.firstname,
        birthyear: row.birthyear,
        club: row.club,
        points: row.points,
      });
    }
  }
  return Array.from(best.values());
}

function formatName(s: UniqueSwimmer): string {
  return `${s.lastname} ${s.firstname}`;
}

function findDoyen(swimmers: UniqueSwimmer[]): FunAward | null {
  const valid = swimmers.filter((s) => s.birthyear > 0);
  if (valid.length === 0) return null;
  const oldest = valid.reduce((a, b) => (a.birthyear < b.birthyear ? a : b));
  const age = new Date().getFullYear() - oldest.birthyear;
  return {
    id: 'doyen',
    title: 'Le Doyen',
    emoji: '👴',
    winner: {
      name: formatName(oldest),
      club: oldest.club,
      detail: `Né(e) en ${oldest.birthyear} (${age} ans)`,
    },
  };
}

function findReleve(swimmers: UniqueSwimmer[]): FunAward | null {
  const valid = swimmers.filter((s) => s.birthyear > 0);
  if (valid.length === 0) return null;
  const youngest = valid.reduce((a, b) => (a.birthyear > b.birthyear ? a : b));
  const age = new Date().getFullYear() - youngest.birthyear;
  return {
    id: 'releve',
    title: 'La Relève',
    emoji: '🌱',
    winner: {
      name: formatName(youngest),
      club: youngest.club,
      detail: `Né(e) en ${youngest.birthyear} (${age} ans)`,
    },
  };
}

function findLoupSolitaire(swimmers: UniqueSwimmer[]): FunAward | null {
  const clubCounts = new Map<string, UniqueSwimmer[]>();
  for (const s of swimmers) {
    const list = clubCounts.get(s.club);
    if (list) {
      list.push(s);
    } else {
      clubCounts.set(s.club, [s]);
    }
  }
  const soloSwimmers = Array.from(clubCounts.entries())
    .filter(([, members]) => members.length === 1)
    .map(([, members]) => members[0]!);
  if (soloSwimmers.length === 0) return null;
  const best = soloSwimmers.reduce((a, b) => (a.points > b.points ? a : b));
  return {
    id: 'loup-solitaire',
    title: 'Le Loup Solitaire',
    emoji: '🐺',
    winner: {
      name: formatName(best),
      club: best.club,
      detail: `Seul(e) représentant(e) de son club (${best.points} pts)`,
    },
  };
}

function findPhotoFinish(swimmers: UniqueSwimmer[]): FunAward | null {
  if (swimmers.length < 2) return null;
  const sorted = [...swimmers].sort((a, b) => b.points - a.points);
  let minGap = Infinity;
  let pairA = sorted[0]!;
  let pairB = sorted[1]!;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i]!.points - sorted[i + 1]!.points;
    if (gap < minGap && gap >= 0) {
      minGap = gap;
      pairA = sorted[i]!;
      pairB = sorted[i + 1]!;
    }
  }
  return {
    id: 'photo-finish',
    title: 'Le Photo-Finish',
    emoji: '📸',
    winner: {
      name: `${formatName(pairA)} et ${formatName(pairB)}`,
      club: pairA.club === pairB.club ? pairA.club : `${pairA.club} / ${pairB.club}`,
      detail: `Seulement ${minGap} pt${minGap !== 1 ? 's' : ''} d'écart (${pairA.points} vs ${pairB.points})`,
    },
  };
}

function findRegulier(swimmers: UniqueSwimmer[]): FunAward | null {
  if (swimmers.length === 0) return null;
  const avg = swimmers.reduce((sum, s) => sum + s.points, 0) / swimmers.length;
  const closest = swimmers.reduce((a, b) =>
    Math.abs(a.points - avg) < Math.abs(b.points - avg) ? a : b
  );
  return {
    id: 'regulier',
    title: 'Le Régulier',
    emoji: '📏',
    winner: {
      name: formatName(closest),
      club: closest.club,
      detail: `${closest.points} pts (moyenne : ${Math.round(avg)} pts)`,
    },
  };
}

function findArmada(swimmers: UniqueSwimmer[]): FunAward | null {
  if (swimmers.length === 0) return null;
  const clubCounts = new Map<string, number>();
  for (const s of swimmers) {
    clubCounts.set(s.club, (clubCounts.get(s.club) ?? 0) + 1);
  }
  let maxClub = '';
  let maxCount = 0;
  for (const [club, count] of clubCounts) {
    if (count > maxCount) {
      maxClub = club;
      maxCount = count;
    }
  }
  return {
    id: 'armada',
    title: "L'Armada",
    emoji: '⚓',
    winner: {
      name: maxClub,
      club: maxClub,
      detail: `${maxCount} nageur${maxCount > 1 ? 's' : ''} inscrits`,
    },
  };
}

export function computeFunAwards(rows: RawSwimmerRow[]): FunAward[] {
  const swimmers = deduplicateSwimmers(rows);
  const finders = [findDoyen, findReleve, findLoupSolitaire, findPhotoFinish, findRegulier, findArmada];
  const awards: FunAward[] = [];
  for (const finder of finders) {
    const award = finder(swimmers);
    if (award) {
      awards.push(award);
    }
  }
  return awards;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/fun-awards.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/fun-awards.ts test/fun-awards.test.ts
git commit -m "feat: add fun awards engine with 6 humorous prizes"
```

---

### Task 3: Add IndividualPage route and sidebar entry

**Files:**
- Create: `src/pages/IndividualPage.tsx` (placeholder first)
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: route system, sidebar nav items
- Produces: `/individuels` route, "Individuels" nav entry

- [ ] **Step 1: Create placeholder IndividualPage**

Create `src/pages/IndividualPage.tsx`:

```typescript
/**
 * Responsabilité : page du classement individuel et des prix rigolos.
 * Appelé par : App.tsx (route /individuels).
 * Suppression casserait : l'écran de classement individuel.
 */
export default function IndividualPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Classement individuel</h1>
      </header>
      <p className="text-neutral-600">Contenu en cours de construction…</p>
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

In `src/App.tsx`, add:
```typescript
import IndividualPage from '@/pages/IndividualPage';
// ...
<Route path="individuels" element={<IndividualPage />} />
```

Place it after the `classement` route and before `parametres`.

- [ ] **Step 3: Add sidebar entry**

In `src/components/layout/Sidebar.tsx`, add `Users` to the Lucide import:
```typescript
import { Home, Settings, Trophy, Upload, Users } from 'lucide-react';
```

Add the nav item after Classement:
```typescript
{ to: '/individuels', label: 'Individuels', icon: Users },
```

- [ ] **Step 4: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/IndividualPage.tsx src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: add individual ranking page route and sidebar entry"
```

---

### Task 4: Build the individual ranking UI

**Files:**
- Modify: `src/pages/IndividualPage.tsx`
- Create: `src/components/ranking/IndividualRankingTable.tsx`
- Create: `src/components/ranking/GenderTabs.tsx`

**Interfaces:**
- Consumes: `IndividualResult` and `filterByGender` from `src/lib/individual-ranking.ts`, `computeIndividualRanking` from same, `useMeetingRows` from `src/hooks/use-meeting-rows.ts`, `AppOutletContext` from `AppShell`, `formatPoints` and `ASCN_CLUB_NAME` and `cn` from `utils.ts`
- Produces: full individual ranking page with gender filter, search, and prize badges

- [ ] **Step 1: Create GenderTabs component**

Create `src/components/ranking/GenderTabs.tsx`:

```typescript
/**
 * Responsabilité : onglets de filtre par genre (Tous / Dames / Messieurs).
 * Appelé par : IndividualPage.tsx.
 * Suppression casserait : le filtre par genre du classement individuel.
 */
import { cn } from '@/lib/utils';

export type GenderFilter = 'all' | 'F' | 'M';

export interface GenderTabsProps {
  active: GenderFilter;
  onChange: (filter: GenderFilter) => void;
}

const TABS: { value: GenderFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'F', label: 'Dames' },
  { value: 'M', label: 'Messieurs' },
];

export function GenderTabs({ active, onChange }: GenderTabsProps): JSX.Element {
  return (
    <div role="tablist" className="flex gap-1 border-b border-neutral-200">
      {TABS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={value === active}
          onClick={() => onChange(value)}
          className={cn(
            'border-b-2 px-4 py-2 text-sm font-medium transition-colors duration-150',
            value === active
              ? 'border-secondary-600 text-secondary-800'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create IndividualRankingTable component**

Create `src/components/ranking/IndividualRankingTable.tsx`:

```typescript
/**
 * Responsabilité : tableau du classement individuel avec recherche.
 * Appelé par : IndividualPage.tsx.
 * Suppression casserait : l'affichage du classement individuel.
 */
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ASCN_CLUB_NAME, cn, formatPoints } from '@/lib/utils';
import type { IndividualResult } from '@/lib/individual-ranking';

export interface IndividualRankingTableProps {
  results: IndividualResult[];
  prizeCount: number;
}

function categoryBadgeLabel(category: string): string {
  return category.replace(/^Classement\s+/i, '');
}

export function IndividualRankingTable({ results, prizeCount }: IndividualRankingTableProps): JSX.Element {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return results;
    return results.filter(
      (r) =>
        r.lastname.toLowerCase().includes(q) ||
        r.firstname.toLowerCase().includes(q) ||
        r.club.toLowerCase().includes(q)
    );
  }, [results, search]);

  return (
    <div className="rounded-lg bg-neutral-0 shadow-card">
      <div className="flex items-center gap-2 border-b border-neutral-200 p-4">
        <Search className="h-4 w-4 text-neutral-400" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer par nom ou club…"
          className="w-full max-w-xs rounded-md border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-secondary-400 focus:ring-1 focus:ring-secondary-400"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="p-8 text-center text-sm text-neutral-600">
          {search.trim() ? 'Aucun nageur ne correspond à la recherche.' : 'Aucun résultat individuel.'}
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">Rang</th>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Année</th>
              <th className="px-3 py-2">Club</th>
              <th className="px-3 py-2">Points</th>
              <th className="px-3 py-2">Catégorie</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.lastname}-${r.firstname}-${r.birthyear}-${r.club}`} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-sm font-mono text-sm font-bold',
                        r.rank <= prizeCount ? 'bg-accent-600 text-neutral-0' : 'text-neutral-700'
                      )}
                      data-numeric
                    >
                      {r.rank}
                    </span>
                    {r.rank <= prizeCount && (
                      <span className="rounded-sm bg-accent-100 px-1.5 py-0.5 text-xs font-medium text-accent-800">
                        {r.rank === 1 ? '1er Prix' : `${r.rank}e Prix`}
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium text-neutral-900">
                  {r.lastname} {r.firstname}
                </td>
                <td className="px-3 py-2 font-mono tabular-nums" data-numeric>
                  {r.birthyear}
                </td>
                <td className={cn('px-3 py-2', r.club === ASCN_CLUB_NAME && 'font-medium text-secondary-800')}>
                  {r.club}
                </td>
                <td className="px-3 py-2 font-mono tabular-nums" data-numeric>
                  {formatPoints(r.points)}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs">
                    {categoryBadgeLabel(r.category)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire up IndividualPage**

Replace the placeholder in `src/pages/IndividualPage.tsx`:

```typescript
/**
 * Responsabilité : page du classement individuel et des prix rigolos.
 * Appelé par : App.tsx (route /individuels).
 * Suppression casserait : l'écran de classement individuel.
 */
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { computeIndividualRanking, filterByGender } from '@/lib/individual-ranking';
import { computeFunAwards } from '@/lib/fun-awards';
import { GenderTabs, type GenderFilter } from '@/components/ranking/GenderTabs';
import { IndividualRankingTable } from '@/components/ranking/IndividualRankingTable';
import { FunAwardsGrid } from '@/components/ranking/FunAwardsGrid';

const PRIZE_COUNT = 2;

export default function IndividualPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, isLoading, error } = useMeetingRows(meetingId);

  const allResults = useMemo(() => computeIndividualRanking(rows), [rows]);
  const displayedResults = useMemo(
    () => (genderFilter === 'all' ? allResults : filterByGender(allResults, genderFilter)),
    [allResults, genderFilter]
  );
  const awards = useMemo(() => computeFunAwards(rows), [rows]);

  const meeting = meetingState.currentMeeting;
  if (!meeting) return <Navigate to="/" replace />;
  if (isLoading) return <p className="text-neutral-600">Chargement…</p>;
  if (error) return <p className="text-sm text-error">{error}</p>;
  if (rows.length === 0) return <Navigate to="/import" replace />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Classement individuel</h1>
        <p className="text-neutral-600">{meeting.name}</p>
      </header>

      <GenderTabs active={genderFilter} onChange={setGenderFilter} />
      <IndividualRankingTable results={displayedResults} prizeCount={PRIZE_COUNT} />

      {genderFilter === 'all' && awards.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-primary-800">Palmarès des rigolos</h2>
          <FunAwardsGrid awards={awards} />
        </>
      )}
    </div>
  );
}
```

Note: `FunAwardsGrid` is created in the next step.

- [ ] **Step 4: Run lint (will fail until FunAwardsGrid exists)**

Run: `npm run lint`
Expected: FAIL — `FunAwardsGrid` not found. This is expected; it's created in the next task.

- [ ] **Step 5: Commit table and tabs (partial — page will be completed in Task 5)**

```bash
git add src/components/ranking/GenderTabs.tsx src/components/ranking/IndividualRankingTable.tsx src/pages/IndividualPage.tsx
git commit -m "feat: build individual ranking page with gender filter and search"
```

---

### Task 5: Build the fun awards UI

**Files:**
- Create: `src/components/ranking/FunAwardsGrid.tsx`

**Interfaces:**
- Consumes: `FunAward` from `src/lib/fun-awards.ts`
- Produces: `FunAwardsGrid` component used by `IndividualPage.tsx`

- [ ] **Step 1: Create FunAwardsGrid component**

Create `src/components/ranking/FunAwardsGrid.tsx`:

```typescript
/**
 * Responsabilité : grille de cartes affichant les prix humoristiques.
 * Appelé par : IndividualPage.tsx.
 * Suppression casserait : l'affichage du "Palmarès des rigolos".
 */
import type { FunAward } from '@/lib/fun-awards';

export interface FunAwardsGridProps {
  awards: FunAward[];
}

export function FunAwardsGrid({ awards }: FunAwardsGridProps): JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {awards.map((award) => (
        <div key={award.id} className="rounded-lg bg-neutral-0 p-4 shadow-card">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl" role="img" aria-hidden>
              {award.emoji}
            </span>
            <h3 className="font-display text-sm font-bold text-primary-800">{award.title}</h3>
          </div>
          <p className="text-sm font-medium text-neutral-900">{award.winner.name}</p>
          <p className="text-xs text-neutral-600">{award.winner.club}</p>
          <p className="mt-1 text-xs text-neutral-500">{award.winner.detail}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ranking/FunAwardsGrid.tsx
git commit -m "feat: add fun awards grid component"
```

---

### Task 6: Update living docs

**Files:**
- Modify: `docs/screens.md`
- Modify: `docs/algorithms.md`

**Interfaces:**
- No code interfaces

- [ ] **Step 1: Update docs/screens.md**

Add the "Individuels" screen description:
- Route `/individuels`, sidebar entry between Classement and Paramètres
- Global individual ranking by points, gender filter (Tous/Dames/Messieurs)
- Top 2 per gender highlighted with prize badges
- Search by name or club
- Fun awards section at bottom ("Palmarès des rigolos")

- [ ] **Step 2: Update docs/algorithms.md**

Add sections for:
- Individual ranking algorithm (deduplicate, sort by points, gender detection)
- Fun awards descriptions (6 prizes, their logic)

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: add individual ranking and fun awards to living docs"
```
