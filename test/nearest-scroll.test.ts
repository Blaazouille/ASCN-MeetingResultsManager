/**
 * Responsabilité : tests du défilement minimal d'un conteneur vers un élément.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de nearest-scroll.ts.
 */
import { describe, expect, it } from 'vitest';
import { nearestScrollTop } from '../src/lib/nearest-scroll';

// A 400px-high list, scrolled 100px down: rows 100 to 500 are visible.
const VIEW = { scrollTop: 100, viewHeight: 400 };

describe('nearestScrollTop', () => {
  it('does not move when the item is already fully visible', () => {
    expect(nearestScrollTop({ ...VIEW, itemTop: 200, itemHeight: 60 })).toBe(100);
    expect(nearestScrollTop({ ...VIEW, itemTop: 100, itemHeight: 400 })).toBe(100);
  });

  it('brings an item below the view up to the bottom edge', () => {
    expect(nearestScrollTop({ ...VIEW, itemTop: 600, itemHeight: 60 })).toBe(260);
  });

  it('shows the whole item when it is only partly visible at the bottom', () => {
    expect(nearestScrollTop({ ...VIEW, itemTop: 480, itemHeight: 60 })).toBe(140);
  });

  it('brings an item above the view down to the top edge', () => {
    expect(nearestScrollTop({ ...VIEW, itemTop: 20, itemHeight: 60 })).toBe(20);
    expect(nearestScrollTop({ ...VIEW, itemTop: 70, itemHeight: 60 })).toBe(70);
  });

  it('aligns an item taller than the view on its top', () => {
    expect(nearestScrollTop({ ...VIEW, itemTop: 300, itemHeight: 500 })).toBe(300);
  });
});
