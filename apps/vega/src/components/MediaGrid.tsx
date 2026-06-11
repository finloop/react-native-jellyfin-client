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
// The title sits near the top with a normal TV safe-zone margin; it must NOT be pushed
// down by the focus inset.
const TITLE_TOP_INSET = scaledPixels(safeZones.titleSafe.vertical);
// PERSISTENT focus inset, applied as the GAP between the title and the grid viewport (a
// marginTop, so it stays empty and outside the clip box). The grid uses `stick-to-start`
// scrolling, which pins the focused row to the TOP of its scroll viewport — so an inset
// provided via the grid `header` scrolls away the instant the first row is focused (it
// always is, via DefaultFocus), leaving the focused row flush. Pushing the viewport down
// instead gives a fixed offset where every focused row sticks (upper-center) without a
// large empty band on first open, while keeping the title pinned at the top.
const GRID_TOP_GAP = scaledPixels(105);
// Headroom INSIDE the clip box so the focused row (pinned to the viewport top by
// stick-to-start) isn't clipped at its 1.08 scale + glow. Safe against bleed: the band it
// exposes only ever shows the empty headroom each row reserves below its title block, not
// a neighbouring poster.
const GRID_FOCUS_HEADROOM = scaledPixels(45);

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

  return (
    <View style={styles.container}>
      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      {/* Clip the grid to its own box so rows scrolled above the viewport top
          (stick-to-start) don't bleed up over the title and top inset. */}
      <View style={styles.viewport}>
        <DefaultFocus>
          <SpatialNavigationVirtualizedGrid
            data={data}
            numberOfColumns={numberOfColumns}
            itemHeight={itemHeight}
            renderItem={renderItem}
            rowContainerStyle={styles.row}
          />
        </DefaultFocus>
      </View>
    </View>
  );
}

export default React.memo(MediaGrid);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Keep the title near the top with a normal safe-zone margin.
    paddingTop: TITLE_TOP_INSET,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
    // Focus inset lives here as an EMPTY gap (marginTop is outside the clip box, so no
    // scrolled content bleeds into it) — see GRID_TOP_GAP note above.
    marginTop: GRID_TOP_GAP,
    // Headroom inside the clip box for the focused card's scale + glow — see note above.
    paddingTop: GRID_FOCUS_HEADROOM,
  },
  row: {
    paddingHorizontal: GRID_H_INSET,
  },
  title: {
    color: colors.text,
    fontSize: scaledPixels(44),
    fontWeight: 'bold',
    paddingHorizontal: GRID_H_INSET,
    marginBottom: scaledPixels(16),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
