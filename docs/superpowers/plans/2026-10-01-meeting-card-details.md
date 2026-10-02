# Détails des meetings sur l'Accueil — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Afficher sur chaque meeting de l'Accueil le nombre de clubs, le nombre de nageurs uniques et la date/heure du dernier import.

**Architecture :** Une colonne `meeting.last_imported_at` (migration 5) est posée par `insertSwimmerResults` dans sa transaction. `SELECT_MEETING` calcule `club_count` et `swimmer_count` à la lecture, comme il calcule déjà `result_count`. Des helpers purs (`ui-labels.ts`, `export-data.ts`) fabriquent les textes ; `MeetingCard` et `ResumeMeetingCard` les affichent.

**Tech Stack :** TypeScript strict, better-sqlite3, Vitest, React 18 + Tailwind.

Spec : `docs/superpowers/specs/2026-10-01-meeting-card-details-design.md`.

## Global Constraints

- UI entièrement en français, ponctuation française ; dates via `Intl.DateTimeFormat` `fr-FR`.
- Nombres : `formatPoints` (espace insécable pour les milliers) ; pas de nouvelle dépendance.
- Chaque fichier : en-tête (responsabilité / appelé par / suppression casserait), jamais plus de 300 lignes, pas de code mort.
- Une migration future = incrémenter `PRAGMA user_version` et vérifier l'existence de la colonne avant de la modifier (no-op sur base à jour).
- `BackupData.version` reste `1` ; `lastImportedAt` est **optionnel** dans `MeetingBackup` (anciennes sauvegardes valides).
- Périmètre : Accueil uniquement. `SidebarMeetingCard`, écran Import et `DeleteMeetingDialog` ne changent pas (ils gardent `resultCountLabel`).
- Pas de rétro-remplissage de `last_imported_at` : NULL jusqu'au prochain import.
- Commits conventionnels, sujet en minuscules (commitlint). Pied de commit : `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Vérifications : `npx vitest run <fichier>` pour un test ciblé, `npm run lint` (= `tsc -b --noEmit`), `npm test` pour tout.

## Structure des fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `src/lib/db-schema.ts` | Modifier | Migration 5 (`last_imported_at`) |
| `src/lib/db.ts` | Modifier | `Meeting` + lecture des 3 nouveaux champs, stamp à l'import |
| `src/lib/backup-validation.ts` | Modifier | `MeetingBackup.lastImportedAt?` + validation |
| `src/lib/backup.ts` | Modifier | Export / restauration de `last_imported_at` |
| `src/lib/ui-labels.ts` | Modifier | `clubCountLabel`, `swimmerCountLabel`, `meetingStatsLabel`, `lastImportLabel` |
| `src/lib/export-data.ts` | Modifier | `formatMeetingImportedAt` |
| `src/components/meeting/MeetingCard.tsx` | Modifier | Affichage dans la liste |
| `src/components/meeting/ResumeMeetingCard.tsx` | Modifier | Affichage dans la carte « Reprendre » |
| `test/meeting-stats.test.ts` | Créer | Tests du stamp d'import et des comptages (`db.test.ts` approche déjà 300 lignes) |
| `test/db-migration.test.ts`, `test/backup.test.ts`, `test/ui-labels.test.ts`, `test/export-data.test.ts` | Modifier | Tests de leur périmètre |
| `test/pdf-export.test.ts`, `test/excel-export.test.ts` | Modifier | Les fixtures `Meeting` reçoivent les nouveaux champs (sinon `tsc` casse) |
| `docs/data-model.md`, `docs/screens.md`, spec | Modifier | Documentation vivante |

---

### Task 1 : Migration 5 et date du dernier import

**Files:**
- Modify: `src/lib/db-schema.ts` (après le bloc `version < 4`, ligne ~105)
- Modify: `src/lib/db.ts` (interface `Meeting`, `MeetingRow`, `rowToMeeting`, `insertSwimmerResults`)
- Modify (fixtures de type) : `test/pdf-export.test.ts:11-19`, `test/excel-export.test.ts:12-20`, `test/export-data.test.ts:24-33` et `:42-51`
- Test: `test/db-migration.test.ts`, `test/meeting-stats.test.ts` (nouveau)

**Interfaces:**
- Produces : `Meeting.lastImportedAt: string | null` (timestamp SQLite UTC `YYYY-MM-DD HH:MM:SS`, `null` = jamais importé). Posé par `insertSwimmerResults(db, meetingId, rows)` (signature inchangée).

- [ ] **Step 1 : écrire les tests de migration qui échouent**

Ajouter dans `test/db-migration.test.ts`, à l'intérieur du `describe('schema migrations', …)` après le test existant :

```ts
  it('adds last_imported_at (NULL) to a v4 database without losing meetings', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mrm-migration-'));
    const file = path.join(dir, 'v4.db');
    const legacy = new Database(file);
    legacy.exec(`
      CREATE TABLE meeting (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
        default_top_n INTEGER NOT NULL DEFAULT 5,
        min_swimmers INTEGER NOT NULL DEFAULT 0,
        active_categories TEXT
      );
      INSERT INTO meeting (name) VALUES ('Meeting 2025');
    `);
    legacy.pragma('user_version = 4');
    legacy.close();

    const db = createDatabase(file);
    try {
      expect(db.pragma('user_version', { simple: true })).toBe(5);
      const meetings = getAllMeetings(db);
      expect(meetings.map((m) => m.name)).toEqual(['Meeting 2025']);
      expect(meetings[0].lastImportedAt).toBeNull();
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('gives a fresh database the last_imported_at column at version 5', () => {
    const db = createDatabase(':memory:');
    expect(db.pragma('user_version', { simple: true })).toBe(5);
    expect(createMeeting(db, { name: 'Neuf' }).lastImportedAt).toBeNull();
  });
```

- [ ] **Step 2 : écrire les tests du stamp d'import (nouveau fichier)**

Créer `test/meeting-stats.test.ts` :

```ts
/**
 * Responsabilité : tests des champs dérivés d'un meeting (date du dernier import, nombre de clubs, nombre de nageurs uniques).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ces champs de db.ts (affichés sur l'Accueil).
 */
import { describe, expect, it } from 'vitest';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import { createDatabase } from '../src/lib/db-schema';
import { createMeeting, getAllMeetings, insertSwimmerResults } from '../src/lib/db';

function row(overrides: Partial<RawSwimmerRow> = {}): RawSwimmerRow {
  return {
    name: 'Classement Mixte',
    place: 1,
    lastname: 'DUPONT',
    firstname: 'Jean',
    birthyear: 1990,
    nation: 'FRA',
    club: 'CN TEST',
    points: 500,
    comment: '',
    ...overrides,
  };
}

function firstMeeting(db: ReturnType<typeof createDatabase>) {
  return getAllMeetings(db)[0];
}

describe('lastImportedAt', () => {
  it('is null for a meeting that was never imported', () => {
    const db = createDatabase(':memory:');
    expect(createMeeting(db, { name: 'Vide' }).lastImportedAt).toBeNull();
  });

  it('is set by an import', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });

    insertSwimmerResults(db, meeting.id, [row()]);

    expect(firstMeeting(db).lastImportedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('is refreshed by a re-import', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });
    insertSwimmerResults(db, meeting.id, [row()]);
    db.prepare("UPDATE meeting SET last_imported_at = '2020-01-01 00:00:00' WHERE id = ?").run(meeting.id);

    insertSwimmerResults(db, meeting.id, [row()]);

    expect(firstMeeting(db).lastImportedAt).not.toBe('2020-01-01 00:00:00');
  });

  it('is left untouched when the import fails', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });
    // lastname is NOT NULL: this row aborts the transaction, which must also
    // roll back the date — otherwise a failed import would look like a good one.
    const broken = row({ lastname: null as unknown as string });

    expect(() => insertSwimmerResults(db, meeting.id, [broken])).toThrow();

    expect(firstMeeting(db).lastImportedAt).toBeNull();
  });

  it('only changes the meeting that was imported', () => {
    const db = createDatabase(':memory:');
    const imported = createMeeting(db, { name: 'Importé' });
    createMeeting(db, { name: 'Autre' });

    insertSwimmerResults(db, imported.id, [row()]);

    const byName = new Map(getAllMeetings(db).map((m) => [m.name, m.lastImportedAt]));
    expect(byName.get('Importé')).not.toBeNull();
    expect(byName.get('Autre')).toBeNull();
  });
});
```

- [ ] **Step 3 : lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run test/db-migration.test.ts test/meeting-stats.test.ts`
Expected: FAIL (`user_version` vaut 4, `lastImportedAt` est `undefined`).

