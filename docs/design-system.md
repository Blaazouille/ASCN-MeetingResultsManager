# Design System

> Tokens et conventions visuelles de l'application. Light mode uniquement (MVP).

## Couleurs

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0A3663` | Navbar, sidebar, headers structurels |
| `secondary` | `#00A4E4` | États actifs, tabs, liens, boutons secondaires |
| `accent` | `#FF6B35` | CTA, badges podium (1er/2e/3e), alertes |
| `neutral-0` | `#FFFFFF` | Fond des cartes |
| `neutral-50` | `#F4F7F6` | Fond de page |
| `neutral-900` | `#1A2332` | Texte principal |
| `neutral-600` | `#5B6B7D` | Texte secondaire |
| `success` | `#22C55E` | Validation, import OK |
| `warning` | `#F59E0B` | Statut provisoire |
| `error` | `#EF4444` | Erreurs |

Chaque couleur décline une palette 50→900 (voir `src/styles/globals.css`).

## Typographie

- **Display / Headings** : Montserrat (600, 700)
- **Body / UI** : Inter (400, 500)
- **Data / Monospace** : JetBrains Mono (500, 700) — `font-variant-numeric: tabular-nums` sur les colonnes numériques

## Composants

- Border-radius : 8px (cartes/boutons), 6px (inputs), 4px (badges)
- Ombres : `0 1px 3px rgba(10,54,99,0.08), 0 1px 2px rgba(10,54,99,0.06)`
- Espacement : grille de 4px
- Transitions : 150ms ease
- Light mode uniquement (MVP)

## Formatage des nombres

- Points avec espace insécable comme séparateur de milliers : `5 841` (`formatPoints()` dans `src/lib/utils.ts`)
- `font-variant-numeric: tabular-nums` sur toutes les colonnes numériques (classe `.font-mono` / attribut `data-numeric`)

## Langue

- UI entièrement en français, pas de bibliothèque i18n
- Ponctuation française (espace insécable avant `:`, `;`, `!`, `?`)
- Dates : `Intl.DateTimeFormat` avec `fr-FR` (ex : "16 nov. 2026")
