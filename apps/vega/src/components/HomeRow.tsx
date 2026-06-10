import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import {
  SpatialNavigationFocusableView,
  SpatialNavigationNode,
  SpatialNavigationVirtualizedList,
  DefaultFocus,
} from 'react-tv-space-navigation';
import { scaledPixels, colors, safeZones } from '@multi-tv/shared-ui';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import RowInfoPanel from './RowInfoPanel';
import MediaPosterCard from './MediaPosterCard';

type HomeRowProps = {
  title: string;
  items: BaseItemDto[];
  onSelect: (item: BaseItemDto) => void;
  /** Only the first row carries DefaultFocus, so initial focus is unambiguous. */
  isFirst: boolean;
};

function HomeRow({ title, items, onSelect, isFirst }: HomeRowProps) {
  const [isActive, setIsActive] = useState(false);
  const [focusedItem, setFocusedItem] = useState<BaseItemDto | null>(items[0] ?? null);

  // 0 = collapsed, 1 = expanded. Drives the info panel's height (JS-driven, since
  // height isn't native-drivable). Lower rows reflow down as this grows.
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: isActive ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isActive, progress]);

  const renderItem = useCallback(
    ({ item }: { item: BaseItemDto }) => (
      <SpatialNavigationFocusableView
        onSelect={() => onSelect(item)}
        onFocus={() => setFocusedItem(item)}
      >
        {({ isFocused }) => <MediaPosterCard item={item} isFocused={isFocused} />}
      </SpatialNavigationFocusableView>
    ),
    [onSelect],
  );

  const list = (
    <SpatialNavigationVirtualizedList
      data={items}
      orientation="horizontal"
      renderItem={renderItem}
      itemSize={scaledPixels(250)}
      onEndReachedThresholdItemsNumber={3}
    />
  );

  return (
    <View style={styles.rowContainer}>
      <Text style={styles.rowTitle}>{title}</Text>
      <View style={styles.listWrapper}>
        <SpatialNavigationNode
          onActive={() => setIsActive(true)}
          onInactive={() => setIsActive(false)}
        >
          {isFirst ? <DefaultFocus>{list}</DefaultFocus> : list}
        </SpatialNavigationNode>
      </View>
      <RowInfoPanel item={focusedItem} progress={progress} />
    </View>
  );
}

export default React.memo(HomeRow);

const styles = StyleSheet.create({
  rowContainer: {
    paddingTop: scaledPixels(16),
  },
  rowTitle: {
    color: colors.text,
    fontSize: scaledPixels(40),
    fontWeight: 'bold',
    marginBottom: scaledPixels(16),
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  listWrapper: {
    height: scaledPixels(420),
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
  },
});
