/**
 * Responsabilité : comportement clavier d'une modale — Échap, piège à focus (Tab), restitution du focus à la fermeture.
 * Appelé par : DeleteMeetingDialog.tsx, ImportGuardDialog.tsx.
 * Suppression casserait : la navigation clavier des modales (Tab sortirait de la modale, le focus serait perdu à la fermeture).
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { restoreFocus, wrapFocusIndex } from '@/lib/focus-trap';

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled])';

export function useModalKeyboard(
  containerRef: RefObject<HTMLElement>,
  onEscape: () => void,
  escapeEnabled: boolean,
): void {
  // Kept in a ref so callers can pass an inline arrow without re-subscribing the
  // listener on every render (each keystroke in a modal input re-renders it).
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && escapeEnabled) {
        onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !containerRef.current) return;
      const focusable = Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const target = wrapFocusIndex(
        focusable.indexOf(document.activeElement as HTMLElement),
        focusable.length,
        event.shiftKey,
      );
      if (target !== null) {
        event.preventDefault();
        focusable[target]?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [containerRef, escapeEnabled]);

  // The opener must be read during the first render: the modal's `autoFocus`
  // button grabs focus in React's commit phase, before any effect (even a
  // layout effect of this component, which runs after its children's) could
  // read document.activeElement — it would only see « Annuler ». A lazy
  // useState runs once, at that first render; a plain useRef initialiser would
  // re-read the DOM on every render.
  const [opener] = useState<HTMLElement | null>(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  // containerRef is read at cleanup time on purpose: React has detached it (null)
  // by then on a real close, but not during StrictMode's simulated unmount.
  useEffect(() => () => restoreFocus(opener, containerRef.current), [opener, containerRef]);
}
