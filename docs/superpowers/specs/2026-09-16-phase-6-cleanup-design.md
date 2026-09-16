# Phase 6 — Refactoring & Cleanup

> Nettoyer le code hérité des phases précédentes, supprimer la fonctionnalité d'impression, restructurer la documentation en docs vivants, et aligner tous les fichiers sur les nouvelles règles du projet.

## 1. Suppression de l'impression

### Fichiers à supprimer
- `src/pages/PrintPage.tsx`
- `src/components/print/PrintPreview.tsx`
- `src/components/print/PrintControls.tsx`
- `src/components/print/A4Page.tsx`

### Fichier à renommer
- `src/lib/print-data.ts` → `src/lib/export-data.ts` (utilisé par les exports PDF/Excel, `MeetingCard`, et `RankingPage` — PAS uniquement par l'impression). Mettre à jour tous les imports.

### Modifications
- **`src/components/layout/Sidebar.tsx`** : retirer l'entrée `{ to: '/impression', label: 'Impression', icon: Printer }` du tableau `NAV_ITEMS`. Retirer l'import `Printer` de Lucide.
- **`src/App.tsx`** : retirer la route `/impression` et le lazy import de `PrintPage`.
- **`src/components/ranking/RankingToolbar.tsx`** : retirer le bouton "Imprimer" et la prop `onPrint`. Garder les boutons PDF et Excel.
- **`src/pages/RankingPage.tsx`** : retirer le bloc `<A4Page>` caché en bas du composant (utilisé par `window.print()`). Retirer l'import `A4Page`. Garder `buildPrintMeta` et `usePrintExport` (utilisés par les exports PDF/Excel). Mettre à jour les imports pour pointer vers `export-data.ts`.
- **`src/styles/globals.css`** : retirer les media queries `@media print` si elles existent.

### Vérification
- `npm run test` passe.
- `npm run lint` passe.
- Aucune référence restante à `PrintPage`, `A4Page`, `PrintPreview`, `PrintControls`, `onPrint`, ou `/impression` dans le code.

## 2. Nettoyage du code (nouvelles règles)

### Header comments
Ajouter un commentaire d'en-tête à chaque fichier `.ts` / `.tsx` répondant aux trois questions :
1. Quelle est la responsabilité unique de ce fichier ?
2. Qui l'appelle ?
3. Que casserait sa suppression ?

Format :
```typescript
/**
 * Responsabilité : [description courte]
 * Appelé par : [fichier(s) ou composant(s)]
 * Suppression casserait : [conséquence]
 */
```

### Limite de 300 lignes
Vérifier tous les fichiers existants. Si un fichier dépasse 300 lignes, le découper en respectant le principe "une responsabilité = un fichier."

Fichiers à surveiller :
- `src/lib/db.ts` (277 lignes — proche de la limite, va grandir avec les phases suivantes)

### Dead code
- Passer en revue tous les imports inutilisés.
- Supprimer les variables, fonctions, et exports non référencés.
- Supprimer tout code commenté.

### Dépendances
- Vérifier si `@react-pdf/renderer` est toujours utilisé (oui — export PDF depuis RankingPage). Le garder.
- Supprimer toute dépendance devenue orpheline après la suppression de l'impression.

## 3. Restructuration de la documentation

### Principe
La documentation décrit l'état actuel de l'application, pas l'historique de construction. Les specs de phase sont des artefacts temporaires de planification.

### Nouveaux fichiers (docs vivants)

**`docs/architecture.md`** — Stack technique, flux de données (CSV → Parseur → Moteur → UI/SQLite/Export), structure IPC, organisation des dossiers.

**`docs/screens.md`** — Description de chaque écran : ce qu'il fait, ses composants, son comportement. Mis à jour à chaque phase.

**`docs/data-model.md`** — Schéma SQLite complet (CREATE TABLE), interfaces TypeScript correspondantes, relations entre tables.

**`docs/design-system.md`** — Couleurs (tokens + hex), typographie (polices + weights), composants (border-radius, ombres, espacement, transitions).

**`docs/algorithms.md`** — Algorithme de classement par équipes, résultats de référence, futur : classement individuel, prix rigolos.

### Nettoyage
- Supprimer les specs de phase implémentées (`docs/superpowers/specs/` et `docs/superpowers/plans/` pour les phases 1-5) ou les déplacer dans un dossier `docs/archive/`.
- Mettre à jour `docs/design-prompt.md` et `docs/technical-design.md` si leur contenu est dupliqué dans les nouveaux docs — sinon les archiver aussi.

### CLAUDE.md
- Retirer `shadcn/ui` de la stack technique (pas installé).
- Retirer `components/ui/` de l'arbre du projet (dossier vide).
- Retirer l'écran "Impression" de la liste des écrans MVP.
- Pointer vers les nouveaux fichiers docs pour les détails.
- Garder CLAUDE.md comme point d'entrée concis.

## 4. Critères de validation

- [ ] Aucune référence à l'impression dans le code source.
- [ ] Tous les fichiers ont un header comment.
- [ ] Aucun fichier ne dépasse 300 lignes.
- [ ] Aucun import, variable, ou fonction inutilisé.
- [ ] Les 5 fichiers docs vivants existent et reflètent l'état actuel.
- [ ] CLAUDE.md est à jour.
- [ ] `npm run test` passe.
- [ ] `npm run lint` passe.
- [ ] L'export PDF fonctionne toujours depuis la page Classement.
- [ ] L'export Excel fonctionne toujours depuis la page Classement.
