import { useCallback, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useDispatch } from 'react-redux';
import {
  SpatialNavigationRoot,
  SpatialNavigationScrollView,
  SpatialNavigationNode,
  DefaultFocus,
} from 'react-tv-space-navigation';
import { useIsFocused, useNavigation } from '@amazon-devices/react-navigation__native';
import type { NativeStackNavigationProp } from '@amazon-devices/react-navigation__native-stack';
import { FocusablePressable, scaledPixels, colors, safeZones } from '@multi-tv/shared-ui';
import type { RootStackParamList } from '../navigation/types';
import type { AppDispatch } from '../store';
import { clearAuth } from '../store/jellyfinSlice';
import JellyfinStorage from '../services/jellyfin/JellyfinStorage';
import { useRemoteBackHandler } from '../hooks/useRemoteBackHandler';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

/**
 * Vega-local Settings screen reached from the top bar's gear. Unlike the shared
 * `SettingsScreen`, it has no drawer-open side effect and its root is active purely
 * on route focus — so there's no `MenuContext` coupling and no focus trap now that
 * the drawer is gone. Back (hardware / the Back button) pops to `Main`.
 */
export default function VegaSettingsScreen() {
  const isFocused = useIsFocused();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  useRemoteBackHandler();
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [notifications, setNotifications] = useState(true);
  const [autoplay, setAutoplay] = useState(true);

  const qualityOptions = ['Auto', '1080p', '720p', '480p'];

  // Drop the stored token (the source of truth for the startup route) and reset Redux,
  // then return to server selection — the saved server URL prefills there. Quality/etc.
  // above are local-only mocks, so only auth needs clearing.
  const handleLogout = useCallback(async () => {
    await JellyfinStorage.clearAuth();
    dispatch(clearAuth());
    navigation.reset({ index: 0, routes: [{ name: 'ServerSelect' }] });
  }, [dispatch, navigation]);

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Settings</Text>
          <DefaultFocus>
            <FocusablePressable text="← Back" onSelect={() => navigation.goBack()} style={styles.backButton} />
          </DefaultFocus>
        </View>

        <SpatialNavigationScrollView style={styles.scrollView}>
          <View style={styles.scrollContent}>
            {/* Video Quality */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Video Quality</Text>
              <SpatialNavigationNode orientation="horizontal">
                <View style={styles.optionsRow}>
                  {qualityOptions.map((quality) => (
                    <FocusablePressable
                      key={quality}
                      text={quality}
                      onSelect={() => setSelectedQuality(quality)}
                      style={selectedQuality === quality ? styles.optionButtonSelected : styles.optionButton}
                    />
                  ))}
                </View>
              </SpatialNavigationNode>
            </View>

            {/* Playback */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Playback</Text>
              <SpatialNavigationNode orientation="vertical">
                <View style={styles.optionsColumn}>
                  <FocusablePressable
                    text={`Autoplay: ${autoplay ? 'On' : 'Off'}`}
                    onSelect={() => setAutoplay(!autoplay)}
                    style={styles.toggleButton}
                  />
                  <FocusablePressable
                    text={`Notifications: ${notifications ? 'On' : 'Off'}`}
                    onSelect={() => setNotifications(!notifications)}
                    style={styles.toggleButton}
                  />
                </View>
              </SpatialNavigationNode>
            </View>

            {/* About */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Version</Text>
                  <Text style={styles.infoValue}>1.0.0</Text>
                </View>
              </View>
            </View>

            {/* Account */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              <SpatialNavigationNode orientation="vertical">
                <FocusablePressable
                  text="Log out"
                  onSelect={handleLogout}
                  style={styles.logoutButton}
                />
              </SpatialNavigationNode>
            </View>
          </View>
        </SpatialNavigationScrollView>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: scaledPixels(safeZones.titleSafe.vertical),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
    marginBottom: scaledPixels(24),
  },
  title: {
    fontSize: scaledPixels(48),
    fontWeight: 'bold',
    color: colors.text,
  },
  backButton: {
    minWidth: scaledPixels(160),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
    paddingTop: scaledPixels(16),
    paddingBottom: scaledPixels(safeZones.actionSafe.vertical + 60),
  },
  section: {
    marginBottom: scaledPixels(40),
  },
  sectionTitle: {
    fontSize: scaledPixels(28),
    fontWeight: '600',
    color: colors.text,
    marginBottom: scaledPixels(20),
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionsColumn: {
    gap: scaledPixels(16),
  },
  optionButton: {
    marginEnd: scaledPixels(12),
    marginBottom: scaledPixels(12),
  },
  optionButtonSelected: {
    marginEnd: scaledPixels(12),
    marginBottom: scaledPixels(12),
    backgroundColor: colors.primary,
  },
  toggleButton: {
    alignSelf: 'flex-start',
    minWidth: scaledPixels(300),
  },
  logoutButton: {
    alignSelf: 'flex-start',
    minWidth: scaledPixels(300),
    backgroundColor: colors.error,
  },
  infoContainer: {
    backgroundColor: colors.card,
    borderRadius: scaledPixels(12),
    padding: scaledPixels(24),
    gap: scaledPixels(16),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: scaledPixels(24),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: scaledPixels(24),
    color: colors.text,
    fontWeight: '600',
  },
});
