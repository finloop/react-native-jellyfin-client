import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@amazon-devices/react-navigation__native-stack';
import { RootStackParamList } from './types';
import VegaDrawerNavigator from './VegaDrawerNavigator';
import JellyfinLoginScreen from '../screens/JellyfinLoginScreen';
import JellyfinStorage from '../services/jellyfin/JellyfinStorage';
import { DetailsScreen } from '@multi-tv/shared-ui';
import VegaPlayerScreen from '../screens/player/VegaPlayerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function VegaRootNavigator() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    JellyfinStorage.loadAuth().then(auth => {
      setInitialRoute(auth ? 'Main' : 'JellyfinLogin');
    });
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
      <Stack.Screen name="JellyfinLogin" component={JellyfinLoginScreen} />
      <Stack.Screen name="Main" component={VegaDrawerNavigator} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen name="Player" component={VegaPlayerScreen} />
    </Stack.Navigator>
  );
}