- [ ] **Step 4 : migration 5**

Dans `src/lib/db-schema.ts`, après le bloc `if (version < 4) { … }` et avant l'accolade fermante de `migrateSchema` :

```ts
  if (version < 5) {
    // When the CSV was last imported. updated_at can't serve: it also moves on a
    // rename or a top-N change. NULL = never imported (existing meetings stay
    // NULL until their next import — updated_at would be a wrong backfill).
    // Same existence check as v3/v4, so a database that already has the column
    // is a no-op rather than an "duplicate column" error.
    const columns = db.prepare('PRAGMA table_info(meeting)').all() as Array<{ name: string }>;
    if (!columns.some((c) => c.name === 'last_imported_at')) {
      db.exec('ALTER TABLE meeting ADD COLUMN last_imported_at TEXT');
    }
    db.pragma('user_version = 5');
  }
```

- [ ] **Step 5 : exposer et poser la date dans `db.ts`**

Dans `src/lib/db.ts` :

1. Interface `Meeting`, après `resultCount` :

```ts
  /** SQLite UTC timestamp of the last CSV import; null = never imported. */
  lastImportedAt: string | null;
```

2. Interface `MeetingRow`, après `result_count: number;` :

```ts
  last_imported_at: string | null;
```

3. `rowToMeeting`, après `resultCount: row.result_count,` :

