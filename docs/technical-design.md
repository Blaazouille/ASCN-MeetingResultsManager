# ASCN Meeting Results Manager — Technical Design Document

> **Purpose**: Implementation reference for building the application in Claude Code. This document defines the project structure, design tokens, component specifications, data flow, and coding conventions.

---

## 1. Project Scaffold

```
ascn-meeting-results/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron/
│   ├── main.ts              # Electron main process
│   ├── preload.ts            # Context bridge for IPC
│   └── ipc-handlers.ts       # File system & SQLite handlers
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root layout + routing
│   ├── lib/
│   │   ├── csv-parser.ts     # CSV import logic (Papa Parse wrapper)
│   │   ├── ranking-engine.ts # Team ranking algorithm
│   │   ├── db.ts             # SQLite operations (better-sqlite3)
│   │   ├── pdf-export.ts     # PDF generation (@react-pdf/renderer)
│   │   ├── excel-export.ts   # Excel generation (ExcelJS)
│   │   └── utils.ts          # Shared helpers
│   ├── hooks/
│   │   ├── use-meeting.ts    # Meeting CRUD operations
│   │   ├── use-import.ts     # CSV import state machine
│   │   └── use-ranking.ts    # Ranking computation + caching
│   ├── components/
│   │   ├── ui/               # shadcn/ui components (auto-generated)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx   # Sidebar + main content area
│   │   │   ├── Sidebar.tsx    # Navigation sidebar
│   │   │   └── Header.tsx     # Top bar with meeting context
│   │   ├── meeting/
│   │   │   ├── MeetingCard.tsx
│   │   │   ├── MeetingList.tsx
│   │   │   └── MeetingForm.tsx
│   │   ├── import/
│   │   │   ├── DropZone.tsx
│   │   │   ├── CsvPreview.tsx
│   │   │   └── ColumnMapper.tsx
│   │   ├── ranking/
│   │   │   ├── TeamRankingTable.tsx
│   │   │   ├── TeamRow.tsx
│   │   │   ├── SwimmerDetail.tsx
│   │   │   ├── CategoryTabs.tsx
│   │   │   └── RankingToolbar.tsx
│   │   ├── print/
│   │   │   ├── PrintPreview.tsx
│   │   │   ├── A4Page.tsx
│   │   │   └── PrintControls.tsx
│   │   └── settings/
│   │       └── SettingsForm.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── ImportPage.tsx
│   │   ├── RankingPage.tsx
│   │   ├── PrintPage.tsx
│   │   └── SettingsPage.tsx
│   └── styles/
│       └── globals.css        # Tailwind base + custom tokens
├── test/
│   ├── csv-parser.test.ts
│   ├── ranking-engine.test.ts
│   └── fixtures/
│       ├── sample.csv         # Real CSV (Latin-1)
│       └── expected-ranking.json
└── resources/
    └── icon.png               # App icon
```

---

## 2. Design Tokens

All tokens are defined in `src/styles/globals.css` as CSS custom properties and exposed to Tailwind via `tailwind.config.ts`.

### Colors

