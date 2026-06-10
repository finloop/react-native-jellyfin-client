import { useCallback } from 'react';
import { useIsFocused } from '@amazon-devices/react-navigation__native';
import { Direction } from '@bam.tech/lrud';
import { useMenuContext } from '@multi-tv/shared-ui';

/**
 * Shared focus wiring for any content screen rendered under the top bar
 * (`VegaHomeScreen`, `VegaPlaceholderScreen`).
 *
 * `MenuContext.isOpen` is reused to mean "the top bar owns focus / is visible".
 * A content screen is therefore the active `SpatialNavigationRoot` only when it's
 * the focused stack route AND the bar isn't holding focus. Pressing Up at the top
 * of the content (where Up has nowhere else to go) hands focus back to the bar.
 */
export function useContentFocusRoot() {
  const isFocused = useIsFocused();
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();

  const isActive = isFocused && !isMenuOpen;

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      if (movement === 'up') {
        toggleMenu(true);
      }
    },
    [toggleMenu],
  );

  return { isActive, onDirectionHandledWithoutMovement };
}