```ts
    lastImportedAt: row.last_imported_at,
```

4. `insertSwimmerResults` : déclarer le statement avec les autres (après `const deleteById = …`) :

```ts
  const stampImport = db.prepare("UPDATE meeting SET last_imported_at = datetime('now') WHERE id = ?");
```

puis, dans la transaction, **après** la boucle `for (const [category, categoryRows] of rowsByCategory) { … }` et avant l'accolade fermante de `db.transaction(`, :

```ts
    // Inside the transaction: a failed import rolls the date back with the rows.
    stampImport.run(meetingId);
```

- [ ] **Step 6 : fixtures de type**

Ajouter `lastImportedAt: null,` après `resultCount: 0,` dans les quatre objets `Meeting` de `test/pdf-export.test.ts` (`TEST_MEETING`), `test/excel-export.test.ts` (`TEST_MEETING`) et `test/export-data.test.ts` (deux littéraux).

- [ ] **Step 7 : tests et typage**

Run: `npx vitest run test/db-migration.test.ts test/meeting-stats.test.ts test/db.test.ts test/backup.test.ts`
Expected: PASS.
Run: `npm run lint`
Expected: aucune erreur.

- [ ] **Step 8 : commit**

```bash
git add src/lib/db-schema.ts src/lib/db.ts test
git commit -m "feat: record the date of each meeting's last import" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2 : Comptage des clubs et des nageurs uniques

**Files:**
- Modify: `src/lib/db.ts` (`Meeting`, `MeetingRow`, `rowToMeeting`, `SELECT_MEETING`)
- Modify (fixtures de type) : `test/pdf-export.test.ts`, `test/excel-export.test.ts`, `test/export-data.test.ts` (deux littéraux)
- Test: `test/meeting-stats.test.ts`

**Interfaces:**
- Consumes : `Meeting` de la Task 1.
- Produces : `Meeting.clubCount: number` (clubs distincts), `Meeting.swimmerCount: number` (nageurs distincts sur `(lastname, firstname, birthyear, club)`, toutes catégories confondues). Les deux valent `0` si rien n'est importé.

- [ ] **Step 1 : écrire les tests qui échouent**

Ajouter à la fin de `test/meeting-stats.test.ts` :

```ts
describe('clubCount and swimmerCount', () => {
  it('are 0 for a meeting with nothing imported', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'Vide' });

    expect(meeting.clubCount).toBe(0);
    expect(meeting.swimmerCount).toBe(0);
  });

  it('count a swimmer once even when listed in several categories', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });

    insertSwimmerResults(db, meeting.id, [
      row({ name: 'Classement Mixte', lastname: 'A', club: 'CLUB X' }),
      row({ name: 'Classement Mixte', lastname: 'B', club: 'CLUB X' }),
      row({ name: 'Classement Mixte', lastname: 'C', club: 'CLUB Y' }),
      row({ name: 'Classement Dames', lastname: 'A', club: 'CLUB X' }),
    ]);

    const [loaded] = getAllMeetings(db);
    expect(loaded.resultCount).toBe(4);
    expect(loaded.swimmerCount).toBe(3);
    expect(loaded.clubCount).toBe(2);
  });

  it('tell homonyms apart by birth year and by club', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });

    insertSwimmerResults(db, meeting.id, [
      row({ lastname: 'MARTIN', firstname: 'Paul', birthyear: 1990, club: 'CLUB X' }),
      row({ lastname: 'MARTIN', firstname: 'Paul', birthyear: 2005, club: 'CLUB X' }),
      row({ lastname: 'MARTIN', firstname: 'Paul', birthyear: 1990, club: 'CLUB Y' }),
    ]);

    expect(getAllMeetings(db)[0].swimmerCount).toBe(3);
  });

  it('are computed per meeting', () => {
    const db = createDatabase(':memory:');
    const a = createMeeting(db, { name: 'A' });
    const b = createMeeting(db, { name: 'B' });

    insertSwimmerResults(db, a.id, [row({ lastname: 'A1' }), row({ lastname: 'A2' })]);
    insertSwimmerResults(db, b.id, [row({ lastname: 'B1' })]);

    const byName = new Map(getAllMeetings(db).map((m) => [m.name, m.swimmerCount]));
    expect(byName.get('A')).toBe(2);
    expect(byName.get('B')).toBe(1);
  });

  it('count a swimmer with an unknown birth year', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });
    db.prepare(
      `INSERT INTO swimmer_result (meeting_id, category, lastname, firstname, birthyear, club, points)
       VALUES (?, 'Classement Mixte', 'X', 'Y', NULL, 'CLUB X', 100)`
    ).run(meeting.id);

    expect(getAllMeetings(db)[0].swimmerCount).toBe(1);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run test/meeting-stats.test.ts`
Expected: FAIL (`clubCount` / `swimmerCount` valent `undefined`).

- [ ] **Step 3 : implémenter dans `db.ts`**

1. Interface `Meeting`, après `lastImportedAt` :

```ts
  /** Distinct clubs across the meeting's imported results. */
  clubCount: number;
  /** Distinct swimmers (a swimmer listed in several categories counts once). */
  swimmerCount: number;
