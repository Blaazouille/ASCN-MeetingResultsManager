# Modèle de données

> Schéma SQLite et types TypeScript correspondants. Source de vérité : `src/lib/db.ts`.

## Schéma SQLite

```sql
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
  UNIQUE(meeting_id, category, lastname, firstname, birthyear, club)
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
```

`user_version` est fixé à `1` à l'ouverture de la base (`createDatabase`). Toute migration future de schéma devra l'incrémenter et gérer la transition.

## Interfaces TypeScript

```typescript
type MeetingStatus = 'provisional' | 'final';

interface Meeting {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
}

interface MeetingInput {
  name: string;
  date: string;
  location?: string | null;
  status?: MeetingStatus;
}
```

```typescript
// src/lib/csv-parser.ts
interface RawSwimmerRow {
  name: string;       // catégorie (ex: "Classement Mixte")
  place: number;
  lastname: string;
  firstname: string;
  birthyear: number;
  nation: string;
  club: string;
  points: number;
  comment: string;
}
```

```typescript
// src/lib/ranking-engine.ts
interface SwimmerEntry {
  lastname: string;
  firstname: string;
  birthyear: number;
  points: number;
  rank: number; // rang individuel dans la catégorie source
}

interface TeamResult {
  rank: number;
  club: string;
  totalPoints: number;
  swimmers: SwimmerEntry[];   // les topN nageurs retenus
  swimmerCount: number;       // total de nageurs du club dans la catégorie
}
```

## Relations

- `swimmer_result.meeting_id` → `meeting.id` (`ON DELETE CASCADE`)
- `team_ranking.meeting_id` → `meeting.id` (`ON DELETE CASCADE`)
- `swimmer_result` est unique par `(meeting_id, category, lastname, firstname, birthyear, club)` : un ré-import du même fichier met à jour les lignes existantes plutôt que de les dupliquer, et retire les nageurs absents du nouvel import (scopé aux catégories présentes).
- `team_ranking` est unique par `(meeting_id, category, club)`.
