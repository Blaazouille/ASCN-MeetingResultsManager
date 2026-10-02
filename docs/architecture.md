# Architecture

> Décrit l'état actuel de l'application. Mis à jour à chaque changement de comportement. Ce fichier contient **la seule arborescence** du dépôt (voir « Organisation des dossiers ») ; un test (`test/docs-architecture.test.ts`) vérifie que chaque fichier de `src/lib/`, `src/hooks/` et `electron/` y figure.

## Stack technique

- **Frontend** : React 18 + Vite + TypeScript (strict)
- **Desktop** : Electron (main + renderer, IPC bridge via `contextBridge`)
- **UI** : Tailwind CSS + Lucide icons
- **Tableaux** : TanStack Table (headless)
- **Persistance** : SQLite via `better-sqlite3` (main process uniquement)
- **CSV** : Papa Parse (auto-détection encodage + délimiteur)
- **Export PDF** : `@react-pdf/renderer`
- **Export Excel** : ExcelJS
- **Tests** : Vitest

## Flux de données

```
CSV (Latin-1) → csv-parser.ts → ranking-engine.ts → UI React
                                                    → SQLite (historique, via IPC)
                                                    → export-data.ts → pdf-export.tsx / excel-export.ts
```

Le parseur CSV (`src/lib/csv-parser.ts`) et le moteur de calcul (`src/lib/ranking-engine.ts`) sont indépendants de React et testés unitairement.

## Architecture IPC

Le process **main** Electron (`electron/main.ts`) possède la base SQLite (`src/lib/db.ts`) et enregistre les handlers IPC (`electron/ipc-handlers.ts`). Le **renderer** (React) n'accède jamais directement à SQLite : il passe par l'API exposée dans `electron/preload.ts` via `contextBridge`, sur la fenêtre globale `window.electronAPI`. Les noms de canaux sont centralisés dans `electron/ipc-channels.ts` pour éviter toute divergence entre les deux côtés du bridge.

