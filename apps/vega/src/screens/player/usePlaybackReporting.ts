import { useCallback, useEffect, useRef } from 'react';
import JellyfinClient from '@multi-tv/shared-ui/src/services/JellyfinClient';
import { secondsToTicks, ticksToSeconds } from '@multi-tv/shared-ui/src/utils/ticks';

const PROGRESS_INTERVAL_MS = 10_000; // heartbeat cadence while playing
const PLAYED_THRESHOLD = 0.9; // mark watched once past this fraction of runtime

export interface PlaybackReportingArgs {
  itemId?: string;
  accessToken?: string;
  userId?: string;
  playSessionId?: string;
  mediaSourceId?: string;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
  runTimeTicks?: number;
  paused: boolean;
  duration: number; // seconds, from the player (fallback runtime)
  isVideoInitialized: boolean;
  isVideoEnded: boolean;
  getCurrentTime: () => number;
}

const noop = () => {};

/**
 * Reports the playback lifecycle to Jellyfin: start / progress heartbeat / stop,
 * plus mark-played near the end. Without this the server never learns playback
 * stopped, so its HLS transcode is orphaned and no resume position is saved.
 *
 * Reporting is keyed on `playSessionId` — when it changes (e.g. an audio-track
 * switch mints a fresh transcode session) the previous session is stopped and the
 * new one started, so audio switches don't orphan a transcode either.
 */
export function usePlaybackReporting(args: PlaybackReportingArgs) {
  const enabled = !!(args.accessToken && args.userId && args.itemId && args.playSessionId);

  // Latest values, read by the interval/cleanup callbacks to avoid stale closures.
  // Synced in an effect (not during render) so we never mutate a ref while rendering.
  // Declared before the effects below so they observe the fresh value on each commit.
  const ctxRef = useRef(args);
  useEffect(() => {
    ctxRef.current = args;
  });

  const activeSessionRef = useRef<string | undefined>(undefined);
  const stoppedRef = useRef(false);

  const buildReport = useCallback((positionSeconds: number) => {
    const c = ctxRef.current;
    return {
      token: c.accessToken!,
      itemId: c.itemId!,
      playSessionId: c.playSessionId,
      mediaSourceId: c.mediaSourceId,
      audioStreamIndex: c.audioStreamIndex,
      subtitleStreamIndex: c.subtitleStreamIndex,
      positionTicks: secondsToTicks(positionSeconds),
      isPaused: c.paused,
    };
  }, []);

  const sendProgress = useCallback(() => {
    if (!activeSessionRef.current || stoppedRef.current) return;
    JellyfinClient.reportPlaybackProgress(buildReport(ctxRef.current.getCurrentTime())).catch(noop);
  }, [buildReport]);

  // Start report + progress heartbeat. Re-runs when the active session changes
  // (audio switch): stops the previous session, then starts the new one.
  useEffect(() => {
    if (!enabled || !args.isVideoInitialized) return;
    if (activeSessionRef.current === args.playSessionId) return;

    const c = ctxRef.current;
    if (activeSessionRef.current) {
      JellyfinClient.reportPlaybackStopped({
        token: c.accessToken!,
        itemId: c.itemId!,
        playSessionId: activeSessionRef.current,
        mediaSourceId: c.mediaSourceId,
        positionTicks: secondsToTicks(c.getCurrentTime()),
      }).catch(noop);
    }

    activeSessionRef.current = args.playSessionId;
    stoppedRef.current = false;
    JellyfinClient.reportPlaybackStart(buildReport(c.getCurrentTime())).catch(noop);

    const id = setInterval(sendProgress, PROGRESS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, args.isVideoInitialized, args.playSessionId, buildReport, sendProgress]);

  // Immediate progress report on pause/play so the dashboard reflects it promptly.
  useEffect(() => {
    if (!activeSessionRef.current) return;
    sendProgress();
  }, [args.paused, sendProgress]);

  // Single stop path, fired on natural end and on unmount (guarded to run once).
  const stop = useCallback(
    (positionSecondsOverride?: number) => {
      if (stoppedRef.current || !activeSessionRef.current) return;
      stoppedRef.current = true;
      const c = ctxRef.current;
      const positionSeconds = positionSecondsOverride ?? c.getCurrentTime();
      JellyfinClient.reportPlaybackStopped(buildReport(positionSeconds)).catch(noop);

      const runtimeSeconds = c.runTimeTicks ? ticksToSeconds(c.runTimeTicks) : c.duration;
      if (runtimeSeconds > 0 && positionSeconds / runtimeSeconds >= PLAYED_THRESHOLD) {
        JellyfinClient.markPlayed(c.accessToken!, c.userId!, c.itemId!).catch(noop);
      }
    },
    [buildReport],
  );

  useEffect(() => {
    if (!args.isVideoEnded) return;
    const c = ctxRef.current;
    stop(c.runTimeTicks ? ticksToSeconds(c.runTimeTicks) : c.duration);
  }, [args.isVideoEnded, stop]);

  useEffect(() => () => stop(), [stop]);
}
