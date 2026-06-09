import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { SpatialNavigationRoot } from 'react-tv-space-navigation';
import { useIsFocused } from '@amazon-devices/react-navigation__native';
import { useNavigation, useRoute, RouteProp } from '@amazon-devices/react-navigation__native';
import { NativeStackNavigationProp } from '@amazon-devices/react-navigation__native-stack';
import {
  IKeplerAppStateManager,
  useKeplerAppStateManager,
} from '@amazon-devices/react-native-kepler';
import {
  VideoPlayer,
  KeplerVideoSurfaceView,
  KeplerCaptionsView,
} from '@amazon-devices/react-native-w3cmedia';
import RemoteControlManager from '@multi-tv/shared-ui/src/app/remote-control/RemoteControlManager';
import { SupportedKeys } from '@multi-tv/shared-ui/src/app/remote-control/SupportedKeys';
import VideoOverlay from '@multi-tv/shared-ui/src/components/player/VideoOverlay.vega';
import ExitButton from '@multi-tv/shared-ui/src/components/player/ExitButton';
import JellyfinClient from '@multi-tv/shared-ui/src/services/JellyfinClient';
import { RootStackParamList } from '../navigation/types';
import { HlsJsPlayer } from '../hlsjsplayer/HlsJsPlayer';
import Document from '../hlsjsplayer/polyfills/DocumentPolyfill';
import Element from '../hlsjsplayer/polyfills/ElementPolyfill';
import TextDecoderPolyfill from '../hlsjsplayer/polyfills/TextDecoderPolyfill';
import W3CMediaPolyfill from '../hlsjsplayer/polyfills/W3CMediaPolyfill';
import MiscPolyfill from '../hlsjsplayer/polyfills/MiscPolyfill';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;

