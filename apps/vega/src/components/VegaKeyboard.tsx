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

// Alphabetical layout (6 columns) — easier to scan with a D-pad than QWERTY. The action
// row (Space / Delete / Clear) spans the bottom.
const ROWS: string[][] = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X'],
  ['Y', 'Z', '0', '1', '2', '3'],
  ['4', '5', '6', '7', '8', '9'],
];

const COLUMNS = 6;
const KEY_GAP = scaledPixels(12);
const KEY_SIZE = scaledPixels(76);
// Action keys each span two letter columns (so three of them fill the row width).
const ACTION_KEY_WIDTH = KEY_SIZE * 2 + KEY_GAP;

type KeyProps = {
  label: string;
  value: string;
  width: number;
  onPress: (value: string) => void;
};

function Key({ label, value, width, onPress }: KeyProps) {
  return (
    <SpatialNavigationFocusableView onSelect={() => onPress(value)}>
      {({ isFocused }) => (
        <View style={[styles.key, { width }, isFocused && styles.keyFocused]}>
          <Text style={[styles.keyLabel, isFocused && styles.keyLabelFocused]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </SpatialNavigationFocusableView>
  );
}

/**
 * On-screen keyboard for the Search screen. Fire TV has no hardware text entry under
 * spatial navigation, so the query is composed key-by-key with the D-pad. Letter keys
 * emit their character; the action row emits the KEY_* tokens. Keys are explicitly sized
 * (not flexed) — `SpatialNavigationView` rows don't reliably stretch flex children, so
 * fixed widths keep the grid aligned. Wrapped in `DefaultFocus` so the first key is
 * focused when the screen mounts.
 */
function VegaKeyboard({ onKeyPress }: { onKeyPress: (value: string) => void }) {
  const renderKey = useCallback(
    (char: string) => (
      <Key key={char} label={char} value={char} width={KEY_SIZE} onPress={onKeyPress} />
    ),
    [onKeyPress],
  );

  return (
    <DefaultFocus>
      <SpatialNavigationView direction="vertical" style={styles.grid}>
        {ROWS.map((row, i) => (
          <SpatialNavigationView key={i} direction="horizontal" style={styles.row}>
            {row.map(renderKey)}
          </SpatialNavigationView>
        ))}
        <SpatialNavigationView direction="horizontal" style={styles.row}>
          <Key label="Space" value={KEY_SPACE} width={ACTION_KEY_WIDTH} onPress={onKeyPress} />
          <Key label="Del" value={KEY_DELETE} width={ACTION_KEY_WIDTH} onPress={onKeyPress} />
          <Key label="Clear" value={KEY_CLEAR} width={ACTION_KEY_WIDTH} onPress={onKeyPress} />
        </SpatialNavigationView>
      </SpatialNavigationView>
    </DefaultFocus>
  );
}

export default React.memo(VegaKeyboard);

/** Total keyboard width, exported so the screen can size the keyboard pane to match. */
export const KEYBOARD_WIDTH = KEY_SIZE * COLUMNS + KEY_GAP * (COLUMNS - 1);

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
