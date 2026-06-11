import AsyncStorage from '@amazon-devices/react-native-async-storage__async-storage';

const STORAGE_KEY = '@jellyfin_auth';
// The chosen server URL, persisted separately from auth: it's set on the server-select
// screen BEFORE login, and must survive a restart even if the user never signs in.
const SERVER_KEY = '@jellyfin_server';

export interface JellyfinAuthData {
  accessToken: string;
  userId: string;
  userName: string;
  serverUrl: string;
}

const saveAuth = async (data: JellyfinAuthData): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const loadAuth = async (): Promise<JellyfinAuthData | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as JellyfinAuthData;
};

const clearAuth = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};

const saveServer = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(SERVER_KEY, url);
};

const loadServer = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(SERVER_KEY);
};

const clearServer = async (): Promise<void> => {
  await AsyncStorage.removeItem(SERVER_KEY);
};

export default { saveAuth, loadAuth, clearAuth, saveServer, loadServer, clearServer };
