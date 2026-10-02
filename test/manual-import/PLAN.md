# Plan de test manuel : garde-fous à l'import (issue #22)

Les fichiers de ce dossier sont tous dérivés de `test/fixtures/sample.csv` (Latin-1, 421 lignes : Mixte 211, Dames 90, Messieurs 121 d'après l'export de référence).
`test/manual-import-files.test.ts` vérifie automatiquement que chaque fichier déclenche bien les alertes annoncées ci-dessous : si le seuil ou un message change, le test casse avant ce plan.

## Préparation

1. `npm run dev`.
2. Créer un meeting « Test garde-fous » (Accueil → Nouveau meeting) et l'ouvrir.
3. Paramètres → Sauvegardes automatiques : noter le dossier (par défaut `Documents\MDLM Ranking\Sauvegardes`), le vider, laisser le nombre à 5.
4. Pour chaque scénario : glisser le fichier dans la zone de dépôt de l'écran Import (ou « Parcourir… »).

**Remise à zéro** : après les scénarios C, D et I, réimporter `01-baseline.csv` (une confirmation peut s'afficher, l'accepter) pour retrouver l'état de départ. Les scénarios B, E, F, G et H annulés ne touchent pas la base.

## Scénarios d'import

| # | Fichier | Attendu | Écriture en base ? |
|---|---|---|---|
| A | `01-baseline.csv` (premier import) | **Pas de modale.** Carte « Fichier importé et enregistré », tuiles nageurs / clubs / catégories (3). Ni encart « Depuis l'import… » ni encart « À savoir ». 1 fichier de sauvegarde créé. | Oui |
| B | `02-identical.csv` | Modale « Ce fichier est-il le bon ? » : « Ce fichier est identique au dernier import (… à … h …). Rien ne changera. » **Annuler** a le focus. | Non tant que rien n'est confirmé |
| C | `03-corrected.csv` (10 scores +5 pts, 2 nageurs en moins) | **Pas de modale.** Encart « Avant d'importer » au-dessus de la zone de dépôt : « 2 nageurs absents du nouveau fichier seront retirés du classement Mixte. », « Importer » a le focus. Après « Importer » : encart « Depuis l'import du … » : 2 nageurs en moins, des résultats modifiés. « Annuler » ne touche pas la base. | Oui, après « Importer » |
| D | `04-partial-mixte-only.csv` (Mixte seul) | **Pas de modale.** Encart « À savoir » : « Le classement Dames n'est plus dans ce fichier : il est conservé tel quel. » et idem Messieurs. Les onglets Dames et Messieurs du Classement restent remplis. | Oui (Mixte seul) |
| E | `05-incomplete-export.csv` (Mixte réduit à 52) | Modale : « Ce fichier contient 52 nageurs en Mixte, contre 211 actuellement. Il pourrait s'agir d'un export incomplet. » et « 159 nageurs absents du nouveau fichier seront retirés du classement Mixte. » | Non tant que rien n'est confirmé |
| F | `06-other-meeting.csv` (tous les noms changés) | Modale : les nageurs retirés par catégorie (Dames 90, Messieurs 121, Mixte 211), puis « La plupart des nageurs de ce fichier sont différents de ceux déjà importés. S'agit-il bien du même meeting ? » | Non tant que rien n'est confirmé |
| G | `07-wrong-file-small.csv` (5 nageurs Mixte inconnus) | Modale avec 5 lignes : Dames absent, Messieurs absent (info), 5 nageurs en Mixte contre 211, 211 nageurs retirés du classement Mixte, nageurs différents. | Non tant que rien n'est confirmé |
| H | `08-header-only.csv`, puis `09-no-points-column.csv` | Message rouge **dans la zone de dépôt** (bordure et fond rouges, icône) « Aucune ligne exploitable dans ce fichier… », la zone tremble. Pas de carte de succès, pas de modale. | Non, aucune sauvegarde créée |
| I | `10-ignored-and-duplicates.csv` | **Pas de modale.** Encart « Avant d'importer » : « 3 nageurs absents du nouveau fichier seront retirés du classement Dames. », puis « Importer » : carte de succès + « À savoir » : « Lignes sans points, non importées : 3. » et « Nageurs en double dans une catégorie (seul le dernier est gardé) : 2. » Les 3 nageurs sans points disparaissent de la base (absents du fichier), c'est normal. | Oui |
| J | `11-not-a-csv.txt` | Même rendu rouge dans la zone : « Fichier non supporté (.csv attendu) ». Redéposer le même fichier fait trembler la zone à nouveau. | Non |

### Comportement de la modale (scénarios B, E, F, G)

Pour chacun, vérifier :