```css
:root {
  /* Primary */
  --color-primary-900: #071E3D;
  --color-primary-800: #0A3663;
  --color-primary-700: #0D4A87;
  --color-primary-600: #1260A8;
  --color-primary-500: #1A78C8;
  --color-primary-400: #4A9AD8;
  --color-primary-300: #7ABBE4;
  --color-primary-200: #B0D5F0;
  --color-primary-100: #E0EEFA;
  --color-primary-50:  #F0F6FD;

  /* Secondary (Pool Blue) */
  --color-secondary-900: #004A66;
  --color-secondary-800: #006E99;
  --color-secondary-700: #0089BF;
  --color-secondary-600: #00A4E4;
  --color-secondary-500: #1AB4ED;
  --color-secondary-400: #4DC6F2;
  --color-secondary-300: #80D6F6;
  --color-secondary-200: #B3E6FA;
  --color-secondary-100: #E0F4FD;
  --color-secondary-50:  #F0FAFF;

  /* Accent (Coral Energy) */
  --color-accent-900: #7A2E10;
  --color-accent-800: #A34118;
  --color-accent-700: #CC5625;
  --color-accent-600: #FF6B35;
  --color-accent-500: #FF8555;
  --color-accent-400: #FFA07A;
  --color-accent-300: #FFB99E;
  --color-accent-200: #FFD4C2;
  --color-accent-100: #FFEEE6;
  --color-accent-50:  #FFF7F3;

  /* Neutrals */
  --color-neutral-950: #0F1419;
  --color-neutral-900: #1A2332;
  --color-neutral-800: #2D3A4D;
  --color-neutral-700: #3F4F66;
  --color-neutral-600: #5B6B7D;
  --color-neutral-500: #7A8999;
  --color-neutral-400: #97A3B0;
  --color-neutral-300: #B4BCC7;
  --color-neutral-200: #D1D7DE;
  --color-neutral-100: #E8EBEF;
  --color-neutral-50:  #F4F7F6;
  --color-neutral-0:   #FFFFFF;

  /* Semantic */
  --color-success: #22C55E;
  --color-success-light: #DCFCE7;
  --color-warning: #F59E0B;
  --color-warning-light: #FEF9C3;
  --color-error: #EF4444;
  --color-error-light: #FEE2E2;
}
```

### Tailwind config extension

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0A3663',
          50: 'var(--color-primary-50)',
          // ... all shades
          900: 'var(--color-primary-900)',
        },
        secondary: {
          DEFAULT: '#00A4E4',
          // ... all shades
        },
        accent: {
          DEFAULT: '#FF6B35',
          // ... all shades
        },
      },
      fontFamily: {
        display: ['Montserrat', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(10,54,99,0.08), 0 1px 2px rgba(10,54,99,0.06)',
        'card-hover': '0 4px 12px rgba(10,54,99,0.12), 0 2px 4px rgba(10,54,99,0.08)',
        dropdown: '0 4px 16px rgba(10,54,99,0.14)',
      },
      spacing: {
        '4.5': '18px',
        '13': '52px',
        '15': '60px',
      },
    },
  },
};
```

### Typography Scale

| Role | Font | Weight | Size | Line Height | Tracking |
|------|------|--------|------|-------------|----------|
| Page Title | Montserrat | 700 | 28px | 1.2 | -0.02em |
| Section Header | Montserrat | 600 | 22px | 1.3 | -0.01em |
| Card Title | Montserrat | 600 | 17px | 1.4 | 0 |
| Body | Inter | 400 | 15px | 1.6 | 0 |
| Body Small | Inter | 400 | 13px | 1.5 | 0 |
| Label | Inter | 500 | 12px | 1 | 0.04em |
| Data / Numbers | JetBrains Mono | 500 | 15px | 1.4 | 0 |
| Rank Large | JetBrains Mono | 700 | 20px | 1 | 0 |

---

## 3. CSV Parser Specification

### File: `src/lib/csv-parser.ts`

```typescript
interface CsvParseOptions {
  encoding?: 'latin1' | 'utf-8' | 'auto';  // default: 'auto'
  delimiter?: string;                        // default: auto-detect
  topN?: number;                             // default: 5
}

interface RawSwimmerRow {
  name: string;       // Category name: "Classement Mixte"
  place: number;      // Rank in category
  lastname: string;   // "SCHWING"
  firstname: string;  // "Pascale"
  birthyear: number;  // 1958
  nation: string;     // "FRA"
  club: string;       // "CN VIRY-CHÂTILLON"
  points: number;     // 1274 (parsed from "1274 Pts")
  comment: string;    // Usually empty
}

