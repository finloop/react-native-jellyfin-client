import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useIsFocused, DrawerActions } from '@amazon-devices/react-navigation__native';
import type { NativeStackNavigationProp } from '@amazon-devices/react-navigation__native-stack';
import {
  SpatialNavigationFocusableView,
  SpatialNavigationNode,
  SpatialNavigationRoot,
  SpatialNavigationScrollView,
  SpatialNavigationVirtualizedList,
  DefaultFocus,
} from 'react-tv-space-navigation';
import { Direction } from '@bam.tech/lrud';
import { useMenuContext, scaledPixels, colors, safeZones, getOpenDrawerDirection, PlatformLinearGradient } from '@multi-tv/shared-ui';
import type { RootStackParamList } from '../navigation/types';
import type { RootState, AppDispatch } from '../store';
import { loadStoredAuth, fetchLibraries, fetchLibraryItems } from '../store/jellyfinSlice';
import { JellyfinClient } from '@multi-tv/shared-ui';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const MovieItem = React.memo(
  ({
    item,
    isFocused,
    styles,
  }: {
    item: BaseItemDto;
    isFocused: boolean;
    styles: any;
  }) => {
    const imageSource = useMemo(
      () => (item.Id ? { uri: JellyfinClient.getItemImageUrl(item.Id) } : undefined),
      [item.Id],
    );

    return (
      <View style={[styles.highlightThumbnail, isFocused && styles.highlightThumbnailFocused]}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImage} />
        )}
      </View>
    );
  },
);

export default function VegaHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();
  const isFocused = useIsFocused();
  const isActive = isFocused && !isMenuOpen;

  const {
    accessToken,
    userId,
    libraries,
    libraryItems,
    isAuthLoading,
    isLibrariesLoading,
  } = useSelector((state: RootState) => state.jellyfin);

  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    dispatch(loadStoredAuth());
  }, [dispatch]);

  useEffect(() => {
    if (accessToken && userId) {
      dispatch(fetchLibraries());
    }
  }, [accessToken, userId, dispatch]);

  useEffect(() => {
    if (accessToken && userId && libraries.length > 0) {
      libraries.forEach((lib) => {
        if (lib.Id && !libraryItems[lib.Id]) {
          dispatch(fetchLibraryItems({ libraryId: lib.Id, collectionType: lib.CollectionType }));
        }
      });
    }
  }, [accessToken, userId, libraries, libraryItems, dispatch]);

  const allItems = useMemo(() => {
    const items: BaseItemDto[] = [];
    Object.values(libraryItems).forEach((libItems) => {
      items.push(...libItems);
    });
    return items;
  }, [libraryItems]);

  const focusedItem = useMemo(() => allItems[focusedIndex] || null, [focusedIndex, allItems]);

  const headerImageSource = useMemo(
    () => (focusedItem?.Id ? { uri: JellyfinClient.getItemImageUrl(focusedItem.Id) } : undefined),
    [focusedItem?.Id],
  );

  const renderHeader = useCallback(() => {
    if (!focusedItem) return null;
    return (
      <View style={gridStyles.header}>
        <Image
          style={gridStyles.headerImage}
          source={headerImageSource}
          resizeMode="cover"
        />
        <PlatformLinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={gridStyles.gradientLeft}
        />
        <View style={gridStyles.headerTextContainer}>
          <Text style={gridStyles.headerTitle}>{focusedItem.Name ?? ''}</Text>
          <Text style={gridStyles.headerDescription} numberOfLines={3}>
            {focusedItem.Overview ?? ''}
          </Text>
        </View>
      </View>
    );
  }, [headerImageSource, focusedItem]);

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      if (movement === getOpenDrawerDirection() && focusedIndex === 0) {
        navigation.dispatch(DrawerActions.openDrawer());
        toggleMenu(true);
      }
    },
    [toggleMenu, focusedIndex, navigation],
  );

  const onSelect = useCallback(
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

  const renderItem = useCallback(
    ({ item, index }: { item: BaseItemDto; index: number }) => (
      <SpatialNavigationFocusableView onSelect={() => onSelect(item)} onFocus={() => setFocusedIndex(index)}>
        {({ isFocused: itemFocused }) => <MovieItem item={item} isFocused={itemFocused} styles={gridStyles} />}
      </SpatialNavigationFocusableView>
    ),
    [onSelect],
  );

  const renderScrollableRow = useCallback(
    (title: string, items: BaseItemDto[]) => {
      if (items.length === 0) return null;
      return (
        <View style={gridStyles.highlightsContainer} key={title}>
          <Text style={gridStyles.highlightsTitle}>{title}</Text>
          <SpatialNavigationNode>
            <DefaultFocus>
              <SpatialNavigationVirtualizedList
                data={items}
                orientation="horizontal"
                renderItem={renderItem}
                itemSize={scaledPixels(250)}
                onEndReachedThresholdItemsNumber={3}
              />
            </DefaultFocus>
          </SpatialNavigationNode>
        </View>
      );
    },
    [renderItem],
  );

  if (isAuthLoading || isLibrariesLoading || libraries.length === 0) {
    return (
      <View style={gridStyles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: scaledPixels(24) }}>
            Loading your media library...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SpatialNavigationRoot isActive={isActive} onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <View style={gridStyles.container}>
        {renderHeader()}
        <SpatialNavigationScrollView offsetFromStart={scaledPixels(60)} style={gridStyles.scrollContent}>
          {libraries
            .filter((lib) => lib.Id && libraryItems[lib.Id] && libraryItems[lib.Id].length > 0)
            .map((lib) => renderScrollableRow(lib.Name ?? 'Library', libraryItems[lib.Id!] ?? []))}
        </SpatialNavigationScrollView>
      </View>
    </SpatialNavigationRoot>
  );
}

const gridStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flex: 1,
    marginBottom: scaledPixels(safeZones.actionSafe.vertical),
  },
  highlightsTitle: {
    color: colors.text,
    fontSize: scaledPixels(40),
    fontWeight: 'bold',
    marginBottom: scaledPixels(16),
    marginTop: scaledPixels(20),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: scaledPixels(56),
    fontWeight: 'bold',
    marginBottom: scaledPixels(16),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  headerDescription: {
    color: colors.text,
    fontSize: scaledPixels(28),
    fontWeight: '500',
    lineHeight: scaledPixels(40),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  highlightThumbnail: {
    width: scaledPixels(220),
    height: scaledPixels(350),
    marginEnd: scaledPixels(20),
    backgroundColor: colors.card,
    borderRadius: scaledPixels(12),
    borderWidth: scaledPixels(5),
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  highlightThumbnailFocused: {
    borderColor: colors.focusBorder,
    borderWidth: scaledPixels(6),
    transform: [{ scale: 1.1 }],
    shadowColor: colors.focus,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: scaledPixels(20),
    elevation: 15,
  },
  highlightsContainer: {
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    paddingVertical: scaledPixels(16),
    height: scaledPixels(450),
  },
  header: {
    width: '100%',
    height: scaledPixels(400),
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientLeft: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: '65%',
  },
  headerTextContainer: {
    position: 'absolute',
    start: scaledPixels(safeZones.titleSafe.horizontal),
    top: scaledPixels(safeZones.titleSafe.vertical),
    bottom: scaledPixels(safeZones.titleSafe.vertical),
    justifyContent: 'center',
    width: '55%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: scaledPixels(8),
    backgroundColor: colors.card,
  },
});