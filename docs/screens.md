# Écrans

> Décrit chaque écran tel qu'il existe actuellement (design « Tableau de bassin », Phase 11). Mis à jour à chaque phase.

## Barre latérale

Fixe à gauche (`w-sidebar`, 248px), fond `marine`, présente sur tous les écrans (`Sidebar.tsx` dans `AppShell.tsx` — il n'y a plus de barre d'en-tête séparée, elle a été retirée en Phase 11).

- Logo/nom de l'app en haut.
- Carte du meeting courant (`SidebarMeetingCard`) : nom + `ImportPendingBadge` (si rien n'est importé) sur fond `marine-raised` ; état vide en pointillés quand aucun meeting n'est ouvert.
- Sections de navigation à plat : Meetings, Données (Import), Résultats (Classement, Individuels, Palmarès), Paramètres.
- Les entrées Données/Résultats restent visibles mais grisées/désactivées tant qu'aucun meeting n'est ouvert (plutôt que masquées, pour que le bénévole sache qu'elles existent).
- L'entrée « Import CSV » affiche une coche verte (`bg-success-bright`) dès que des résultats ont été importés (`resultCount > 0`).
- Numéro de version de l'app en pied de sidebar (`useAppVersion`).

## Accueil (`/`)

- `PageHeader` en tête.
- Carte « Reprendre » (`ResumeMeetingCard`, fond `marine`) mettant en avant le dernier meeting ouvert, avec les mêmes clubs, nageurs et dernier import, et accès direct à l'import ou au classement.
- Deux colonnes : « Tous les meetings » (`MeetingList` / `MeetingCard`, une ligne cliquable pleine largeur par meeting avec `ImportPendingBadge` (si rien n'est importé) et, une fois importé, nombre de clubs et de nageurs uniques (`meetingStatsLabel`) puis date et heure du dernier import (`lastImportLabel`, `formatMeetingImportedAt`) et un bouton corbeille qui ouvre `DeleteMeetingDialog` : avertissement, puis saisie du nom exact du meeting pour activer « Supprimer définitivement ») et « Nouveau meeting » (`MeetingForm`, toujours visible, plus de bascule créer/annuler) avec une liste numérotée des 3 étapes suivantes.
- Seul le nom du meeting est demandé à la création (pas de date ni de lieu — retirés du modèle de données ; la carte affiche la date de création à titre indicatif).
- Clic sur une carte existante ou sur « Reprendre » navigue vers Import ou Classement selon l'état du meeting.

## Import (`/import`)

- `PageHeader` (surtitre = nom du meeting, titre « Importer les résultats »).
- Avant import : zone de dépôt (`DropZone`) drag & drop ou sélection, bouton « Parcourir… ». Si le meeting a déjà des résultats (nouvelle session sur un meeting existant), un rappel (`resultCountLabel`) s'affiche au-dessus.
- Garde-fou avant écrasement : si le meeting a déjà des résultats, le fichier est comparé à la base **avant toute écriture** (`checkImportAgainstExisting`). Une alerte bloquante ouvre `ImportGuardDialog` (« Ce fichier est-il le bon ? », bouton « Annuler » par défaut, « Importer quand même ») : fichier identique au dernier import, catégorie qui perd plus de 20 % de ses nageurs, ou moins de la moitié de nageurs en commun. Une catégorie absente du fichier est signalée dans la modale mais ne la déclenche pas seule (elle est conservée). Annuler efface le fichier lu et ne touche pas la base.
- Après import réussi : carte de succès (coche verte, nom du fichier), trois tuiles de statistiques (`StatTile`) — nageurs, clubs, catégories (avec puces par catégorie, `categoryShortLabel`) — et un bouton principal « Voir le classement ». La zone de dépôt se réduit alors à une version compacte horizontale (« Nouvelle version du fichier ? »).
- Après un réimport : encart « Depuis l'import du 27 sept. 2026 à 14 h 32 » (`ImportChanges`) avec « +12 nageurs · −1 nageur · 38 résultats modifiés · 3 clubs ont changé de rang » (lien « Voir le classement » si des clubs ont bougé), ou « Aucun changement par rapport à l'import précédent. ». Les clubs sont comptés pour la catégorie Mixte (sinon la première) avec le top N du meeting. Rien au premier import d'un meeting.
- Avertissements et détails techniques (encodage, délimiteur, nombre de lignes) repliés dans un `<details>`, fermé par défaut.
- Persistance des lignes parsées en base via IPC (`insertSwimmerResults`).

## Classement (`/classement`)

- `PageHeader` avec les exports en actions : bouton Excel (secondaire) et bouton PDF (principal).
- Barre de filtres (`RankingToolbar`, sur `FilterBar`) : onglets de catégorie (`CategoryTabs`, limités aux catégories actives configurées dans Paramètres), sélecteur du nombre de nageurs retenus par club (top N, `Segmented`), recherche par nom de club (`SearchField`).
- Podium (`PodiumCards`) : les 3 premiers clubs, ordre gauche-à-droite 1‑2‑3, carte du 1er en `marine` mise en avant, écart par rapport au leader (`formatGap`).
- Tableau des clubs (`TeamRankingTable` / `TeamRow`) : Rang (`RankChip`), Club (+ `ClubTag` « Notre club » pour AS Cherbourg Natation, teinte corail sur toute la ligne), Nageurs retenus (« N retenus sur M », `formatRetainedSwimmers`), Écart, Points avec barre de progression par rapport au leader. Après un réimport, `MovementBadge` à côté du rang : `↑2` (`success`), `↓1` (`corail-strong`), pastille « + » pour une entrée nouvelle (infobulle « Nouveau dans le classement » ; omise quand plus de la moitié des lignes sont nouvelles) ; rien si le rang est stable ou s'il n'y a pas d'import précédent. Calculé pour la catégorie et le top N affichés ; absent des exports PDF/Excel.
- Ligne entière cliquable pour déplier/replier le détail des nageurs (`SwimmerDetail`) ; chevron dédié, accessible au clavier (Tab), cible ≥44px.

## Individuels (`/individuels`)

- `PageHeader` (surtitre = nom du meeting, sous-titre = catégorie + nombre de nageurs), actions Excel/PDF.
- `FilterBar` : `CategoryTabs` (catégories actives) + `SearchField` (recherche par nom ou club, alignée à droite).
- Classement par points des nageurs de la catégorie active (`IndividualRankingTable`, rang recalculé par catégorie) : Rang (`RankChip`, couleurs médaille pour le top 3), Nom, Année de naissance, Club (+ `ClubTag` pour ASCN), Points (`font-display`, `formatPoints`).
- `MovementBadge` à côté du rang après un réimport (même règles que sur le Classement, par catégorie affichée ; absent des exports).
- Pastille corail « 1er Prix » / « 2e Prix » pour les nageurs de rang 1 et 2 (ex-aequo inclus). Rang partagé : marqueur « ex. » ; bandeau corail si l'égalité touche un prix ou le podium équipes.
- Lignes `h-14` (≥56px), en-tête `h-11`.

## Palmarès (`/palmares`)

- `PageHeader` avec `CategoryTabs` en action (filtrage par catégorie).
- Grille de 6 cartes (`FunAwardsGrid`), une par récompense humoristique (Le Doyen, La Relève, Duo Mixte, Photo-Finish, Le Club des Sages / Le Club des Grandes Dames selon la catégorie, La Jeune Garde) : icône Lucide colorée dans un badge rond (pas d'emoji), nom du gagnant, description.
- Calcul entièrement automatique à partir des résultats de la catégorie active (`computeFunAwards`).

## Paramètres (`/parametres`)

Toujours accessible depuis la sidebar, même sans meeting ouvert — c'est le seul moyen de restaurer une sauvegarde sur une installation neuve, avant qu'aucun meeting n'existe.

- Formulaire de configuration du meeting (`SettingsForm`) : nom. N'apparaît que si un meeting est ouvert.
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