interface CsvParseResult {
  rows: RawSwimmerRow[];
  categories: string[];       // ["Classement Dames", "Classement Messieurs", "Classement Mixte"]
  clubCount: number;
  swimmerCount: number;
  encoding: string;           // Detected encoding
  delimiter: string;          // Detected delimiter
  warnings: string[];         // Any parsing issues
}
```

### Parsing rules

1. **Encoding detection**: Try UTF-8 first. If decoding produces replacement characters (`�`), re-read as Latin-1 (ISO 8859-1). The real file is Latin-1 with semicolon delimiter.

2. **Points extraction**: The `points` column contains strings like `"1274 Pts"`. Extract the numeric value:
   ```typescript
   function parsePoints(raw: string): number {
     const match = raw.match(/(\d+(?:[.,]\d+)?)/);
     if (!match) throw new Error(`Cannot parse points: "${raw}"`);
     return parseFloat(match[1].replace(',', '.'));
   }
   ```

3. **Category grouping**: The `name` column acts as a section header. Group rows by this value. Each unique `name` value becomes a category.

4. **Validation**: After parsing, verify:
   - All rows have non-empty `club` and `points`
   - Points are within plausible range (0–1500 for FFN cotations)
   - No duplicate swimmer within a category (by `lastname` + `firstname`)

---

## 4. Ranking Engine Specification

### File: `src/lib/ranking-engine.ts`

```typescript
interface RankingParams {
  category: string;   // e.g. "Classement Mixte"
  topN: number;       // Number of top swimmers per club (default: 5)
}

interface SwimmerEntry {
  lastname: string;
  firstname: string;
  birthyear: number;
  points: number;
  rank: number;       // Individual rank in category
}

interface TeamResult {
  rank: number;
  club: string;
  totalPoints: number;
  swimmers: SwimmerEntry[];   // The topN swimmers retained
  swimmerCount: number;       // Total swimmers from this club in category
}

function computeTeamRanking(
  rows: RawSwimmerRow[],
  params: RankingParams
): TeamResult[];
```

### Algorithm (validated against Access output)

```
1. Filter rows where row.name === params.category
2. Group by row.club
3. For each club:
   a. Sort swimmers by points DESC
   b. Take top min(params.topN, swimmers.length)
   c. Sum their points → totalPoints
