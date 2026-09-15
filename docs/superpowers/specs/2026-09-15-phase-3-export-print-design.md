# Phase 3 — Export PDF / Excel + Aperçu impression

## Contexte

Phase 2 (moteur de classement + écran Classement) est terminée. Phase 3 couvre les exports PDF/Excel et l'aperçu d'impression A4 (écrans 3 et 4 de `docs/design-prompt.md`, §6 de `docs/technical-design.md`).

L'Electron main process (IPC, SQLite, dialogues de sauvegarde) n'existe pas encore — c'est la Phase 4. Les exports de cette phase se font donc entièrement dans le renderer : génération en mémoire (Blob) et téléchargement navigateur standard, sans passer par un dialogue "Enregistrer sous" natif. Ce comportement sera revu en Phase 4 si besoin.

## Décisions

- **Téléchargement navigateur** plutôt qu'attendre l'IPC Electron : les exports sont utilisables dès maintenant (dev Vite et build Electron), quitte à revoir le mécanisme en Phase 4.
- **Actions directes partout** : les boutons Imprimer / Export PDF / Export Excel du `RankingToolbar` (écran Classement) agissent directement sur la sélection courante, sans naviguer vers l'écran Impression. L'écran Impression (`/print`) reste une page d'aperçu autonome avec sa propre sélection de catégorie.
- **Méta meeting placeholder** : pas de Paramètres (Phase 5) ni de SQLite (Phase 4) pour l'instant, donc le nom du meeting et la date sont des valeurs par défaut codées en dur ("Meeting de la Mer 2026" + date du jour formatée `fr-FR`), centralisées dans une seule fonction pour être faciles à remplacer en Phase 5.

## Architecture

Un module de données partagé (`buildPrintMeta`) fournit la même information (méta meeting) aux deux cibles de rendu : un aperçu HTML (écran + impression navigateur) et un document `@react-pdf/renderer` (PDF téléchargeable). Les deux cibles consomment le même `TeamResult[]` calculé par `computeTeamRanking` — pas de duplication de la logique de classement.

```
TeamResult[] + PrintMeta
        │
        ├── A4Page.tsx (HTML/Tailwind) ──► écran (PrintPreview) + window.print()
        │
        ├── RankingPdfDocument (react-pdf) ──► pdf-export.ts ──► Blob PDF téléchargé
        │
        └── excel-export.ts (ExcelJS) ──► Blob XLSX téléchargé
```

## Composants et fichiers

### `src/lib/`

- **`print-data.ts`**
  - `interface PrintMeta { meetingName: string; date: string; status: 'Provisoire' | 'Définitif'; computedAt: string }`
  - `buildPrintMeta(): PrintMeta` — valeurs par défaut ; `computedAt` formaté `Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })`.

- **`download.ts`**
  - `downloadBlob(blob: Blob, filename: string): void` — crée une URL objet, déclenche un clic sur un `<a download>` temporaire, révoque l'URL ensuite.

- **`pdf-export.ts`**
  - `RankingPdfDocument({ meta, category, results }): JSX.Element` — composant `@react-pdf/renderer` (`Document`/`Page`/`View`/`Text`), une page par appel (une seule catégorie). Reprend la maquette texte de `technical-design.md` §6 (titre, sous-titre catégorie, tableau rang/club/points/nageurs retenus, pied de page horodatage + PROVISOIRE).
  - `async function exportRankingToPdf(meta: PrintMeta, category: string, results: TeamResult[]): Promise<void>` — utilise `pdf(<RankingPdfDocument .../>).toBlob()`, puis `downloadBlob` avec un nom de fichier du type `classement-{category-slug}-{date}.pdf`.

- **`excel-export.ts`**
  - `async function exportRankingToExcel(meta: PrintMeta, category: string, results: TeamResult[]): Promise<void>` — `ExcelJS.Workbook`, une feuille nommée d'après la catégorie. Colonnes : Rang, Club, Points, Nageurs retenus (noms concaténés `LASTNAME Prénom`). Ligne d'en-tête en gras. `workbook.xlsx.writeBuffer()` → `Blob` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) → `downloadBlob` avec nom `classement-{category-slug}-{date}.xlsx`.

- Un petit helper `slugifyCategory(category: string): string` (dans `print-data.ts` ou `utils.ts`) pour dériver les noms de fichiers depuis le nom de catégorie FFN ("Classement Mixte" → "mixte").

### `src/components/print/`

