# Écrans

> Décrit chaque écran tel qu'il existe actuellement. Mis à jour à chaque phase.

## Accueil (`/`)

- Liste des meetings existants (`MeetingList` / `MeetingCard`).
- Bouton pour créer un nouveau meeting (`MeetingForm`) : seul le nom est obligatoire, la date est pré-remplie avec la date du jour (modifiable mais non obligatoire).
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

- Formulaire de configuration du meeting (`SettingsForm`) : nom, date, lieu, statut.
- Règles de calcul : top N par défaut, catégories actives, seuil minimum de nageurs par club.

### Sauvegarde et restauration

- Export complet de la base de données en fichier JSON (`BackupData`) : enregistrement du nom du meeting, de la date, des nageurs et des classements.
- Import depuis un fichier JSON avec aperçu préalable : affiche le nombre de meetings et de nageurs à importer, ainsi que le nombre de meetings existants dans la base (pour éviter les doublons par name/date).
- Confirmation explicite avant d'écrire la base — l'utilisateur voit les impacts potentiels avant validation.

### Sauvegardes automatiques

- Dossier de sauvegarde configurable (bouton parcourir) : stocké dans `backup-config.json` sous `app.getPath('userData')`.
- Nombre maximal de sauvegardes conservées (entrée numérique, par défaut 5) : les fichiers les plus anciens sont supprimés lors du dépassement de cette limite.
- Les sauvegardes automatiques s'exécutent silencieusement après chaque import CSV réussi et ne bloquent jamais l'import en cas d'erreur — tout défaut de sauvegarde est journalisé mais l'import continue.

**Note** : l'écran Impression a été retiré (Phase 6) — les exports PDF et Excel depuis l'écran Classement couvrent ce besoin.
