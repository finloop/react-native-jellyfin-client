import { useEffect, useRef } from "react";
import type { SpatialNavigationNodeRef } from "react-tv-space-navigation";

/**
 * Returns a ref to attach to the currently-selected SpatialNavigationFocusableView
 * inside a SpatialNavigationScrollView (e.g. the active row in a picker). Pass the
 * picker's `visible` flag so the scroll re-fires every time it opens.
 *
 * DefaultFocus assigns focus to that row while the modal is opening, but at that
 * point the scroll view hasn't measured its own size yet (its onLayout hasn't
 * fired), so SpatialNavigationScrollView suppresses the scroll-to-focused and the
 * selected row can stay off-screen until the user presses a key. Re-firing focus a
 * couple of frames later — once layout has settled — makes the scroll view scroll
 * the selected row into view on open. Re-focusing an already-focused node is a
 * visual no-op (React batches the blur/focus into a stable isFocused), it only
 * re-triggers the scroll.
 */
export const useScrollToSelectedOnOpen = (visible: boolean) => {
  const ref = useRef<SpatialNavigationNodeRef>(null);

  useEffect(() => {
    if (!visible) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        ref.current?.focus();
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [visible]);

  return ref;
};
