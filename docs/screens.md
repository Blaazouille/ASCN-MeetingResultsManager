# Écrans

> Décrit chaque écran tel qu'il existe actuellement (design « Tableau de bassin », Phase 11). Mis à jour à chaque phase.

## Barre latérale

Fixe à gauche (`w-sidebar`, 248px), fond `marine`, présente sur tous les écrans (`Sidebar.tsx` dans `AppShell.tsx` — il n'y a plus de barre d'en-tête séparée, elle a été retirée en Phase 11).

- Logo/nom de l'app en haut.
- Carte du meeting courant (`SidebarMeetingCard`) : nom + `ImportPendingBadge` (si rien n'est importé) sur fond `marine-raised` ; état vide en pointillés quand aucun meeting n'est ouvert.
- Sections de navigation à plat : Meetings, Données (Import), Résultats (Classement, Individuels, Palmarès, Cérémonie), Paramètres.
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
- Erreurs de fichier (non CSV, illisible, sans ligne exploitable) : affichées **dans la zone de dépôt** (`DropZone`, bordure et fond rouges, icône d'alerte, `role="alert"`) et la zone « tremble » à chaque nouvelle erreur, même si le message est identique (Web Animations API, désactivé si l'OS demande de réduire les animations).
- Fichier sans ligne exploitable (en-tête seul, colonne `points` absente) : erreur « Aucune ligne exploitable… », rien n'est importé.
- Après import réussi : carte de succès (coche verte, nom du fichier), trois tuiles de statistiques (`StatTile`) — nageurs, clubs, catégories (avec puces par catégorie, `categoryShortLabel`) — et un bouton principal « Voir le classement ». La zone de dépôt se réduit alors à une version compacte horizontale (« Nouvelle version du fichier ? »).
- Encart « À savoir » (`role="status"`) sous la carte de succès : alertes non bloquantes (catégorie absente du fichier), échec de la sauvegarde automatique, lignes sans points non importées, nageurs en double dans une catégorie (seul le dernier est gardé), résumé des changements non calculable. Un échec après l'enregistrement n'est jamais présenté comme un échec d'import.
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

## Cérémonie (`/ceremonie`)

Antisèche du gérant pour la remise des prix, sur son poste uniquement : pas de plein écran, de second écran ni d'affichage public (hors périmètre).

- `PageHeader` avec « Imprimer le déroulé » (secondaire) et « Lancer le déroulé » (principal) ; pendant le déroulé, « Revenir à la préparation » remplace le bouton principal.
- **Préparation** (`CeremonyPreparation`) :
  - « Ordre des annonces » (`CeremonyBlockList`) : trois blocs à cocher et à réordonner avec des boutons Monter / Descendre (≥44px) — par défaut Palmarès des rigolos, Prix individuels (1er et 2e Prix), Classement par équipes. Chaque bloc couvre les catégories actives l'une après l'autre.
  - « Places annoncées par équipes » (`Segmented`) : 3 (défaut), 5 ou 10.
  - « À vérifier avant de commencer » : ex æquo sur une place annoncée, dernier import de plus de 30 minutes, catégorie active sans rien à annoncer. Sinon « Rien à signaler. »
  - « Aperçu » : la liste numérotée des annonces telles qu'elles seront lancées.
- **Déroulé** (`CeremonyRun`) : figé au lancement (un réimport ne change pas l'ordre en cours) et conservé dans `sessionStorage` pour survivre à un passage par un autre écran. Bandeau corail si des résultats plus récents ont été importés depuis.
  - « Annonce 7 / 18 » et barre de progression.
  - Carte de l'annonce (`CeremonyStepCard`, `font-display` en grand) : contexte (« Classement par équipes · Mixte »), intitulé (« 3e place », « 1er Prix », « La Doyenne », avec `RankChip`), nom à lire (+ `ClubTag` pour notre club), club et points, nageurs à appeler pour une équipe, écart avec la place suivante. Les ex æquo sont sur la même carte, annoncés ensemble.
  - Précédent / Suivant (`h-12`) ; « Terminer » sur la dernière annonce. Clavier : → ou espace pour la suivante, ← pour la précédente.
  - Liste latérale (`CeremonyStepList`) : annonces faites cochées, annonce courante en `marine`, clic pour y aller.
- Fiche PDF (`ceremony-pdf-export.tsx`) : les mêmes étapes, dans le même ordre (l'aperçu avant le lancement, le déroulé figé ensuite), en gros caractères avec une case à cocher par annonce.

## Paramètres (`/parametres`)

Toujours accessible depuis la sidebar, même sans meeting ouvert — c'est le seul moyen de restaurer une sauvegarde sur une installation neuve, avant qu'aucun meeting n'existe.

- Formulaire de configuration du meeting (`SettingsForm`) : nom. N'apparaît que si un meeting est ouvert.
- Règles de calcul : top N par défaut, catégories actives, seuil minimum de nageurs par club.

### Sauvegarde et restauration

- Export complet de la base de données en fichier JSON (`BackupData`) : enregistrement du nom du meeting, des nageurs et des classements.
- Import = restauration à l'identique : la base est remplacée entièrement par le contenu du fichier, exactement comme elle était au moment de l'export. Tous les meetings actuellement présents sont supprimés au profit de ceux du fichier, y compris un meeting créé après la sauvegarde et absent du fichier — ce n'est pas une fusion.
- Aperçu préalable avant d'écrire la base : nombre de meetings et de lignes de résultats dans le fichier (une ligne par nageur et par catégorie — un nageur compte donc plusieurs fois s'il apparaît en Dames/Messieurs et en Mixte), et nombre de meetings actuellement dans la base qui seront supprimés. Confirmation explicite requise.
- Copie de sécurité avant restauration : à la confirmation, si la base contient au moins un meeting, elle est d'abord enregistrée dans le dossier de sauvegarde sous le nom `mdlm-pre-restore-<horodatage>.json` (l'aperçu l'annonce). Sur une base vide (installation neuve), aucune copie n'est faite ni annoncée, pour qu'un dossier de sauvegarde inaccessible ne bloque pas la récupération des données. Après la restauration, le message de succès indique le chemin de la copie quand il y en a une ; l'importer annule la restauration. Si la copie ne peut pas être écrite, la restauration n'a pas lieu et un message demande de vérifier le dossier de sauvegarde. Ces copies ne sont jamais supprimées par la rotation des sauvegardes automatiques.

### Sauvegardes automatiques

- Dossier de sauvegarde configurable (bouton parcourir), par défaut `Documents/MDLM Ranking/Sauvegardes` — un emplacement que le bénévole sait déjà retrouver, contrairement au dossier de données d'Electron. Ce choix est stocké dans `backup-config.json` sous `app.getPath('userData')`.
- Nombre maximal de sauvegardes conservées (entrée numérique, par défaut 5, minimum 3 : une valeur plus basse est relevée à 3) : les fichiers les plus anciens sont supprimés lors du dépassement de cette limite.
- Les sauvegardes automatiques s'exécutent silencieusement après chaque import CSV réussi et ne bloquent jamais l'import en cas d'erreur : l'import continue et un échec de sauvegarde est signalé dans l'encart « À savoir » de l'écran Import.

### Mises à jour

- Version installée, date et heure de la dernière vérification (ligne masquée avant la première vérification, le statut indiquant alors « Pas encore vérifié »), et statut en français simple : « À jour », « Mise à jour prête — redémarrez l'application », « Impossible de vérifier (pas de connexion ?) » quand le poste est hors ligne, ou « La mise à jour a échoué. Réessayez plus tard. » pour un autre échec (release cassée, téléchargement interrompu), suivi d'une ligne « Détail : » avec le message technique court.
- Bouton « Vérifier maintenant » : affiche « Vérification en cours… » jusqu'à la fin de la vérification et de l'éventuel téléchargement, puis le nouveau statut.
- Hors ligne au démarrage, rien ne s'affiche ailleurs : pas de toast d'erreur, seulement ce statut. Le toast « Une mise à jour est prête. » reste réservé au téléchargement réussi.
- Chaque vérification est aussi consignée dans `update-log.txt` (200 dernières lignes) sous le dossier de données de l'application, pour diagnostiquer un échec à distance.

**Note** : l'écran Impression a été retiré (Phase 6) — les exports PDF et Excel depuis l'écran Classement couvrent ce besoin.
