import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { scaledPixels, colors, safeZones, JellyfinClient } from '@multi-tv/shared-ui';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';

/** Target height of the expanded info panel; exported so the screen can reserve
 * bottom scroll padding for the last row's panel. */
export const PANEL_HEIGHT = scaledPixels(380);

const BACKDROP_HEIGHT = scaledPixels(300);

// 1 minute = 60s × 10,000,000 (100ns ticks). Note: this is RunTimeTicks (ticks),
// NOT the seconds-based duration param used by DetailsScreen.
const TICKS_PER_MINUTE = 600_000_000;

const formatRuntime = (ticks?: number | null): string | undefined => {
  if (!ticks) return undefined;
  const totalMinutes = Math.round(ticks / TICKS_PER_MINUTE);
  if (totalMinutes <= 0) return undefined;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const buildMetaLine = (item: BaseItemDto): string =>
  [
    item.ProductionYear?.toString(),
    item.OfficialRating ?? undefined,
    formatRuntime(item.RunTimeTicks),
    item.CommunityRating != null ? `★ ${item.CommunityRating.toFixed(1)}` : undefined,
  ]
    .filter(Boolean)
    .join('   ·   ');

const DEBOUNCE_MS = 280;

type RowInfoPanelProps = {
  item: BaseItemDto | null;
  progress: Animated.Value;
};

/**
 * Info panel that animates open below a row's poster strip. Height is driven by the
 * parent's `progress` value (0↔1); content fades in on the back half of the open.
 * The backdrop + metadata reflect a *debounced* committed item so fast left/right
 * navigation never thrashes image loads.
 */
function RowInfoPanel({ item, progress }: RowInfoPanelProps) {
  const [committed, setCommitted] = useState<BaseItemDto | null>(item);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Debounce the committed item — only load a new backdrop once navigation settles.
  useEffect(() => {
    if (!item || item.Id === committed?.Id) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCommitted(item), DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [item, committed?.Id]);

  // Crossfade the backdrop whenever the committed item changes (skip the first mount,
  // since the panel-height open already fades the whole panel in).
  const fade = useRef(new Animated.Value(1)).current;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [committed?.Id, fade]);

  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [0, PANEL_HEIGHT] });
  const opacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  const backdropUri = committed?.Id ? JellyfinClient.getItemBackdropUrl(committed) : undefined;
  const genres = committed?.Genres?.slice(0, 4) ?? [];
  const metaLine = committed ? buildMetaLine(committed) : '';

  return (
    <Animated.View style={[styles.panel, { height }]}>
      <Animated.View style={[styles.inner, { opacity }]}>
        <Animated.Image
          source={backdropUri ? { uri: backdropUri } : undefined}
          style={[styles.backdrop, { opacity: fade }]}
          resizeMode="cover"
        />
        <View style={styles.textColumn}>
          {!!committed?.Name && (
            <Text style={styles.title} numberOfLines={1}>
              {committed.Name}
            </Text>
          )}
          {!!metaLine && <Text style={styles.metaLine}>{metaLine}</Text>}
          {genres.length > 0 && (
            <View style={styles.genresRow}>
              {genres.map((genre, index) => (
                <View key={`${genre}-${index}`} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          )}
          {!!committed?.Overview && (
            <Text style={styles.overview} numberOfLines={4}>
              {committed.Overview}
            </Text>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default React.memo(RowInfoPanel);

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
    paddingTop: scaledPixels(20),
  },
  inner: {
    flexDirection: 'row',
  },
  backdrop: {
    height: BACKDROP_HEIGHT,
    aspectRatio: 16 / 9,
    borderRadius: scaledPixels(12),
    backgroundColor: colors.card,
  },
  textColumn: {
    flex: 1,
    paddingStart: scaledPixels(40),
  },
  title: {
    fontSize: scaledPixels(40),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: scaledPixels(12),
  },
  metaLine: {
    fontSize: scaledPixels(22),
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: scaledPixels(16),
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaledPixels(12),
    marginBottom: scaledPixels(16),
  },
  genreTag: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: scaledPixels(16),
    paddingVertical: scaledPixels(8),
    borderRadius: scaledPixels(20),
    borderWidth: scaledPixels(1),
    borderColor: colors.focusBorder,
  },
  genreText: {
    fontSize: scaledPixels(18),
    color: colors.text,
    fontWeight: '600',
  },
  overview: {
    fontSize: scaledPixels(24),
    lineHeight: scaledPixels(34),
    color: colors.text,
  },
});
