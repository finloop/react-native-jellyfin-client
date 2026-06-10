/**
 * Jellyfin reports playback positions in "ticks" — 100-nanosecond units, so
 * 10,000,000 ticks per second. Helpers to convert to/from player seconds.
 */
export const secondsToTicks = (seconds: number): number =>
  Math.max(0, Math.round(seconds * 10_000_000));

export const ticksToSeconds = (ticks: number): number => (ticks > 0 ? ticks / 10_000_000 : 0);