```

2. `MeetingRow`, après `last_imported_at` :

```ts
  club_count: number;
  swimmer_count: number;
```

3. `rowToMeeting`, après `lastImportedAt: row.last_imported_at,` :

```ts
    clubCount: row.club_count,
    swimmerCount: row.swimmer_count,
```

4. Remplacer la constante `SELECT_MEETING` (et son commentaire) par :

```ts
// Every read of a meeting carries its counts, so Accueil and the sidebar can
// tell "à importer" from "importé" and show clubs/swimmers without loading the
// rows themselves. A swimmer has one row per category, so swimmer_count
// counts distinct identities: COUNT(DISTINCT a, b) isn't valid SQLite, hence
// the concatenation (birthyear can be NULL, hence the IFNULL).
const SELECT_MEETING = `
  SELECT m.*,
    (SELECT COUNT(*) FROM swimmer_result s WHERE s.meeting_id = m.id) AS result_count,
    (SELECT COUNT(DISTINCT s.club) FROM swimmer_result s WHERE s.meeting_id = m.id) AS club_count,
    (SELECT COUNT(DISTINCT s.lastname || '|' || s.firstname || '|' || IFNULL(s.birthyear, '') || '|' || s.club)
       FROM swimmer_result s WHERE s.meeting_id = m.id) AS swimmer_count
  FROM meeting m`;
```

Les usages existants (`${SELECT_MEETING} ORDER BY m.id DESC`, `${SELECT_MEETING} WHERE m.id = ?`) restent valides.

- [ ] **Step 4 : fixtures de type**

Ajouter `clubCount: 0,` et `swimmerCount: 0,` après `lastImportedAt: null,` dans les mêmes quatre objets `Meeting` qu'en Task 1.

- [ ] **Step 5 : tests et typage**

Run: `npx vitest run test/meeting-stats.test.ts test/db.test.ts`
Expected: PASS.
Run: `npm run lint`
Expected: aucune erreur.

- [ ] **Step 6 : commit**

```bash
git add src/lib/db.ts test
git commit -m "feat: count distinct clubs and swimmers per meeting" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3 : Sauvegarde et restauration de la date d'import

**Files:**
- Modify: `src/lib/backup-validation.ts` (interface `MeetingBackup`, `validateBackup`)
- Modify: `src/lib/backup.ts` (`MeetingRow`, `exportDatabase`, `restoreDatabase`)
- Test: `test/backup.test.ts`

**Interfaces:**
- Consumes : colonne `meeting.last_imported_at` (Task 1).
- Produces : `MeetingBackup.lastImportedAt?: string | null`. Export : toujours présent (`string | null`). Restauration : champ absent ⇒ `NULL`.

- [ ] **Step 1 : écrire les tests qui échouent**

Dans `test/backup.test.ts`, changer l'import (ligne 4) en :

```ts
import { createMeeting, getAllMeetings, insertSwimmerResults } from '../src/lib/db';
```

et ajouter à la fin du fichier :

