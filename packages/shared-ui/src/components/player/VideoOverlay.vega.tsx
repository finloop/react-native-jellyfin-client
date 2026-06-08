import React, { useEffect, useRef, useMemo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import FocusablePressable from "../FocusablePressable";
import SeekBar from "./SeekBar";
import { AudioTrackPickerButton, AudioTrackPickerModal, AudioTrack } from "./AudioTrackPicker";
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
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  const currentTrack = useMemo(
    () => audioTracks.find((t) => t.index === selectedAudioTrackIndex),
    [audioTracks, selectedAudioTrackIndex],
  );

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  // Close audio picker when overlay hides
  useEffect(() => {
    if (!visible) onAudioPickerOpenChange(false);
  }, [visible, onAudioPickerOpenChange]);

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
        <View style={styles.extendedControls}>
          {audioTracks.length > 1 && (
            <AudioTrackPickerButton
              currentTrack={currentTrack}
              onOpen={() => onAudioPickerOpenChange(true)}
            />
          )}
          <FocusablePressable
            text="Exit"
            onSelect={onExit}
            style={styles.controlButton}
          />
        </View>
      </View>

      <AudioTrackPickerModal
        visible={isAudioPickerOpen}
        tracks={audioTracks}
        selectedIndex={selectedAudioTrackIndex}
        onSelect={onAudioTrackChange ?? (() => {})}
        onClose={() => onAudioPickerOpenChange(false)}
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
