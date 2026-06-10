import { useRef, useState } from 'react';
import { IComponentInstance } from '@amazon-devices/react-native-kepler';
import { VideoPlayerController } from './VideoPlayerController.kepler';

/**
 * Bridges the imperative VideoPlayerController to React state.
 *
 * Owns every piece of player UI state and wires the controller's callbacks to
 * the matching setters. The controller is created once and keeps its own copy
 * of currentTime/duration, so the screen and other hooks drive playback purely
 * through `controller` (seek, togglePausePlay, attach/detach handles).
 */
export function useVideoPlayer(
  initialUri: string,
  componentInstance: IComponentInstance | null,
) {
  const [paused, setPaused] = useState(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isVideoInitialized, setIsVideoInitialized] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isVideoError, setIsVideoError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const controllerRef = useRef<VideoPlayerController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new VideoPlayerController(initialUri, componentInstance, {
      onDuration: setDuration,
      onTimeUpdate: setCurrentTime,
      onBuffering: setIsVideoBuffering,
      onInitialized: setIsVideoInitialized,
      onEnded: () => setIsVideoEnded(true),
      onError: () => setIsVideoError(true),
      onPlayerReady: setIsPlayerReady,
      onPausedChange: setPaused,
    });
  }

  return {
    controller: controllerRef.current,
    paused,
    isVideoBuffering,
    isPlayerReady,
    isVideoInitialized,
    isVideoEnded,
    isVideoError,
    currentTime,
    duration,
  };
}
