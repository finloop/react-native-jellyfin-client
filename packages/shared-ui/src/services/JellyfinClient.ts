import { Jellyfin } from '@jellyfin/sdk';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getMediaInfoApi } from '@jellyfin/sdk/lib/utils/api/media-info-api';
import { getUserViewsApi } from '@jellyfin/sdk/lib/utils/api/user-views-api';

export const SERVER_URL = 'http://192.168.1.13:8096';

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

const FIRE_TV_DEVICE_PROFILE = {
  MaxStreamingBitrate: 40000000,
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
    },
  ],
  ContainerProfiles: [],
  CodecProfiles: [],
  SubtitleProfiles: [],
};

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
    limit: 50,
    sortBy: ['SortName', 'ProductionYear'],
    recursive: true,
    ...(itemKind ? { includeItemTypes: [itemKind as any] } : {}),
  });
  return response.data.Items ?? [];
};

export interface AudioTrackInfo {
  index: number;
  label: string;
}

const getPlaybackUrl = async (
  token: string,
  userId: string,
  itemId: string,
  audioStreamIndex?: number,
): Promise<{ url: string; format: string; audioTracks: AudioTrackInfo[] }> => {
  const api = authApi(token);
  const response = await getMediaInfoApi(api).getPostedPlaybackInfo({
    itemId,
    userId,
    autoOpenLiveStream: true,
    playbackInfoDto: {
      DeviceProfile: FIRE_TV_DEVICE_PROFILE as any,
      UserId: userId,
      ...(audioStreamIndex !== undefined ? { AudioStreamIndex: audioStreamIndex } : {}),
    },
  });

  const mediaSource = response.data.MediaSources?.[0];
  const playSessionId = response.data.PlaySessionId;

  if (!mediaSource) {
    throw new Error(`No media source available for item ${itemId}`);
  }

  const audioTracks: AudioTrackInfo[] = (mediaSource.MediaStreams ?? [])
    .filter((s) => s.Type === 'Audio')
    .map((s) => ({
      index: s.Index ?? 0,
      label: s.DisplayTitle ?? s.Language ?? `Track ${s.Index}`,
    }));

  if (mediaSource.TranscodingUrl) {
    const url = new URL(`${SERVER_URL}${mediaSource.TranscodingUrl}`);
    if (audioStreamIndex !== undefined) {
      url.searchParams.set('AudioStreamIndex', String(audioStreamIndex));
    }
    return { url: url.toString(), format: 'HLS', audioTracks };
  }

  const qs = `static=true&api_key=${token}&mediaSourceId=${encodeURIComponent(mediaSource.Id ?? itemId)}${playSessionId ? `&PlaySessionId=${encodeURIComponent(playSessionId)}` : ''}`;
  return {
    url: `${SERVER_URL}/Videos/${itemId}/stream?${qs}`,
    format: 'MP4',
    audioTracks,
  };
};

const getItemImageUrl = (itemId: string): string =>
  `${SERVER_URL}/Items/${itemId}/Images/Primary`;

export default {
  SERVER_URL,
  initiateQuickConnect,
  checkQuickConnect,
  authenticateWithQuickConnect,
  getLibraries,
  getLibraryItems,
  getPlaybackUrl,
  getItemImageUrl,
  COLLECTION_TYPE_TO_ITEM_KIND,
};