4. Sort clubs by totalPoints DESC
5. Assign rank (1-indexed, no gaps)
6. Return TeamResult[]
```

### Test fixture

The algorithm must produce exactly these results for `category = "Classement Mixte"`, `topN = 5`:

| Rank | Club | Points |
|------|------|--------|
| 1 | CN VIRY-CHÂTILLON | 5841 |
| 2 | BOULOGNE BILLANCOURT NATATION | 5364 |
| 3 | AC CHERBOURG EN COTENTIN | 5201 |
| 4 | UAS ST-CLOUD | 5191 |
| 5 | EN CAEN | 5155 |
| ... | ... | ... |
| 38 | CN BERGERAC | 561 |

Full validation: all 38 clubs must match the reference Excel exactly.

---

## 5. Data Model (SQLite)

### File: `src/lib/db.ts`

Uses `better-sqlite3` (synchronous, Electron main process).

```sql
-- Meeting (one per event edition)
CREATE TABLE IF NOT EXISTS meeting (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  date        TEXT NOT NULL,
  location    TEXT,
  status      TEXT DEFAULT 'provisional' CHECK(status IN ('provisional', 'final')),
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Imported swimmer results (raw from CSV)
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

-- Computed team rankings (materialized for export)
CREATE TABLE IF NOT EXISTS team_ranking (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id  INTEGER NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  club        TEXT NOT NULL,
  rank        INTEGER NOT NULL,
  total_pts   REAL NOT NULL,
  top_n       INTEGER NOT NULL,
  swimmers    TEXT NOT NULL,  -- JSON: [{"lastname","firstname","birthyear","points"}]
  computed_at TEXT DEFAULT (datetime('now')),
  UNIQUE(meeting_id, category, club)
);

CREATE INDEX IF NOT EXISTS idx_swimmer_meeting ON swimmer_result(meeting_id);
CREATE INDEX IF NOT EXISTS idx_swimmer_category ON swimmer_result(meeting_id, category);
CREATE INDEX IF NOT EXISTS idx_ranking_meeting ON team_ranking(meeting_id);
```

### IPC Bridge (Electron)

The SQLite database runs in the **main process**. The renderer communicates via IPC:

```typescript
// electron/preload.ts — exposed via contextBridge
interface ElectronAPI {
  // Meetings
  getMeetings(): Promise<Meeting[]>;
  createMeeting(data: MeetingInput): Promise<Meeting>;
  updateMeeting(id: number, data: Partial<MeetingInput>): Promise<Meeting>;
  deleteMeeting(id: number): Promise<void>;

  // Import
  importCsv(meetingId: number, filePath: string): Promise<CsvParseResult>;
  getSwimmerResults(meetingId: number, category?: string): Promise<RawSwimmerRow[]>;

  // Rankings
  computeRanking(meetingId: number, params: RankingParams): Promise<TeamResult[]>;
  saveRanking(meetingId: number, results: TeamResult[]): Promise<void>;

  // Export
  exportPdf(meetingId: number, category: string): Promise<string>; // returns file path
  exportExcel(meetingId: number, category: string): Promise<string>;

  // File dialogs
  openFileDialog(filters?: FileFilter[]): Promise<string | null>;
  saveFileDialog(defaultName: string, filters?: FileFilter[]): Promise<string | null>;
}
```

---

## 6. Component Specifications

### AppShell (`components/layout/AppShell.tsx`)

```
┌─────────────────────────────────────────────────────┐
│  Window Title Bar (Electron frameless + custom)     │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │   Main Content Area                      │
│ (220px)  │   (flex-1, overflow-y: auto)            │
│          │                                          │
│ - Logo   │   [Page content rendered here]           │
│ - Nav    │                                          │
│ - Meeting│                                          │
│   context│                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

- Sidebar: fixed width 220px, `bg-primary-800`, white text
- Navigation items: icon + label, active state with `bg-primary-700` + left border `accent`
- Meeting name shown at bottom of sidebar when inside a meeting

### TeamRankingTable (`components/ranking/TeamRankingTable.tsx`)

Built on **TanStack Table** with the following column definition:

| Column | Width | Align | Rendering |
|--------|-------|-------|-----------|
| Rank | 60px | center | Badge with podium colors (gold/silver/bronze for 1-3) |
| Club | flex-1 | left | Bold text, truncate with tooltip on overflow |
| Points | 120px | right | `font-mono`, `tabular-nums`, formatted with space separator (5 841) |
| Swimmers | 80px | center | Count badge (e.g. "5/5" or "3/5") |
| Expand | 40px | center | Chevron icon (rotates on expand) |

**Expanded row**: below the club row, shows a sub-table:

| Sub-column | Content |
|------------|---------|
| Rank | Individual rank in category |
| Name | `LASTNAME Firstname` |
| Birth Year | 1958 |
| Points | Individual points |

### DropZone (`components/import/DropZone.tsx`)

States:
1. **Idle**: Dashed border (`border-dashed border-2 border-neutral-300`), file icon, "Déposez votre fichier CSV extraNat ici" + Browse button
2. **Drag over**: Background `secondary-50`, border `secondary-400`, pulsing animation
3. **Processing**: Spinner + "Analyse du fichier..."
4. **Success**: Green border, summary stats, preview table
5. **Error**: Red border, error message with fix suggestion

### Print A4 Page (`components/print/A4Page.tsx`)

Used both for the in-app preview and for `@react-pdf/renderer` PDF generation. The component tree must be compatible with both rendering targets.

```
┌─────────────────────────────────────────┐
│  MEETING DE LA MER 2026                  │
│  Classement par équipes — Mixte          │
│  16 novembre 2026                        │
├─────────────────────────────────────────┤
│  # │ Club                    │ Points   │
│────│─────────────────────────│──────────│
│  1 │ CN VIRY-CHÂTILLON       │ 5 841    │
│    │ SCHWING, DAVID, CAZAL,  │          │
│    │ BONNIN, CARON           │          │
│────│─────────────────────────│──────────│
│  2 │ BOULOGNE BILLANCOURT N. │ 5 364    │
│    │ MARCHAND, FERRY, MORAND,│          │
│    │ DELAROCHE, LEFEBVRE     │          │
│────│─────────────────────────│──────────│
│ ...                                      │
├─────────────────────────────────────────┤
│  Calculé le 16/11/2026 14:32 │ PROV.    │
└─────────────────────────────────────────┘
```

Typography for print:
- Title: Montserrat Bold, 24pt
- Subtitle: Inter Medium, 14pt
- Rank: Montserrat Bold, 18pt
- Club name: Inter Semi-Bold, 16pt
- Points: JetBrains Mono Medium, 16pt
- Swimmer names: Inter Regular, 11pt
- Footer: Inter Regular, 10pt

---

## 7. Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-table": "^8.10.0",
    "papaparse": "^5.4.0",
    "@react-pdf/renderer": "^3.4.0",
    "exceljs": "^4.4.0",
    "better-sqlite3": "^11.0.0",
    "lucide-react": "^0.300.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/papaparse": "^5.3.0",
    "vitest": "^2.0.0"
  }
}
```

---

## 8. Coding Conventions

### TypeScript
- Strict mode enabled (`"strict": true`)
- All function parameters and return types explicitly typed
- Use `interface` for object shapes, `type` for unions/intersections
- No `any` — use `unknown` and narrow with type guards

### React
- Functional components only
- Custom hooks for all business logic (no logic in components)
- Props interfaces named `{ComponentName}Props`
- Use `React.memo()` for heavy table rows
- Error boundaries around each page

### File naming
- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Lib/utils: `kebab-case.ts`
- Types: co-located in the file that defines them, or `types.ts` if shared

### CSS / Tailwind
- Use Tailwind utility classes in JSX
- Custom CSS only for print styles and complex animations
- No inline `style` attributes except for dynamic values (column widths)
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes

### Number formatting
- Points displayed with non-breaking space as thousands separator: `5 841`
- Utility function: `formatPoints(n: number): string`
- Always use `tabular-nums` font variant for numeric columns

### French language
- All UI strings in French (no i18n library needed for MVP)
- Use proper French punctuation (non-breaking space before `:`, `;`, `!`, `?`)
- Dates formatted as "16 nov. 2026" (Intl.DateTimeFormat with `fr-FR`)

---

## 9. Build & Packaging

### Development

```bash
# Install dependencies
npm install

