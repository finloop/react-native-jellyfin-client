import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import RemoteControlManager from '@multi-tv/shared-ui/src/app/remote-control/RemoteControlManager';
import { SupportedKeys } from '@multi-tv/shared-ui/src/app/remote-control/SupportedKeys';

interface PlayerRemoteControlHandlers {
  onFastForward: () => void;
  onRewind: () => void;
  onTogglePausePlay: () => void;
  onShowControls: () => void;
  onBack: () => void;
  /** True when any overlay picker (audio/subtitle) is open. */
  isPickerOpen: boolean;
  onClosePicker: () => void;
}

/**
 * Wires the D-pad / remote keys to playback actions while the player is mounted.
 *
 * Also registers an empty hardwareBackPress handler so the RemoteControlManager
 * owns the Back key (this is what lets an open picker intercept Back instead
 * of the navigator popping the screen).
 */
export function usePlayerRemoteControl({
  onFastForward,
  onRewind,
  onTogglePausePlay,
  onShowControls,
  onBack,
  isPickerOpen,
  onClosePicker,
}: PlayerRemoteControlHandlers) {
  useEffect(() => {
    const handleKeyDown = (key: SupportedKeys) => {
      switch (key) {
        case SupportedKeys.FastForward:
          onFastForward();
          break;
        case SupportedKeys.Rewind:
          onRewind();
          break;
        case SupportedKeys.Back:
          if (isPickerOpen) {
            onClosePicker();
          } else {
            onBack();
          }
          break;
        case SupportedKeys.PlayPause:
          onTogglePausePlay();
          break;
        default:
          onShowControls();
          break;
      }
    };

    const listener = RemoteControlManager.addKeydownListener(handleKeyDown);
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // We register empty back handler so that the RemoteControlManager
      // can handle the back key, this also fixes the AudioTrackPicker
      return true;
    });

    return () => {
      RemoteControlManager.removeKeydownListener(listener);
      backHandler.remove();
    };
  }, [
    onFastForward,
    onRewind,
    onTogglePausePlay,
    onShowControls,
    onBack,
    isPickerOpen,
    onClosePicker,
  ]);
}
