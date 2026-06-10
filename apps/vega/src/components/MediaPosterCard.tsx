import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { scaledPixels, colors, JellyfinClient } from '@multi-tv/shared-ui';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';

const POSTER_RATIO = 350 / 220; // portrait poster aspect, matches the Home row card
const DEFAULT_WIDTH = 220;

type Props = {
  item: BaseItemDto;
  isFocused: boolean;
  /** Poster width in px. Defaults to the Home row's fixed 220 (scaled). The Libraries
   *  grid passes a computed width so each row fills the available space. */
  width?: number;
  /** Render the item title (+ year) below the poster (Libraries grid). */
  showTitle?: boolean;
};

/**
 * Portrait poster tile shared by the Home rows and the Libraries item grid.
 *
 * Episodes carry their show in SeriesId — prefer the series' portrait poster over the
 * episode's wide still so every card keeps a consistent portrait shape. `getItemImageUrl`
 * always returns a URL string (even when the item has no image), so we fall back to a
 * solid card via `onError` rather than a truthiness check on the URI.
 */
const MediaPosterCard = React.memo(({ item, isFocused, width, showTitle }: Props) => {
  const [failed, setFailed] = useState(false);
  const posterId = item.SeriesId ?? item.Id;
  const uri = posterId ? JellyfinClient.getItemImageUrl(posterId) : undefined;
  const w = width ?? scaledPixels(DEFAULT_WIDTH);
  const h = w * POSTER_RATIO;
  return (
    <View style={[styles.container, { width: w }]}>
      <View
        style={[styles.thumbnail, { width: w, height: h }, isFocused && styles.thumbnailFocused]}
      >
        {uri && !failed ? (
          <Image
            source={{ uri }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={styles.cardImage} />
        )}
      </View>
      {showTitle ? (
        <View style={styles.titleWrap}>
          <Text style={[styles.title, isFocused && styles.titleFocused]} numberOfLines={1}>
            {item.Name ?? ''}
          </Text>
          {item.ProductionYear ? <Text style={styles.year}>{item.ProductionYear}</Text> : null}
        </View>
      ) : null}
    </View>
  );
});

MediaPosterCard.displayName = 'MediaPosterCard';

export default MediaPosterCard;

const styles = StyleSheet.create({
  container: {
    marginEnd: scaledPixels(20),
  },
  thumbnail: {
    backgroundColor: colors.card,
    borderRadius: scaledPixels(12),
    borderWidth: scaledPixels(5),
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailFocused: {
    borderColor: colors.focusBorder,
    borderWidth: scaledPixels(6),
    transform: [{ scale: 1.08 }],
    shadowColor: colors.focus,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: scaledPixels(20),
    elevation: 15,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: scaledPixels(8),
    backgroundColor: colors.card,
  },
  titleWrap: {
    marginTop: scaledPixels(12),
  },
  title: {
    color: colors.textSecondary,
    fontSize: scaledPixels(24),
    fontWeight: '600',
  },
  titleFocused: {
    color: colors.text,
  },
  year: {
    color: colors.textSecondary,
    fontSize: scaledPixels(20),
    marginTop: scaledPixels(4),
    opacity: 0.7,
  },
});
