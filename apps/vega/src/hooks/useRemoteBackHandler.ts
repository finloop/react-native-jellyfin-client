import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from '@amazon-devices/react-navigation__native';
import RemoteControlManager from '@multi-tv/shared-ui/src/app/remote-control/RemoteControlManager';
import { SupportedKeys } from '@multi-tv/shared-ui/src/app/remote-control/SupportedKeys';

/**
 * Wires the remote Back key to `navigation.goBack()` for a pushed stack screen.
 *
 * Vega doesn't mount `GoBackConfiguration` globally (mounting it would double-fire
 * against the Player's own Back handler), so pushed screens that want Back must opt
 * in. Mirrors the Back half of the Player's `usePlayerRemoteControl`: a
 * RemoteControlManager listener that pops the stack, plus an empty `hardwareBackPress`
 * consumer so nothing else also handles Back while this screen is mounted.
 */
export function useRemoteBackHandler() {
  const navigation = useNavigation();

  useEffect(() => {
    const handleKeyDown = (key: SupportedKeys) => {
      if (key === SupportedKeys.Back && navigation.canGoBack()) {
        navigation.goBack();
      }
    };

    const listener = RemoteControlManager.addKeydownListener(handleKeyDown);
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => {
      RemoteControlManager.removeKeydownListener(listener);
      backHandler.remove();
    };
  }, [navigation]);
}
