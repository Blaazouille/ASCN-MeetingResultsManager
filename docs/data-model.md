# Modèle de données

> Schéma SQLite et types TypeScript correspondants. Source de vérité : `src/lib/db-schema.ts` (schéma, migrations) et `src/lib/db.ts` (types, CRUD).

## Schéma SQLite

```sql
CREATE TABLE IF NOT EXISTS meeting (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'provisional' CHECK(status IN ('provisional', 'final')),
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  default_top_n      INTEGER NOT NULL DEFAULT 5,      -- ajouté en migration user_version 2
  min_swimmers       INTEGER NOT NULL DEFAULT 0,       -- ajouté en migration user_version 2
  active_categories  TEXT                              -- ajouté en migration user_version 2 (JSON, NULL = toutes actives)
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

`createDatabase` exécute les migrations gatées sur `PRAGMA user_version` (`migrateSchema`) : une base fraîche (ou `:memory:`) part de la version 0 et rejoue toutes les migrations dans l'ordre ; une base existante ne rejoue que celles qu'elle n'a pas encore vues. Version actuelle : `3` (`2` a ajouté `default_top_n`, `min_swimmers`, `active_categories` ; `3` a supprimé `date` et `location`, qui n'alimentaient rien de fonctionnel — la migration vérifie la présence des colonnes avant de les `DROP`, pour rester un no-op sur une base déjà à jour). Toute migration future doit incrémenter `user_version` et gérer la transition de la même façon.

## Interfaces TypeScript

```typescript
type MeetingStatus = 'provisional' | 'final';

interface Meeting {
  id: number;
  name: string;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
  defaultTopN: number;
  minSwimmers: number;
  activeCategories: string[] | null; // null = toutes les catégories présentes sont actives
}

interface MeetingInput {
  name: string;
  status?: MeetingStatus;
  defaultTopN?: number;
  minSwimmers?: number;
  activeCategories?: string[] | null;
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

interface RankingParams {
  category: string;
  topN: number;
  minSwimmers?: number; // clubs avec moins de nageurs que ce seuil exclus (0/omis = pas de seuil)
}
```

## Schéma de sauvegarde (BackupData JSON)

Format d'export/import complet de la base de données (`src/lib/backup.ts`) :

```typescript
interface BackupData {
  version: 1;
  appName: string;              // "MDLM Ranking"
  exportedAt: string;           // ISO timestamp
  meetings: MeetingBackup[];
}

interface MeetingBackup {
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  defaultTopN: number;          // Règle de calcul : top N par défaut
  minSwimmers: number;          // Règle de calcul : seuil minimum
  activeCategories: string[] | null;  // Règle de calcul : catégories actives
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
  swimmers: string;             // Sérialisation des nageurs retenus
  computedAt: string;           // ISO timestamp
}
```

La sauvegarde inclut les règles de calcul (`defaultTopN`, `minSwimmers`, `activeCategories`) ainsi que les classements pré-calculés (`team_ranking`), de sorte qu'une restauration reconstitue l'état complet du meeting sans recalcul.

## Configuration des sauvegardes automatiques

La configuration est stockée dans un fichier JSON distinct, en dehors de SQLite :

```typescript
interface BackupConfig {
  backupDir: string;            // Chemin absolu du dossier de sauvegarde
  maxBackups: number;           // Nombre maximal de fichiers conservés (par défaut 5)
}
```

Fichier : `{app.getPath('userData')}/backup-config.json` (par exemple `C:\Users\<user>\AppData\Roaming\MDLM Ranking\backup-config.json` sur Windows).

Raison de la séparation : la config survit à une restauration complète de la base (les sauvegardes ne réinitialisent pas les fichiers du système de fichiers Electron, seulement les tables SQLite). Cela permet à l'utilisateur de restaurer un backup sans perdre ses paramètres de sauvegarde (dossier et rotation).

## Relations

- `swimmer_result.meeting_id` → `meeting.id` (`ON DELETE CASCADE`)
- `team_ranking.meeting_id` → `meeting.id` (`ON DELETE CASCADE`)
- `swimmer_result` est unique par `(meeting_id, category, lastname, firstname, birthyear, club)` : un ré-import du même fichier met à jour les lignes existantes plutôt que de les dupliquer, et retire les nageurs absents du nouvel import (scopé aux catégories présentes).
- `team_ranking` est unique par `(meeting_id, category, club)`.
