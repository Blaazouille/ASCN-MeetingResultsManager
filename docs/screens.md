# Écrans

> Décrit chaque écran tel qu'il existe actuellement. Mis à jour à chaque phase.

## Accueil (`/`)

- Liste des meetings existants (`MeetingList` / `MeetingCard`).
- Bouton pour créer un nouveau meeting (`MeetingForm`) : seul le nom est demandé, la base ne retient ni date de meeting ni lieu (ces champs ont été retirés du modèle de données — la carte affiche la date de création à la place, à titre indicatif).
- Clic sur une carte pour ouvrir un meeting (le charge en contexte partagé et navigue vers Import ou Classement selon l'état).

## Import (`/import`)

- Drag & drop ou sélection d'un fichier CSV FFN extraNat (`DropZone`).
- Parsing côté renderer, preview des lignes et des catégories détectées.
- Persistance des lignes parsées en base via IPC (`insertSwimmerResults`).

## Classement (`/classement`)

- Tableau des clubs classés par équipe (`TeamRankingTable` / `TeamRow`) : cliquer sur une ligne déplie/replie le détail des nageurs (`SwimmerDetail`).
- Onglets de filtrage par catégorie (`CategoryTabs`), limités aux catégories actives configurées dans Paramètres (`resolveActiveCategories`).
- Sélecteur du nombre de nageurs retenus par club (top N — `RankingToolbar`), initialisé depuis le top N par défaut du meeting.
- Badge de statut du meeting (provisoire/définitif).
- Recherche par nom de club.
- Export PDF et export Excel du classement affiché.

## Individuels (`/individuels`)

- Classement global par points, tous nageurs confondus (multi-catégories).
- Onglets de filtrage par genre (`Tous`, `Dames`, `Messieurs`), détection automatique du genre par le parseur.
- Tableau (`TeamRankingTable` ou similaire) : Rang, Nom, Année de naissance, Club, Points, Catégorie.
- Badges pour les 2 premiers nageurs : `1er Prix` et `2e Prix` (par genre dans les vues filtrées, globaux en `Tous`).
- Recherche par nom ou club (même logique que le classement par équipes).
- Section "Palmarès des rigolos" en bas (visible uniquement en vue `Tous`) : affiche les 6 fun awards (doyen, relève, loup-solitaire, photo-finish, régulier, armada) avec descriptions humoristiques.

## Paramètres (`/parametres`)

Toujours accessible depuis la sidebar, même sans meeting ouvert — c'est le seul moyen de restaurer une sauvegarde sur une installation neuve, avant qu'aucun meeting n'existe.

- Formulaire de configuration du meeting (`SettingsForm`) : nom, statut. N'apparaît que si un meeting est ouvert.
- Règles de calcul : top N par défaut, catégories actives, seuil minimum de nageurs par club.

### Sauvegarde et restauration

- Export complet de la base de données en fichier JSON (`BackupData`) : enregistrement du nom du meeting, des nageurs et des classements.
- Import = restauration à l'identique : la base est remplacée entièrement par le contenu du fichier, exactement comme elle était au moment de l'export. Tous les meetings actuellement présents sont supprimés au profit de ceux du fichier, y compris un meeting créé après la sauvegarde et absent du fichier — ce n'est pas une fusion.
- Aperçu préalable avant d'écrire la base : nombre de meetings et de lignes de résultats dans le fichier (une ligne par nageur et par catégorie — un nageur compte donc plusieurs fois s'il apparaît en Dames/Messieurs et en Mixte), et nombre de meetings actuellement dans la base qui seront supprimés. Confirmation explicite requise.

### Sauvegardes automatiques

- Dossier de sauvegarde configurable (bouton parcourir), par défaut `Documents/MDLM Ranking/Sauvegardes` — un emplacement que le bénévole sait déjà retrouver, contrairement au dossier de données d'Electron. Ce choix est stocké dans `backup-config.json` sous `app.getPath('userData')`.
- Nombre maximal de sauvegardes conservées (entrée numérique, par défaut 5) : les fichiers les plus anciens sont supprimés lors du dépassement de cette limite.
- Les sauvegardes automatiques s'exécutent silencieusement après chaque import CSV réussi et ne bloquent jamais l'import en cas d'erreur — tout défaut de sauvegarde est journalisé mais l'import continue.

**Note** : l'écran Impression a été retiré (Phase 6) — les exports PDF et Excel depuis l'écran Classement couvrent ce besoin.
