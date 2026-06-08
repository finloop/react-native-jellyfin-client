export type RootStackParamList = {
  DrawerNavigator: undefined;
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
  Player: {
    movie: string;
    headerImage: string;
    format?: string;
    itemId?: string;
    audioTracks?: { index: number; label: string }[];
    accessToken?: string;
    userId?: string;
  };
};

export type DrawerParamList = {
  Home: undefined;
  Explore: undefined;
  TV: undefined;
  Settings: undefined;
};
