// Main App Navigator
export { default as AppNavigator } from './navigation/AppNavigator';
export type { AppNavigatorProps } from './navigation/AppNavigator';

// Theme
export * from './theme';

// Components
export { default as FocusablePressable } from './components/FocusablePressable';
export { default as LoadingIndicator } from './components/LoadingIndicator';
export { default as SeasonSelector } from './components/SeasonSelector';
export { default as EpisodeRow } from './components/EpisodeRow';
export { MenuProvider, useMenuContext } from './components/MenuContext';
export { default as CustomDrawerContent } from './components/CustomDrawerContent';
export { default as PlatformLinearGradient } from './components/PlatformLinearGradient';

// Screens
export { default as HomeScreen } from './screens/HomeScreen';
export { default as DetailsScreen } from './screens/DetailsScreen';
export { default as PlayerScreen } from './screens/PlayerScreen';
export { default as ExploreScreen } from './screens/ExploreScreen';
export { default as TVScreen } from './screens/TVScreen';
export { default as SettingsScreen } from './screens/SettingsScreen';

// Services
export { default as JellyfinClient } from './services/JellyfinClient';
export type { QuickConnectResult, JellyfinAuthResult } from './services/JellyfinClient';

// Utils
export { VideoHandler } from './utils/VideoHandler';
export { isRTL, getOpenDrawerDirection, getCloseDrawerDirection } from './utils/rtl';

// Navigation
export { default as RootNavigator } from './navigation/RootNavigator';
export { default as DrawerNavigator } from './navigation/DrawerNavigator';
export * from './navigation/types';

// Hooks
export { scaledPixels } from './hooks/useScale';

// Remote Control
export { GoBackConfiguration } from './app/remote-control/GoBackConfiguration';
