/**
 * Responsabilité : règles de la catégorie affichée, partagée par Classement, Individuels et Palmarès
 * (catégorie par défaut, sélection encore proposée ou non).
 * Appelé par : use-selected-category.ts, import-diff.ts (catégorie du résumé de réimport),
 * ceremony-plan.ts (isMixteCategory) et les tests.
 * Suppression casserait : le choix de la catégorie à l'ouverture d'un meeting et après un changement des catégories actives.
 */

/**
 * True for the Mixte category, the one the Meeting de la Mer rewards. Matched on the name, any case:
 * the FFN label (« Classement Mixte ») is the only thing that tells it apart. One rule for every screen,
 * the Cérémonie included, so they never disagree on which category is Mixte.
 */
export function isMixteCategory(category: string): boolean {
  return /mixte/i.test(category);
}

/** The category shown when nothing valid is selected: Mixte when offered, otherwise the first one offered ('' when none). */
export function defaultCategory(categories: readonly string[]): string {
  return categories.find(isMixteCategory) ?? categories[0] ?? '';
}

/** The category to display: the volunteer's choice while it is still offered, otherwise the default rule. */
export function resolveCategory(selected: string | null, categories: string[]): string {
  return selected !== null && categories.includes(selected) ? selected : defaultCategory(categories);
}

/**
 * True when the stored choice must be forgotten because it is no longer offered (active categories
 * changed in Paramètres, reimport without it). An empty list means the rows are still loading, not
 * that the choice is gone: clearing then would lose it on every screen change.
 */
export function isStaleSelection(selected: string | null, categories: string[]): boolean {
  return selected !== null && categories.length > 0 && !categories.includes(selected);
}