export default function VegaPlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { movie, audioTracks = [], itemId, accessToken, userId } = route.params;
  const isFocused = useIsFocused();

  const keplerAppStateManager: IKeplerAppStateManager = useKeplerAppStateManager();
  const componentInstance = keplerAppStateManager.getComponentInstance();

  const [paused, setPaused] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isVideoInitialized, setIsVideoInitialized] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isVideoError, setIsVideoError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedAudioTrackIndex, setSelectedAudioTrackIndex] = useState(
    audioTracks.find((t) => t)?.index ?? 0,
  );
  const [isAudioPickerOpen, setIsAudioPickerOpen] = useState(false);

  const videoPlayerRef = useRef<VideoPlayer | null>(null);
  const hlsPlayerRef = useRef<HlsJsPlayer | null>(null);
  const surfaceHandleRef = useRef<string | null>(null);
  const captionViewHandleRef = useRef<string | null>(null);
  const pendingPlaybackRef = useRef<{ uri: string; startPosition?: number }>({ uri: movie });
  const hlsReadyRef = useRef(false);
  const canPlayFiredRef = useRef(false);
  const nearEndRef = useRef(false);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    hideControlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 500000);
  }, []);

  const destroyPlayer = useCallback(() => {
    hlsReadyRef.current = false;
    canPlayFiredRef.current = false;
    nearEndRef.current = false;
    if (surfaceHandleRef.current && videoPlayerRef.current) {
      videoPlayerRef.current.clearSurfaceHandle(surfaceHandleRef.current);
      surfaceHandleRef.current = null;
    }
    if (captionViewHandleRef.current && videoPlayerRef.current) {
      videoPlayerRef.current.clearCaptionViewHandle(captionViewHandleRef.current);
      captionViewHandleRef.current = null;
    }
    hlsPlayerRef.current?.destroy();
    hlsPlayerRef.current = null;
    videoPlayerRef.current?.deinitialize();
    (global as any).gmedia = null;
    videoPlayerRef.current = null;
    setIsPlayerReady(false);
    setIsVideoInitialized(false);
    setIsVideoBuffering(true);
    setPaused(true);
  }, []);

  const seek = useCallback((time: number) => {
    if (videoPlayerRef.current && durationRef.current) {
      const clamped = Math.max(0, Math.min(time, durationRef.current));
      videoPlayerRef.current.currentTime = clamped;
      setCurrentTime(clamped);
      currentTimeRef.current = clamped;
      nearEndRef.current = clamped >= durationRef.current - 2;
      showControls();
    }
  }, [showControls]);

  const initPlayer = useCallback(async (uri: string, startPosition = 0) => {
    pendingPlaybackRef.current = { uri, startPosition };

    const vp = new VideoPlayer();
    (global as any).gmedia = vp;
    videoPlayerRef.current = vp;

    // isActive guards against stale closures if initPlayer is called again before this one completes
    const isActive = () => videoPlayerRef.current === vp;

    try {
      if (componentInstance) {
        await vp.setMediaControlFocus(componentInstance, null as any);
      }
    } catch {}

    vp.addEventListener('loadedmetadata', () => {
      if (!isActive()) return;
      setDuration(vp.duration || 0);
      setIsVideoInitialized(true);
    });
    vp.addEventListener('timeupdate', () => {
      if (!isActive()) return;
      const ct = vp.currentTime || 0;
      setCurrentTime(ct);
      setIsVideoBuffering(false);
      nearEndRef.current = durationRef.current > 0 && ct >= durationRef.current - 2;
    });
    vp.addEventListener('ended', () => {
      if (!isActive() || !nearEndRef.current) return;
      setIsVideoEnded(true);
    });
    vp.addEventListener('waiting', () => {
      if (!isActive()) return;
      setIsVideoBuffering(true);
    });
    vp.addEventListener('playing', () => {
      if (!isActive()) return;
      setIsVideoBuffering(false);
    });

    await vp.initialize();
    if (!isActive()) return;

    vp.autoplay = false;
    setIsPlayerReady(true);

    Document.install();
    Element.install();
    TextDecoderPolyfill.install();
    W3CMediaPolyfill.install();
    MiscPolyfill.install();

    const hlsPlayer = new HlsJsPlayer(vp);
    hlsPlayerRef.current = hlsPlayer;
    hlsPlayer.addPlayerEventListener('error', () => {
      if (!isActive()) return;
      setIsVideoError(true);
    });
    hlsReadyRef.current = true;

    vp.addEventListener('canplay', () => {
      if (!isActive() || canPlayFiredRef.current) return;
      canPlayFiredRef.current = true;
      if (surfaceHandleRef.current) {
        vp.play();
        setPaused(false);
      }
    });
  }, [componentInstance]);

  const togglePausePlay = useCallback(() => {
    if (!videoPlayerRef.current || !canPlayFiredRef.current) return;
    if (videoPlayerRef.current.paused) {
      videoPlayerRef.current.play();
      setPaused(false);
    } else {
      videoPlayerRef.current.pause();
      setPaused(true);
    }
    showControls();
  }, [showControls]);

  const changeAudioTrack = useCallback(async (newTrackIndex: number) => {
    if (!accessToken || !userId || !itemId) return;

    const seekTarget = currentTimeRef.current;
    setSelectedAudioTrackIndex(newTrackIndex);

    try {
      const { url } = await JellyfinClient.getPlaybackUrl(accessToken, userId, itemId, newTrackIndex);
      destroyPlayer();
      await initPlayer(url, seekTarget);
    } catch (e) {
      console.error('[VegaPlayerScreen] Failed to change audio track', e);
    }
  }, [accessToken, userId, itemId, destroyPlayer, initPlayer]);

  const navigateBack = useCallback(() => {
    destroyPlayer();
    setTimeout(() => navigation.goBack(), 300);
  }, [navigation, destroyPlayer]);

  useEffect(() => {
    if (!isFocused) return;
    initPlayer(movie).catch(() => setIsVideoError(true));
    return destroyPlayer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie, isFocused]);

  useEffect(() => {
    if (isVideoEnded) navigateBack();
  }, [isVideoEnded, navigateBack]);

  useEffect(() => {
    if (isVideoInitialized && duration > 0) showControls();
  }, [isVideoInitialized, duration, showControls]);

  useEffect(() => {
    const handleKeyDown = (key: SupportedKeys) => {
      switch (key) {
        case SupportedKeys.FastForward:
          seek(currentTimeRef.current + 10);
          break;
        case SupportedKeys.Rewind:
          seek(currentTimeRef.current - 10);
          break;
        case SupportedKeys.Back:
          if (isAudioPickerOpen) {
            setIsAudioPickerOpen(false);
          } else {
            navigateBack();
          }
          break;
        case SupportedKeys.PlayPause:
          togglePausePlay();
          break;
        default:
          showControls();
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
  }, [seek, togglePausePlay, showControls, navigateBack, isAudioPickerOpen]);

  const onSurfaceViewCreated = useCallback((surfaceHandle: string) => {
    surfaceHandleRef.current = surfaceHandle;
    videoPlayerRef.current?.setSurfaceHandle(surfaceHandle);

    if (hlsReadyRef.current && hlsPlayerRef.current) {
      hlsReadyRef.current = false;
      const { uri, startPosition } = pendingPlaybackRef.current;
      if (startPosition) seek(startPosition);
      
      hlsPlayerRef.current.load(
        { uri, secure: 'false', drm_scheme: '', drm_license_uri: '' },
        false,
      );
    }

    if (canPlayFiredRef.current && videoPlayerRef.current) {
      videoPlayerRef.current.play();
      setPaused(false);
    }
  }, []);

  const onSurfaceViewDestroyed = useCallback((surfaceHandle: string) => {
    // Guard against clearing a handle on a newly created VideoPlayer after a reinit.
    // destroyPlayer() nulls surfaceHandleRef before state triggers this unmount callback.
    if (surfaceHandleRef.current === surfaceHandle) {
      videoPlayerRef.current?.clearSurfaceHandle(surfaceHandle);
      surfaceHandleRef.current = null;
    }
  }, []);

  const onCaptionViewCreated = useCallback((captionHandle: string) => {
    captionViewHandleRef.current = captionHandle;
    videoPlayerRef.current?.setCaptionViewHandle(captionHandle);
  }, []);

  const onCaptionViewDestroyed = useCallback((captionHandle: string) => {
    if (captionViewHandleRef.current === captionHandle) {
      videoPlayerRef.current?.clearCaptionViewHandle(captionHandle);
      captionViewHandleRef.current = null;
    }
  }, []);

  if (isVideoError) {
    return (
      <SpatialNavigationRoot isActive={isFocused}>
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <ExitButton onSelect={navigateBack} />
          </View>
        </View>
      </SpatialNavigationRoot>
    );
  }

  return (
    <SpatialNavigationRoot isActive={isFocused && !isAudioPickerOpen}>
      <View style={styles.container}>
        {isPlayerReady && (
          <>
            <KeplerVideoSurfaceView
              style={styles.surface}
              onSurfaceViewCreated={onSurfaceViewCreated}
              onSurfaceViewDestroyed={onSurfaceViewDestroyed}
            />
            <KeplerCaptionsView
              style={styles.captions}
              onCaptionViewCreated={onCaptionViewCreated}
              onCaptionViewDestroyed={onCaptionViewDestroyed}
              show={false}
            />
          </>
        )}
        {!!durationRef.current && (
          <VideoOverlay
            visible={controlsVisible}
            paused={paused}
            onPlayPause={togglePausePlay}
            onExit={navigateBack}
            currentTime={currentTime}
            duration={durationRef.current}
            isBuffering={isVideoBuffering}
            audioTracks={audioTracks}
            selectedAudioTrackIndex={selectedAudioTrackIndex}
            onAudioTrackChange={changeAudioTrack}
            isAudioPickerOpen={isAudioPickerOpen}
            onAudioPickerOpenChange={setIsAudioPickerOpen}
          />
        )}
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  surface: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  captions: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 2,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
