/**
 * Responsabilité : calcule le défilement minimal d'un conteneur pour rendre un élément entièrement visible (comportement « nearest »).
 * Appelé par : CeremonyStepList.tsx (liste « Déroulé » de la cérémonie) et les tests.
 * Suppression casserait : le suivi automatique de l'annonce en cours dans la liste latérale de la cérémonie.
 */

export interface NearestScrollInput {
  /** Current scroll position of the container. */
  scrollTop: number;
  /** Visible height of the container (clientHeight). */
  viewHeight: number;
  /** Item top, measured from the top of the container's scrollable content. */
  itemTop: number;
  itemHeight: number;
}

/**
 * The container scrollTop that shows the item while moving as little as
 * possible: unchanged when already fully visible, item aligned to the top
 * edge when above (or taller than the view), to the bottom edge when below.
 * Computed by hand rather than with element.scrollIntoView, which also
 * scrolls every scrollable ancestor (the whole page) — the page must stay
 * still while the list follows the announcement.
 */
export function nearestScrollTop({ scrollTop, viewHeight, itemTop, itemHeight }: NearestScrollInput): number {
  const itemBottom = itemTop + itemHeight;
  if (itemTop < scrollTop || itemHeight > viewHeight) return itemTop;
  if (itemBottom > scrollTop + viewHeight) return itemBottom - viewHeight;
  return scrollTop;
}
