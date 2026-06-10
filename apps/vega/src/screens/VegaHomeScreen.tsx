import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@amazon-devices/react-navigation__native';
import type { NativeStackNavigationProp } from '@amazon-devices/react-navigation__native-stack';
import { SpatialNavigationRoot, SpatialNavigationScrollView } from 'react-tv-space-navigation';
import { scaledPixels, colors, safeZones, JellyfinClient } from '@multi-tv/shared-ui';
import type { RootStackParamList } from '../navigation/types';
import type { RootState, AppDispatch } from '../store';
import { loadStoredAuth, fetchLibraries, fetchHomeRows } from '../store/jellyfinSlice';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import HomeRow from '../components/HomeRow';
import { PANEL_HEIGHT } from '../components/RowInfoPanel';
import { useContentFocusRoot } from '../hooks/useContentFocusRoot';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function VegaHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { isActive, onDirectionHandledWithoutMovement } = useContentFocusRoot();

  const {
    accessToken,
    userId,
    libraries,
    resumeItems,
    nextUpItems,
    latestMovies,
    latestShows,
    isAuthLoading,
    isLibrariesLoading,
    isHomeRowsLoading,
    hasLoadedHomeRows,
  } = useSelector((state: RootState) => state.jellyfin);

  useEffect(() => {
    if (!accessToken) {
      dispatch(loadStoredAuth());
    }
  }, [accessToken, dispatch]);

  useEffect(() => {
    if (accessToken && userId) {
      dispatch(fetchLibraries());
    }
  }, [accessToken, userId, dispatch]);

  // Once libraries load (needed to resolve the recently-added parentIds), fetch the
  // curated Home rows exactly once.
  const hasFetchedRowsRef = useRef(false);
  useEffect(() => {
    if (accessToken && userId && libraries.length > 0 && !hasFetchedRowsRef.current) {
      hasFetchedRowsRef.current = true;
      dispatch(fetchHomeRows());
    }
  }, [accessToken, userId, libraries, dispatch]);

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

  // Only take over the screen on the very first load (before any data exists).
  // Once the rows have loaded once, later background refetches keep showing the
  // cached rows and update them in place, so returning to Home never re-blanks.
  const isInitialLoading =
    !hasLoadedHomeRows && (isAuthLoading || isLibrariesLoading || isHomeRowsLoading);
  if (isInitialLoading) {
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

  const rows: { key: string; title: string; items: BaseItemDto[] }[] = [
    { key: 'resume', title: 'Kontynuuj odtwarzanie', items: resumeItems },
    { key: 'nextup', title: 'Do obejrzenia', items: nextUpItems },
    { key: 'movies', title: 'Filmy - ostatnio dodane', items: latestMovies },
    { key: 'shows', title: 'Shows - ostatnio dodane', items: latestShows },
  ].filter((row) => row.items.length > 0);

  return (
    <SpatialNavigationRoot isActive={isActive} onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <View style={gridStyles.container}>
        <SpatialNavigationScrollView
          offsetFromStart={scaledPixels(60)}
          style={gridStyles.scrollContent}
          contentContainerStyle={gridStyles.scrollContentContainer}
        >
          {rows.map((row, index) => (
            <HomeRow
              key={row.key}
              title={row.title}
              items={row.items}
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