1. **Annuler** (touche Entrée sans rien faire d'autre) ou **Échap** : la modale se ferme, aucune carte de succès, la zone de dépôt reprend sa taille normale. Aller sur Classement : les résultats sont inchangés. Aucun nouveau fichier de sauvegarde.
2. **Importer quand même** : la carte de succès s'affiche avec l'encart « Depuis l'import… ». Pour G, l'encart « À savoir » ne répète que les alertes non bloquantes (les catégories absentes). Un nouveau fichier de sauvegarde apparaît dans le dossier.
3. **Clavier** : Tab / Maj+Tab restent dans la modale, le fond n'est pas atteignable.
4. **Tactile** : les deux boutons font au moins 44 px de haut, le texte reste lisible (pas de coupure moche, espace insécable avant « ? »).
5. Le message est en français, sans « recouvrement », « hash » ni autre jargon.

### Cas limites à enchaîner

- **Après un échec** : déposer `08-header-only.csv`, puis `01-baseline.csv` : l'erreur disparaît et la suite fonctionne.
- **Après une annulation** : annuler `05`, puis déposer `03-corrected.csv` : import normal, pas de reste de l'ancienne modale.
- **Quitter l'écran pendant l'encart** : déposer `03-corrected.csv` sur la base de départ, laisser l'encart « Avant d'importer » affiché, cliquer « Par équipes » dans la barre latérale puis revenir sur Import : l'encart est toujours là (pas de coche verte « Fichier importé et enregistré »), le Classement n'a pas changé. « Importer » met le focus sur la carte de résultat ; « Annuler » (ou Échap) le met sur « Parcourir… ».
- **Deuxième dépôt pendant l'encart** : encart « Avant d'importer » de `03-corrected.csv` affiché, déposer `01-baseline.csv` : à aucun moment une carte verte « Fichier importé et enregistré » n'apparaît pour `03-corrected.csv`.
- **Échec d'enregistrement puis aller-retour** (base verrouillée : ouvrir le fichier de la base dans DB Browser for SQLite et y laisser une modification non enregistrée, puis importer `03-corrected.csv` et cliquer « Importer ») : après « Échec de l'enregistrement : … », aller sur « Par équipes » puis revenir : le message d'échec est toujours là, aucune coche verte.
- **Quitter l'écran pendant l'enregistrement** : déposer un gros fichier, aller sur « Par équipes » aussitôt puis revenir : la carte indique « Enregistrement du fichier… » tant que ce n'est pas fini, puis la coche verte ; un dépôt fait avant la fin est ignoré.
- **Même fichier redéposé** : après C, déposer à nouveau `03-corrected.csv`, confirmer « Importer quand même » : l'encart « Depuis l'import du … » affiche toujours les 2 nageurs en moins (et non « Aucun changement »), et les flèches du Classement sont toujours là.
- **Autre meeting** : créer un 2ᵉ meeting vide, importer `06-other-meeting.csv` : **pas de modale** (premier import). Le meeting « Test garde-fous » n'est pas modifié.

## Sauvegardes

| # | Scénario | Attendu |
|---|---|---|
| K | Faire les scénarios A, C, D, I : compter les fichiers du dossier de sauvegarde. | 1 fichier par import réussi, aucun pour un import annulé ou refusé (B, E, F, G, H, J). Aucune sauvegarde faite avant l'import : le dernier fichier contient l'état du dernier import. |
| L | Paramètres : taper `1` dans « Nombre de sauvegardes automatiques conservées ». | La valeur remonte à 3. Enregistrer fonctionne, relancer l'app : 3 affiché. |
| M | Avec 3 conservées, faire 4 imports réussis. | Il reste 3 fichiers, les plus anciens sont supprimés. |
| N | Refuser l'écriture dans le dossier (PowerShell ; `GetFolderPath` suit la redirection éventuelle du dossier Documents, par exemple vers un autre disque) : `icacls "$([Environment]::GetFolderPath('MyDocuments'))\MDLM Ranking\Sauvegardes" /deny "$($env:USERNAME):(OI)(CI)W"`, puis importer `03-corrected.csv`. | L'import réussit (carte verte) **et** l'encart « À savoir » affiche « La sauvegarde automatique a échoué. Vérifiez le dossier de sauvegarde dans les Paramètres. » Aucun nouveau fichier dans le dossier. |
| O | Annuler l'interdiction : `icacls "$([Environment]::GetFolderPath('MyDocuments'))\MDLM Ranking\Sauvegardes" /remove:d $env:USERNAME`, puis importer un fichier. | Plus d'avertissement, le fichier de sauvegarde est créé. |
| P | Restaurer une sauvegarde (Paramètres → Restaurer) créée à l'étape K, après le scénario C. | Les résultats reviennent à l'état de cette sauvegarde. |

## À cocher avant la fusion

- [ ] A à J passés
- [ ] Comportement de la modale vérifié (clavier, tactile, texte)
- [ ] Cas limites enchaînés
- [ ] K à P passés
- [ ] `npm run test` et `npx tsc --noEmit` verts
- [ ] Aucune erreur dans la console Electron pendant les scénarios (hors l'échec voulu du scénario N : « Auto-backup failed »)