```ts
describe('lastImportedAt in backups', () => {
  function importedDb(): Database.Database {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'Importé' });
    insertSwimmerResults(db, meeting.id, [
      { name: 'Classement Mixte', place: 1, lastname: 'DUPONT', firstname: 'Jean', birthyear: 1990, nation: 'FRA', club: 'CN TEST', points: 800, comment: '' },
    ]);
    db.prepare("UPDATE meeting SET last_imported_at = '2026-09-27 12:30:00' WHERE id = ?").run(meeting.id);
    return db;
  }

  it('exports the import date', () => {
    expect(exportDatabase(importedDb()).meetings[0].lastImportedAt).toBe('2026-09-27 12:30:00');
  });

  it('exports null for a meeting never imported', () => {
    const db = freshDb();
    createMeeting(db, { name: 'Vide' });

    expect(exportDatabase(db).meetings[0].lastImportedAt).toBeNull();
  });

  it('survives a backup → restore round-trip', () => {
    const target = freshDb();

    restoreDatabase(target, validateBackup(exportDatabase(importedDb())));

    expect(getAllMeetings(target)[0].lastImportedAt).toBe('2026-09-27 12:30:00');
  });

  it('restores an older backup that has no lastImportedAt as "never imported"', () => {
    const backup = exportDatabase(importedDb());
    delete (backup.meetings[0] as { lastImportedAt?: string | null }).lastImportedAt;
    const target = freshDb();

    restoreDatabase(target, validateBackup(JSON.parse(JSON.stringify(backup))));

    expect(getAllMeetings(target)[0].lastImportedAt).toBeNull();
  });

  it('rejects a lastImportedAt that is neither a string nor null', () => {
    const backup = JSON.parse(JSON.stringify(exportDatabase(importedDb()))) as { meetings: Array<Record<string, unknown>> };
    backup.meetings[0].lastImportedAt = 42;

    expect(() => validateBackup(backup)).toThrow('lastImportedAt');
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run test/backup.test.ts`
Expected: FAIL (`lastImportedAt` est `undefined` à l'export, la validation n'existe pas).

- [ ] **Step 3 : type et validation**

Dans `src/lib/backup-validation.ts`, interface `MeetingBackup`, après `updatedAt: string;` :

```ts
  /** Optional: backups made before v1.3 don't have it (restored as "never imported"). */
  lastImportedAt?: string | null;
```

Dans `validateBackup`, après le bloc qui contrôle `createdAt` / `updatedAt` (avant le contrôle de `defaultTopN`) :

```ts
    if (m.lastImportedAt !== undefined && m.lastImportedAt !== null && typeof m.lastImportedAt !== 'string') {
      throw new Error('Format de backup invalide : meeting.lastImportedAt doit être null ou une string');
    }
```

- [ ] **Step 4 : export et restauration**

Dans `src/lib/backup.ts` :

1. `MeetingRow`, après `updated_at: string;` : `last_imported_at: string | null;`
2. `exportDatabase`, dans l'objet retourné, après `updatedAt: m.updated_at,` : `lastImportedAt: m.last_imported_at,`
3. `restoreDatabase`, remplacer le statement `insertMeeting` par :

```ts
  const insertMeeting = db.prepare(
    `INSERT INTO meeting (name, created_at, updated_at, last_imported_at, default_top_n, min_swimmers, active_categories)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
