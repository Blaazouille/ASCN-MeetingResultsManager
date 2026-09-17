# Écrans

> Décrit chaque écran tel qu'il existe actuellement. Mis à jour à chaque phase.

## Accueil (`/`)

- Liste des meetings existants (`MeetingList` / `MeetingCard`).
- Bouton pour créer un nouveau meeting (`MeetingForm`).
- Clic sur une carte pour ouvrir un meeting (le charge en contexte partagé et navigue vers Import ou Classement selon l'état).

## Import (`/import`)

- Drag & drop ou sélection d'un fichier CSV FFN extraNat (`DropZone`).
- Parsing côté renderer, preview des lignes et des catégories détectées.
- Persistance des lignes parsées en base via IPC (`insertSwimmerResults`).

## Classement (`/classement`)

- Tableau des clubs classés par équipe (`TeamRankingTable` / `TeamRow`), avec drill-down nageurs (`SwimmerDetail`).
- Onglets de filtrage par catégorie (`CategoryTabs`).
- Sélecteur du nombre de nageurs retenus par club (top N — `RankingToolbar`).
- Recherche par nom de club.
- Export PDF et export Excel du classement affiché.

## Paramètres (`/parametres`)

- Écran actuellement en placeholder. Accueillera la configuration du meeting (nom, date, lieu, statut) et les règles de calcul (top N par défaut, catégories).

**Note** : l'écran Impression a été retiré (Phase 6) — les exports PDF et Excel depuis l'écran Classement couvrent ce besoin.