**Mouvements après un réimport** : `insertSwimmerResults` lit les lignes existantes avant toute écriture et, dans la même transaction, les range dans `import_snapshot` (un seul instantané par meeting : celui d'avant le dernier import qui a changé quelque chose). Un import qui laisse toutes les lignes identiques (même fichier redéposé) garde l'instantané en place, sinon flèches et résumé compareraient l'état actuel avec lui-même. Le canal `import:getSnapshot` le renvoie ; le renderer calcule lui-même les flèches (`rankMovements`) en reclassant l'instantané avec la catégorie, le top N et le seuil affichés, et le résumé de l'écran Import (`summarizeImportChanges`). L'instantané n'est pas inclus dans `BackupData` : après une restauration, il n'y a plus d'import précédent à comparer.

Le classement par équipes est calculé côté renderer (`useRanking` → `computeTeamRanking`) plutôt que via IPC : cela évite un aller-retour à chaque changement de top N ou de catégorie. Il n'est jamais stocké : la seule source est `swimmer_result`, et tout écran (y compris un futur historique) le recalcule à partir des résultats. Les exports PDF et Excel passent eux aussi par le renderer (`pdf-export.tsx`, `excel-export.ts`, `download.ts`), sans canal IPC.

## Meeting d'entraînement (issue #28)

Un meeting « Entraînement » (`meeting.is_demo = 1`) permet de répéter tout le parcours avant le jour J sans toucher aux vrais meetings.

- **Données** : `resources/meeting-exemple.csv`, version anonymisée de `test/fixtures/sample.csv`, produite par `scripts/anonymize-sample.ts` (`npm run anonymize-sample`, exécuté avec `node --experimental-strip-types`, sans dépendance). Noms et prénoms remplacés par des noms courants fictifs, de façon déterministe (même nageur → même identité fictive dans Dames/Messieurs et Mixte), avec le genre conservé ; clubs remplacés par des clubs fictifs sauf AS Cherbourg Natation ; années de naissance, places et points conservés (ex-aequo compris) ; format extraNat intact (Latin-1, `;`, `"1274 Pts"`). Toute valeur fictive présente dans le vrai fichier est écartée. Le fichier est versionné et embarqué dans le paquet (`build.files` de `package.json`) : aucun accès réseau. `test/demo-sample.test.ts` vérifie qu'aucun nom ou prénom réel n'y figure et que le fichier versionné correspond à la sortie du script.
- **Création** : canal `meeting:createDemo` → le main lit le fichier, le parse avec `parseCsv` (le vrai parseur) et appelle `resetDemoMeeting` (`src/lib/demo-meeting.ts`), qui supprime l'ancien meeting d'entraînement et en crée un nouveau dans une seule transaction : il n'y en a jamais qu'un.
- **Téléchargement** : canal `meeting:getDemoCsv` → octets bruts du fichier, téléchargés par le renderer (`downloadBlob`) pour s'exercer au glisser-déposer.
- **Sauvegardes** : exclu de `exportDatabase` (donc des sauvegardes automatiques, de l'export manuel et de la copie avant restauration). Un import dans ce meeting n'écrit pas de sauvegarde automatique (`isDemoMeeting` dans le handler `import:csv`) : chaque répétition ferait sinon sortir une vraie sauvegarde de la rotation.
- **Exports** : `buildExportMeta` renseigne `notice` (« EXEMPLE — non officiel ») pour ce meeting. Les trois PDF (équipes, individuel, déroulé de cérémonie) l'impriment au-dessus du titre via `PdfExportNotice` (`pdf-export-notice.tsx`), les deux Excel en première ligne via `addExportNotice` (`export-data.ts`). Couleur unique : `EXPORT_NOTICE_COLOR`.
- **Écran Import** : sur ce meeting, un avertissement rappelle que les résultats ne sont ni officiels ni sauvegardés.

## Sauvegarde et restauration (Phase 9)

### Flux de sauvegarde et restauration

```
SQLite (meeting, swimmer_result)
    ↓
exportDatabase() [src/lib/backup.ts]
    ↓
BackupData (JSON : version, appName, exportedAt, meetings[])
    ↓
Fichier .json sur disque
    ↓
validateBackup() [src/lib/backup-validation.ts]
    ↓  (confirmation)
restoreWithSafetyCopy() [electron/pre-restore-backup.ts]
    ├─ si la base contient des meetings réels : exportDatabase() → mdlm-pre-restore-<horodatage>.json dans le dossier de sauvegarde
    │   (échec → restauration annulée, message en français, base intacte)
    ↓
restoreDatabase() [src/lib/backup.ts]
    ↓
SQLite (remplacement complet — tous les meetings existants sont supprimés avant l'insertion des meetings du fichier)
```

### Copie de sécurité avant restauration

Une restauration supprime tous les meetings, y compris ceux absents du fichier (et leurs `import_snapshot` en cascade). Avant de l'exécuter, le handler `backup:confirm-import` appelle `restoreWithSafetyCopy` (`electron/pre-restore-backup.ts`) : la base actuelle est écrite via `exportDatabase` dans `mdlm-pre-restore-<horodatage>.json`, dans le dossier de sauvegarde configuré (`backupDir`, créé si besoin). Si la lecture de la config ou l'écriture échoue, une erreur en français est levée avant tout appel à `restoreDatabase` : la base n'est pas modifiée. En cas de succès, le chemin de la copie (`safetyCopyPath`) est renvoyé au renderer, qui l'affiche. Si la base ne contient aucun meeting (installation neuve, reprise après sinistre), il n'y a rien à protéger : aucune copie n'est faite, le dossier n'est même pas lu, et `safetyCopyPath` vaut `null`. Sinon, un `backup-config.json` pointant vers un dossier absent ou corrompu empêcherait justement la restauration dont on a besoin. Le module n'importe pas `electron` (le dossier est fourni par un callback) pour rester testable sous Vitest.

Ces copies ne font **pas** partie de la rotation : `rotateBackups` ne supprime que les fichiers `mdlm-auto-backup-*`. Une restauration est rare et c'est la seule façon de revenir en arrière après un mauvais fichier ; quelques imports CSV ne doivent pas la faire disparaître. Le bénévole les supprime lui-même s'il le souhaite.

### Sauvegardes automatiques

Les sauvegardes automatiques s'exécutent dans `electron/auto-backup.ts` après chaque import CSV réussi (fin de `insertSwimmerResults` dans le handler `import:csv`). `performAutoBackup` ne lève jamais mais renvoie le message d'erreur (ou `null`) : le handler `import:csv` le renvoie au renderer (`{ backupError }`), qui l'affiche dans l'encart « À savoir » ; la sauvegarde est donc attendue, plus différée. Le nombre de sauvegardes conservées est d'au moins 3 (`MIN_BACKUPS`) : un mauvais fichier réimporté plusieurs fois ne doit pas faire tourner toutes les bonnes sauvegardes. Pas de sauvegarde avant import : les résultats ne changent que par import, donc la sauvegarde du dernier import contient déjà l'état qu'un nouvel import va écraser. Elles ne bloquent jamais l'import : un échec est journalisé, renvoyé au renderer et affiché, mais l'import déjà écrit reste valide (`performAutoBackup` enveloppe le code dans un try/catch).

La configuration des sauvegardes (`backupDir` et `maxBackups`) est stockée dans un fichier JSON distinct (`backup-config.json`) sous `app.getPath('userData')`, en dehors de SQLite. Cela garantit que la config survit à une restauration complète de la base (la restauration ne touche que les tables SQLite, pas le système de fichiers Electron).

**Compatibilité des fichiers** : le champ `teamRankings` des sauvegardes n'est plus lu (classements recalculés, voir plus haut). Une ancienne sauvegarde qui en contient se restaure normalement, le champ est ignoré. Les nouvelles sauvegardes l'écrivent toujours, vide (`[]`), parce que les versions précédentes de l'app exigent ce tableau : elles peuvent ainsi relire une sauvegarde faite par cette version.

### Canaux IPC pour backup/restore

Canaux IPC de `electron/ipc-channels.ts` :

- `backup:export` — exporte la base entière en JSON
- `backup:import` — valide un fichier JSON importé
- `backup:confirm-import` — écrit la copie de sécurité `mdlm-pre-restore-*.json` (si la base contient des meetings), puis restaure ; renvoie `{ result, safetyCopyPath }` (`null` sans copie)
- `backup:cancel-import` — libère l'import en attente côté main quand l'utilisateur annule l'aperçu
- `backup:get-config` — charge la config de sauvegarde automatique
- `backup:set-config` — enregistre la config de sauvegarde automatique
- `backup:choose-dir` — ouvre un dialogue pour sélectionner le dossier de sauvegarde ; renvoie `{ success: true, path }` (`path` vaut `null` si le bénévole annule) ou `{ success: false, error }` si le dialogue échoue, pour ne pas confondre une erreur avec une annulation

## Configuration Electron

La fenêtre principale (`BrowserWindow`) est configurée avec `autoHideMenuBar: true` — la barre de menus native est cachée par défaut et accessible via la touche Alt. Le layout utilise une sidebar en position `fixed` et un header `sticky` : seul le contenu principal (`<main>`) défile, la sidebar et le header restent visibles en permanence.

## Versioning, installeur et auto-update (Phase 10)

- **Versioning automatique** : `release-please` lit les commits Conventional Commits sur `main` et maintient une PR de release qui bump `package.json` et `CHANGELOG.md`. Fusionner cette PR crée le tag, la GitHub Release et le changelog automatiquement — plus de bump manuel.
- **Garde-fous Conventional Commits** (condition dont dépend le calcul de version) : `commitlint` (hook Husky `commit-msg`, config `commitlint.config.js`) bloque localement tout commit non conforme ; `.github/workflows/commitlint-pr.yml` vérifie en CI le **titre de chaque PR**, car les PR sont fusionnées en squash et c'est ce titre qui devient le commit lu par `release-please` sur `main`.
- **Build & publication** : un seul workflow, `.github/workflows/release-please.yml`, à deux jobs. Le job `release-please` crée ou met à jour la PR de release ; quand une release vient d'être créée (sortie `release_created`), le job `build-windows` (Node 24) se place sur le tag, construit l'installeur (`npm run build:win -- --publish never`) et attache `.exe`, `latest.yml` et `.blockmap` à cette release. Les deux étapes sont dans le même workflow parce qu'une release publiée avec le `GITHUB_TOKEN` par défaut ne déclenche aucun autre workflow : un workflow séparé `on: release` ne se lancerait jamais.
- **Installeur** : NSIS personnalisé (`build.nsis` dans `package.json`) — choix du dossier d'installation, raccourci bureau, pas de mode one-click. Le fichier s'appelle `MDLM-Ranking-Setup-<version>.exe` (`artifactName`), sans espace : `electron-builder` écrit dans `latest.yml` un nom où les espaces deviennent des tirets, alors que GitHub remplace les espaces par des points dans le nom des fichiers attachés à une release. Avec des espaces, le fichier désigné par `latest.yml` n'existerait donc jamais sur la release et chaque téléchargement de mise à jour échouerait. Pas de signature de code (déploiement à un seul poste non technique) ; l'avertissement SmartScreen est accepté.
- **Auto-updater in-app** : `electron/auto-updater.ts` (`electron-updater`) vérifie les mises à jour une fois au démarrage, télécharge silencieusement, et notifie le renderer via le canal IPC `update:downloaded` (main → renderer). Le composant `UpdateToast` (`src/components/layout/UpdateToast.tsx`, monté dans `AppShell`) propose "Redémarrer maintenant" — le renderer invoque alors le canal `update:quitAndInstall` (renderer → main), qui appelle `autoUpdater.quitAndInstall()` — ou "Plus tard" : dans ce cas, `autoInstallOnAppQuit` installe la mise à jour à la prochaine fermeture naturelle de l'app.
- **Suivi des vérifications** : chaque vérification (au démarrage, 5 s après l'ouverture, ou à la demande depuis Paramètres) se termine par un statut `UpdateStatus` — `up-to-date`, `downloaded` (seulement une fois le téléchargement terminé) ou `failed` avec un message court — produit par `runCheck()` dans `auto-updater.ts`, qui ne rejette jamais : un échec de vérification comme de téléchargement devient un statut `failed`. `electron/update-state.ts` écrit ce statut dans `update-status.json` et ajoute une ligne (date ISO, résultat, erreur complète aplatie, 500 caractères max) à `update-log.txt`, tous deux sous `app.getPath('userData')`. Le journal ne garde que les 200 dernières lignes (`src/lib/update-log.ts`) : une ligne par lancement couvre plusieurs saisons de meetings pour une taille maximale d'environ 100 Ko, sans rotation de fichiers. Un fichier de statut absent ou illisible vaut « jamais vérifié » (`parseUpdateStatus`), donc aucune migration n'est nécessaire. Hors ligne au démarrage, aucun toast : c'est le cas normal au bord du bassin, le statut est seulement visible dans Paramètres. Canaux IPC (renderer → main) : `update:getStatus` (dernier statut mémorisé, ou `null` ; si une vérification est en cours, attend et renvoie son résultat pour ne jamais afficher un statut périmé) et `update:checkNow` (lance une vérification, ou réutilise celle en cours, et renvoie le statut une fois la vérification et l'éventuel téléchargement terminés). Les libellés français du statut viennent de `src/lib/update-status.ts`.

## Organisation des dossiers

```
├── CLAUDE.md                      # Porte d'entrée IA : résumé, règles, liens (pas d'arborescence)
├── README.md                      # Présentation, installation, commandes, liens
├── .ai/                           # Règles de collaboration IA (conventions, PR, tests, revue…)
├── electron/
│   ├── main.ts                    # Process principal Electron
│   ├── preload.ts                 # Context bridge IPC
│   ├── ipc-handlers.ts            # Handlers filesystem + SQLite
│   ├── ipc-channels.ts            # Noms de canaux IPC partagés
│   ├── auto-backup.ts             # Sauvegarde automatique après import CSV, avec rotation (sauf meeting d'entraînement)
│   ├── pre-restore-backup.ts      # Copie de sécurité de la base avant une restauration
│   ├── auto-updater.ts            # Vérification et téléchargement des mises à jour
│   └── update-state.ts            # Statut de la dernière vérification et journal borné (userData)
├── src/
│   ├── main.tsx                   # Point d'entrée React
│   ├── App.tsx                    # Routeur principal
│   ├── lib/                       # Logique pure, indépendante de React
│   │   ├── csv-parser.ts          # Parseur CSV FFN extraNat
│   │   ├── csv-cells.ts           # Lecture des cellules numériques (points, place, année de naissance)
│   │   ├── csv-row.ts             # Lecture et validation d'une ligne du CSV (gardée, ignorée ou écartée)
│   │   ├── ranking-engine.ts      # Classement par équipes
│   │   ├── rank-ties.ts           # Rangs ex-aequo, détection des égalités sur le podium
│   │   ├── individual-ranking.ts  # Classement individuel, détection du genre
│   │   ├── fun-awards.ts          # Prix rigolos du palmarès
│   │   ├── ceremony-script.ts     # Déroulé de cérémonie (buildCeremonyScript) : annonces dans l'ordre, à rebours
│   │   ├── ceremony-plan.ts       # Préparation : blocs cochés et leur ordre → options du déroulé
│   │   ├── ceremony-navigation.ts # Progression : annonce courante, annonces affichées/faites/sautées, filtre des raccourcis clavier
│   │   ├── ceremony-session.ts    # Déroulé figé au lancement, relu depuis sessionStorage
│   │   ├── ceremony-warnings.ts   # Points à vérifier avant la cérémonie (ex æquo, import ancien, catégorie vide)
│   │   ├── ceremony-labels.ts     # Textes du déroulé (intitulés, progression, écarts, alertes)
│   │   ├── ceremony-pdf-export.tsx # Fiche de proclamation PDF (même déroulé que l'écran)
│   │   ├── db-schema.ts           # Schéma SQLite et migrations
│   │   ├── db.ts                  # Opérations CRUD SQLite
│   │   ├── demo-meeting.ts        # Meeting d'entraînement : création/réinitialisation, détection
│   │   ├── import-snapshot.ts     # Instantané des résultats d'avant le dernier import (table import_snapshot)
│   │   ├── import-check.ts        # Alertes avant import : fichier identique, export incomplet, autre meeting
│   │   ├── import-card-state.ts   # Carte de l'écran Import : masquée, en cours ou importé (jamais de coche sans enregistrement)
│   │   ├── import-run.ts          # Écarte le résultat d'un import lancé avant un changement de meeting
│   │   ├── import-diff.ts         # Mouvements de rang et résumé des changements entre deux imports
│   │   ├── backup.ts              # Export/restauration complète de la base en JSON
│   │   ├── backup-validation.ts   # Types de sauvegarde et validation d'un fichier externe
│   │   ├── export-data.ts         # Métadonnées et helpers pour les exports
│   │   ├── pdf-export.tsx         # PDF du classement par équipes
│   │   ├── pdf-export-notice.tsx  # Mention « EXEMPLE — non officiel » en tête des PDF (meeting d'entraînement)
│   │   ├── excel-export.ts        # Excel du classement par équipes
│   │   ├── individual-pdf-export.tsx   # PDF du classement individuel
│   │   ├── individual-excel-export.ts  # Excel du classement individuel
│   │   ├── download.ts            # Déclenchement du téléchargement navigateur
│   │   ├── export-feedback.ts     # Messages de succès et d'échec des exports PDF/Excel
│   │   ├── backup-config-messages.ts # Messages d'erreur de la configuration des sauvegardes automatiques
│   │   ├── focus-trap.ts          # Focus des modales : Tab suivant, retour au déclencheur
│   │   ├── update-status.ts       # Statut de la dernière vérification de mise à jour et libellés français
│   │   ├── update-log.ts          # Ligne du journal des mises à jour et troncature aux 200 dernières lignes
│   │   ├── ui-labels.ts           # Libellés et valeurs d'affichage dérivés des données
│   │   └── utils.ts               # Helpers (formatPoints, cn, etc.)
│   ├── hooks/
│   │   ├── use-meeting.ts         # Meetings : liste, création, mise à jour, suppression
│   │   ├── use-meeting-rows.ts    # Lignes nageurs d'un meeting (cache)
│   │   ├── use-previous-rows.ts   # Résultats d'avant le dernier import (instantané), pour les flèches de mouvement
│   │   ├── use-import.ts          # Import CSV (parse, aperçu, persistance)
│   │   ├── use-ranking.ts         # Classement par équipes (catégorie, top N, recherche)
│   │   ├── use-ranking-export.ts  # Exports PDF/Excel du classement par équipes
│   │   ├── use-individual-export.ts # Exports PDF/Excel du classement individuel
│   │   ├── use-ceremony.ts        # Écran Cérémonie : préparation, déroulé figé, progression, confirmation de sortie
│   │   ├── use-ceremony-export.ts # Impression PDF du déroulé de cérémonie
│   │   ├── use-ceremony-shortcuts.ts # Raccourcis clavier du déroulé (← → espace), interceptés hors champs et modales
│   │   ├── use-export-status.ts   # État commun des exports (en cours, succès, échec)
│   │   ├── use-modal-keyboard.ts  # Échap, piège à focus et restitution du focus des modales
│   │   ├── use-app-version.ts     # Version de l'app
│   │   ├── use-auto-update.ts     # Notification de mise à jour téléchargée
│   │   └── use-update-status.ts   # Section « Mises à jour » de Paramètres (statut, vérification à la demande)
│   ├── components/
│   │   ├── layout/                # AppShell, Sidebar, SidebarMeetingCard, PageHeader, FilterBar, UpdateToast
│   │   ├── meeting/               # MeetingCard, MeetingList, MeetingForm, ResumeMeetingCard, DeleteMeetingDialog,
│   │   │                          # TrainingSection
│   │   ├── import/                # DropZone, StatTile, ImportChanges, ImportGuardDialog, ImportRemovalNotice,
│   │   │                          # DemoImportWarning
│   │   ├── ranking/               # TeamRankingTable, TeamRow, SwimmerDetail, CategoryTabs, RankingToolbar,
│   │   │                          # PodiumCards, ExportActions, ExportFeedback, ComparisonUnavailableNote,
│   │   │                          # IndividualRankingTable, FunAwardsGrid
│   │   ├── ceremony/              # CeremonyPreparation, CeremonyBlockList, CeremonyRun, CeremonyStepCard, CeremonyStepList, LeaveCeremonyDialog
│   │   ├── settings/              # SettingsForm, BackupSection, BackupConfigSection, UpdateSection
│   │   └── ui/                    # Button, Segmented, SearchField, ImportPendingBadge, DemoBadge, RankChip, ClubTag,
│   │                              # MovementBadge
│   ├── pages/                     # HomePage, ImportPage, RankingPage, IndividualPage, PalmaresPage, CeremonyPage, SettingsPage
│   ├── styles/
│   │   ├── globals.css            # Tailwind base + custom properties (tokens)
│   │   └── fonts.css              # Déclarations @font-face (polices embarquées)
│   └── assets/fonts/              # Barlow / Barlow Condensed (.woff2), embarquées hors ligne
├── test/                          # Tests Vitest : un fichier par module de src/lib et electron, plus les
│   │                              # garde-fous design-tokens, no-legacy-tokens et docs-architecture
│   └── fixtures/                  # sample.csv (vrai CSV Latin-1), expected-ranking.json, CSV d'essais manuels
├── scripts/
│   └── anonymize-sample.ts        # Génère resources/meeting-exemple.csv à partir de sample.csv
├── resources/
│   ├── icon.png
│   └── meeting-exemple.csv        # CSV d'exemple anonymisé (meeting d'entraînement), embarqué
└── docs/
    ├── architecture.md            # Ce fichier
    ├── screens.md
    ├── data-model.md
    ├── design-system.md
    ├── algorithms.md
    └── archive/                   # Specs et plans des phases terminées (historique figé, ne pas mettre à jour)
```
