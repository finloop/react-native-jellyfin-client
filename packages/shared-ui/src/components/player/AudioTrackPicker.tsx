import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SpatialNavigationFocusableView, DefaultFocus, SpatialNavigationRoot } from "react-tv-space-navigation";
import { scaledPixels } from "../../hooks/useScale";
import { colors } from "../../theme/colors";

export interface AudioTrack {
  index: number;
  label: string;
}

interface AudioTrackPickerButtonProps {
  currentTrack: AudioTrack | undefined;
  onOpen: () => void;
}

interface AudioTrackPickerModalProps {
  visible: boolean;
  tracks: AudioTrack[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export const AudioTrackPickerButton = React.memo(({ currentTrack, onOpen }: AudioTrackPickerButtonProps) => (
  <SpatialNavigationFocusableView onSelect={onOpen}>
    {({ isFocused }) => (
      <View style={[styles.triggerButton, isFocused && styles.triggerButtonFocused]}>
        <Text style={[styles.triggerLabel, isFocused && styles.triggerLabelFocused]}>
          Audio
        </Text>
        <Text style={[styles.triggerValue, isFocused && styles.triggerValueFocused]} numberOfLines={1}>
          {currentTrack?.label ?? '—'}
        </Text>
      </View>
    )}
  </SpatialNavigationFocusableView>
));

export const AudioTrackPickerModal = React.memo(({
  visible,
  tracks,
  selectedIndex,
  onSelect,
  onClose,
}: AudioTrackPickerModalProps) => {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.backdrop} />
      <SpatialNavigationRoot isActive={visible}>
        <DefaultFocus>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Audio Track</Text>
            <View style={styles.trackList}>
              {tracks.map((track) => (
                <SpatialNavigationFocusableView
                  key={track.index}
                  onSelect={() => { onSelect(track.index); onClose(); }}
                >
                  {({ isFocused }) => (
                    <View style={[
                      styles.trackItem,
                      track.index === selectedIndex && styles.trackItemSelected,
                      isFocused && styles.trackItemFocused,
                    ]}>
                      <Text style={[
                        styles.trackItemLabel,
                        track.index === selectedIndex && styles.trackItemLabelSelected,
                        isFocused && styles.trackItemLabelFocused,
                      ]}>
                        {track.label}
                      </Text>
                      {track.index === selectedIndex && (
                        <Text style={[styles.checkmark, isFocused && styles.checkmarkFocused]}>✓</Text>
                      )}
                    </View>
                  )}
                </SpatialNavigationFocusableView>
              ))}
            </View>
          </View>
        </DefaultFocus>
      </SpatialNavigationRoot>
    </View>
  );
});

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaledPixels(8),
    paddingVertical: scaledPixels(10),
    paddingHorizontal: scaledPixels(24),
    borderRadius: scaledPixels(6),
    borderWidth: scaledPixels(2),
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
  },
  triggerButtonFocused: {
    borderColor: colors.focusBorder,
    backgroundColor: colors.focusBackground,
    transform: [{ scale: 1.05 }],
  },
  triggerLabel: {
    color: colors.textSecondary,
    fontSize: scaledPixels(18),
    fontWeight: "600",
  },
  triggerLabelFocused: {
    color: colors.textOnPrimary,
  },
  triggerValue: {
    color: colors.text,
    fontSize: scaledPixels(18),
  },
  triggerValueFocused: {
    color: colors.textOnPrimary,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimMedium,
  },
  panel: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: scaledPixels(12),
    borderWidth: scaledPixels(1),
    borderColor: colors.border,
    paddingVertical: scaledPixels(24),
    paddingHorizontal: scaledPixels(32),
    minWidth: scaledPixels(400),
    maxWidth: scaledPixels(700),
  },
  panelTitle: {
    color: colors.textSecondary,
    fontSize: scaledPixels(22),
    fontWeight: "700",
    marginBottom: scaledPixels(20),
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  trackList: {
    gap: scaledPixels(8),
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: scaledPixels(14),
    paddingHorizontal: scaledPixels(20),
    borderRadius: scaledPixels(8),
    borderWidth: scaledPixels(2),
    borderColor: "transparent",
    backgroundColor: colors.card,
  },
  trackItemSelected: {
    borderColor: colors.primary,
  },
  trackItemFocused: {
    borderColor: colors.focusBorder,
    backgroundColor: colors.focusBackground,
    transform: [{ scale: 1.02 }],
  },
  trackItemLabel: {
    color: colors.text,
    fontSize: scaledPixels(22),
    fontWeight: "500",
  },
  trackItemLabelSelected: {
    color: colors.primary,
    fontWeight: "700",
  },
  trackItemLabelFocused: {
    color: colors.textOnPrimary,
    fontWeight: "700",
  },
  checkmark: {
    color: colors.primary,
    fontSize: scaledPixels(22),
    fontWeight: "700",
  },
  checkmarkFocused: {
    color: colors.textOnPrimary,
  },
});
