import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SpatialNavigationFocusableView, DefaultFocus, SpatialNavigationRoot, SpatialNavigationScrollView } from "react-tv-space-navigation";
import { scaledPixels } from "../../hooks/useScale";
import { colors } from "../../theme/colors";

export interface SubtitleTrack {
  index: number;
  label: string;
}

interface SubtitleTrackPickerButtonProps {
  currentTrack: SubtitleTrack | undefined;
  onOpen: () => void;
}

interface SubtitleTrackPickerModalProps {
  visible: boolean;
  tracks: SubtitleTrack[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export const SubtitleTrackPickerButton = React.memo(({ currentTrack, onOpen }: SubtitleTrackPickerButtonProps) => (
  <SpatialNavigationFocusableView onSelect={onOpen}>
    {({ isFocused }) => (
      <View style={[styles.triggerButton, isFocused && styles.triggerButtonFocused]}>
        <Text style={[styles.triggerLabel, isFocused && styles.triggerLabelFocused]}>
          Subtitles
        </Text>
        <Text style={[styles.triggerValue, isFocused && styles.triggerValueFocused]} numberOfLines={1}>
          {currentTrack?.label ?? 'Off'}
        </Text>
      </View>
    )}
  </SpatialNavigationFocusableView>
));

export const SubtitleTrackPickerModal = React.memo(({
  visible,
  tracks,
  selectedIndex,
  onSelect,
  onClose,
}: SubtitleTrackPickerModalProps) => {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.backdrop} />
      <SpatialNavigationRoot isActive={visible}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Subtitles</Text>
          <SpatialNavigationScrollView style={styles.scrollView}>
            <DefaultFocus>
              <View style={styles.trackList}>
                {tracks.map((track) => (
                  <SpatialNavigationFocusableView
                    key={track.index}
                    onSelect={() => {
                      if (track.index !== selectedIndex) {
                        onSelect(track.index);
                      }
                      onClose();
                    }}
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
            </DefaultFocus>
          </SpatialNavigationScrollView>
        </View>
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
  // Cap the list height so long subtitle lists scroll instead of overflowing the
  // screen; SpatialNavigationScrollView keeps the focused row in view.
  scrollView: {
    maxHeight: scaledPixels(600),
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
