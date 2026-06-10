import React, { useCallback } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  SpatialNavigationFocusableView,
  SpatialNavigationVirtualizedList,
} from 'react-tv-space-navigation';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import JellyfinClient from '../services/JellyfinClient';
import LoadingIndicator from './LoadingIndicator';
import { scaledPixels } from '../hooks/useScale';
import { colors } from '../theme';

// A single landscape episode card: the episode's own 16:9 still (NOT the series poster),
// a "S{n}·E{n}" line, the title, and a resume progress bar when partially watched.
const EpisodeCard = React.memo(
  ({ item, isFocused }: { item: BaseItemDto; isFocused: boolean }) => {
    const uri = item.Id ? JellyfinClient.getItemImageUrl(item.Id) : undefined;
    const season = item.ParentIndexNumber;
    const episode = item.IndexNumber;
    const label =
      season != null && episode != null ? `S${season}·E${episode}` : '';

    const position = item.UserData?.PlaybackPositionTicks ?? 0;
    const runtime = item.RunTimeTicks ?? 0;
    const progress = position > 0 && runtime > 0 ? Math.min(1, position / runtime) : 0;

    return (
      <View style={styles.card}>
        <View style={[styles.still, isFocused && styles.stillFocused]}>
          {uri ? (
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.image} />
          )}
          {progress > 0 && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          )}
        </View>
        {label ? (
          <Text style={styles.episodeMeta} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <Text style={styles.episodeTitle} numberOfLines={1}>
          {item.Name ?? ''}
        </Text>
      </View>
    );
  },
);

type EpisodeRowProps = {
  episodes: BaseItemDto[];
  loading: boolean;
  onSelectEpisode: (episode: BaseItemDto) => void;
};

function EpisodeRow({ episodes, loading, onSelectEpisode }: EpisodeRowProps) {
  const renderItem = useCallback(
    ({ item }: { item: BaseItemDto }) => (
      <SpatialNavigationFocusableView onSelect={() => onSelectEpisode(item)}>
        {({ isFocused }) => <EpisodeCard item={item} isFocused={isFocused} />}
      </SpatialNavigationFocusableView>
    ),
    [onSelectEpisode],
  );

  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <LoadingIndicator />
      </View>
    );
  }

  if (episodes.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.emptyText}>No episodes</Text>
      </View>
    );
  }

  return (
    <View style={styles.listWrapper}>
      <SpatialNavigationVirtualizedList
        data={episodes}
        orientation="horizontal"
        renderItem={renderItem}
        itemSize={scaledPixels(380)}
        onEndReachedThresholdItemsNumber={3}
      />
    </View>
  );
}

export default React.memo(EpisodeRow);

const CARD_WIDTH = 340;
const CARD_HEIGHT = 191; // 16:9 still

const styles = StyleSheet.create({
  listWrapper: {
    height: scaledPixels(320),
  },
  stateContainer: {
    height: scaledPixels(320),
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: scaledPixels(24),
  },
  card: {
    width: scaledPixels(CARD_WIDTH),
    marginEnd: scaledPixels(20),
  },
  still: {
    width: scaledPixels(CARD_WIDTH),
    height: scaledPixels(CARD_HEIGHT),
    borderRadius: scaledPixels(12),
    borderWidth: scaledPixels(4),
    borderColor: 'transparent',
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  stillFocused: {
    borderColor: colors.focusBorder,
    transform: [{ scale: 1.05 }],
    shadowColor: colors.focus,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: scaledPixels(20),
    elevation: 15,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.card,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: scaledPixels(6),
    backgroundColor: colors.scrimMedium,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  episodeMeta: {
    color: colors.textSecondary,
    fontSize: scaledPixels(18),
    fontWeight: '600',
    marginTop: scaledPixels(12),
  },
  episodeTitle: {
    color: colors.text,
    fontSize: scaledPixels(22),
    fontWeight: '600',
    marginTop: scaledPixels(4),
  },
});