# Dev mode (Vite + Electron)
npm run dev        # Starts Vite dev server + Electron window

# Run tests
npm run test       # Vitest
npm run test:csv   # CSV parser tests with real fixture
```

### Production build

```bash
# Build for Windows
npm run build:win  # → dist/ASCN Meeting Results Setup.exe

# Build for macOS
npm run build:mac  # → dist/ASCN Meeting Results.dmg
```

Electron Builder config:
```json
{
  "appId": "fr.ascn.meeting-results",
  "productName": "ASCN Meeting Results",
  "directories": { "output": "dist" },
  "files": ["build/**/*", "electron/**/*"],
  "win": {
    "target": "nsis",
    "icon": "resources/icon.ico"
  },
  "mac": {
    "target": "dmg",
    "icon": "resources/icon.icns"
  }
}
```

---

## 10. Phase 1 Implementation Checklist

The first Claude Code session should deliver:

- [ ] Project scaffold (Vite + React + TypeScript + Tailwind + shadcn/ui)
- [ ] Electron wrapper with IPC bridge skeleton
- [ ] CSV parser with Latin-1 support and auto-detection
- [ ] Unit tests for CSV parser against real fixture file
- [ ] DropZone component with drag-and-drop
- [ ] CSV preview table after import
- [ ] Column validation (green badges for correctly mapped columns)
- [ ] Basic AppShell with sidebar navigation (no routing yet)
- [ ] Design tokens in globals.css + tailwind.config.ts
