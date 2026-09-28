# Design System — « Tableau de bassin »

> Tokens et conventions visuelles de l'application. Light mode uniquement (MVP).
> Maquette de référence : [artefact de design](https://claude.ai/artifact/4hd1YLZVKGhsRcjB2kjiya).

## Couleurs

| Token | Hex | Usage |
|-------|-----|-------|
| `marine` | `#0A3663` | Sidebar, en-têtes structurels, bouton d'action principal |
| `marine-deep` | `#071E3D` | Survol du bouton principal |
| `marine-raised` | `#1E466F` | Fond des éléments actifs sur la sidebar |
| `marine-line` | `#54728F` | Séparateurs sur fond `marine` |
| `marine-soft` | `#E0EEFA` | Fond survolé des boutons secondaires |
| `on-marine` / `on-marine-muted` / `on-marine-subtle` / `on-marine-faint` | `#FFFFFF` / `#B0D5F0` / `#C9DDF0` / `#7ABBE4` | Textes sur fond `marine`, du plus au moins contrasté |
| `bassin` | `#00A4E4` | Décoratif seulement (jamais de texte blanc dessus) |
| `bassin-strong` | `#006E99` | Texte/icônes sur fond clair, anneau de focus |
| `bassin-soft` | `#E6F6FD` | Fond des tuiles et badges bleus |
| `corail` | `#FF6B35` | Décoratif seulement (jamais de texte blanc dessus) |
| `corail-strong` | `#B3390A` | Texte « Notre club », alertes |
| `corail-soft` / `corail-wash` / `corail-line` | `#FFE6D8` / `#FFF4EE` / `#F5D3C2` | Fonds et bordures corail |
| `ink` / `ink-soft` / `ink-muted` | `#1A2332` / `#3F4F66` / `#5B6B7D` | Texte principal, secondaire, discret |
| `line` / `line-strong` | `#E8EDF2` / `#8394A6` | Bordures discrètes / bordures de contrôles (inputs, cases) |
| `surface` / `surface-raised` / `surface-sunken` / `surface-header` | `#F4F7F6` / `#FFFFFF` / `#EEF2F6` / `#F7F9FB` | Fond de page, cartes, zones creusées, en-têtes de tableau |
| `success` / `success-light` / `success-bright` | `#15803D` / `#DCFCE7` / `#22C55E` | Validation, import OK (texte sur `-light`, `-bright` pour les puces) |
| `warning` / `warning-light` | `#92400E` / `#FEF3C7` | Statut provisoire |
| `error` / `error-light` | `#B91C1C` / `#FEE2E2` | Erreurs |
| `medal-gold` / `medal-silver` / `medal-bronze` | `#D4AF37` / `#A8A9AD` / `#CD7F32` | Podium — toujours avec des chiffres `ink` dessus (le blanc n'y passe pas 4,5:1) |

Les tokens sont des variables CSS dans `src/styles/globals.css` (`--color-*`), consommées par `tailwind.config.ts`. `bassin` et `corail` sont décoratifs : ne jamais poser de texte blanc dessus, utiliser leurs variantes `-strong` pour le texte.

## Typographie

- **Titres et chiffres (`font-display`)** : Barlow Condensed (600, 700)
- **Texte courant et UI (`font-body`)** : Barlow (400, 500, 600, 700)
- Polices embarquées dans `src/assets/fonts/` (`.woff2`), déclarées dans `src/styles/fonts.css` — aucun appel réseau (l'app doit fonctionner hors ligne au bord du bassin)
- `font-variant-numeric: tabular-nums` sur toutes les colonnes numériques via la classe utilitaire Tailwind `tabular-nums`

## Rayons, ombres, tailles tactiles

- Border-radius : `rounded-sm` 8px (contrôles), `rounded-md` 10px, `rounded-lg` 12px (cartes), `rounded-xl` 16px
- Ombres : `shadow-card` (cartes au repos), `shadow-raised` (éléments flottants), `shadow-segment` (option active d'un `Segmented`)
- Cibles tactiles : 44 px minimum de hauteur pour tout bouton, option ou lien de navigation (`h-11`) ; 48 px (`h-12`) pour les boutons de grande taille
- Espacement : grille de 4px
- Transitions : 150ms ease

## Contraste (WCAG AA)

Vérifié par `test/design-tokens.test.ts`, qui calcule le ratio de contraste de chaque paire token/fond à partir des hex dans `globals.css` — toute régression de couleur fait échouer ce test avant d'atteindre un écran.

- Texte : minimum 4,5:1 (ex. `ink` sur `surface-raised`, `on-marine` sur `marine`, `corail-strong` sur `corail-soft`)
- UI non textuelle (bordures de contrôle, anneau de focus) : minimum 3:1 (ex. `line-strong` sur `surface-raised`)
- Deux tokens s'écartent volontairement d'une première proposition de palette pour tenir ces seuils : `corail-strong` est `#B3390A` (un `#C2410C` plus clair ne donnait que 4,2:1 sur `corail-soft`) et `line-strong` est `#8394A6` (un `#C5D0DB` plus clair ne donnait que 1,6:1 pour les bordures de contrôle). `corail-soft` lui-même est `#FFE6D8` plutôt qu'un `#FFE2D3` légèrement plus foncé : ce dernier tenait 4,5:1 pour `corail-strong` mais pas pour `ink-muted`, utilisé dessus au survol de la ligne du club « Notre club » (`TeamRow.tsx` / `TeamRankingTable.tsx`).

## Primitives (`src/components/ui/`)

| Composant | Rôle |
|-----------|------|
| `Button` | Bouton d'action — variantes `primary` (une seule par écran), `secondary`, `ghost` ; tailles `md`/`lg` |
| `ClubTag` | Étiquette « Notre club » accolée à AS Cherbourg Natation dans les classements |
| `RankChip` | Numéro de rang, aux couleurs de la médaille pour les trois premiers (chiffres `ink`, jamais blancs) |
| `SearchField` | Champ de recherche avec loupe, filtre à la frappe |
| `Segmented` | Sélecteur « une option parmi quelques-unes » toujours visible (catégorie, nageurs comptés, statut) |
| `StatusBadge` | Pastille de statut d'un meeting (Provisoire, Définitif, À importer) |

## Formatage des nombres

- Points avec espace insécable comme séparateur de milliers : `5 841` (`formatPoints()` dans `src/lib/utils.ts`)
- `font-variant-numeric: tabular-nums` sur toutes les colonnes numériques via la classe utilitaire Tailwind `tabular-nums`

## Langue

- UI entièrement en français, pas de bibliothèque i18n
- Ponctuation française (espace insécable avant `:`, `;`, `!`, `?`)
- Dates : `Intl.DateTimeFormat` avec `fr-FR` (ex : "16 nov. 2026")
