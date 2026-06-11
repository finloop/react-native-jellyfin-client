import { Jellyfin } from '@jellyfin/sdk';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getMediaInfoApi } from '@jellyfin/sdk/lib/utils/api/media-info-api';
import { getPlaystateApi } from '@jellyfin/sdk/lib/utils/api/playstate-api';
import { getTvShowsApi } from '@jellyfin/sdk/lib/utils/api/tv-shows-api';
import { getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api/user-library-api';
import { getUserViewsApi } from '@jellyfin/sdk/lib/utils/api/user-views-api';

export const SERVER_URL = 'https://demo.jellyfin.org/stable';

const jellyfin = new Jellyfin({
  clientInfo: { name: 'MultiTV Vega', version: '1.0.0' },
  deviceInfo: { name: 'Fire TV', id: 'multitv-vega-device' },
});

const unauthApi = () => jellyfin.createApi(SERVER_URL);
const authApi = (token: string) => jellyfin.createApi(SERVER_URL, token);

export interface QuickConnectResult {
  Code: string;
  Secret: string;
  Authenticated: boolean;
}

export interface JellyfinAuthResult {
  AccessToken: string;
  User: { Id: string; Name: string };
}

const initiateQuickConnect = async (): Promise<QuickConnectResult> => {
  const api = unauthApi();
  const response = await api.axiosInstance.post<QuickConnectResult>(
    `${api.basePath}/QuickConnect/Initiate`,
    null,
    { headers: { Authorization: api.authorizationHeader } },
  );
  return response.data;
};

const checkQuickConnect = async (secret: string): Promise<QuickConnectResult> => {
  const api = unauthApi();
  const response = await api.axiosInstance.get<QuickConnectResult>(
    `${api.basePath}/QuickConnect/Connect?Secret=${secret}`,
    { headers: { Authorization: api.authorizationHeader } },
  );
  return response.data;
};

const authenticateWithQuickConnect = async (secret: string): Promise<JellyfinAuthResult> => {
  const api = unauthApi();
  const response = await api.axiosInstance.post<JellyfinAuthResult>(
    `${api.basePath}/Users/AuthenticateWithQuickConnect`,
    { secret },
    { headers: { Authorization: api.authorizationHeader } },
  );
  return response.data;
};

const getLibraries = async (token: string, userId: string): Promise<BaseItemDto[]> => {
  const api = authApi(token);
  const response = await getUserViewsApi(api).getUserViews({ userId });
  return response.data.Items ?? [];
};

// Per-codec hardware decode ceilings for Fire TV (Vega), from the device specs.
// The transcode profile below outputs h264, so 30 Mbps is the effective Max.
// The old 8 Mbps cap was overly conservative — the ~39.6 Mbps micro-stall was
// simply exceeding h264's 30 Mbps hardware limit, not a general decoder weakness.
const CODEC_MAX_BITRATE: Record<string, number> = {
  h264: 30_000_000,
  hevc: 35_000_000,
  av1: 100_000_000,
  vp9: 30_000_000,
};

/** Default/highest streaming bitrate: the h264 hardware decode ceiling (30 Mbps). */
export const DEFAULT_MAX_BITRATE = CODEC_MAX_BITRATE.h264;

// Built per request so the quality picker can re-resolve at a different bitrate.
// VideoBitrate is the binding cap (Jellyfin transcodes to min(source, this)), so
// setting it together with MaxStreamingBitrate is how the ceiling actually holds.
const buildFireTvDeviceProfile = (maxBitrate: number = DEFAULT_MAX_BITRATE) => ({
  MaxStreamingBitrate: maxBitrate,
  DirectPlayProfiles: [],
  TranscodingProfiles: [
    {
      Container: 'ts',
      Type: 'Video',
      AudioCodec: 'aac',
      VideoCodec: 'h264',
      Context: 'Streaming',
      Protocol: 'hls',
      MaxAudioChannels: '2',
      MinSegments: '1',
      BreakOnNonKeyFrames: true,
      VideoBitrate: maxBitrate,
    },
  ],
  ContainerProfiles: [],
  CodecProfiles: [],
  // Empty: the client advertises no subtitle delivery formats, so Jellyfin burns
  // a requested SubtitleStreamIndex into the transcode (Encode/burn-in).
  SubtitleProfiles: [],
});

const COLLECTION_TYPE_TO_ITEM_KIND: Record<string, string> = {
  movies: 'Movie',
  tvshows: 'Series',
  boxsets: 'BoxSet',
  homevideos: 'Video',
  musicvideos: 'MusicVideo',
  playlists: 'Playlist',
  music: 'MusicAlbum',
};

const getLibraryItems = async (
  token: string,
  userId: string,
  libraryId: string,
  collectionType?: string | null,
): Promise<BaseItemDto[]> => {
  const api = authApi(token);
  const itemKind = collectionType
    ? COLLECTION_TYPE_TO_ITEM_KIND[collectionType]
    : undefined;
  const response = await getItemsApi(api).getItems({
    userId,
    parentId: libraryId,
    fields: [ItemFields.Overview, ItemFields.Genres],
    // TODO: paginate via startIndex + grid onEndReached for libraries beyond this cap.
    limit: 200,
    sortBy: ['SortName', 'ProductionYear'],
    recursive: true,
    ...(itemKind ? { includeItemTypes: [itemKind as any] } : {}),
  });
  return response.data.Items ?? [];
};

// Full metadata for a single item (People, Genres, RunTimeTicks, ProductionYear,
// CommunityRating, OfficialRating, Overview, …) — getItem returns these by default,
// unlike getLibraryItems which restricts fields to keep the listing query light.
const getItemDetails = async (
  token: string,
  userId: string,
  itemId: string,
): Promise<BaseItemDto> => {
  const api = authApi(token);
  const response = await getUserLibraryApi(api).getItem({ userId, itemId });
  return response.data;
};

// Shared request shape for the curated Home rows. Overview + Genres feed RowInfoPanel.
const HOME_ROW_LIMIT = 20;
const HOME_FIELDS = [ItemFields.Overview, ItemFields.Genres];
const HOME_IMAGE_TYPES = ['Primary', 'Backdrop', 'Thumb'] as any;

// Continue Watching — items the user has partially played (movies, series, episodes).
const getResumeItems = async (token: string, userId: string): Promise<BaseItemDto[]> => {
  const api = authApi(token);
  const res = await getItemsApi(api).getResumeItems({
    userId,
    includeItemTypes: ['Movie', 'Series', 'Episode'] as any,
    fields: HOME_FIELDS,
    enableImageTypes: HOME_IMAGE_TYPES,
    limit: HOME_ROW_LIMIT,
  });
  return res.data.Items ?? [];
};

// Next Up — the next unwatched episode per series (excluding ones already in progress).
const getNextUp = async (token: string, userId: string): Promise<BaseItemDto[]> => {
  const api = authApi(token);
  const res = await getTvShowsApi(api).getNextUp({
    userId,
    fields: HOME_FIELDS,
    enableImageTypes: HOME_IMAGE_TYPES,
    enableResumable: false,
    limit: HOME_ROW_LIMIT,
  });
  return res.data.Items ?? [];
};

// Seasons of a Series, in air order. ItemCounts populates ChildCount (episodes/season),
// used for the "N Seasons · M Episodes" summary on the details screen.
const getSeasons = async (
  token: string,
  userId: string,
  seriesId: string,
): Promise<BaseItemDto[]> => {
  const api = authApi(token);
  const res = await getTvShowsApi(api).getSeasons({
    seriesId,
    userId,
    fields: [ItemFields.ItemCounts],
    enableImageTypes: HOME_IMAGE_TYPES,
  });
  return res.data.Items ?? [];
};

// Episodes for one season of a Series. enableUserData drives the resume progress bar.
const getEpisodes = async (
  token: string,
  userId: string,
  seriesId: string,
  seasonId: string,
): Promise<BaseItemDto[]> => {
  const api = authApi(token);
  const res = await getTvShowsApi(api).getEpisodes({
    seriesId,
    userId,
    seasonId,
    enableUserData: true,
    fields: HOME_FIELDS,
    enableImageTypes: HOME_IMAGE_TYPES,
  });
  return res.data.Items ?? [];
};

// The series' next episode to play: in-progress first (enableResumable), then the next
// unwatched one — powers the details screen's primary Play/Resume button.
const getSeriesNextUp = async (
  token: string,
  userId: string,
  seriesId: string,
): Promise<BaseItemDto | null> => {
  const api = authApi(token);
  const res = await getTvShowsApi(api).getNextUp({
    userId,
    seriesId,
    fields: HOME_FIELDS,
    enableImageTypes: HOME_IMAGE_TYPES,
    enableUserData: true,
    enableResumable: true,
    limit: 1,
  });
  return res.data.Items?.[0] ?? null;
};

// Recently Added in a library. Note: getLatestMedia returns the array directly on
// `data`, not `data.Items` like the other endpoints.
const getLatestMedia = async (
  token: string,
  userId: string,
  parentId: string,
  itemKind: string,
): Promise<BaseItemDto[]> => {
  const api = authApi(token);
  const res = await getUserLibraryApi(api).getLatestMedia({
    userId,
    parentId,
    includeItemTypes: [itemKind] as any,
    fields: HOME_FIELDS,
    enableImageTypes: HOME_IMAGE_TYPES,
    limit: HOME_ROW_LIMIT,
  });
  return res.data ?? [];
};

export interface AudioTrackInfo {
  index: number;
  label: string;
}

export interface SubtitleTrackInfo {
  /** Jellyfin subtitle stream index; -1 is the synthetic "Off" entry. */
  index: number;
  label: string;
}

export interface PlaybackResolution {
  url: string;
  format: string;
  audioTracks: AudioTrackInfo[];
  /** Selectable subtitle streams (plus an "Off" entry), burned in on selection. */
  subtitleTracks: SubtitleTrackInfo[];
  /** Stream indices Jellyfin actually selected for this resolution — used to seed
   * the player UI so it matches what's really playing (-1 subtitle = none). */
  audioStreamIndex: number;
  subtitleStreamIndex: number;
  /** Session identifiers from /PlaybackInfo — reused for every playback report. */
  playSessionId?: string;
  mediaSourceId?: string;
  /** Total runtime, in Jellyfin ticks (100ns units). */
  runTimeTicks?: number;
  /** Saved resume position from UserData, in ticks. 0 when not resumable. */
  resumePositionTicks: number;
}

const getPlaybackUrl = async (
  token: string,
  userId: string,
  itemId: string,
  audioStreamIndex?: number,
  subtitleStreamIndex?: number,
  maxStreamingBitrate?: number,
): Promise<PlaybackResolution> => {
  const api = authApi(token);

  const itemResponse = await getUserLibraryApi(api).getItem({ userId, itemId });
  const resumePositionTicks = itemResponse.data.UserData?.PlaybackPositionTicks ?? 0;

  const response = await getMediaInfoApi(api).getPostedPlaybackInfo({
    itemId,
    userId,
    autoOpenLiveStream: true,
    playbackInfoDto: {
      DeviceProfile: buildFireTvDeviceProfile(maxStreamingBitrate) as any,
      UserId: userId,
      ...(audioStreamIndex !== undefined ? { AudioStreamIndex: audioStreamIndex } : {}),
      ...(subtitleStreamIndex !== undefined ? { SubtitleStreamIndex: subtitleStreamIndex } : {}),
    },
  });

  const mediaSource = response.data.MediaSources?.[0];
  const playSessionId = response.data.PlaySessionId ?? undefined;

  if (!mediaSource) {
    throw new Error(`No media source available for item ${itemId}`);
  }

  const mediaSourceId = mediaSource.Id ?? itemId;
  const runTimeTicks = mediaSource.RunTimeTicks ?? undefined;

  const audioTracks: AudioTrackInfo[] = (mediaSource.MediaStreams ?? [])
    .filter((s) => s.Type === 'Audio')
    .map((s) => ({
      index: s.Index ?? 0,
      label: s.DisplayTitle ?? s.Language ?? `Track ${s.Index}`,
    }));

  // All subtitle streams (burn-in handles image-based subs too), plus a synthetic
  // "Off" entry. Selecting one re-resolves with its index so Jellyfin encodes it.
  const subtitleTracks: SubtitleTrackInfo[] = [
    { index: -1, label: 'Off' },
    ...(mediaSource.MediaStreams ?? [])
      .filter((s) => s.Type === 'Subtitle')
      .map((s) => ({
        index: s.Index ?? 0,
        label: s.DisplayTitle ?? s.Language ?? `Subtitle ${s.Index}`,
      })),
  ];

  const session = { playSessionId, mediaSourceId, runTimeTicks, resumePositionTicks, subtitleTracks };

  const fallbackAudioIndex = mediaSource.DefaultAudioStreamIndex ?? audioTracks[0]?.index ?? 0;

  if (mediaSource.TranscodingUrl) {
    const url = new URL(`${SERVER_URL}${mediaSource.TranscodingUrl}`);
    // Jellyfin ignores these in the PlaybackInfo body for live sessions, so they
    // must be overridden on the TranscodingUrl query string. -1 = no subtitle.
    if (audioStreamIndex !== undefined) {
      url.searchParams.set('AudioStreamIndex', String(audioStreamIndex));
    }
    if (subtitleStreamIndex !== undefined) {
      url.searchParams.set('SubtitleStreamIndex', String(subtitleStreamIndex));
    }
    // Read back what Jellyfin actually selected (on the first resolve it picks
    // defaults/forced streams itself) so the UI reflects what's really playing.
    const activeAudio = url.searchParams.get('AudioStreamIndex');
    const activeSubtitle = url.searchParams.get('SubtitleStreamIndex');
    return {
      url: url.toString(),
      format: 'HLS',
      audioTracks,
      audioStreamIndex: activeAudio !== null ? Number(activeAudio) : fallbackAudioIndex,
      subtitleStreamIndex: activeSubtitle !== null ? Number(activeSubtitle) : -1,
      ...session,
    };
  }

  const qs = `static=true&api_key=${token}&mediaSourceId=${encodeURIComponent(mediaSourceId)}${playSessionId ? `&PlaySessionId=${encodeURIComponent(playSessionId)}` : ''}`;
  return {
    url: `${SERVER_URL}/Videos/${itemId}/stream?${qs}`,
    format: 'MP4',
    audioTracks,
    audioStreamIndex: audioStreamIndex ?? fallbackAudioIndex,
    subtitleStreamIndex: subtitleStreamIndex ?? -1,
    ...session,
  };
};

export interface PlaybackReport {
  token: string;
  itemId: string;
  playSessionId?: string;
  mediaSourceId?: string;
  positionTicks: number;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
  isPaused?: boolean;
}

// Transcode-only device profile (see FIRE_TV_DEVICE_PROFILE), so always Transcode.
const PLAY_METHOD = 'Transcode' as const;

const reportPlaybackStart = async (report: PlaybackReport): Promise<void> => {
  const api = authApi(report.token);
  await getPlaystateApi(api).reportPlaybackStart({
    playbackStartInfo: {
      ItemId: report.itemId,
      MediaSourceId: report.mediaSourceId,
      PlaySessionId: report.playSessionId,
      PositionTicks: report.positionTicks,
      AudioStreamIndex: report.audioStreamIndex,
      SubtitleStreamIndex: report.subtitleStreamIndex,
      PlayMethod: PLAY_METHOD,
      CanSeek: true,
      IsPaused: false,
    },
  });
};

const reportPlaybackProgress = async (report: PlaybackReport): Promise<void> => {
  const api = authApi(report.token);
  await getPlaystateApi(api).reportPlaybackProgress({
    playbackProgressInfo: {
      ItemId: report.itemId,
      MediaSourceId: report.mediaSourceId,
      PlaySessionId: report.playSessionId,
      PositionTicks: report.positionTicks,
      AudioStreamIndex: report.audioStreamIndex,
      SubtitleStreamIndex: report.subtitleStreamIndex,
      PlayMethod: PLAY_METHOD,
      CanSeek: true,
      IsPaused: report.isPaused ?? false,
    },
  });
};

const reportPlaybackStopped = async (report: PlaybackReport): Promise<void> => {
  const api = authApi(report.token);
  await getPlaystateApi(api).reportPlaybackStopped({
    playbackStopInfo: {
      ItemId: report.itemId,
      MediaSourceId: report.mediaSourceId,
      PlaySessionId: report.playSessionId,
      PositionTicks: report.positionTicks,
    },
  });
};

const markPlayed = async (token: string, userId: string, itemId: string): Promise<void> => {
  const api = authApi(token);
  await getPlaystateApi(api).markPlayedItem({ userId, itemId });
};

// SERVER_URL must NOT have a trailing slash (it's a sub-path origin), so paths
// here start with `/`. A trailing slash on SERVER_URL would yield `stable//Items`,
// which the demo's sub-path reverse proxy 404s.
const getItemImageUrl = (itemId: string): string =>
  `${SERVER_URL}/Items/${itemId}/Images/Primary`;

// Landscape backdrop for an item, falling back to the Primary (poster) image when
// the item has no backdrop so the caller never renders a broken image.
const getItemBackdropUrl = (item: Pick<BaseItemDto, 'Id' | 'BackdropImageTags'>): string =>
  (item.BackdropImageTags?.length ?? 0) > 0
    ? `${SERVER_URL}/Items/${item.Id}/Images/Backdrop/0`
    : `${SERVER_URL}/Items/${item.Id}/Images/Primary`;

export default {
  SERVER_URL,
  initiateQuickConnect,
  checkQuickConnect,
  authenticateWithQuickConnect,
  getLibraries,
  getLibraryItems,
  getItemDetails,
  getResumeItems,
  getNextUp,
  getSeasons,
  getEpisodes,
  getSeriesNextUp,
  getLatestMedia,
  getPlaybackUrl,
  reportPlaybackStart,
  reportPlaybackProgress,
  reportPlaybackStopped,
  markPlayed,
  getItemImageUrl,
  getItemBackdropUrl,
  COLLECTION_TYPE_TO_ITEM_KIND,
};