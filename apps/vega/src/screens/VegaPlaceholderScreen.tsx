import { StyleSheet, Text, View } from 'react-native';
import { SpatialNavigationRoot, SpatialNavigationFocusableView, DefaultFocus } from 'react-tv-space-navigation';
import { scaledPixels, colors } from '@multi-tv/shared-ui';
import { useContentFocusRoot } from '../hooks/useContentFocusRoot';

type Props = {
  title: string;
};

/**
 * Stand-in for the not-yet-built top-level views (Search / Libraries / Favourites).
 * Wires the same focus pattern as the real screens so Up returns to the top bar and
 * focus behaves identically across tabs.
 */
export default function VegaPlaceholderScreen({ title }: Props) {
  const { isActive, onDirectionHandledWithoutMovement } = useContentFocusRoot();

  return (
    <SpatialNavigationRoot isActive={isActive} onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <View style={styles.container}>
        <DefaultFocus>
          <SpatialNavigationFocusableView onSelect={() => {}}>
            {({ isFocused }) => (
              <View style={[styles.card, isFocused && styles.cardFocused]}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>Coming soon</Text>
              </View>
            )}
          </SpatialNavigationFocusableView>
        </DefaultFocus>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    paddingVertical: scaledPixels(40),
    paddingHorizontal: scaledPixels(80),
    borderRadius: scaledPixels(12),
    borderWidth: scaledPixels(3),
    borderColor: 'transparent',
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
  },
  cardFocused: {
    borderColor: colors.focusBorder,
    transform: [{ scale: 1.05 }],
    shadowColor: colors.focus,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: scaledPixels(12),
    elevation: 8,
  },
  title: {
    color: colors.text,
    fontSize: scaledPixels(48),
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: scaledPixels(24),
    marginTop: scaledPixels(12),
  },
});