```

et l'appel `insertMeeting.run(` par :

```ts
      const row = insertMeeting.run(
        meeting.name,
        meeting.createdAt,
        meeting.updatedAt,
        // `?? null`: better-sqlite3 refuses `undefined`, and older backups omit the field.
        meeting.lastImportedAt ?? null,
        meeting.defaultTopN,
        meeting.minSwimmers,
        meeting.activeCategories ? JSON.stringify(meeting.activeCategories) : null
      );
```

- [ ] **Step 5 : tests et typage**

Run: `npx vitest run test/backup.test.ts test/auto-backup.test.ts`
Expected: PASS.
Run: `npm run lint`
Expected: aucune erreur.

- [ ] **Step 6 : commit**

```bash
git add src/lib/backup-validation.ts src/lib/backup.ts test/backup.test.ts
git commit -m "feat: keep the last import date in backups" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4 : Libellés et formatage de la date d'import

**Files:**
- Modify: `src/lib/ui-labels.ts` (après `resultCountLabel`, ligne ~46)
- Modify: `src/lib/export-data.ts`
- Test: `test/ui-labels.test.ts`, `test/export-data.test.ts`

**Interfaces:**
- Consumes : `Meeting.lastImportedAt` (Task 1), `formatPoints` de `utils.ts`.
- Produces :
  - `clubCountLabel(count: number): string` — « 0 club », « 1 club », « 38 clubs ».
  - `swimmerCountLabel(count: number): string` — « 1 nageur », « 1 234 nageurs » (espace insécable).
  - `meetingStatsLabel(clubCount: number, swimmerCount: number): string` — « 38 clubs · 412 nageurs ».
  - `lastImportLabel(formattedDate: string): string` — « Dernier import le … ».
  - `formatMeetingImportedAt(meeting: Meeting): string | null` — « 27 sept. 2026 à 14 h 32 » (heure locale), `null` si jamais importé.

- [ ] **Step 1 : tests des libellés (échec attendu)**

Dans `test/ui-labels.test.ts`, ajouter `clubCountLabel`, `lastImportLabel`, `meetingStatsLabel` et `swimmerCountLabel` à l'import (ordre alphabétique) et ajouter à la fin du fichier :

```ts
describe('clubCountLabel', () => {
  it('uses the singular for 0 and 1 (French rule), the plural from 2', () => {
    expect(clubCountLabel(0)).toBe('0 club');
    expect(clubCountLabel(1)).toBe('1 club');
    expect(clubCountLabel(38)).toBe('38 clubs');
  });
});

describe('swimmerCountLabel', () => {
  it('uses the singular for 0 and 1, the plural from 2', () => {
    expect(swimmerCountLabel(0)).toBe('0 nageur');
    expect(swimmerCountLabel(1)).toBe('1 nageur');
    expect(swimmerCountLabel(412)).toBe('412 nageurs');
  });

  it('separates thousands with a non-breaking space', () => {
    expect(swimmerCountLabel(1234)).toBe(`1${NBSP}234 nageurs`);
  });
});

describe('meetingStatsLabel', () => {
  it('joins clubs and swimmers', () => {
    expect(meetingStatsLabel(38, 412)).toBe('38 clubs · 412 nageurs');
  });

  it('handles singulars', () => {
    expect(meetingStatsLabel(1, 1)).toBe('1 club · 1 nageur');
  });
});

describe('lastImportLabel', () => {
  it('prefixes the formatted date', () => {
    expect(lastImportLabel('27 sept. 2026 à 14 h 32')).toBe('Dernier import le 27 sept. 2026 à 14 h 32');
  });
});
```

Run: `npx vitest run test/ui-labels.test.ts`
Expected: FAIL (fonctions non définies).

- [ ] **Step 2 : implémenter les libellés**

Dans `src/lib/ui-labels.ts`, après `resultCountLabel` :

```ts
/** "38 clubs" — French treats 0 as singular, so the plural starts at 2. */
export function clubCountLabel(count: number): string {
  return count < 2 ? `${count} club` : `${formatPoints(count)} clubs`;
}

/** "412 nageurs" — counts people, not rows (see Meeting.swimmerCount). */
export function swimmerCountLabel(count: number): string {
  return count < 2 ? `${count} nageur` : `${formatPoints(count)} nageurs`;
}

/** "38 clubs · 412 nageurs": the one-line size of an imported meeting, shared by both Accueil cards. */
export function meetingStatsLabel(clubCount: number, swimmerCount: number): string {
  return `${clubCountLabel(clubCount)} · ${swimmerCountLabel(swimmerCount)}`;
}

/** "Dernier import le 27 sept. 2026 à 14 h 32": takes the already-formatted date from formatMeetingImportedAt. */
export function lastImportLabel(formattedDate: string): string {
  return `Dernier import le ${formattedDate}`;
}
```

Run: `npx vitest run test/ui-labels.test.ts`
Expected: PASS.

- [ ] **Step 3 : test du formateur de date (échec attendu)**

Dans `test/export-data.test.ts`, ajouter `formatMeetingImportedAt` à l'import de `../src/lib/export-data`, et ajouter à la fin :

```ts
describe('formatMeetingImportedAt', () => {
  const base = {
    id: 1,
    name: 'Meeting de la Mer 2026',
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    defaultTopN: 5,
    minSwimmers: 0,
    activeCategories: null,
    resultCount: 0,
    clubCount: 0,
    swimmerCount: 0,
  };

  it('is null when the meeting was never imported', () => {
    expect(formatMeetingImportedAt({ ...base, lastImportedAt: null })).toBeNull();
  });

  it('formats a SQLite UTC timestamp as "27 sept. 2026 à 14 h 32" (local time)', () => {
    // Midday UTC keeps the calendar day stable in any timezone the tests run in.
    const formatted = formatMeetingImportedAt({ ...base, lastImportedAt: '2026-09-27 12:30:00' });

    expect(formatted).toMatch(/^27\s+sept\.?\s+2026 à \d{2} h \d{2}$/);
  });
});
```

Run: `npx vitest run test/export-data.test.ts`
Expected: FAIL (`formatMeetingImportedAt` non défini).

- [ ] **Step 4 : implémenter le formateur**

Dans `src/lib/export-data.ts` :

1. Après `TIMESTAMP_FORMATTER` (ligne 15) :

```ts
// Date and time are formatted apart and joined by hand: a single Intl call with
// dateStyle + timeStyle yields "14:32" or "à 14:32" depending on the ICU version,
// while the club reads "14 h 32".
const IMPORT_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const IMPORT_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
```

2. Après `formatMeetingCreatedAt` :

```ts
/**
 * Date and time of the meeting's last CSV import, e.g. "27 sept. 2026 à 14 h 32",
 * or null when it was never imported. The time matters: volunteers re-import
 * several times on meeting day and need to tell which version is loaded.
 */
export function formatMeetingImportedAt(meeting: Meeting): string | null {
  if (meeting.lastImportedAt === null) return null;
  const at = parseSqliteTimestamp(meeting.lastImportedAt);
  const [hours, minutes] = IMPORT_TIME_FORMATTER.format(at).split(':');
  return `${IMPORT_DATE_FORMATTER.format(at)} à ${hours} h ${minutes}`;
}
```

3. En-tête : remplacer la ligne « Appelé par » par `Appelé par : use-print-export.ts, pdf-export.tsx, excel-export.ts, MeetingCard.tsx, ResumeMeetingCard.tsx.`

- [ ] **Step 5 : tests et typage**

Run: `npx vitest run test/export-data.test.ts test/ui-labels.test.ts`
Expected: PASS.
Run: `npm run lint`
Expected: aucune erreur.

- [ ] **Step 6 : commit**

```bash
git add src/lib/ui-labels.ts src/lib/export-data.ts test/ui-labels.test.ts test/export-data.test.ts
git commit -m "feat: labels and date format for meeting stats" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5 : Affichage sur l'Accueil

**Files:**
- Modify: `src/components/meeting/MeetingCard.tsx`
- Modify: `src/components/meeting/ResumeMeetingCard.tsx`

**Interfaces:**
- Consumes : `meetingStatsLabel`, `lastImportLabel` (`@/lib/ui-labels`), `formatMeetingImportedAt`, `formatMeetingCreatedAt` (`@/lib/export-data`), `Meeting` (Tasks 1-4).

Il n'y a pas de tests de composants dans ce dépôt (la logique est dans les helpers testés en Task 4) : la vérification est `tsc` + contrôle visuel.

- [ ] **Step 1 : `MeetingCard`**

Dans `src/components/meeting/MeetingCard.tsx` :

1. En-tête, ligne « Responsabilité » :

```
 * Responsabilité : ligne résumant un meeting (nom, création, clubs, nageurs, dernier import, pastille « À importer ») sur l'Accueil, avec ouverture et suppression.
```

2. Imports : remplacer les deux lignes `formatMeetingCreatedAt` / `resultCountLabel` par :

```tsx
import { formatMeetingCreatedAt, formatMeetingImportedAt } from '@/lib/export-data';
import { lastImportLabel, meetingStatsLabel } from '@/lib/ui-labels';
```

3. Au début de la fonction, avant le `return` (le commentaire « Two sibling buttons… » reste au-dessus du `return`) :

```tsx
  const hasResults = meeting.resultCount > 0;
  // Null for a meeting imported before the date was tracked: show no line rather than a wrong one.
  const importedAt = formatMeetingImportedAt(meeting);
```

4. Remplacer le bloc `<span className="flex flex-1 flex-col gap-0.5">…</span>` par :

```tsx
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[17px] font-semibold text-ink">{meeting.name}</span>
          <span className="text-sm text-ink-muted">
            Créé le {formatMeetingCreatedAt(meeting)}
            {hasResults && ` · ${meetingStatsLabel(meeting.clubCount, meeting.swimmerCount)}`}
          </span>
          {hasResults && importedAt && (
            <span className="text-[13px] text-ink-muted">{lastImportLabel(importedAt)}</span>
          )}
        </span>
```

5. Remplacer `{meeting.resultCount === 0 && <ImportPendingBadge />}` par `{!hasResults && <ImportPendingBadge />}`.

- [ ] **Step 2 : `ResumeMeetingCard`**

Dans `src/components/meeting/ResumeMeetingCard.tsx` :

1. En-tête, « Responsabilité » :

```
 * Responsabilité : carte « Reprendre » du dernier meeting sur l'Accueil (pastille « À importer », clubs, nageurs, dernier import, accès direct).
```

2. Imports : remplacer `import { resultCountLabel } from '@/lib/ui-labels';` par :

```tsx
import { formatMeetingImportedAt } from '@/lib/export-data';
import { lastImportLabel, meetingStatsLabel } from '@/lib/ui-labels';
```

3. Après `const hasResults = meeting.resultCount > 0;` :

```tsx
  const importedAt = formatMeetingImportedAt(meeting);
```

4. Remplacer le bloc `<div className="flex items-center gap-2.5 text-[15px] text-on-marine-subtle">…</div>` par :

```tsx
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-on-marine-subtle">
          {!hasResults && <ImportPendingBadge />}
          {hasResults && <span>{meetingStatsLabel(meeting.clubCount, meeting.swimmerCount)}</span>}
          {hasResults && importedAt && <span>· {lastImportLabel(importedAt)}</span>}
        </div>
```

- [ ] **Step 3 : typage et tests**

Run: `npm run lint`
Expected: aucune erreur (pas d'import inutilisé : `resultCountLabel` n'est plus importé dans ces deux fichiers).
Run: `npm test`
Expected: toute la suite passe.

- [ ] **Step 4 : contrôle visuel**

Lancer `npm run dev`, puis vérifier sur l'Accueil :
- meeting sans import : badge « À importer », ni stats ni ligne d'import ;
- après import d'un CSV (`test/fixtures/sample.csv`) : `38 clubs · … nageurs` et `Dernier import le … à HH h MM` dans la liste **et** dans « Reprendre » (l'`ImportPage` recharge déjà les meetings après un import) ;
- un second import met l'heure à jour ;
- meeting importé avant la migration : stats visibles, pas de ligne d'import ;
- fenêtre étroite : la ligne de « Reprendre » passe à la ligne sans déborder.

- [ ] **Step 5 : commit**

```bash
git add src/components/meeting
git commit -m "feat: show clubs, swimmers and last import on Accueil" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6 : Documentation et PR

**Files:**
- Modify: `docs/data-model.md`, `docs/screens.md`, `docs/superpowers/specs/2026-10-01-meeting-card-details-design.md`

- [ ] **Step 1 : `docs/data-model.md`**

1. Dans le bloc SQL de `meeting`, après la ligne `active_categories …` (ajouter une virgule à cette ligne) :

```sql
  active_categories  TEXT,                             -- ajouté en migration user_version 2 (JSON, NULL = toutes actives)
  last_imported_at   TEXT                              -- ajouté en migration user_version 5 (NULL = jamais importé)
```

2. Paragraphe « Version actuelle : `4` … » : remplacer `4` par `5` et ajouter, après la description de la migration 4 : « `5` a ajouté `last_imported_at` (date du dernier import CSV, posée par `insertSwimmerResults` ; NULL jusqu'au prochain import pour les meetings existants) ».

3. Interface `Meeting` : après `resultCount …` ajouter

```typescript
  lastImportedAt: string | null; // timestamp SQLite (UTC) du dernier import CSV ; null = jamais importé
  clubCount: number;             // clubs distincts parmi les résultats importés
  swimmerCount: number;          // nageurs distincts (un nageur présent dans plusieurs catégories compte une fois)
```

4. Interface `MeetingBackup` : après `updatedAt: string;` ajouter `lastImportedAt?: string | null;  // absent des anciennes sauvegardes, restauré comme « jamais importé »`.

- [ ] **Step 2 : `docs/screens.md`**

Dans la puce `MeetingList` / `MeetingCard` de l'Accueil, remplacer « et nombre de résultats — `resultCountLabel` — » par « et, une fois importé, nombre de clubs et de nageurs uniques (`meetingStatsLabel`) puis date et heure du dernier import (`lastImportLabel`, `formatMeetingImportedAt`) — ». Dans la puce « Carte "Reprendre" », ajouter « avec les mêmes clubs, nageurs et dernier import ».

- [ ] **Step 3 : spec**

Dans la section « `ResumeMeetingCard` » de la spec, remplacer la ligne `38 clubs · 412 nageurs · import du 27 sept. à 14 h 32` par `38 clubs · 412 nageurs · Dernier import le 27 sept. 2026 à 14 h 32` (même libellé et même format que la liste : un seul helper).

- [ ] **Step 4 : vérification finale**

Run: `npm test` puis `npm run lint`
Expected: tout passe.

- [ ] **Step 5 : commit, push, PR**

```bash
git add docs
git commit -m "docs: document meeting stats and last import date" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push -u origin feat/meeting-card-details
```

Ouvrir la PR selon `.ai/pull-request.md` : la branche part de `refactor/remove-meeting-status` (la migration 5 suit la migration 4) ; si cette PR est déjà fusionnée dans `main`, rebaser d'abord (`git rebase main`). Le sujet du titre de PR commence par une minuscule (commitlint `subject-case`), p. ex. `feat: show clubs, swimmers and last import on Accueil`. Corps de PR terminé par :

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
