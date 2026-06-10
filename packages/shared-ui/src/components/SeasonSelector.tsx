import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SpatialNavigationNode } from 'react-tv-space-navigation';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import FocusablePressable from './FocusablePressable';
import { scaledPixels } from '../hooks/useScale';
import { colors } from '../theme';

type SeasonSelectorProps = {
  seasons: BaseItemDto[];
  selectedSeasonId: string | null;
  onSelectSeason: (seasonId: string) => void;
};

// Horizontal row of focusable season "pills". Pressing one switches the episode row.
// Seasons are few, so a plain mapped row inside a horizontal node is enough (no
// virtualization). The selected pill is highlighted even when not focused.
function SeasonSelector({ seasons, selectedSeasonId, onSelectSeason }: SeasonSelectorProps) {
  return (
    <SpatialNavigationNode orientation="horizontal">
      <View style={styles.row}>
        {seasons.map((season) => {
          if (!season.Id) return null;
          const label = season.Name ?? `Season ${season.IndexNumber ?? ''}`.trim();
          const isSelected = season.Id === selectedSeasonId;
          return (
            <FocusablePressable
              key={season.Id}
              text={label}
              onSelect={() => onSelectSeason(season.Id!)}
              style={isSelected ? styles.pillSelected : styles.pill}
            />
          );
        })}
      </View>
    </SpatialNavigationNode>
  );
}

export default React.memo(SeasonSelector);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    marginEnd: scaledPixels(16),
    minWidth: scaledPixels(120),
    minHeight: scaledPixels(56),
    paddingVertical: scaledPixels(12),
    paddingHorizontal: scaledPixels(28),
  },
  pillSelected: {
    marginEnd: scaledPixels(16),
    minWidth: scaledPixels(120),
    minHeight: scaledPixels(56),
    paddingVertical: scaledPixels(12),
    paddingHorizontal: scaledPixels(28),
    backgroundColor: colors.focusBackgroundSecondary,
    borderColor: colors.primary,
  },
});
