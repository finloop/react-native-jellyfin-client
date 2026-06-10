import React from "react";
import { View, Text, StyleSheet, I18nManager, DimensionValue } from "react-native";
import { scaledPixels } from "../../hooks/useScale";
import { formatTime } from "../../utils/formatTime";

interface SeekBarProps {
  currentTime: number;
  duration: number;
}

const SeekBar = React.memo(({ currentTime, duration }: SeekBarProps) => {
  const percentage = React.useMemo(() => {
    if (!duration) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  const offset = `${percentage}%` as DimensionValue;
  const thumbPosition = I18nManager.isRTL ? { right: offset } : { left: offset };

  return (
    <View>
      <Text style={seekBarStyles.timeLabel}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </Text>
      <View style={seekBarStyles.seekbarContainer}>
        <View style={seekBarStyles.seekbarTrack} />
        <View style={[seekBarStyles.seekbarThumb, thumbPosition]} />
      </View>
    </View>
  );
});

const seekBarStyles = StyleSheet.create({
  timeLabel: {
    color: "#fff",
    fontSize: scaledPixels(24),
    marginBottom: scaledPixels(4),
  },
  seekbarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: scaledPixels(40),
    justifyContent: "center",
  },
  seekbarTrack: {
    width: "100%",
    height: scaledPixels(5),
    backgroundColor: "#888",
    borderRadius: scaledPixels(2.5),
  },
  seekbarThumb: {
    position: "absolute",
    width: scaledPixels(20),
    height: scaledPixels(20),
    borderRadius: scaledPixels(10),
    backgroundColor: "#fff",
  },
});

export default SeekBar;
