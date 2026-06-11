import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@amazon-devices/react-navigation__native-stack';
import JellyfinStorage from '../services/jellyfin/JellyfinStorage';
import type { RootStackParamList } from '../navigation/types';
import { JellyfinClient } from '@multi-tv/shared-ui';

const WHITE = '#FFFFFF';
const BLACK = '#000000';
const LIGHT_GRAY = '#CCCCCC';
const PALE_GRAY = '#999999';
const STRONG_RED = '#E74C3C';
const CHARCOAL_GRAY = '#333333';

type Props = NativeStackScreenProps<RootStackParamList, 'JellyfinLogin'>;

const POLL_INTERVAL_MS = 1000;

const JellyfinLoginScreen = ({ navigation }: Props) => {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const secretRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (secret: string) => {
      intervalRef.current = setInterval(async () => {
        try {
          const result = await JellyfinClient.checkQuickConnect(secret);
          if (result.Authenticated) {
            stopPolling();
            setIsAuthenticating(true);
            const authResult =
              await JellyfinClient.authenticateWithQuickConnect(secret);
            await JellyfinStorage.saveAuth({
              accessToken: authResult.AccessToken,
              userId: authResult.User.Id,
              userName: authResult.User.Name,
              serverUrl: JellyfinClient.getServerUrl(),
            });
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
          }
        } catch (e: any) {
          const status = e?.response?.status;
          if (status === 400 || status === 404) {
            stopPolling();
            setError(
              status === 400
                ? 'The code has expired. Please try again.'
                : 'Quick Connect session not found. Please try again.',
            );
          }
        }
      }, POLL_INTERVAL_MS);
    },
    [navigation, stopPolling],
  );

  const initQuickConnect = useCallback(async () => {
    stopPolling();
    setCode(null);
    setError(null);
    setIsAuthenticating(false);
    try {
      const result = await JellyfinClient.initiateQuickConnect();
      secretRef.current = result.Secret;
      setCode(result.Code);
      startPolling(result.Secret);
    } catch {
      setError(
        'Could not reach Jellyfin server. Make sure the server is running.',
      );
    }
  }, [startPolling, stopPolling]);

  useEffect(() => {
    initQuickConnect();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isAuthenticating) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={WHITE} />
        <Text style={styles.hint}>Signing in…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect to Jellyfin</Text>

      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={initQuickConnect}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </>
      ) : code ? (
        <>
          <Text style={styles.instruction}>
            Open your Jellyfin server and go to{'\n'}
            Dashboard → Quick Connect, then enter:
          </Text>
          <Text style={styles.code}>{code}</Text>
          <ActivityIndicator
            style={styles.spinner}
            color={PALE_GRAY}
          />
          <Text style={styles.hint}>Waiting for approval…</Text>
        </>
      ) : (
        <ActivityIndicator size="large" color={WHITE} />
      )}
    </View>
  );
};

export default JellyfinLoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    color: WHITE,
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 32,
  },
  instruction: {
    color: LIGHT_GRAY,
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 32,
  },
  code: {
    color: WHITE,
    fontSize: 80,
    fontWeight: 'bold',
    letterSpacing: 12,
    marginBottom: 40,
  },
  spinner: {
    marginBottom: 16,
  },
  hint: {
    color: PALE_GRAY,
    fontSize: 18,
    marginTop: 16,
  },
  error: {
    color: STRONG_RED,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 28,
  },
  button: {
    backgroundColor: CHARCOAL_GRAY,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: WHITE,
    fontSize: 20,
    fontWeight: '600',
  },
});