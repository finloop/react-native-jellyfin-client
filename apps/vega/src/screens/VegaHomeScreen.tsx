import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useIsFocused, DrawerActions } from '@amazon-devices/react-navigation__native';
import type { NativeStackNavigationProp } from '@amazon-devices/react-navigation__native-stack';
import { SpatialNavigationRoot, SpatialNavigationScrollView } from 'react-tv-space-navigation';
import { Direction } from '@bam.tech/lrud';
import { useMenuContext, scaledPixels, colors, safeZones, getOpenDrawerDirection, JellyfinClient } from '@multi-tv/shared-ui';
import type { RootStackParamList } from '../navigation/types';
import type { RootState, AppDispatch } from '../store';
import { loadStoredAuth, fetchLibraries, fetchLibraryItems } from '../store/jellyfinSlice';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import HomeRow from '../components/HomeRow';
import { PANEL_HEIGHT } from '../components/RowInfoPanel';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

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

  // Fires only when a direction press had nowhere to go — i.e. at the left edge of a
  // row — so opening the drawer on the drawer direction works from any row's start.
  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      if (movement === getOpenDrawerDirection()) {
        navigation.dispatch(DrawerActions.openDrawer());
        toggleMenu(true);
      }
    },
    [toggleMenu, navigation],
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

  const visibleLibraries = libraries.filter(
    (lib: BaseItemDto) => lib.Id && libraryItems[lib.Id] && libraryItems[lib.Id].length > 0,
  );

  return (
    <SpatialNavigationRoot isActive={isActive} onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <View style={gridStyles.container}>
        <SpatialNavigationScrollView
          offsetFromStart={scaledPixels(60)}
          style={gridStyles.scrollContent}
          contentContainerStyle={gridStyles.scrollContentContainer}
        >
          {visibleLibraries.map((lib: BaseItemDto, index: number) => (
            <HomeRow
              key={lib.Id}
              title={lib.Name ?? 'Library'}
              items={libraryItems[lib.Id!] ?? []}
              onSelect={onSelect}
              isFirst={index === 0}
            />
          ))}
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
  // Reserve room so the last row's info panel can scroll fully into view.
  scrollContentContainer: {
    paddingTop: scaledPixels(40),
    paddingBottom: PANEL_HEIGHT,
  },
});
