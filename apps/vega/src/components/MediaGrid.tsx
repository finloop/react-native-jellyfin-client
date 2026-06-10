import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  SpatialNavigationVirtualizedGrid,
  SpatialNavigationFocusableView,
  DefaultFocus,
} from 'react-tv-space-navigation';
import { scaledPixels, colors, safeZones } from '@multi-tv/shared-ui';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';

/** Horizontal inset for the grid rows (and header), shared with the card-width math. */
export const GRID_H_INSET = scaledPixels(safeZones.actionSafe.horizontal);
/** Gap between cards in a row; cards carry this as a trailing marginEnd. */
export const GRID_ITEM_GAP = scaledPixels(20);
// The top bar overlays the top of the content and the virtualized grid anchors its
// content to its mount position (it doesn't reflow when the bar animates in, and its
// headerSize is read once), so reserve a CONSTANT top zone tall enough to always clear
// the bar — whether it's hidden or showing. Matches BAR_HEIGHT in VegaTopBar (120).
const TOP_INSET = scaledPixels(120 + 24);
const TITLE_HEIGHT = scaledPixels(70);

type MediaGridProps = {
  data: BaseItemDto[];
  /** Number of items per row. The grid only chunks data into rows — cell WIDTH comes
   *  from the card itself — so card width × numberOfColumns must fit the row. */
  numberOfColumns: number;
  /** Row height. Must include the focused card's scale + glow headroom (see HomeRow). */
  itemHeight: number;
  renderCard: (item: BaseItemDto, isFocused: boolean) => React.ReactElement;
  onSelect: (item: BaseItemDto) => void;
  onFocus?: (item: BaseItemDto) => void;
  /** Optional heading shown above the rows (e.g. the selected library's name). */
  title?: string;
};

/**
 * Reusable spatially-navigable grid built on `SpatialNavigationVirtualizedGrid`
 * (vertically scrolling, 2D-navigable). The grid positions its content from its own
 * origin and ignores an outer container's padding, so the top inset is provided via the
 * grid `header` and the horizontal inset via `rowContainerStyle` rather than wrapper
 * padding. Wrapped in `DefaultFocus` so the first cell is focused on mount — give the
 * screen a distinct `key` per dataset to force a clean remount and a fresh DefaultFocus.
 */
function MediaGrid({
  data,
  numberOfColumns,
  itemHeight,
  renderCard,
  onSelect,
  onFocus,
  title,
}: MediaGridProps) {
  const renderItem = useCallback(
    ({ item }: { item: BaseItemDto }) => (
      <SpatialNavigationFocusableView
        onSelect={() => onSelect(item)}
        {...(onFocus ? { onFocus: () => onFocus(item) } : {})}
      >
        {({ isFocused }) => renderCard(item, isFocused)}
      </SpatialNavigationFocusableView>
    ),
    [onSelect, onFocus, renderCard],
  );

  const header = (
    <View style={styles.header}>
      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
    </View>
  );
  const headerSize = TOP_INSET + (title ? TITLE_HEIGHT : 0);

  return (
    <View style={styles.container}>
      <DefaultFocus>
        <SpatialNavigationVirtualizedGrid
          data={data}
          numberOfColumns={numberOfColumns}
          itemHeight={itemHeight}
          renderItem={renderItem}
          header={header}
          headerSize={headerSize}
          rowContainerStyle={styles.row}
        />
      </DefaultFocus>
    </View>
  );
}

export default React.memo(MediaGrid);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    paddingHorizontal: GRID_H_INSET,
  },
  header: {
    paddingTop: TOP_INSET,
    paddingHorizontal: GRID_H_INSET,
  },
  title: {
    color: colors.text,
    fontSize: scaledPixels(44),
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
