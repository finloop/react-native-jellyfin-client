import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@amazon-devices/react-navigation__native-stack';
import { RootStackParamList } from './types';
import VegaMainScreen from './VegaMainScreen';
import JellyfinLoginScreen from '../screens/JellyfinLoginScreen';
import VegaServerSelectScreen from '../screens/VegaServerSelectScreen';
import JellyfinStorage from '../services/jellyfin/JellyfinStorage';
import { DetailsScreen, JellyfinClient } from '@multi-tv/shared-ui';
import VegaPlayerScreen from '../screens/player/VegaPlayerScreen';
import VegaSettingsScreen from '../screens/VegaSettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function VegaRootNavigator() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const auth = await JellyfinStorage.loadAuth();
      if (auth) {
        // Re-point the client at the server this session was authenticated against.
        JellyfinClient.setServerUrl(auth.serverUrl);
        setInitialRoute('Main');
        return;
      }
      // Logged out: apply any previously-chosen server so the select screen prefills it,
      // then let the user confirm or change it before logging in.
      const server = await JellyfinStorage.loadServer();
      if (server) JellyfinClient.setServerUrl(server);
      setInitialRoute('ServerSelect');
    })();
  }, []);

  if (!initialRoute) {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute as keyof RootStackParamList}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ServerSelect" component={VegaServerSelectScreen} />
      <Stack.Screen name="JellyfinLogin" component={JellyfinLoginScreen} />
      <Stack.Screen name="Main" component={VegaMainScreen} />
      <Stack.Screen name="Settings" component={VegaSettingsScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen name="Player" component={VegaPlayerScreen} />
    </Stack.Navigator>
  );
}