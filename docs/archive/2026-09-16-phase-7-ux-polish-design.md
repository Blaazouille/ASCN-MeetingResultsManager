# Phase 7 — UX Polish

> Améliorer l'expérience utilisateur quotidienne : simplifier la création de meeting, fixer le layout, masquer la barre de menus Electron, rendre les lignes cliquables, et renommer l'application.

## 1. Simplification de la création de meeting

### Comportement actuel
Le formulaire `MeetingForm` exige un nom et une date (`required`). Le lieu est optionnel.

### Comportement cible
Seul le **nom** est obligatoire. La date est pré-remplie avec la date du jour et reste modifiable mais pas obligatoire. Le lieu reste optionnel.

### Modifications

**`src/components/meeting/MeetingForm.tsx`** :
- Retirer `required` de l'input date.
- Initialiser `date` avec `new Date().toISOString().slice(0, 10)` au lieu de `''`.
- Le formulaire envoie la date pré-remplie si l'utilisateur ne la change pas.

**`src/lib/db.ts`** :
- `MeetingInput.date` devient optionnel (`date?: string`).
- `createMeeting` : si `date` est absent ou vide, utiliser `date('now')` côté SQL.
- Schéma SQL : ajouter `DEFAULT (date('now'))` à la colonne `date` lors de la migration.

**Tests** :
- `test/db.test.ts` : tester la création d'un meeting sans date (doit recevoir la date du jour).

## 2. Layout fixe

### Comportement actuel
Tout le layout scrolle ensemble (sidebar, header, contenu).

### Comportement cible
- La **sidebar** est fixe sur toute la hauteur de l'écran.
- Le **header** est sticky en haut de la zone de contenu.
- Seule la **zone de contenu** (main) scrolle.

### Modifications

**`src/components/layout/AppShell.tsx`** :
```
Sidebar : position fixed, left-0, top-0, h-screen, z-20
Zone droite : ml-[220px] (largeur de la sidebar), flex-col, h-screen
Header : sticky top-0, z-10
Main : flex-1, overflow-y-auto
```

**`src/components/layout/Sidebar.tsx`** :
- Ajouter `fixed inset-y-0 left-0 z-20` aux classes du `<nav>`.

**`src/components/layout/Header.tsx`** :
- Ajouter `sticky top-0 z-10` aux classes du `<header>`.

## 3. Masquer la barre de menus Electron

### Approche
Utiliser `autoHideMenuBar: true` dans les options `BrowserWindow`. La barre de menus est cachée par défaut, accessible via la touche Alt si besoin.

### Modifications

**`electron/main.ts`** :
- Ajouter `autoHideMenuBar: true` aux options de `new BrowserWindow(...)`.

Pas de changement dans le renderer — pas de fenêtre frameless, pas de boutons de contrôle custom, pas de drag region.

## 4. Clic sur la ligne pour déplier

### Comportement actuel
Le tableau `TeamRankingTable` a un chevron (`ChevronRight`) à droite de chaque ligne. Cliquer sur le chevron déplie/replie le détail des nageurs.

### Comportement cible
Cliquer **n'importe où sur la ligne** déplie/replie le détail. Le chevron reste comme indicateur visuel.

### Modifications

**`src/components/ranking/TeamRow.tsx`** :
- Ajouter un `onClick` sur le `<tr>` qui appelle la fonction toggle.
- Ajouter `cursor-pointer` au `<tr>`.
- Ajouter un effet hover sur la ligne entière (`hover:bg-neutral-50`).
- S'assurer que le chevron ne gère plus le clic indépendamment (éviter le double toggle).

**`src/components/ranking/TeamRankingTable.tsx`** :
- Le `buildExpandColumn` peut simplifier le bouton chevron en un simple indicateur (retirer le `<button>`, garder le `<ChevronRight>` comme icône).

## 5. Renommage de l'application

### Options proposées

| Nom | Pour | Contre |
|-----|------|--------|
| **NatResults** | Court, clair, générique, facile à retenir | Anglais |
| **MeetSplash** | Ludique, aquatique, mémorable | Peut sembler peu sérieux |
| **Vague** | Français, minimal, lien aquatique subtil | Trop abstrait ? |

Le choix final sera fait par l'utilisateur. Le nom choisi remplacera :

- **`src/components/layout/Sidebar.tsx`** : le texte "AS Cherbourg Natation" et "Meeting Results" dans le header de la sidebar.
- **`src/components/layout/Header.tsx`** : le texte "Meeting Results Manager".
- **`package.json`** : champs `name` et `productName`.
- **`electron/main.ts`** : titre de la fenêtre Electron (`title` dans `BrowserWindow`).
- **`resources/`** : mettre à jour le nom dans les métadonnées si applicable.

## 6. Critères de validation

- [ ] Créer un meeting avec seulement un nom fonctionne (date = aujourd'hui par défaut).
- [ ] La sidebar ne scrolle pas avec le contenu.
- [ ] Le header reste visible en haut lors du scroll.
- [ ] La barre de menus Electron est cachée au démarrage.
- [ ] Cliquer sur une ligne du tableau déplie le détail des nageurs.
- [ ] Le nom de l'app est mis à jour partout.
- [ ] `npm run test` passe.
- [ ] `npm run lint` passe.
- [ ] Tous les nouveaux/modifiés fichiers ont un header comment.
- [ ] Aucun fichier ne dépasse 300 lignes.