- **`A4Page.tsx`** — layout HTML/Tailwind reproduisant la maquette `technical-design.md` §6 : en-tête (titre meeting, sous-titre "Classement par équipes — {catégorie}", date), tableau (Rang/Club/Points/Nageurs, alternance de fond, mise en valeur du club ASCN via `ASCN_CLUB_NAME`), pied de page (horodatage + badge PROVISOIRE si applicable). Classe `print-area` sur le conteneur racine pour l'isolation d'impression. Typographie : Montserrat Bold 24pt (titre), Inter Medium 14pt (sous-titre), Montserrat Bold 18pt (rang), Inter Semi-Bold 16pt (club), JetBrains Mono Medium 16pt (points), Inter Regular 11pt (nageurs), Inter Regular 10pt (pied de page).
- **`PrintPreview.tsx`** — encadre `A4Page` avec l'effet "papier" (ombre, fond neutre, centré, largeur A4 simulée), non imprimé lui-même (seul `.print-area` interne est visible à l'impression).
- **`PrintControls.tsx`** — sélecteur de catégorie (réutilise `CategoryTabs` ou un `<select>` simple) + boutons "Imprimer" (`window.print()`) et "Télécharger PDF" (`exportRankingToPdf`).

### CSS impression globale (`src/styles/globals.css`)

Ajout d'une règle `@media print` isolant `.print-area` :

```css
@media print {
  body * { visibility: hidden; }
  .print-area, .print-area * { visibility: visible; }
  .print-area { position: absolute; top: 0; left: 0; width: 100%; }
}
```

### Écran Impression (`src/pages/PrintPage.tsx`)

Remplace le placeholder. Structure identique à `RankingPage.tsx` pour la récupération des données (`useOutletContext<AppOutletContext>()`, redirection vers `/import` si `!importState.result`), avec une instance dédiée de `useRanking(rows, categories)` — `topN` non exposé à l'utilisateur ici (reste à sa valeur par défaut 5, pas de sélecteur, conformément à l'écran 4 de la spec). Rendu : en-tête de page, `CategoryTabs`, `PrintControls`, `PrintPreview` (contenant `A4Page`).

### Écran Classement (`src/components/ranking/RankingToolbar.tsx` + `RankingPage.tsx`)

- `RankingToolbar` reçoit en props `category`, `results: TeamResult[]`, `meta: PrintMeta` en plus de `topN`/`onTopNChange` existants, et affiche 3 boutons : "Imprimer", "Export PDF", "Export Excel", alignés à droite (conforme à la maquette écran 3).
  - "Export PDF" → `exportRankingToPdf(meta, category, results)`
  - "Export Excel" → `exportRankingToExcel(meta, category, results)`
  - "Imprimer" → `window.print()`
- Pour que "Imprimer" imprime la mise en page A4 (et non la table à l'écran), `RankingPage` monte un `A4Page` supplémentaire, positionné hors du viewport visible (ex. `fixed -left-[9999px] top-0`, jamais `display:none` — sinon la règle `.print-area` ne peut pas le rendre visible à l'impression) avec `category`/`results`/`meta` courants. Ce composant est déjà utilisé par l'écran Impression ; il est simplement réutilisé ici sans duplication de layout.

## Gestion des cas limites

- Aucun résultat pour la catégorie (liste vide) : `A4Page` affiche un message "Aucun club classé" au lieu d'un tableau vide, cohérent avec le comportement déjà existant du tableau de classement.
- Nom de catégorie contenant des caractères spéciaux pour le nom de fichier : `slugifyCategory` retire les accents et remplace les espaces/caractères non alphanumériques par `-`.

## Tests

- `test/pdf-export.test.ts` : `exportRankingToPdf` résout sans erreur sur un jeu de résultats issu de `test/fixtures/expected-ranking.json` ; vérifie que `pdf(<RankingPdfDocument .../>).toBlob()` produit un `Blob` non vide de type `application/pdf` (test du builder de document, pas de `downloadBlob` qui dépend du DOM navigateur — mocker `URL.createObjectURL`/l'élément `<a>` si nécessaire, ou isoler `downloadBlob` du test).
- `test/excel-export.test.ts` : génère le classeur pour la fixture de référence, relit le buffer avec `ExcelJS.Workbook().xlsx.load()`, vérifie la présence des 38 clubs, du club ASCN, et que les points de CN VIRY-CHÂTILLON (5841) et CN BERGERAC (561) apparaissent aux bonnes lignes.
- `test/print-data.test.ts` : `slugifyCategory` sur "Classement Mixte" → "classement-mixte" (ou équivalent), gestion des accents ("Dames" reste inchangé, cas avec accents si présent dans les catégories réelles).

## Hors scope (reporté)

- Dialogue "Enregistrer sous" natif Electron (Phase 4).
- Logo du meeting dans l'en-tête (mentionné comme "possibilité" dans la spec écran 4, pas un requis MVP).
- Sélecteur de topN sur l'écran Impression (l'écran 4 de la spec n'en prévoit pas).
- Édition des méta du meeting (nom/date/statut) — Phase 5 (Paramètres).
