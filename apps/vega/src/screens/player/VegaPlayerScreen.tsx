import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SpatialNavigationRoot } from 'react-tv-space-navigation';
import { useIsFocused } from '@amazon-devices/react-navigation__native';
import { useNavigation, useRoute, RouteProp } from '@amazon-devices/react-navigation__native';
import { NativeStackNavigationProp } from '@amazon-devices/react-navigation__native-stack';
import {
  IKeplerAppStateManager,
  useKeplerAppStateManager,
} from '@amazon-devices/react-native-kepler';
import {
  KeplerVideoSurfaceView,
  KeplerCaptionsView,
} from '@amazon-devices/react-native-w3cmedia';
import VideoOverlay from '@multi-tv/shared-ui/src/components/player/VideoOverlay.vega';
import ExitButton from '@multi-tv/shared-ui/src/components/player/ExitButton';
import { BITRATE_OPTIONS } from '@multi-tv/shared-ui/src/components/player/BitratePicker';
import JellyfinClient, { DEFAULT_MAX_BITRATE } from '@multi-tv/shared-ui/src/services/JellyfinClient';
import { ticksToSeconds } from '@multi-tv/shared-ui/src/utils/ticks';
import { RootStackParamList } from '../../navigation/types';
import { useVideoPlayer } from './useVideoPlayer';
import { useControlsVisibility } from './useControlsVisibility';
import { usePlayerRemoteControl } from './usePlayerRemoteControl';
import { usePlaybackReporting } from './usePlaybackReporting';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;

