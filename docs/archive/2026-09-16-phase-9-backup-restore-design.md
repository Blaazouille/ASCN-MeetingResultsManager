# Phase 9 — Backup & Restore

> Permettre l'export et l'import complet des données de l'application en JSON, avec sauvegarde automatique à chaque import CSV, pour faciliter le transfert entre postes et la réinstallation.

## 1. Format de backup

### Structure JSON

```typescript
interface BackupData {
  version: 1;
  appName: string;           // nom de l'app (pour identification)
  exportedAt: string;        // ISO 8601 datetime
  meetings: MeetingBackup[];
}

interface MeetingBackup {
  name: string;
  date: string;
  location: string | null;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
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
}

interface TeamRankingBackup {
  category: string;
  club: string;
  rank: number;
  totalPoints: number;
  topN: number;
  swimmers: string;  // JSON sérialisé (comme dans la DB)
  computedAt: string;
}
```

Le format est volontairement lisible et éditable manuellement si besoin. Pas de compression.

### Fichier
- Extension : `.json`
- Nom par défaut : `{app-name}-backup-{YYYY-MM-DD-HHmmss}.json`
- Encodage : UTF-8

## 2. Export

### Moteur

**Nouveau fichier : `src/lib/backup.ts`**

```typescript
function exportDatabase(db: Database.Database): BackupData
```

- Lit tous les meetings avec `getAllMeetings`.
- Pour chaque meeting, lit ses `swimmer_result` et `team_ranking`.
- Sérialise dans la structure `BackupData`.
- Fonction pure (prend la DB, retourne des données) — testable.

### IPC

**`electron/ipc-handlers.ts`** : nouveau handler `backup:export`.
1. Appelle `exportDatabase(db)`.
2. Ouvre un dialogue "Enregistrer sous" (`dialog.showSaveDialog`) avec le nom par défaut et filtre `.json`.
3. Écrit le fichier avec `fs.writeFileSync` (UTF-8).
4. Retourne `{ success: true, path: string }` ou `{ success: false, error: string }`.

### UI

Bouton "Exporter les données" dans la page Paramètres (section dédiée "Sauvegarde"). Icône `Download` (Lucide).

Au clic :
1. Appelle `window.electronAPI.exportBackup()`.
2. Affiche un message de succès avec le chemin du fichier sauvegardé.

## 3. Import (restauration)

### Moteur

**Dans `src/lib/backup.ts`** :

```typescript
interface RestoreResult {
  meetingsImported: number;
  meetingsSkipped: number;
  swimmersImported: number;
}

function validateBackup(data: unknown): BackupData  // type guard + validation
function restoreDatabase(db: Database.Database, data: BackupData): RestoreResult
```

**`validateBackup`** :
- Vérifie que `version === 1`.
- Vérifie la structure avec des type guards (pas de `any`).
- Lève une erreur explicite si le format est invalide.

**`restoreDatabase`** :
- Pour chaque meeting dans le backup :
  - Cherche un meeting existant avec le même `name` + `date`.
  - Si trouvé → skip (incrémente `meetingsSkipped`).
  - Si pas trouvé → crée le meeting, insère ses swimmers et rankings.
- Exécute le tout dans une transaction SQLite (rollback complet en cas d'erreur).
- Retourne le `RestoreResult`.

### IPC

**`electron/ipc-handlers.ts`** : nouveau handler `backup:import`.
1. Ouvre un dialogue "Ouvrir" (`dialog.showOpenDialog`) avec filtre `.json`.
2. Lit le fichier.
3. Parse le JSON et appelle `validateBackup`.
4. Retourne les stats du backup (nombre de meetings, swimmers) pour confirmation.

**`electron/ipc-handlers.ts`** : nouveau handler `backup:confirm-import`.
1. Appelle `restoreDatabase(db, data)`.
2. Retourne le `RestoreResult`.

Le flow en deux étapes (preview puis confirmation) évite d'appliquer un fichier sans que l'utilisateur n'ait vu ce qu'il contient.

### UI

Bouton "Importer des données" dans la page Paramètres, à côté de l'export. Icône `Upload` (Lucide).

Flow :
1. Clic → dialogue de sélection de fichier.
2. Affiche un résumé : "Ce fichier contient X meetings et Y nageurs. Z meetings existent déjà et seront ignorés."
3. Bouton "Confirmer l'import" / "Annuler".
4. Après import : message de succès avec le `RestoreResult`.

## 4. Auto-backup à l'import CSV

### Comportement
Après chaque import CSV réussi (`insertSwimmerResults` terminé sans erreur), l'application écrit automatiquement un backup JSON complet dans un dossier dédié.

### Paramétrage
- **Dossier** : par défaut, le dossier `backups/` dans le répertoire de données utilisateur de l'app (`app.getPath('userData')/backups/`).
- **Rotation** : garder les 5 derniers backups, supprimer le plus ancien quand la limite est atteinte.
- **Configurable** : dans la page Paramètres, l'utilisateur peut changer le dossier et le nombre max de backups.

### Implémentation

**`electron/ipc-handlers.ts`** :
- Après `insertSwimmerResults`, appeler `exportDatabase(db)` et écrire le fichier dans le dossier de backup.
- Lister les fichiers `.json` dans le dossier, trier par date, supprimer les excédentaires.

**Silencieux** : pas de notification à l'utilisateur sauf en cas d'erreur (log console côté main process). L'auto-backup ne doit pas bloquer le flow d'import.

### Stockage des préférences de backup
Les préférences (dossier, max backups) sont stockées dans un fichier `backup-config.json` dans `app.getPath('userData')`, pas dans SQLite (car elles doivent survivre à une restauration de la DB).

## 5. Tests

**`test/backup.test.ts`** :
- `exportDatabase` : sérialise correctement meetings, swimmers, rankings.
- `validateBackup` : accepte un backup valide, rejette un format invalide (version manquante, structure incorrecte).
- `restoreDatabase` : importe correctement, skip les doublons, transaction rollback en cas d'erreur.
- Round-trip : export → import dans une DB vide → les données sont identiques.
- Rotation : avec max=5, le 6e backup supprime le plus ancien.

## 6. Critères de validation

- [ ] Le bouton "Exporter" génère un fichier JSON lisible et complet.
- [ ] Le bouton "Importer" restaure les données avec confirmation préalable.
- [ ] Les meetings existants sont correctement détectés et ignorés.
- [ ] L'auto-backup s'exécute après chaque import CSV sans bloquer l'UI.
- [ ] La rotation garde exactement N backups.
- [ ] Le round-trip export → import préserve toutes les données.
- [ ] Tous les tests passent (`npm run test`).
- [ ] `npm run lint` passe.
- [ ] Tous les nouveaux fichiers ont un header comment.
- [ ] Aucun fichier ne dépasse 300 lignes.
