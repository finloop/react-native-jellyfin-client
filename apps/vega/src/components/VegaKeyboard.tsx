import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  SpatialNavigationFocusableView,
  SpatialNavigationView,
  DefaultFocus,
} from 'react-tv-space-navigation';
import { scaledPixels, colors } from '@multi-tv/shared-ui';

// Special key identifiers. Single characters are emitted verbatim; these tokens map to
// editing actions handled by the parent.
export const KEY_SPACE = 'SPACE';
export const KEY_DELETE = 'DELETE';
export const KEY_CLEAR = 'CLEAR';

/** A single key. `span` is the key's width in column units (default 1). */
export type KeyDef = { label: string; value: string; span?: number };

const KEY_GAP = scaledPixels(12);
const KEY_SIZE = scaledPixels(76);

const keyWidth = (span = 1) => span * KEY_SIZE + (span - 1) * KEY_GAP;

// Default layout — the Search keyboard: alphabetical 6-col grid (easier to scan with a
// D-pad than QWERTY) over an action row of Space / Del / Clear, each spanning two columns.
const ALPHA_ROWS: KeyDef[][] = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X'],
  ['Y', 'Z', '0', '1', '2', '3'],
  ['4', '5', '6', '7', '8', '9'],
].map((row) => row.map((c) => ({ label: c, value: c })));

const ALPHA_LAYOUT: KeyDef[][] = [
  ...ALPHA_ROWS,
  [
    { label: 'Space', value: KEY_SPACE, span: 2 },
    { label: 'Del', value: KEY_DELETE, span: 2 },
    { label: 'Clear', value: KEY_CLEAR, span: 2 },
  ],
];

/** Width of the default 6-column layout, exported so the Search pane can size to match. */
export const KEYBOARD_WIDTH = keyWidth(6);

type KeyProps = {
  def: KeyDef;
  onPress: (value: string) => void;
};

function Key({ def, onPress }: KeyProps) {
  return (
    <SpatialNavigationFocusableView onSelect={() => onPress(def.value)}>
      {({ isFocused }) => (
        <View style={[styles.key, { width: keyWidth(def.span) }, isFocused && styles.keyFocused]}>
          <Text style={[styles.keyLabel, isFocused && styles.keyLabelFocused]} numberOfLines={1}>
            {def.label}
          </Text>
        </View>
      )}
    </SpatialNavigationFocusableView>
  );
}

/**
 * On-screen keyboard for D-pad text entry (Fire TV has no hardware text input under
 * spatial navigation). Letter keys emit their character; the action tokens (KEY_*) are
 * handled by the parent. Keys are explicitly sized — `SpatialNavigationView` rows don't
 * reliably stretch flex children — so each cell width comes from its column `span`.
 * Wrapped in `DefaultFocus` so the first key is focused on mount.
 *
 * Pass `layout` to override the default alphabetical layout (e.g. the URL keyboard on the
 * server-selection screen).
 */
function VegaKeyboard({
  onKeyPress,
  layout = ALPHA_LAYOUT,
}: {
  onKeyPress: (value: string) => void;
  layout?: KeyDef[][];
}) {
  const renderKey = useCallback(
    (def: KeyDef) => <Key key={def.value} def={def} onPress={onKeyPress} />,
    [onKeyPress],
  );

  return (
    <DefaultFocus>
      {/* alignInGrid (LRUD isIndexAlign) keeps the column when moving between rows —
          without it each row restores its last-focused key, so Down drifts sideways
          (e.g. S → 1 instead of S → Y). */}
      <SpatialNavigationView direction="vertical" alignInGrid style={styles.grid}>
        {layout.map((row, i) => (
          <SpatialNavigationView key={i} direction="horizontal" style={styles.row}>
            {row.map(renderKey)}
          </SpatialNavigationView>
        ))}
      </SpatialNavigationView>
    </DefaultFocus>
  );
}

export default React.memo(VegaKeyboard);

const styles = StyleSheet.create({
  grid: {
    gap: KEY_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: KEY_GAP,
  },
  key: {
    height: KEY_SIZE,
    borderRadius: scaledPixels(10),
    borderWidth: scaledPixels(2),
    borderColor: 'transparent',
    backgroundColor: colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyFocused: {
    backgroundColor: colors.focusBackground,
    borderColor: colors.focusBorder,
    transform: [{ scale: 1.08 }],
    shadowColor: colors.focusGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: scaledPixels(10),
    elevation: 8,
  },
  keyLabel: {
    color: colors.text,
    fontSize: scaledPixels(28),
    fontWeight: '600',
  },
  keyLabelFocused: {
    color: colors.textOnPrimary,
  },
});
