import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@amazon-devices/react-navigation__native';
import type { NativeStackNavigationProp } from '@amazon-devices/react-navigation__native-stack';
import { SpatialNavigationRoot } from 'react-tv-space-navigation';
import { scaledPixels, colors, safeZones, JellyfinClient } from '@multi-tv/shared-ui';
import type { RootStackParamList } from '../navigation/types';
import type { RootState, AppDispatch } from '../store';
import { loadStoredAuth, fetchLibraries, fetchHomeRows } from '../store/jellyfinSlice';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import HomeRow from '../components/HomeRow';
import { useContentFocusRoot } from '../hooks/useContentFocusRoot';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

// We own the vertical scroll instead of using SpatialNavigationScrollView: its scroll
// target is measured from the live layout *before* React re-renders, so navigating down
// measures while the row you just left still has its info panel expanded — inflating the
// target by PANEL_HEIGHT and overshooting. Instead we drive an Animated translateY from
// the active row index, using each row's stable collapsed height, so the target is correct
// on the first try and lands in a single motion.
const OFFSET_FROM_START = scaledPixels(60);
const CONTENT_PADDING_TOP = scaledPixels(40);

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

  // Owned vertical scroll. `blockHeights[i]` is row i's collapsed (panel-excluded) height,
  // reported by each row's onLayout; the scroll target for the active row is the sum of the
  // heights above it, so it never depends on the in-flux panel animation.
  const blockHeights = useRef<number[]>([]);
  const translateY = useRef(new Animated.Value(0)).current;

  const handleMeasureBlock = useCallback((index: number, height: number) => {
    blockHeights.current[index] = height;
  }, []);

  const handleActivate = useCallback(
    (index: number) => {
      let target = CONTENT_PADDING_TOP - OFFSET_FROM_START;
      for (let i = 0; i < index; i++) {
        target += blockHeights.current[i] ?? 0;
      }
      // Keep the focused row a fixed distance from the top; never scroll above the start.
      const clamped = Math.max(0, target);
      Animated.timing(translateY, {
        toValue: -clamped,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [translateY],
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
        <View style={gridStyles.viewport}>
          <Animated.View style={[gridStyles.content, { transform: [{ translateY }] }]}>
            {rows.map((row, index) => (
              <HomeRow
                key={row.key}
                index={index}
                title={row.title}
                items={row.items}
                onSelect={onSelect}
                isFirst={index === 0}
                onMeasureBlock={handleMeasureBlock}
                onActivate={handleActivate}
              />
            ))}
          </Animated.View>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

const gridStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Clips the rows as the content translates up/down (our own scroll viewport).
  viewport: {
    flex: 1,
    overflow: 'hidden',
    marginBottom: scaledPixels(safeZones.actionSafe.vertical),
  },
  content: {
    paddingTop: CONTENT_PADDING_TOP,
  },
});
