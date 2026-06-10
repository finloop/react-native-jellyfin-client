import AsyncStorage from '@amazon-devices/react-native-async-storage__async-storage';
import { configureStore } from '@reduxjs/toolkit';
import jellyfinReducer, { JellyfinState, initialState as jellyfinInitialState } from './jellyfinSlice';

interface Store {
  jellyfin: JellyfinState;
}

const loadState = async () => {
  try {
    const serializedState = await AsyncStorage.getItem('reduxState');
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error('Could not load state', err);
    return undefined;
  }
};

const saveState = async (state: Store) => {
  try {
    const serializedState = JSON.stringify(state);
    await AsyncStorage.setItem('reduxState', serializedState);
  } catch (err) {
    console.error('Could not save state', err);
  }
};

export let store: any;

export const initializeStore = async () => {
  const preloadedState = await loadState();
  // Merge persisted state over the slice defaults so state saved by an older app
  // version (missing newer fields) rehydrates with those fields defined.
  const mergedState = preloadedState
    ? { jellyfin: { ...jellyfinInitialState, ...preloadedState.jellyfin } }
    : undefined;
  store = configureStore({
    reducer: {
      jellyfin: jellyfinReducer,
    },
    preloadedState: mergedState,
  });

  store.subscribe(() => {
    saveState(store.getState());
  });

  return store;
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;