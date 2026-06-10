import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, View, Image, Text, Platform } from 'react-native';
import { SpatialNavigationRoot, DefaultFocus } from 'react-tv-space-navigation';
import { scaledPixels } from '../hooks/useScale';
import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import FocusablePressable from '../components/FocusablePressable';
import { RootStackParamList } from '../navigation/types';
import { safeZones, colors } from '../theme';
import JellyfinClient from '../services/JellyfinClient';

type DetailsScreenRouteProp = RouteProp<RootStackParamList, 'Details'>;
type DetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Details'>;

export default function DetailsScreen() {
  const route = useRoute<DetailsScreenRouteProp>();
  const navigation = useNavigation<DetailsScreenNavigationProp>();
  const {
    title,
    description,
    movie,
    headerImage,
    category,
    genres,
    releaseYear,
    rating,
    ratingCount,
    contentRating,
    duration,
    accessToken,
    userId,
  } = route.params;

  const isFocused = useIsFocused();
  const [isResolvingPlaybackUrl, setIsResolvingPlaybackUrl] = useState(false);
  const resolvingRef = useRef(false);

  // Full Jellyfin item, fetched in-screen so the real-data apps (which only pass
  // id/title/description) still show crew + metadata. Falls back to route params.
  const [item, setItem] = useState<BaseItemDto | null>(null);

  useEffect(() => {
    if (!accessToken || !userId || !movie) return;
    let cancelled = false;
    JellyfinClient.getItemDetails(accessToken, userId, movie)
      .then((data) => {
        if (!cancelled) setItem(data);
      })
      .catch((e) =>
        console.error('[DetailsScreen] Failed to fetch item details', e),
      );
    return () => {
      cancelled = true;
    };
  }, [accessToken, userId, movie]);

  // Hero background: prefer the item's landscape backdrop (Primary is a portrait
  // poster, which crops badly when 'cover'-filled into this full-screen view). The
  // passed headerImage (poster) acts as the instant placeholder until the item loads.
  const imageSource = useMemo(
    () => ({ uri: item ? JellyfinClient.getItemBackdropUrl(item) : headerImage }),
    [item, headerImage],
  );

  // Memoize button style to prevent unnecessary re-renders
  const buttonStyle = useMemo(
    () => ({ paddingHorizontal: scaledPixels(30) }),
    [],
  );

  // Prefer fetched Jellyfin data, fall back to route params (mock catalog path).
  const displayDescription = item?.Overview ?? description;
  const displayYear = item?.ProductionYear ?? releaseYear;
  const displayContentRating = item?.OfficialRating ?? contentRating;
  const displayRating = item?.CommunityRating ?? rating;
  const displayGenres = item?.Genres ?? genres;

  // RunTimeTicks are 100ns ticks; the mock catalog 'duration' is already seconds.
  const durationSeconds = item?.RunTimeTicks
    ? Math.floor(item.RunTimeTicks / 10_000_000)
    : duration;

  // Format duration from seconds to human-readable format
  const formattedDuration = useMemo(() => {
    if (!durationSeconds) return '';
    const totalMinutes = Math.floor(durationSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }, [durationSeconds]);

  // Format rating display
  const ratingDisplay = useMemo(() => {
    if (!displayRating) return '';
    return ratingCount
      ? `${displayRating.toFixed(1)} ⭐ (${ratingCount} ratings)`
      : `${displayRating.toFixed(1)} ⭐`;
  }, [displayRating, ratingCount]);

  // Crew derived from the fetched item's People (Director / Producer / Stars).
  const crew = useMemo(() => {
    const people = item?.People ?? [];
    const entries: { role: string; name: string }[] = [];

    const director = people.find((p) => p.Type === 'Director');
    if (director?.Name) entries.push({ role: 'Director', name: director.Name });

    const producer = people.find((p) => p.Type === 'Producer');
    if (producer?.Name) entries.push({ role: 'Producer', name: producer.Name });

    const stars = people
      .filter((p) => p.Type === 'Actor' && p.Name)
      .slice(0, 3)
      .map((p) => p.Name as string);
    if (stars.length > 0) {
      entries.push({
        role: stars.length > 1 ? 'Stars' : 'Star',
        name: stars.join(', '),
      });
    }

    return entries;
  }, [item]);

  const navigate = useCallback(async () => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    setIsResolvingPlaybackUrl(true);

    try {
      if (accessToken && userId) {
        const { url, format, audioTracks, subtitleTracks, audioStreamIndex, subtitleStreamIndex, playSessionId, mediaSourceId, resumePositionTicks, runTimeTicks } =
          await JellyfinClient.getPlaybackUrl(accessToken, userId, movie);
        navigation.navigate('Player', {
          movie: url,
          headerImage: headerImage,
          format,
          itemId: movie,
          audioTracks,
          subtitleTracks,
          audioStreamIndex,
          subtitleStreamIndex,
          accessToken,
          userId,
          playSessionId,
          mediaSourceId,
          resumePositionTicks,
          runTimeTicks,
        });
      } else {
        navigation.navigate('Player', {
          movie: movie,
          headerImage: headerImage,
        });
      }
    } catch (e) {
      console.error('[DetailsScreen] Failed to resolve playback URL', e);
    } finally {
      setIsResolvingPlaybackUrl(false);
      resolvingRef.current = false;
    }
  }, [navigation, movie, headerImage, accessToken, userId]);

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={detailsStyles.container}>
        <Image source={imageSource} style={detailsStyles.backgroundImage} />
        {Platform.OS === 'web' && (
          <FocusablePressable
            text="← Back"
            onSelect={() => navigation.goBack()}
            style={detailsStyles.backButton}
          />
        )}
        <View style={detailsStyles.contentContainer}>
          <View style={detailsStyles.topContent}>
            <Text style={detailsStyles.title}>{title}</Text>

            {/* Metadata row */}
            <View style={detailsStyles.metadataRow}>
              {displayYear && (
                <Text style={detailsStyles.metadataText}>{displayYear}</Text>
              )}
              {displayContentRating && (
                <Text style={detailsStyles.metadataText}>{displayContentRating}</Text>
              )}
              {formattedDuration && (
                <Text style={detailsStyles.metadataText}>{formattedDuration}</Text>
              )}
              {ratingDisplay && (
                <Text style={detailsStyles.metadataText}>{ratingDisplay}</Text>
              )}
            </View>

            {/* Genres */}
            {displayGenres && displayGenres.length > 0 && (
              <View style={detailsStyles.genresContainer}>
                {displayGenres.map((genre: string, index: number) => (
                  <View key={index} style={detailsStyles.genreTag}>
                    <Text style={detailsStyles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={detailsStyles.description}>{displayDescription}</Text>
          </View>
          <View style={detailsStyles.bottomContent}>
            {crew.length > 0 && (
              <View style={detailsStyles.crewContainer}>
                {crew.map((member) => (
                  <View key={member.role} style={detailsStyles.crewMember}>
                    <Text style={detailsStyles.crewRole}>{member.role}</Text>
                    <Text style={detailsStyles.crewName}>{member.name}</Text>
                  </View>
                ))}
              </View>
            )}
            <DefaultFocus>
              <FocusablePressable
                text={isResolvingPlaybackUrl ? 'Loading...' : 'Watch now'}
                onSelect={navigate}
                style={buttonStyle}
              />
            </DefaultFocus>
          </View>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

const detailsStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backgroundImage: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      opacity: 0.25,
    },
    backButton: {
      position: 'absolute',
      top: scaledPixels(safeZones.actionSafe.vertical),
      start: scaledPixels(safeZones.actionSafe.horizontal),
      zIndex: 10,
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
      paddingTop: scaledPixels(safeZones.titleSafe.vertical),
      paddingBottom: scaledPixels(safeZones.actionSafe.vertical),
      justifyContent: 'flex-end',
    },
    topContent: {
      flex: 1,
      justifyContent: 'center',
    },
    bottomContent: {
      paddingBottom: scaledPixels(20),
    },
    title: {
      fontSize: scaledPixels(64),
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: scaledPixels(24),
      textShadowColor: 'rgba(0, 0, 0, 0.9)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 12,
    },
    description: {
      fontSize: scaledPixels(28),
      color: colors.text,
      marginBottom: scaledPixels(32),
      width: '65%',
      lineHeight: scaledPixels(40),
      textShadowColor: 'rgba(0, 0, 0, 0.9)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    metadataRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: scaledPixels(16),
      gap: scaledPixels(16),
    },
    metadataText: {
      fontSize: scaledPixels(22),
      color: colors.textSecondary,
      fontWeight: '600',
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    genresContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: scaledPixels(20),
      gap: scaledPixels(12),
    },
    genreTag: {
      backgroundColor: colors.cardElevated,
      paddingHorizontal: scaledPixels(16),
      paddingVertical: scaledPixels(8),
      borderRadius: scaledPixels(20),
      borderWidth: scaledPixels(1),
      borderColor: colors.focusBorder,
    },
    genreText: {
      fontSize: scaledPixels(18),
      color: colors.text,
      fontWeight: '600',
    },
    crewContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: scaledPixels(40),
      gap: scaledPixels(48),
    },
    crewMember: {
      marginBottom: scaledPixels(16),
    },
    crewRole: {
      fontSize: scaledPixels(20),
      color: colors.textSecondary,
      fontWeight: '600',
      marginBottom: scaledPixels(4),
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    crewName: {
      fontSize: scaledPixels(28),
      color: colors.text,
      fontWeight: 'bold',
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    watchButton: {
      backgroundColor: colors.cardElevated,
      paddingVertical: scaledPixels(20),
      paddingHorizontal: scaledPixels(40),
      borderRadius: scaledPixels(8),
      alignSelf: 'flex-start',
    },
    watchButtonFocused: {
      backgroundColor: colors.focusBackground,
    },
    watchButtonText: {
      color: colors.text,
      fontSize: scaledPixels(24),
      fontWeight: 'bold',
    },
    watchButtonTextFocused: {
      color: colors.textOnPrimary,
      fontSize: scaledPixels(24),
      fontWeight: 'bold',
    },
  });
