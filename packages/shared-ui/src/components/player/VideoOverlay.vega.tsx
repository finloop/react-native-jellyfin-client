import React, { useEffect, useRef, useMemo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import FocusablePressable from "../FocusablePressable";
import SeekBar from "./SeekBar";
import { SpatialNavigationNode, SpatialNavigationView } from 'react-tv-space-navigation';
import { AudioTrackPickerButton, AudioTrackPickerModal, AudioTrack } from "./AudioTrackPicker";
import { SubtitleTrackPickerButton, SubtitleTrackPickerModal, SubtitleTrack } from "./SubtitleTrackPicker";
import { BitratePickerButton, BitratePickerModal, BitrateOption } from "./BitratePicker";
import LoadingIndicator from "../LoadingIndicator";
import { scaledPixels } from "../../hooks/useScale";
import { safeZones } from "../../theme";

interface VideoOverlayProps {
  visible: boolean;
  paused: boolean;
  onPlayPause: () => void;
  onExit: () => void;
  currentTime: number;
  duration: number;
  isBuffering?: boolean;
  audioTracks?: AudioTrack[];
  selectedAudioTrackIndex?: number;
  onAudioTrackChange?: (index: number) => void;
  isAudioPickerOpen: boolean;
  onAudioPickerOpenChange: (open: boolean) => void;
  subtitleTracks?: SubtitleTrack[];
  selectedSubtitleStreamIndex?: number;
  onSubtitleTrackChange?: (index: number) => void;
  isSubtitlePickerOpen: boolean;
  onSubtitlePickerOpenChange: (open: boolean) => void;
  bitrateOptions?: BitrateOption[];
  selectedBitrate?: number;
  onBitrateChange?: (value: number) => void;
  isBitratePickerOpen?: boolean;
  onBitratePickerOpenChange?: (open: boolean) => void;
}

const VideoOverlay: React.FC<VideoOverlayProps> = React.memo(({
  visible,
  paused,
  onPlayPause,
  onExit,
  currentTime,
  duration,
  isBuffering = false,
  audioTracks = [],
  selectedAudioTrackIndex = 0,
  onAudioTrackChange,
  isAudioPickerOpen,
  onAudioPickerOpenChange,
  subtitleTracks = [],
  selectedSubtitleStreamIndex = -1,
  onSubtitleTrackChange,
  isSubtitlePickerOpen,
  onSubtitlePickerOpenChange,
  bitrateOptions = [],
  selectedBitrate = 0,
  onBitrateChange,
  isBitratePickerOpen = false,
  onBitratePickerOpenChange = () => {},
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  const currentTrack = useMemo(
    () => audioTracks.find((t) => t.index === selectedAudioTrackIndex),
    [audioTracks, selectedAudioTrackIndex],
  );

  const currentSubtitleTrack = useMemo(
    () => subtitleTracks.find((t) => t.index === selectedSubtitleStreamIndex),
    [subtitleTracks, selectedSubtitleStreamIndex],
  );

  const currentBitrateOption = useMemo(
    () => bitrateOptions.find((o) => o.value === selectedBitrate),
    [bitrateOptions, selectedBitrate],
  );

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  // Close pickers when overlay hides
  useEffect(() => {
    if (!visible) {
      onAudioPickerOpenChange(false);
      onSubtitlePickerOpenChange(false);
      onBitratePickerOpenChange(false);
    }
  }, [visible, onAudioPickerOpenChange, onSubtitlePickerOpenChange, onBitratePickerOpenChange]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {isBuffering && <LoadingIndicator />}

      <FocusablePressable
        text="Exit"
        onSelect={onExit}
        style={styles.exitButton}
      />

      <View style={styles.bottomControls}>
        <SeekBar currentTime={currentTime} duration={duration} />
        <SpatialNavigationView style={styles.extendedControls} direction="horizontal" >
          <SpatialNavigationNode>
              <AudioTrackPickerButton
                currentTrack={currentTrack}
                onOpen={() => onAudioPickerOpenChange(true)}
              />
          </SpatialNavigationNode>
          {subtitleTracks.length > 0 && (
            <SpatialNavigationNode>
                <SubtitleTrackPickerButton
                  currentTrack={currentSubtitleTrack}
                  onOpen={() => onSubtitlePickerOpenChange(true)}
                />
            </SpatialNavigationNode>
          )}
          {bitrateOptions.length > 0 && (
            <SpatialNavigationNode>
                <BitratePickerButton
                  currentOption={currentBitrateOption}
                  onOpen={() => onBitratePickerOpenChange(true)}
                />
            </SpatialNavigationNode>
          )}
        </SpatialNavigationView>
      </View>

      <AudioTrackPickerModal
        visible={isAudioPickerOpen}
        tracks={audioTracks}
        selectedIndex={selectedAudioTrackIndex}
        onSelect={onAudioTrackChange ?? (() => {})}
        onClose={() => onAudioPickerOpenChange(false)}
      />

      <SubtitleTrackPickerModal
        visible={isSubtitlePickerOpen}
        tracks={subtitleTracks}
        selectedIndex={selectedSubtitleStreamIndex}
        onSelect={onSubtitleTrackChange ?? (() => {})}
        onClose={() => onSubtitlePickerOpenChange(false)}
      />

      <BitratePickerModal
        visible={isBitratePickerOpen}
        options={bitrateOptions}
        selectedValue={selectedBitrate}
        onSelect={onBitrateChange ?? (() => {})}
        onClose={() => onBitratePickerOpenChange(false)}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "space-between",
    zIndex: 10,
  },
  exitButton: {
    marginTop: scaledPixels(safeZones.actionSafe.vertical),
    marginLeft: scaledPixels(safeZones.actionSafe.horizontal),
  },
  bottomControls: {
    marginBottom: scaledPixels(safeZones.actionSafe.vertical),
    marginLeft: scaledPixels(safeZones.actionSafe.horizontal),
    marginRight: scaledPixels(safeZones.actionSafe.horizontal),
    flexDirection: "column",
  },
  extendedControls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: scaledPixels(16),
    gap: scaledPixels(12),
  },
  controlButton: {
    marginTop: 0,
    marginLeft: 0,
  },
});

export default VideoOverlay;
