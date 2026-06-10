import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages the auto-hiding playback controls overlay.
 *
 * `showControls` reveals the overlay and (re)arms the hide timeout. The timeout
 * is cleared on unmount so it can't fire against a torn-down screen.
 */
export function useControlsVisibility() {
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    hideControlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 500000);
  }, []);

  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    };
  }, []);

  return { controlsVisible, showControls };
}
