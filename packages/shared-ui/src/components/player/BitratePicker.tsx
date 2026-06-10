import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SpatialNavigationFocusableView, DefaultFocus, SpatialNavigationRoot, SpatialNavigationScrollView } from "react-tv-space-navigation";
import { scaledPixels } from "../../hooks/useScale";
import { colors } from "../../theme/colors";
import { DEFAULT_MAX_BITRATE } from "../../services/JellyfinClient";

export interface BitrateOption {
  /** Target streaming bitrate in bits/second. */
  value: number;
  label: string;
}

// "Max" is the h264 hardware decode ceiling (see DEFAULT_MAX_BITRATE); the rest
// step down for bandwidth/buffering relief. Steps at or above Max are dropped.
export const BITRATE_OPTIONS: BitrateOption[] = [
  { value: DEFAULT_MAX_BITRATE, label: "Max (30 Mbps)" },
  { value: 20_000_000, label: "20 Mbps" },
  { value: 12_000_000, label: "12 Mbps" },
  { value: 8_000_000, label: "8 Mbps" },
  { value: 4_000_000, label: "4 Mbps" },
  { value: 2_000_000, label: "2 Mbps" },
  { value: 1_000_000, label: "1 Mbps" },
].filter((o) => o.value <= DEFAULT_MAX_BITRATE);

interface BitratePickerButtonProps {
  currentOption: BitrateOption | undefined;
  onOpen: () => void;
}

interface BitratePickerModalProps {
  visible: boolean;
  options: BitrateOption[];
  selectedValue: number;
  onSelect: (value: number) => void;
  onClose: () => void;
}

export const BitratePickerButton = React.memo(({ currentOption, onOpen }: BitratePickerButtonProps) => (
  <SpatialNavigationFocusableView onSelect={onOpen}>
    {({ isFocused }) => (
      <View style={[styles.triggerButton, isFocused && styles.triggerButtonFocused]}>
        <Text style={[styles.triggerLabel, isFocused && styles.triggerLabelFocused]}>
          Quality
        </Text>
        <Text style={[styles.triggerValue, isFocused && styles.triggerValueFocused]} numberOfLines={1}>
          {currentOption?.label ?? '—'}
        </Text>
      </View>
    )}
  </SpatialNavigationFocusableView>
));

export const BitratePickerModal = React.memo(({
  visible,
  options,
  selectedValue,
  onSelect,
  onClose,
}: BitratePickerModalProps) => {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.backdrop} />
      <SpatialNavigationRoot isActive={visible}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Quality</Text>
          <SpatialNavigationScrollView style={styles.scrollView}>
            <DefaultFocus>
              <View style={styles.trackList}>
                {options.map((option) => (
                  <SpatialNavigationFocusableView
                    key={option.value}
                    onSelect={() => {
                      if (option.value !== selectedValue) {
                        onSelect(option.value);
                      }
                      onClose();
                    }}
                  >
                    {({ isFocused }) => (
                      <View style={[
                        styles.trackItem,
                        option.value === selectedValue && styles.trackItemSelected,
                        isFocused && styles.trackItemFocused,
                      ]}>
                        <Text style={[
                          styles.trackItemLabel,
                          option.value === selectedValue && styles.trackItemLabelSelected,
                          isFocused && styles.trackItemLabelFocused,
                        ]}>
                          {option.label}
                        </Text>
                        {option.value === selectedValue && (
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
  // Cap the list height so long option lists scroll instead of overflowing the
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
