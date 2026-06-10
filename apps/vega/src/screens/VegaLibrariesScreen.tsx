import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@amazon-devices/react-navigation__native';
import type { NativeStackNavigationProp } from '@amazon-devices/react-navigation__native-stack';
import {
  SpatialNavigationRoot,
  SpatialNavigationFocusableView,
  DefaultFocus,
} from 'react-tv-space-navigation';
import { scaledPixels, colors, JellyfinClient } from '@multi-tv/shared-ui';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import type { RootStackParamList } from '../navigation/types';
import type { RootState, AppDispatch } from '../store';
import { fetchLibraries, fetchLibraryItems } from '../store/jellyfinSlice';
import { useContentFocusRoot } from '../hooks/useContentFocusRoot';
import { useLibrariesBackHandler } from '../hooks/useLibrariesBackHandler';
import MediaGrid, { GRID_H_INSET, GRID_ITEM_GAP } from '../components/MediaGrid';
import LibraryCard from '../components/LibraryCard';
import MediaPosterCard from '../components/MediaPosterCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

// Collection types whose items the shared Details screen can render (video libraries).
const VIDEO_COLLECTION_TYPES = new Set(['movies', 'tvshows', 'homevideos']);

// Item-grid layout, derived from screen width so each row fills the safe-zone width
// (the grid only chunks rows — cell width comes from the card itself).
const ITEM_COLUMNS = 6;
const ITEM_CARD_WIDTH =
  (Dimensions.get('window').width - 2 * GRID_H_INSET) / ITEM_COLUMNS - GRID_ITEM_GAP;
const ITEM_POSTER_HEIGHT = ITEM_CARD_WIDTH * (350 / 220);
// Poster + title/year block + focus-scale headroom.
const ITEM_ROW_HEIGHT = ITEM_POSTER_HEIGHT + scaledPixels(120);

/** Centered text takeover for the brief load before a grid mounts (mirrors Home). */
function CenteredText({ text }: { text: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

/** Focusable empty-state card, so focus has a home and Up still returns to the bar. */
function EmptyState({ text, onSelect }: { text: string; onSelect: () => void }) {
  return (
    <View style={styles.centered}>
      <DefaultFocus>
        <SpatialNavigationFocusableView onSelect={onSelect}>
          {({ isFocused }) => (
            <View style={[styles.emptyCard, isFocused && styles.emptyCardFocused]}>
              <Text style={styles.emptyText}>{text}</Text>
            </View>
          )}
        </SpatialNavigationFocusableView>
      </DefaultFocus>
    </View>
  );
}

/**
 * The Libraries tab. A two-level view held in local state: with no library selected it
 * shows a grid of the (video) libraries; selecting one shows a grid of that library's
 * items. Both render under one `SpatialNavigationRoot` so Up always returns to the top
 * bar; Back drops from the items grid back to the libraries grid (see
 * `useLibrariesBackHandler`). Selecting an item opens the shared Details screen.
 */
export default function VegaLibrariesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { isActive, onDirectionHandledWithoutMovement } = useContentFocusRoot();

  const {
    accessToken,
    userId,
    libraries,
    libraryItems,
    isLibraryItemsLoading,
    isLibrariesLoading,
  } = useSelector((state: RootState) => state.jellyfin);

  const [selectedLibrary, setSelectedLibrary] = useState<BaseItemDto | null>(null);

  const videoLibraries = useMemo(
    () => libraries.filter((l) => l.CollectionType && VIDEO_COLLECTION_TYPES.has(l.CollectionType)),
    [libraries],
  );

  // Home usually loads libraries already (persisted); fetch only if none are present.
  useEffect(() => {
    if (accessToken && userId && libraries.length === 0) {
      dispatch(fetchLibraries());
    }
  }, [accessToken, userId, libraries.length, dispatch]);

  const handleSelectLibrary = useCallback(
    (library: BaseItemDto) => {
      if (!library.Id) return;
      setSelectedLibrary(library);
      if (!libraryItems[library.Id]) {
        dispatch(
          fetchLibraryItems({ libraryId: library.Id, collectionType: library.CollectionType }),
        );
      }
    },
    [dispatch, libraryItems],
  );

  const handleSelectItem = useCallback(
    (item: BaseItemDto) => {
      if (!item.Id) return;
      navigation.navigate('Details', {
        title: item.Name ?? '',
        description: item.Overview ?? '',
        headerImage: JellyfinClient.getItemImageUrl(item.Id),
        movie: item.Id,
        accessToken,
        userId,
      });
    },
    [navigation, accessToken, userId],
  );

  const clearSelection = useCallback(() => setSelectedLibrary(null), []);
  useLibrariesBackHandler({ active: !!selectedLibrary && isActive, onBack: clearSelection });

  const renderLibraryCard = useCallback(
    (library: BaseItemDto, isFocused: boolean) => (
      <LibraryCard library={library} isFocused={isFocused} />
    ),
    [],
  );
  const renderPosterCard = useCallback(
    (item: BaseItemDto, isFocused: boolean) => (
      <MediaPosterCard item={item} isFocused={isFocused} width={ITEM_CARD_WIDTH} showTitle />
    ),
    [],
  );

  let content: React.ReactNode;
  if (!selectedLibrary) {
    if (isLibrariesLoading && videoLibraries.length === 0) {
      content = <CenteredText text="Loading libraries..." />;
    } else if (videoLibraries.length === 0) {
      content = <EmptyState text="No libraries found" onSelect={() => {}} />;
    } else {
      content = (
        <MediaGrid
          key="libraries"
          data={videoLibraries}
          numberOfColumns={4}
          itemHeight={scaledPixels(330)}
          renderCard={renderLibraryCard}
          onSelect={handleSelectLibrary}
          title="Libraries"
        />
      );
    }
  } else {
    const items = selectedLibrary.Id ? libraryItems[selectedLibrary.Id] : undefined;
    const loading = selectedLibrary.Id ? isLibraryItemsLoading[selectedLibrary.Id] : false;
    if (!items && loading) {
      content = <CenteredText text="Loading..." />;
    } else if (!items || items.length === 0) {
      content = <EmptyState text="This library is empty" onSelect={clearSelection} />;
    } else {
      content = (
        <MediaGrid
          key={selectedLibrary.Id}
          data={items}
          numberOfColumns={ITEM_COLUMNS}
          itemHeight={ITEM_ROW_HEIGHT}
          renderCard={renderPosterCard}
          onSelect={handleSelectItem}
          title={selectedLibrary.Name ?? ''}
        />
      );
    }
  }

  return (
    <SpatialNavigationRoot
      isActive={isActive}
      onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}
    >
      <View style={styles.container}>{content}</View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: scaledPixels(24),
  },
  emptyCard: {
    paddingVertical: scaledPixels(40),
    paddingHorizontal: scaledPixels(80),
    borderRadius: scaledPixels(12),
    borderWidth: scaledPixels(3),
    borderColor: 'transparent',
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
  },
  emptyCardFocused: {
    borderColor: colors.focusBorder,
    transform: [{ scale: 1.05 }],
    shadowColor: colors.focus,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: scaledPixels(12),
    elevation: 8,
  },
  emptyText: {
    color: colors.text,
    fontSize: scaledPixels(32),
    fontWeight: 'bold',
  },
});
