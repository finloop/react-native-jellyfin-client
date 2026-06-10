/** Top-level views switchable from the top navigation bar. */
export type TopTab = 'Search' | 'Home' | 'Libraries' | 'Favourites';

export type RootStackParamList = {
  JellyfinLogin: undefined;
  Main: undefined;
  Settings: undefined;
  Details: {
    title: string;
    description: string;
    headerImage: string;
    movie: string;
    category?: string;
    genres?: string[];
    releaseYear?: number;
    rating?: number;
    ratingCount?: number;
    contentRating?: string;
    duration?: number;
    accessToken?: string;
    userId?: string;
  };
  Player: { movie: string; headerImage: string; format?: string; itemId?: string; audioTracks?: { index: number; label: string }[]; subtitleTracks?: { index: number; label: string }[]; audioStreamIndex?: number; subtitleStreamIndex?: number; accessToken?: string; userId?: string; playSessionId?: string; mediaSourceId?: string; resumePositionTicks?: number; runTimeTicks?: number };
};
