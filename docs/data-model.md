# Modèle de données

> Schéma SQLite et types TypeScript correspondants. Source de vérité : `src/lib/db-schema.ts` (schéma, migrations) et `src/lib/db.ts` (types, CRUD).

## Schéma SQLite

```sql
CREATE TABLE IF NOT EXISTS meeting (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  default_top_n      INTEGER NOT NULL DEFAULT 5,      -- ajouté en migration user_version 2
  min_swimmers       INTEGER NOT NULL DEFAULT 0,       -- ajouté en migration user_version 2
  active_categories  TEXT,                             -- ajouté en migration user_version 2 (JSON, NULL = toutes actives)
  last_imported_at   TEXT,                             -- ajouté en migration user_version 5 (NULL = jamais importé)
  is_demo            INTEGER NOT NULL DEFAULT 0        -- ajouté en migration user_version 8 (1 = meeting d'entraînement)
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

-- ajoutée en migration user_version 6 : résultats d'avant le dernier import (un seul instantané par meeting)
CREATE TABLE IF NOT EXISTS import_snapshot (
  meeting_id  INTEGER PRIMARY KEY REFERENCES meeting(id) ON DELETE CASCADE,
  imported_at TEXT,                                 -- date de l'import précédent (NULL si antérieur à last_imported_at)
  rows        TEXT NOT NULL                         -- JSON : RawSwimmerRow[]
);

CREATE INDEX IF NOT EXISTS idx_swimmer_meeting ON swimmer_result(meeting_id);
CREATE INDEX IF NOT EXISTS idx_swimmer_category ON swimmer_result(meeting_id, category);
```

`createDatabase` exécute les migrations gatées sur `PRAGMA user_version` (`migrateSchema`) : une base fraîche (ou `:memory:`) part de la version 0 et rejoue toutes les migrations dans l'ordre ; une base existante ne rejoue que celles qu'elle n'a pas encore vues. Version actuelle : `8` (`2` a ajouté `default_top_n`, `min_swimmers`, `active_categories` ; `3` a supprimé `date` et `location`, qui n'alimentaient rien de fonctionnel ; `4` a supprimé `status` (provisoire/définitif), dont le club n'avait pas l'usage ; `5` a ajouté `last_imported_at` (date du dernier import CSV, posée par `insertSwimmerResults` ; NULL jusqu'au prochain import pour les meetings existants) ; `6` a créé `import_snapshot` (instantané d'avant le dernier import, pour les mouvements de classement) ; `7` a supprimé la table `team_ranking`, jamais alimentée par un écran : les classements sont toujours recalculés depuis `swimmer_result` ; `8` a ajouté `is_demo` (meeting d'entraînement, 0 pour tous les meetings existants) — chaque migration vérifie la présence des colonnes ou tables avant de les `DROP`, pour rester un no-op sur une base déjà à jour). Toute migration future doit incrémenter `user_version` et gérer la transition de la même façon.

## Interfaces TypeScript

```typescript
interface Meeting {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  defaultTopN: number;
  minSwimmers: number;
  activeCategories: string[] | null; // null = toutes les catégories présentes sont actives
  resultCount: number; // nombre de lignes swimmer_result du meeting ; 0 = rien importé pour l'instant
  lastImportedAt: string | null; // timestamp SQLite (UTC) du dernier import CSV ; null = jamais importé
  clubCount: number;             // clubs distincts parmi les résultats importés
  swimmerCount: number;          // nageurs distincts (un nageur présent dans plusieurs catégories compte une fois)
  isDemo: boolean;               // meeting d'entraînement (is_demo = 1) : jamais sauvegardé, supprimé sans confirmation
}

interface MeetingInput {
  name: string;
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
  createdAt: string;
  updatedAt: string;
  lastImportedAt?: string | null;  // absent des anciennes sauvegardes, restauré comme « jamais importé »
  defaultTopN: number;          // Règle de calcul : top N par défaut
  minSwimmers: number;          // Règle de calcul : seuil minimum
  activeCategories: string[] | null;  // Règle de calcul : catégories actives
  swimmers: SwimmerBackup[];
  teamRankings?: unknown[];     // champ hérité : ignoré à la restauration, toujours écrit vide ([]) pour les anciennes versions de l'app
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
```

Le meeting d'entraînement (`is_demo = 1`, voir `src/lib/demo-meeting.ts`) n'est jamais sauvegardé : `exportDatabase` l'écarte, donc il est absent des sauvegardes automatiques, de l'export manuel et de la copie avant restauration. Ce sont des données d'exemple jetables : il se recrée en un clic depuis l'Accueil. Une restauration le supprime comme tous les meetings. Le format `BackupData` ne change pas (pas de champ `isDemo`).

L'instantané `import_snapshot` n'est volontairement pas sauvegardé : une restauration repart sans « import précédent » (pas de flèches tant qu'un nouvel import n'a pas eu lieu).

La sauvegarde inclut les résultats des nageurs et les règles de calcul (`defaultTopN`, `minSwimmers`, `activeCategories`) : une restauration reconstitue l'état complet du meeting, les classements étant recalculés à l'affichage. Les sauvegardes faites avant la version 7 du schéma contiennent des classements dans `teamRankings` : ils sont ignorés à la restauration, sans erreur. Les nouvelles sauvegardes écrivent `teamRankings: []` parce que les versions précédentes de l'app exigent ce tableau : elles peuvent ainsi relire une sauvegarde récente.

## Configuration des sauvegardes automatiques

La configuration est stockée dans un fichier JSON distinct, en dehors de SQLite :

```typescript
interface BackupConfig {
  backupDir: string;            // Chemin absolu du dossier de sauvegarde
  maxBackups: number;           // Nombre maximal de fichiers conservés (par défaut 5, minimum 3)
}
```

Fichier : `{app.getPath('userData')}/backup-config.json` (par exemple `C:\Users\<user>\AppData\Roaming\MDLM Ranking\backup-config.json` sur Windows).

Raison de la séparation : la config survit à une restauration complète de la base (les sauvegardes ne réinitialisent pas les fichiers du système de fichiers Electron, seulement les tables SQLite). Cela permet à l'utilisateur de restaurer un backup sans perdre ses paramètres de sauvegarde (dossier et rotation).

## Relations

- `swimmer_result.meeting_id` → `meeting.id` (`ON DELETE CASCADE`)
- `import_snapshot.meeting_id` → `meeting.id` (`ON DELETE CASCADE`)
- `swimmer_result` est unique par `(meeting_id, category, lastname, firstname, birthyear, club)` : un ré-import du même fichier met à jour les lignes existantes plutôt que de les dupliquer, et retire les nageurs absents du nouvel import (scopé aux catégories présentes).
- `import_snapshot` est unique par `meeting_id` ; chaque import avec des résultats déjà présents le remplace, le premier import d'un meeting le supprime (rien à comparer).