export default function VegaPlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { movie, audioTracks = [], subtitleTracks = [], itemId, accessToken, userId, resumePositionTicks, runTimeTicks } =
    route.params;
  const isFocused = useIsFocused();

  // Session identifiers are stateful: an audio-track switch re-resolves a fresh
  // PlaySessionId/MediaSourceId that the reporting hook needs to pick up.
  const [playSessionId, setPlaySessionId] = useState(route.params.playSessionId);
  const [mediaSourceId, setMediaSourceId] = useState(route.params.mediaSourceId);
  const resumeSeconds = ticksToSeconds(resumePositionTicks ?? 0);

  const keplerAppStateManager: IKeplerAppStateManager = useKeplerAppStateManager();
  const componentInstance = keplerAppStateManager.getComponentInstance();

  const {
    controller,
    paused,
    isVideoBuffering,
    isPlayerReady,
    isVideoInitialized,
    isVideoEnded,
    isVideoError,
    currentTime,
    duration,
    scrubTime,
  } = useVideoPlayer(movie, componentInstance);

  const { controlsVisible, showControls } = useControlsVisibility();

  // Seed from the indices Jellyfin actually resolved (it may pick a default audio
  // track or a forced/default subtitle), so the pickers match what's playing.
  const [selectedAudioTrackIndex, setSelectedAudioTrackIndex] = useState(
    route.params.audioStreamIndex ?? audioTracks.find((t) => t)?.index ?? 0,
  );
  const [isAudioPickerOpen, setIsAudioPickerOpen] = useState(false);

  // -1 = subtitles off. Selecting a subtitle reloads with it burned in.
  const [selectedSubtitleStreamIndex, setSelectedSubtitleStreamIndex] = useState(
    route.params.subtitleStreamIndex ?? -1,
  );
  const [isSubtitlePickerOpen, setIsSubtitlePickerOpen] = useState(false);

  // Streaming bitrate. Seeds to the h264 hardware ceiling (the default the initial
  // resolve uses); selecting a lower value reloads a fresh transcode at that cap.
  const [selectedBitrate, setSelectedBitrate] = useState(DEFAULT_MAX_BITRATE);
  const [isBitratePickerOpen, setIsBitratePickerOpen] = useState(false);

  const togglePausePlay = useCallback(() => {
    controller.togglePausePlay();
    showControls();
  }, [controller, showControls]);

  const fastForward = useCallback(() => {
    controller.scrubBy(1);
    showControls();
  }, [controller, showControls]);

  const rewind = useCallback(() => {
    controller.scrubBy(-1);
    showControls();
  }, [controller, showControls]);

  const navigateBack = useCallback(() => {
    controller.destroy();
    setTimeout(() => navigation.goBack(), 300);
  }, [navigation, controller]);

  // Audio, subtitle and bitrate all switch by re-resolving a fresh transcode (with
  // the subtitle burned in) and reloading the player at the current position. All
  // three params are always re-sent so changing one never resets the others.
  const reloadWithStreams = useCallback(
    async (audioIndex: number, subtitleIndex: number, maxBitrate: number) => {
      if (!accessToken || !userId || !itemId) return;

      const seekTarget = controller.getCurrentTime();
      try {
        const resolution = await JellyfinClient.getPlaybackUrl(
          accessToken,
          userId,
          itemId,
          audioIndex,
          subtitleIndex,
          maxBitrate,
        );
        setPlaySessionId(resolution.playSessionId);
        setMediaSourceId(resolution.mediaSourceId);
        // Await teardown before re-init: the old decoder must be fully released
        // before a new VideoPlayer is created (single decoder instance on Vega).
        await controller.destroy();
        await controller.init(resolution.url, seekTarget);
      } catch (e) {
        console.error('[VegaPlayerScreen] Failed to reload streams', e);
      }
    },
    [accessToken, userId, itemId, controller],
  );

  const changeAudioTrack = useCallback(
    (newTrackIndex: number) => {
      setSelectedAudioTrackIndex(newTrackIndex);
      reloadWithStreams(newTrackIndex, selectedSubtitleStreamIndex, selectedBitrate);
    },
    [reloadWithStreams, selectedSubtitleStreamIndex, selectedBitrate],
  );

  const changeSubtitleTrack = useCallback(
    (newIndex: number) => {
      setSelectedSubtitleStreamIndex(newIndex);
      reloadWithStreams(selectedAudioTrackIndex, newIndex, selectedBitrate);
    },
    [reloadWithStreams, selectedAudioTrackIndex, selectedBitrate],
  );

  const changeBitrate = useCallback(
    (newBitrate: number) => {
      setSelectedBitrate(newBitrate);
      reloadWithStreams(selectedAudioTrackIndex, selectedSubtitleStreamIndex, newBitrate);
    },
    [reloadWithStreams, selectedAudioTrackIndex, selectedSubtitleStreamIndex],
  );

  useEffect(() => {
    if (!isFocused) return;
    controller.init(movie, resumeSeconds);
    return controller.destroy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie, isFocused]);

  // Vega's Lifecycle Manager kills apps that hold media (decoder) resources while
  // backgrounded, so release the player on background and re-acquire on return.
  // Position is retained by the controller; the prior HLS transcode session may
  // have been reaped server-side, so we re-resolve a fresh URL to resume in place.
  const releasedForBackgroundRef = useRef(false);
  useEffect(() => {
    const subscription = keplerAppStateManager.addAppStateListener('change', (state) => {
      if (state === 'background' && !releasedForBackgroundRef.current) {
        releasedForBackgroundRef.current = true;
        controller.releaseForBackground();
      } else if (state === 'active' && releasedForBackgroundRef.current) {
        releasedForBackgroundRef.current = false;
        reloadWithStreams(selectedAudioTrackIndex, selectedSubtitleStreamIndex, selectedBitrate);
      }
    });
    return () => subscription.remove();
  }, [
    keplerAppStateManager,
    controller,
    reloadWithStreams,
    selectedAudioTrackIndex,
    selectedSubtitleStreamIndex,
    selectedBitrate,
  ]);

  usePlaybackReporting({
    itemId,
    accessToken,
    userId,
    playSessionId,
    mediaSourceId,
    audioStreamIndex: selectedAudioTrackIndex,
    subtitleStreamIndex: selectedSubtitleStreamIndex,
    runTimeTicks,
    paused,
    duration,
    isVideoInitialized,
    isVideoEnded,
    getCurrentTime: controller.getCurrentTime,
  });

  useEffect(() => {
    if (isVideoEnded) navigateBack();
  }, [isVideoEnded, navigateBack]);

  useEffect(() => {
    if (isVideoInitialized && duration > 0) showControls();
  }, [isVideoInitialized, duration, showControls]);

  usePlayerRemoteControl({
    onFastForward: fastForward,
    onRewind: rewind,
    onTogglePausePlay: togglePausePlay,
    onShowControls: showControls,
    onBack: navigateBack,
    isPickerOpen: isAudioPickerOpen || isSubtitlePickerOpen || isBitratePickerOpen,
    onClosePicker: () => {
      setIsAudioPickerOpen(false);
      setIsSubtitlePickerOpen(false);
      setIsBitratePickerOpen(false);
    },
  });

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
    <SpatialNavigationRoot isActive={isFocused && !isAudioPickerOpen && !isSubtitlePickerOpen && !isBitratePickerOpen}>
      <View style={styles.container}>
        {isPlayerReady && (
          <>
            <KeplerVideoSurfaceView
              style={styles.surface}
              onSurfaceViewCreated={controller.attachSurface}
              onSurfaceViewDestroyed={controller.detachSurface}
            />
            <KeplerCaptionsView
              style={styles.captions}
              onCaptionViewCreated={controller.attachCaption}
              onCaptionViewDestroyed={controller.detachCaption}
              show={false}
            />
          </>
        )}
        {duration > 0 && (
          <VideoOverlay
            visible={controlsVisible}
            paused={paused}
            onPlayPause={togglePausePlay}
            onExit={navigateBack}
            currentTime={scrubTime ?? currentTime}
            duration={duration}
            isBuffering={isVideoBuffering}
            audioTracks={audioTracks}
            selectedAudioTrackIndex={selectedAudioTrackIndex}
            onAudioTrackChange={changeAudioTrack}
            isAudioPickerOpen={isAudioPickerOpen}
            onAudioPickerOpenChange={setIsAudioPickerOpen}
            subtitleTracks={subtitleTracks}
            selectedSubtitleStreamIndex={selectedSubtitleStreamIndex}
            onSubtitleTrackChange={changeSubtitleTrack}
            isSubtitlePickerOpen={isSubtitlePickerOpen}
            onSubtitlePickerOpenChange={setIsSubtitlePickerOpen}
            bitrateOptions={BITRATE_OPTIONS}
            selectedBitrate={selectedBitrate}
            onBitrateChange={changeBitrate}
            isBitratePickerOpen={isBitratePickerOpen}
            onBitratePickerOpenChange={setIsBitratePickerOpen}
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
