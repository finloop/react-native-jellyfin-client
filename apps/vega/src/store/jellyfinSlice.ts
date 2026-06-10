import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { JellyfinClient } from '@multi-tv/shared-ui';
import JellyfinStorage from '../services/jellyfin/JellyfinStorage';

export interface JellyfinState {
  accessToken: string | null;
  userId: string | null;
  userName: string | null;
  serverUrl: string | null;
  libraries: BaseItemDto[];
  libraryItems: Record<string, BaseItemDto[]>;
  // Per-library in-flight flag for `fetchLibraryItems`, keyed by libraryId (parallel
  // to `libraryItems`) so opening two libraries in quick succession can't cross-talk.
  isLibraryItemsLoading: Record<string, boolean>;
  resumeItems: BaseItemDto[];
  nextUpItems: BaseItemDto[];
  latestMovies: BaseItemDto[];
  latestShows: BaseItemDto[];
  isAuthLoading: boolean;
  isLibrariesLoading: boolean;
  isHomeRowsLoading: boolean;
  // True once the Home rows have loaded successfully at least once. Persisted, so
  // subsequent mounts/cold starts render cached rows instead of the loading takeover
  // while a background refetch runs silently.
  hasLoadedHomeRows: boolean;
  error: string | null;
}

export const initialState: JellyfinState = {
  accessToken: null,
  userId: null,
  userName: null,
  serverUrl: null,
  libraries: [],
  libraryItems: {},
  isLibraryItemsLoading: {},
  resumeItems: [],
  nextUpItems: [],
  latestMovies: [],
  latestShows: [],
  isAuthLoading: true,
  isLibrariesLoading: false,
  isHomeRowsLoading: false,
  hasLoadedHomeRows: false,
  error: null,
};

export const loadStoredAuth = createAsyncThunk(
  'jellyfin/loadStoredAuth',
  async () => {
    return await JellyfinStorage.loadAuth();
  },
);

export const fetchLibraries = createAsyncThunk(
  'jellyfin/fetchLibraries',
  async (_: void, { getState }) => {
    const state = (getState() as any).jellyfin as JellyfinState;
    if (!state.accessToken || !state.userId) {
      throw new Error('Not authenticated');
    }
    return await JellyfinClient.getLibraries(state.accessToken, state.userId);
  },
);

export const fetchLibraryItems = createAsyncThunk(
  'jellyfin/fetchLibraryItems',
  async (
    { libraryId, collectionType }: { libraryId: string; collectionType?: string | null },
    { getState },
  ) => {
    const state = (getState() as any).jellyfin as JellyfinState;
    if (!state.accessToken || !state.userId) {
      throw new Error('Not authenticated');
    }
    const items = await JellyfinClient.getLibraryItems(
      state.accessToken,
      state.userId,
      libraryId,
      collectionType,
    );
    return { libraryId, items };
  },
);

// Fetches the four curated Home rows in parallel. Depends on `libraries` already
// being loaded so it can resolve the movies/tvshows parentIds for "recently added".
export const fetchHomeRows = createAsyncThunk(
  'jellyfin/fetchHomeRows',
  async (_: void, { getState }) => {
    const state = (getState() as any).jellyfin as JellyfinState;
    const { accessToken, userId, libraries } = state;
    if (!accessToken || !userId) {
      throw new Error('Not authenticated');
    }
    const moviesLib = libraries.find((l) => l.CollectionType === 'movies');
    const showsLib = libraries.find((l) => l.CollectionType === 'tvshows');
    const [resumeItems, nextUpItems, latestMovies, latestShows] = await Promise.all([
      JellyfinClient.getResumeItems(accessToken, userId),
      JellyfinClient.getNextUp(accessToken, userId),
      moviesLib?.Id
        ? JellyfinClient.getLatestMedia(accessToken, userId, moviesLib.Id, 'Movie')
        : Promise.resolve([]),
      showsLib?.Id
        ? JellyfinClient.getLatestMedia(accessToken, userId, showsLib.Id, 'Series')
        : Promise.resolve([]),
    ]);
    return { resumeItems, nextUpItems, latestMovies, latestShows };
  },
);

const jellyfinSlice = createSlice({
  name: 'jellyfin',
  initialState,
  reducers: {
    setAuth(
      state,
      action: PayloadAction<{
        accessToken: string;
        userId: string;
        userName: string;
        serverUrl: string;
      }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId;
      state.userName = action.payload.userName;
      state.serverUrl = action.payload.serverUrl;
      state.isAuthLoading = false;
    },
    clearAuth(state) {
      state.accessToken = null;
      state.userId = null;
      state.userName = null;
      state.serverUrl = null;
      state.libraries = [];
      state.libraryItems = {};
      state.isLibraryItemsLoading = {};
      state.resumeItems = [];
      state.nextUpItems = [];
      state.latestMovies = [];
      state.latestShows = [];
      state.hasLoadedHomeRows = false;
      state.isAuthLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStoredAuth.pending, (state) => {
        state.isAuthLoading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isAuthLoading = false;
        if (action.payload) {
          state.accessToken = action.payload.accessToken;
          state.userId = action.payload.userId;
          state.userName = action.payload.userName;
          state.serverUrl = action.payload.serverUrl;
        }
      })
      .addCase(loadStoredAuth.rejected, (state) => {
        state.isAuthLoading = false;
      })
      .addCase(fetchLibraries.pending, (state) => {
        state.isLibrariesLoading = true;
        state.error = null;
      })
      .addCase(fetchLibraries.fulfilled, (state, action) => {
        state.isLibrariesLoading = false;
        state.libraries = action.payload;
      })
      .addCase(fetchLibraries.rejected, (state, action) => {
        state.isLibrariesLoading = false;
        state.error = action.error.message ?? 'Failed to fetch libraries';
      })
      .addCase(fetchLibraryItems.pending, (state, action) => {
        state.isLibraryItemsLoading[action.meta.arg.libraryId] = true;
        state.error = null;
      })
      .addCase(fetchLibraryItems.fulfilled, (state, action) => {
        state.isLibraryItemsLoading[action.payload.libraryId] = false;
        state.libraryItems[action.payload.libraryId] = action.payload.items;
      })
      .addCase(fetchLibraryItems.rejected, (state, action) => {
        state.isLibraryItemsLoading[action.meta.arg.libraryId] = false;
        state.error = action.error.message ?? 'Failed to fetch library items';
      })
      .addCase(fetchHomeRows.pending, (state) => {
        state.isHomeRowsLoading = true;
        state.error = null;
      })
      .addCase(fetchHomeRows.fulfilled, (state, action) => {
        state.isHomeRowsLoading = false;
        state.hasLoadedHomeRows = true;
        state.resumeItems = action.payload.resumeItems;
        state.nextUpItems = action.payload.nextUpItems;
        state.latestMovies = action.payload.latestMovies;
        state.latestShows = action.payload.latestShows;
      })
      .addCase(fetchHomeRows.rejected, (state, action) => {
        state.isHomeRowsLoading = false;
        state.error = action.error.message ?? 'Failed to fetch home rows';
      });
  },
});

export const { setAuth, clearAuth } = jellyfinSlice.actions;
export default jellyfinSlice.reducer;