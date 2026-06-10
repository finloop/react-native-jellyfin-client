import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { scaledPixels, colors, JellyfinClient } from '@multi-tv/shared-ui';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';

/**
 * Landscape tile for a Jellyfin library (a "user view"), matching the Jellyfin-web
 * Libraries look: a 16:9 image with the library name below. `getItemImageUrl` always
 * returns a URL string, so we fall back to a solid card via `onError`.
 */
const LibraryCard = React.memo(
  ({ library, isFocused }: { library: BaseItemDto; isFocused: boolean }) => {
    const [failed, setFailed] = useState(false);
    const uri = library.Id ? JellyfinClient.getItemImageUrl(library.Id) : undefined;
    return (
      <View style={styles.container}>
        <View style={[styles.thumbnail, isFocused && styles.thumbnailFocused]}>
          {uri && !failed ? (
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setFailed(true)}
            />
          ) : (
            <View style={styles.image} />
          )}
        </View>
        <Text style={[styles.label, isFocused && styles.labelFocused]} numberOfLines={1}>
          {library.Name ?? ''}
        </Text>
      </View>
    );
  },
);

LibraryCard.displayName = 'LibraryCard';

export default LibraryCard;

const styles = StyleSheet.create({
  container: {
    width: scaledPixels(400),
    marginEnd: scaledPixels(24),
  },
  thumbnail: {
    width: scaledPixels(400),
    height: scaledPixels(225),
    backgroundColor: colors.card,
    borderRadius: scaledPixels(12),
    borderWidth: scaledPixels(5),
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailFocused: {
    borderColor: colors.focusBorder,
    borderWidth: scaledPixels(6),
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
    borderRadius: scaledPixels(8),
    backgroundColor: colors.card,
  },
  label: {
    color: colors.textSecondary,
    fontSize: scaledPixels(26),
    fontWeight: '600',
    marginTop: scaledPixels(14),
    width: scaledPixels(400),
  },
  labelFocused: {
    color: colors.text,
  },
});
