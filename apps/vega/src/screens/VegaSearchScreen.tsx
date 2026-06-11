import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@amazon-devices/react-navigation__native';
import type { NativeStackNavigationProp } from '@amazon-devices/react-navigation__native-stack';
import {
  SpatialNavigationRoot,
  SpatialNavigationView,
  SpatialNavigationVirtualizedGrid,
  SpatialNavigationFocusableView,
} from 'react-tv-space-navigation';
import { scaledPixels, colors, safeZones, JellyfinClient } from '@multi-tv/shared-ui';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import type { RootStackParamList } from '../navigation/types';
import type { RootState } from '../store';
import { useContentFocusRoot } from '../hooks/useContentFocusRoot';
import VegaKeyboard, {
  KEY_SPACE,
  KEY_DELETE,
  KEY_CLEAR,
  KEYBOARD_WIDTH,
} from '../components/VegaKeyboard';
import MediaPosterCard from '../components/MediaPosterCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const H_INSET = scaledPixels(safeZones.actionSafe.horizontal);
const V_INSET = scaledPixels(safeZones.titleSafe.vertical);
const RESULT_GAP = scaledPixels(20);

// Gap between the keyboard pane and the results pane.
const PANE_GAP = scaledPixels(60);

const RESULT_COLUMNS = 4;
const RESULTS_AREA_WIDTH =
  Dimensions.get('window').width - KEYBOARD_WIDTH - 2 * H_INSET - PANE_GAP;
const RESULT_CARD_WIDTH = RESULTS_AREA_WIDTH / RESULT_COLUMNS - RESULT_GAP;
const RESULT_POSTER_HEIGHT = RESULT_CARD_WIDTH * (350 / 220);
const RESULT_ROW_HEIGHT = RESULT_POSTER_HEIGHT + scaledPixels(120);

const DEBOUNCE_MS = 350;

/** Right-pane status text (prompt / loading / empty). */
function Status({ text }: { text: string }) {
  return (
    <View style={styles.status}>
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
}

/**
 * Search tab. A D-pad keyboard on the left composes a query string; the right pane shows
 * a debounced live search as a poster grid. One `SpatialNavigationRoot` holds both panes
 * (horizontal), so Up from the keyboard's top row hands focus back to the top bar via
 * `useContentFocusRoot`. The keyboard owns `DefaultFocus`; results are focusable but not
 * default, so focus starts on the keyboard each mount.
 */
export default function VegaSearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isActive, onDirectionHandledWithoutMovement } = useContentFocusRoot();
  const { accessToken, userId } = useSelector((state: RootState) => state.jellyfin);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Monotonic request id so a slow earlier response can't overwrite a newer one.
  const requestIdRef = useRef(0);

  const handleKeyPress = useCallback((value: string) => {
    setQuery((prev) => {
      if (value === KEY_CLEAR) return '';
      if (value === KEY_DELETE) return prev.slice(0, -1);
      if (value === KEY_SPACE) return `${prev} `;
      return prev + value;
    });
  }, []);

  // Debounced search whenever the trimmed query changes.
  useEffect(() => {
    const term = query.trim();
    if (!term || !accessToken || !userId) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++requestIdRef.current;
    const handle = setTimeout(async () => {
      try {
        const items = await JellyfinClient.search(accessToken, userId, term);
        if (id === requestIdRef.current) {
          setResults(items);
          setSearched(true);
          setLoading(false);
        }
      } catch {
        if (id === requestIdRef.current) {
          setResults([]);
          setSearched(true);
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, accessToken, userId]);

  const handleSelectItem = useCallback(
    (item: BaseItemDto) => {
      if (!item.Id) return;
      navigation.navigate('Details', {
        title: item.Name ?? '',
        description: item.Overview ?? '',
        headerImage: JellyfinClient.getItemImageUrl(item.Id),
        movie: item.Id,
        accessToken: accessToken ?? undefined,
        userId: userId ?? undefined,
      });
    },
    [navigation, accessToken, userId],
  );

  const renderItem = useCallback(
    ({ item }: { item: BaseItemDto }) => (
      <SpatialNavigationFocusableView onSelect={() => handleSelectItem(item)}>
        {({ isFocused }) => (
          <MediaPosterCard item={item} isFocused={isFocused} width={RESULT_CARD_WIDTH} showTitle />
        )}
      </SpatialNavigationFocusableView>
    ),
    [handleSelectItem],
  );

  let resultsContent: React.ReactNode;
  if (!query.trim()) {
    resultsContent = <Status text="Type to search your library" />;
  } else if (loading && results.length === 0) {
    resultsContent = <Status text="Searching…" />;
  } else if (searched && results.length === 0) {
    resultsContent = <Status text={`No results for "${query.trim()}"`} />;
  } else {
    resultsContent = (
      <SpatialNavigationVirtualizedGrid
        key={results.length}
        data={results}
        numberOfColumns={RESULT_COLUMNS}
        itemHeight={RESULT_ROW_HEIGHT}
        renderItem={renderItem}
        rowContainerStyle={styles.resultRow}
      />
    );
  }

  return (
    <SpatialNavigationRoot
      isActive={isActive}
      onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}
    >
      <SpatialNavigationView direction="horizontal" style={styles.container}>
        <View style={styles.keyboardPane}>
          <VegaKeyboard onKeyPress={handleKeyPress} />
        </View>
        <View style={styles.resultsPane}>
          <View style={styles.queryBar}>
            <Text style={styles.queryText} numberOfLines={1}>
              {query || ' '}
            </Text>
            <View style={styles.caret} />
          </View>
          <View style={styles.resultsViewport}>{resultsContent}</View>
        </View>
      </SpatialNavigationView>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: H_INSET,
    paddingTop: V_INSET,
  },
  keyboardPane: {
    width: KEYBOARD_WIDTH,
    marginRight: PANE_GAP,
  },
  resultsPane: {
    flex: 1,
  },
  queryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scaledPixels(72),
    paddingHorizontal: scaledPixels(24),
    marginBottom: scaledPixels(24),
    borderRadius: scaledPixels(10),
    backgroundColor: colors.backgroundElevated,
  },
  queryText: {
    color: colors.text,
    fontSize: scaledPixels(32),
    fontWeight: '600',
    flexShrink: 1,
  },
  caret: {
    width: scaledPixels(3),
    height: scaledPixels(36),
    marginLeft: scaledPixels(4),
    backgroundColor: colors.textTertiary,
  },
  resultsViewport: {
    flex: 1,
    overflow: 'hidden',
    paddingTop: scaledPixels(20),
  },
  resultRow: {
    gap: RESULT_GAP,
    marginBottom: RESULT_GAP,
  },
  status: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: scaledPixels(28),
  },
});
