import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import {
  SpatialNavigationRoot,
  SpatialNavigationNode,
  SpatialNavigationFocusableView,
  DefaultFocus,
} from 'react-tv-space-navigation';
import { useNavigation, useIsFocused } from '@amazon-devices/react-navigation__native';
import type { NativeStackNavigationProp } from '@amazon-devices/react-navigation__native-stack';
import { Direction } from '@bam.tech/lrud';
import { scaledPixels, colors, safeZones } from '@multi-tv/shared-ui';
import type { RootStackParamList, TopTab } from '../navigation/types';

const TABS: TopTab[] = ['Search', 'Home', 'Libraries', 'Favourites'];
const BAR_HEIGHT = scaledPixels(120);

type Props = {
  activeTab: TopTab;
  /** Select a tab: switches the view and drops focus into the content. */
  onSelectTab: (tab: TopTab) => void;
  /** Pressing Down from the bar without selecting: enter the current view. */
  onEnterContent: () => void;
  /** When true the bar owns focus and is shown; when false it collapses away. */
  isVisible: boolean;
};

/**
 * Horizontal top navigation bar (Search · Home · Libraries · Favourites · ⚙).
 * Its own `SpatialNavigationRoot`, active only while it holds focus AND the Main
 * route is the focused stack route (so it deactivates when Settings is pushed).
 * Animates its height/opacity off `isVisible`, which the container maps from
 * `MenuContext.isOpen`.
 */
export default function VegaTopBar({ activeTab, onSelectTab, onEnterContent, isVisible }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isScreenFocused = useIsFocused();

  const progress = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: isVisible ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height isn't native-drivable
    }).start();
  }, [isVisible, progress]);

  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_HEIGHT] });

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      if (movement === 'down') onEnterContent();
    },
    [onEnterContent],
  );

  return (
    <SpatialNavigationRoot
      isActive={isVisible && isScreenFocused}
      onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}
    >
      <Animated.View style={[styles.bar, { height, opacity: progress }]}>
        <SpatialNavigationNode orientation="horizontal">
          <View style={styles.row}>
            {/* All items are uniform sibling tabs (same depth, each wrapped in
                DefaultFocus) so left/right order follows source order. Content tabs
                switch the active view; Settings navigates to its own screen. */}
            {TABS.map((tab) => {
              const isTabActive = tab === activeTab;
              // Only `enable` toggles — the element tree stays stable, so the bar's
              // navigator keeps focus on the selected tab across hide/show.
              return (
                <DefaultFocus key={tab} enable={isTabActive}>
                  <SpatialNavigationFocusableView onSelect={() => onSelectTab(tab)}>
                    {({ isFocused }) => (
                      <View style={[styles.tab, isTabActive && styles.tabActive, isFocused && styles.tabFocused]}>
                        <Text
                          style={[
                            styles.tabText,
                            isTabActive && styles.tabTextActive,
                            isFocused && styles.tabTextFocused,
                          ]}
                        >
                          {tab}
                        </Text>
                      </View>
                    )}
                  </SpatialNavigationFocusableView>
                </DefaultFocus>
              );
            })}

            <DefaultFocus enable={false}>
              <SpatialNavigationFocusableView onSelect={() => navigation.navigate('Settings')}>
                {({ isFocused }) => (
                  <View style={[styles.tab, isFocused && styles.tabFocused]}>
                    <Text style={[styles.tabText, isFocused && styles.tabTextFocused]}>Settings</Text>
                  </View>
                )}
              </SpatialNavigationFocusableView>
            </DefaultFocus>
          </View>
        </SpatialNavigationNode>
      </Animated.View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  bar: {
    overflow: 'hidden',
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
  },
  tab: {
    paddingVertical: scaledPixels(16),
    paddingHorizontal: scaledPixels(32),
    marginRight: scaledPixels(12),
    borderRadius: scaledPixels(8),
    borderWidth: scaledPixels(3),
    borderColor: 'transparent',
  },
  tabActive: {
    borderColor: colors.primary,
  },
  tabFocused: {
    backgroundColor: colors.focusBackground,
    borderColor: colors.focusBorder,
    transform: [{ scale: 1.05 }],
    shadowColor: colors.focus,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: scaledPixels(12),
    elevation: 8,
  },
  tabText: {
    color: colors.text,
    fontSize: scaledPixels(30),
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  tabTextFocused: {
    color: colors.textOnPrimary,
  },
});
