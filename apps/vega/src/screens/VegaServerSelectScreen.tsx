import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@amazon-devices/react-navigation__native';
import type { NativeStackNavigationProp } from '@amazon-devices/react-navigation__native-stack';
import {
  SpatialNavigationRoot,
  SpatialNavigationView,
} from 'react-tv-space-navigation';
import { useIsFocused } from '@amazon-devices/react-navigation__native';
import { scaledPixels, colors, FocusablePressable, JellyfinClient } from '@multi-tv/shared-ui';
import type { RootStackParamList } from '../navigation/types';
import JellyfinStorage from '../services/jellyfin/JellyfinStorage';
import VegaKeyboard, { KEY_DELETE, KEY_CLEAR, type KeyDef } from '../components/VegaKeyboard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ServerSelect'>;

// Every server URL starts here, so the field is prefilled with it and the keyboard only
// needs host/port/path characters.
const URL_PREFIX = 'https://';

// URL keyboard: lowercase letters, digits, and the punctuation a base URL needs (no
// Space — URLs have none). 10 columns; the action row spans the full width.
const URL_LAYOUT: KeyDef[][] = [
  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
  ['k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'],
  ['u', 'v', 'w', 'x', 'y', 'z', '.', '-', '/', ':'],
  ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
].map((row) => row.map((c) => ({ label: c, value: c })));

const SERVER_LAYOUT: KeyDef[][] = [
  ...URL_LAYOUT,
  [
    { label: 'Delete', value: KEY_DELETE, span: 5 },
    { label: 'Clear', value: KEY_CLEAR, span: 5 },
  ],
];

/**
 * First screen for a logged-out user: enter a Jellyfin server URL with the on-screen
 * keyboard, or use the public demo server. The chosen URL is applied to the client
 * (`setServerUrl`), persisted, and then Quick Connect login runs against it.
 */
export default function VegaServerSelectScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const [url, setUrl] = useState(URL_PREFIX);

  // Prefill with a previously-saved custom server so returning users don't retype it.
  useEffect(() => {
    JellyfinStorage.loadServer().then((saved) => {
      if (saved && saved !== JellyfinClient.SERVER_URL) setUrl(saved);
    });
  }, []);

  const handleKeyPress = useCallback((value: string) => {
    setUrl((prev) => {
      if (value === KEY_CLEAR) return URL_PREFIX;
      if (value === KEY_DELETE) return prev.slice(0, -1);
      return prev + value;
    });
  }, []);

  const goToLogin = useCallback(
    async (serverUrl: string) => {
      JellyfinClient.setServerUrl(serverUrl);
      await JellyfinStorage.saveServer(JellyfinClient.getServerUrl());
      navigation.navigate('JellyfinLogin');
    },
    [navigation],
  );

  const handleConnect = useCallback(() => {
    const trimmed = url.trim();
    // Ignore an empty / scheme-only entry.
    if (!trimmed || trimmed === URL_PREFIX || trimmed === 'http://') return;
    goToLogin(trimmed);
  }, [url, goToLogin]);

  const handleUseDemo = useCallback(() => {
    goToLogin(JellyfinClient.SERVER_URL);
  }, [goToLogin]);

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.container}>
        <Text style={styles.title}>Connect to Jellyfin</Text>
        <Text style={styles.subtitle}>
          Enter your server address, or use the public demo server.
        </Text>

        <View style={styles.field}>
          <Text style={styles.fieldText} numberOfLines={1}>
            {url}
          </Text>
          <View style={styles.caret} />
        </View>

        <SpatialNavigationView direction="vertical" style={styles.controls}>
          <VegaKeyboard onKeyPress={handleKeyPress} layout={SERVER_LAYOUT} />
          <SpatialNavigationView direction="horizontal" style={styles.buttonRow}>
            <FocusablePressable text="Connect" onSelect={handleConnect} style={styles.button} />
            <FocusablePressable
              text="Use demo server"
              onSelect={handleUseDemo}
              style={styles.button}
            />
          </SpatialNavigationView>
        </SpatialNavigationView>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingTop: scaledPixels(70),
  },
  title: {
    color: colors.text,
    fontSize: scaledPixels(48),
    fontWeight: 'bold',
    marginBottom: scaledPixels(12),
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: scaledPixels(24),
    marginBottom: scaledPixels(36),
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    width: scaledPixels(900),
    height: scaledPixels(76),
    paddingHorizontal: scaledPixels(24),
    marginBottom: scaledPixels(36),
    borderRadius: scaledPixels(10),
    borderWidth: scaledPixels(2),
    borderColor: colors.cardElevated,
    backgroundColor: colors.backgroundElevated,
  },
  fieldText: {
    color: colors.text,
    fontSize: scaledPixels(30),
    fontWeight: '600',
    flexShrink: 1,
  },
  caret: {
    width: scaledPixels(3),
    height: scaledPixels(36),
    marginLeft: scaledPixels(4),
    backgroundColor: colors.textTertiary,
  },
  controls: {
    alignItems: 'center',
    gap: scaledPixels(36),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: scaledPixels(24),
  },
  button: {
    minWidth: scaledPixels(300),
  },
});
