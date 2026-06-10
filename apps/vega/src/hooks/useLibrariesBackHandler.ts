import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import RemoteControlManager from '@multi-tv/shared-ui/src/app/remote-control/RemoteControlManager';
import { SupportedKeys } from '@multi-tv/shared-ui/src/app/remote-control/SupportedKeys';

/**
 * Intra-tab Back handling for the Libraries screen: while viewing a library's items,
 * Back returns to the libraries grid instead of leaving the screen.
 *
 * Only wired while `active` (a library is open AND this screen owns focus). This is
 * deliberate — Back is dispatched through the same emitter as directional keys with no
 * event consumption, so every listener fires. If we registered the
 * `hardwareBackPress => true` consumer on the top-level libraries grid we'd trap the
 * user in-app; if we registered it while a pushed `Details` screen is open we'd clear
 * the selection underneath it. Gating on `active` avoids both. Mirrors the Back half of
 * `useRemoteBackHandler`.
 */
export function useLibrariesBackHandler({
  active,
  onBack,
}: {
  active: boolean;
  onBack: () => void;
}) {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (key: SupportedKeys) => {
      if (key === SupportedKeys.Back) {
        onBack();
      }
    };

    const listener = RemoteControlManager.addKeydownListener(handleKeyDown);
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => {
      RemoteControlManager.removeKeydownListener(listener);
      backHandler.remove();
    };
  }, [active, onBack]);
}
