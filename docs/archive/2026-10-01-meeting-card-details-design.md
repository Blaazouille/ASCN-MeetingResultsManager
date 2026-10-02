# Détails des meetings sur l'Accueil — spec de conception

> Date : 2026-10-01. Périmètre : écran Accueil uniquement (pas la barre latérale).

## Problème

La liste des meetings n'affiche que le nom, la date de création et un « nombre de résultats ». Ce dernier compte une ligne par nageur **et par catégorie** (Dames, Messieurs, Mixte) : il surestime le nombre de personnes. La date du dernier import n'est stockée nulle part : `meeting.updated_at` bouge à chaque modification (renommage, top N…), elle ne peut pas la remplacer.

## Objectif

Sur chaque meeting de l'Accueil, afficher :
- le nombre de clubs ;
- le nombre de nageurs uniques ;
- la date et l'heure du dernier import.

## Données (main process)

### Migration 5
- Ajoute `meeting.last_imported_at TEXT` (NULL = jamais importé).
- Même schéma que les migrations 2 à 4 : `ADD COLUMN` gaté sur `PRAGMA user_version` et sur la présence de la colonne (no-op sur une base déjà à jour). `user_version` passe à `5`.
- Pas de rétro-remplissage : les meetings existants restent à NULL jusqu'à leur prochain import (`updated_at` serait souvent faux).

### Import
- Le chemin de remplacement des résultats (`db.ts`) positionne `last_imported_at = datetime('now')` dans la même transaction que l'écriture des lignes, pour qu'un import échoué ne laisse pas de date.
- Un ré-import met la date à jour.

### Lecture (`SELECT_MEETING`)
Deux sous-requêtes s'ajoutent à `result_count` :
- `club_count` : `COUNT(DISTINCT club)`.
- `swimmer_count` : nageurs distincts sur `(lastname, firstname, birthyear, club)`, la clé qui identifie une personne à travers les catégories.

### Interface `Meeting`
Ajoute `lastImportedAt: string | null`, `clubCount: number`, `swimmerCount: number`. `resultCount` reste : la logique « À importer » en dépend.

### Sauvegarde
`MeetingBackup` reçoit `lastImportedAt?: string | null` (optionnel). Une restauration le conserve ; une ancienne sauvegarde sans le champ se charge normalement, avec la date à NULL. `BackupData.version` reste `1` (changement rétro-compatible).

## Affichage

### Libellés (`src/lib/ui-labels.ts`)
- `clubCountLabel(n)` : « 1 club » / « 38 clubs ».
- `swimmerCountLabel(n)` : « 1 nageur » / « 412 nageurs » (milliers via `formatPoints`).
- `lastImportLabel(formatted)` : « Dernier import le … ».

### Formatage (`src/lib/export-data.ts`)
`formatMeetingImportedAt(meeting): string | null` à côté de `formatMeetingCreatedAt`, avec `Intl.DateTimeFormat('fr-FR')`, date **et heure** (« 27 sept. 2026 à 14 h 32 ») : le jour du meeting, les bénévoles réimportent plusieurs fois. Retourne `null` si jamais importé. Réutilise `parseSqliteTimestamp` (les timestamps SQLite sont en UTC, sans fuseau).

### `MeetingCard` (ligne de liste)
- Ligne 2 : `Créé le 12 sept. 2026 · 38 clubs · 412 nageurs`.
- Ligne 3, plus discrète : `Dernier import le 27 sept. 2026 à 14 h 32`.
- Jamais importé (`resultCount === 0`) : stats et ligne d'import masquées, la pastille « À importer » existante reste.
- Meeting importé avant la migration (`lastImportedAt` NULL, `resultCount > 0`) : stats affichées, pas de ligne d'import.

### `ResumeMeetingCard` (carte « Reprendre »)
Remplace `resultCountLabel` par `38 clubs · 412 nageurs · Dernier import le 27 sept. 2026 à 14 h 32` (couleurs `on-marine`). Même règles de masquage.

### Hors périmètre
Barre latérale (`SidebarMeetingCard`), écran Import, dialogue de suppression : inchangés. Le dialogue de suppression et l'écran Import gardent `resultCountLabel`.

## Alternative écartée
Dériver la date de `team_ranking.computed_at` : aucune migration, mais la date bouge à chaque recalcul de classement, sans lien avec l'import.

## Tests
- Migration : base fraîche et base existante (v4 → v5), idempotente.
- Import : pose `last_imported_at` ; un ré-import la met à jour ; un import en échec ne la change pas.
- Comptages : un nageur présent dans plusieurs catégories compte une fois ; clubs distincts ; meeting vide → 0.
- Libellés : singulier/pluriel, séparateur de milliers.
- `formatMeetingImportedAt` : `null` si jamais importé, format fr-FR sinon.
- Sauvegarde : aller-retour avec et sans `lastImportedAt` ; ancienne sauvegarde sans le champ.

## Documentation à mettre à jour
`docs/data-model.md` (schéma, version 5, interface `Meeting`, `MeetingBackup`), `docs/screens.md` (Accueil).
