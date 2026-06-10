import { IComponentInstance } from '@amazon-devices/react-native-kepler';
import { VideoPlayer } from '@amazon-devices/react-native-w3cmedia';
import { HlsJsPlayer } from '../../hlsjsplayer/HlsJsPlayer';
import { installPolyfills } from '../../hlsjsplayer/polyfills';

const SCRUB_STEP_BASE = 10; // s — single tap / first press
const SCRUB_STEP_MAX = 60; // s — acceleration cap
const SCRUB_ACCEL = 1.25; // multiplier per fast consecutive press
const SCRUB_FAST_MS = 250; // presses closer than this accelerate
const SCRUB_IDLE_MS = 450; // commit this long after the last press

/**
 * Callbacks the controller uses to push player state back into React.
 * Each maps to a single piece of UI state owned by useVideoPlayer.
 */
export interface VideoPlayerCallbacks {
  onDuration: (duration: number) => void;
  onTimeUpdate: (currentTime: number) => void;
  onBuffering: (buffering: boolean) => void;
  onInitialized: (initialized: boolean) => void;
  onEnded: () => void;
  onError: () => void;
  onPlayerReady: (ready: boolean) => void;
  onPausedChange: (paused: boolean) => void;
  onScrubTime: (scrubTime: number | null) => void;
}

/**
 * VideoPlayerController
 *
 * Owns the imperative, non-React side of playback for the Vega/Kepler player:
 * the VideoPlayer instance, the hls.js bridge, surface/caption handles, and all
 * the lifecycle bookkeeping refs. State changes are pushed out through the
 * `callbacks` object so the React layer (useVideoPlayer) stays thin.
 */
export class VideoPlayerController {
  private readonly componentInstance: IComponentInstance | null;
  private readonly callbacks: VideoPlayerCallbacks;

  private videoPlayer: VideoPlayer | null = null;
  private hlsPlayer: HlsJsPlayer | null = null;
  private surfaceHandle: string | null = null;
  private captionHandle: string | null = null;
  private pendingPlayback: { uri: string; startPosition?: number };

  private hlsReady = false;
  private canPlayFired = false;
  private nearEnd = false;
  private duration = 0;
  private currentTime = 0;

  // Scrub state: while the user holds/rapid-presses FF/RW we only move a preview
  // target and keep the player paused; a single real seek is committed once the
  // presses stop (see scrubBy/commitScrub).
  private isScrubbing = false;
  private scrubTarget = 0;
  private wasPlaying = false;
  private scrubStep = SCRUB_STEP_BASE;
  private lastScrubPress = 0;
  private scrubDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor(
    initialUri: string,
    componentInstance: IComponentInstance | null,
    callbacks: VideoPlayerCallbacks,
  ) {
    this.componentInstance = componentInstance;
    this.callbacks = callbacks;
    this.pendingPlayback = { uri: initialUri };
  }

  getCurrentTime = () => this.currentTime;

  init = async (uri: string, startPosition = 0) => {
    this.pendingPlayback = { uri, startPosition };

    const vp = new VideoPlayer();
    (global as any).gmedia = vp;
    this.videoPlayer = vp;

    // isActive guards against stale closures if init is called again before this one completes
    const isActive = () => this.videoPlayer === vp;

    try {
      if (this.componentInstance) {
        await vp.setMediaControlFocus(this.componentInstance, null as any);
      }
    } catch {}

    vp.addEventListener('loadedmetadata', () => {
      if (!isActive()) return;
      this.duration = vp.duration || 0;
      this.callbacks.onDuration(this.duration);
      this.callbacks.onInitialized(true);
      // No resume seek: hls.js loads at the offset (config.startPosition), so
      // currentTime already starts at the resume/reload position. A client seek
      // after a frag-0 load primes the decoder at PTS~0 and then stalls in a
      // buffer-hole-nudge loop trying to cross the jump to a deep offset.
    });
    vp.addEventListener('timeupdate', () => {
      if (!isActive()) return;
      if (this.isScrubbing) return; // preview owns currentTime while scrubbing
      const ct = vp.currentTime || 0;
      this.currentTime = ct;
      this.callbacks.onTimeUpdate(ct);
      this.callbacks.onBuffering(false);
      this.nearEnd = this.duration > 0 && ct >= this.duration - 2;
    });
    vp.addEventListener('ended', () => {
      if (!isActive() || !this.nearEnd) return;
      this.callbacks.onEnded();
    });
    vp.addEventListener('waiting', () => {
      if (!isActive()) return;
      this.callbacks.onBuffering(true);
    });
    vp.addEventListener('playing', () => {
      if (!isActive()) return;
      this.callbacks.onBuffering(false);
      // No resume seek here: hls.js starts loading at the resume/reload offset
      // (config.startPosition, set in attachSurface), so the decoder primes at the
      // target. A client seek after a frag-0 load primes at PTS~0 and then stalls
      // trying to cross the jump to a deep offset.
    });
    // Native MediaElement errors (decode failures, unsupported codecs, source
    // errors) surface here — below the hls.js layer, so they're not caught by the
    // hls 'error' listener. Without this they'd freeze the frame with no error UI.
    vp.addEventListener('error', () => {
      if (!isActive()) return;
      const err = vp.error;
      console.error(
        `[VideoPlayerController] MediaElement error code=${err?.code} message=${err?.message}`,
      );
      this.callbacks.onError();
    });

    try {
      await vp.initialize();
      if (!isActive()) return;

      vp.autoplay = false;
      this.callbacks.onPlayerReady(true);

      installPolyfills();

      const hlsPlayer = new HlsJsPlayer(vp);
      this.hlsPlayer = hlsPlayer;
      hlsPlayer.addPlayerEventListener('error', () => {
        if (!isActive()) return;
        this.callbacks.onError();
      });
      this.hlsReady = true;

      vp.addEventListener('canplay', () => {
        if (!isActive() || this.canPlayFired) return;
        this.canPlayFired = true;
        if (this.surfaceHandle) {
          vp.play();
          this.callbacks.onPausedChange(false);
        }
      });
    } catch {
      if (isActive()) this.callbacks.onError();
    }
  };

  /**
   * Detach the controller from its current player/pipeline and reset UI state,
   * returning the orphaned instances so the caller can release the decoder either
   * asynchronously (destroy) or synchronously (releaseForBackground). Nulling the
   * refs first makes any in-flight media events (guarded by isActive) no-ops while
   * teardown is in progress.
   */
  private teardown = (): { vp: VideoPlayer | null; hls: HlsJsPlayer | null } => {
    if (this.scrubDebounce) {
      clearTimeout(this.scrubDebounce);
      this.scrubDebounce = null;
    }
    this.isScrubbing = false;
    this.callbacks.onScrubTime(null);
    this.hlsReady = false;
    this.canPlayFired = false;
    this.nearEnd = false;

    const vp = this.videoPlayer;
    const hls = this.hlsPlayer;
    this.videoPlayer = null;
    this.hlsPlayer = null;
    (global as any).gmedia = null;

    if (this.surfaceHandle && vp) {
      vp.clearSurfaceHandle(this.surfaceHandle);
    }
    this.surfaceHandle = null;
    if (this.captionHandle && vp) {
      vp.clearCaptionViewHandle(this.captionHandle);
    }
    this.captionHandle = null;

    this.callbacks.onPlayerReady(false);
    this.callbacks.onInitialized(false);
    this.callbacks.onBuffering(true);
    this.callbacks.onPausedChange(true);

    return { vp, hls };
  };

  /**
   * Full async teardown. Awaiting deinitialize() before the next init() is
   * required: Vega supports a single (secure) video decoder instance, so a new
   * VideoPlayer must not be created until the previous one has released it —
   * otherwise back-to-back reloads (audio/subtitle/bitrate switches) race the old
   * decoder's teardown against the new one's init.
   */
  destroy = async () => {
    const { vp, hls } = this.teardown();
    try {
      await hls?.destroy();
    } catch {}
    try {
      await vp?.deinitialize();
    } catch {}
  };

  /**
   * Synchronous release for the Lifecycle Manager background transition. Vega
   * kills apps that hold media resources in the background, so the decoder must be
   * freed before the process is suspended — deinitializeSync blocks (up to the
   * timeout) where the async deinitialize() might not complete in time. Position
   * is retained (currentTime is untouched) so playback can resume on foreground.
   */
  releaseForBackground = () => {
    const { vp, hls } = this.teardown();
    try {
      hls?.destroy();
    } catch {}
    try {
      vp?.deinitializeSync(1000);
    } catch {}
  };

  seek = (time: number) => {
    if (this.videoPlayer && this.duration) {
      const clamped = Math.max(0, Math.min(time, this.duration));
      this.videoPlayer.currentTime = clamped;
      this.currentTime = clamped;
      this.callbacks.onTimeUpdate(clamped);
      this.nearEnd = clamped >= this.duration - 2;
    }
  };

  /**
   * Accumulate a preview-only seek in `dir` (+1 forward, -1 back) without
   * touching real playback. The first press of a burst snapshots the play state
   * and pauses the video; sustained fast presses accelerate the step. The real
   * seek is committed once SCRUB_IDLE_MS elapses with no further presses.
   */
  scrubBy = (dir: 1 | -1) => {
    if (!this.videoPlayer || !this.duration || !this.canPlayFired) return;

    const now = Date.now();
    if (!this.isScrubbing) {
      // first press of a burst: snapshot + pause
      this.isScrubbing = true;
      this.wasPlaying = !this.videoPlayer.paused;
      this.scrubTarget = this.currentTime;
      this.scrubStep = SCRUB_STEP_BASE;
      if (!this.videoPlayer.paused) {
        this.videoPlayer.pause();
        this.callbacks.onPausedChange(true);
      }
    } else if (now - this.lastScrubPress < SCRUB_FAST_MS) {
      this.scrubStep = Math.min(this.scrubStep * SCRUB_ACCEL, SCRUB_STEP_MAX); // accelerate
    } else {
      this.scrubStep = SCRUB_STEP_BASE; // slow taps stay precise
    }
    this.lastScrubPress = now;

    // accumulate target, clamp (leave 1s margin so FF-to-end can't auto-exit)
    this.scrubTarget = Math.max(
      0,
      Math.min(this.scrubTarget + this.scrubStep * dir, this.duration - 1),
    );
    this.callbacks.onScrubTime(this.scrubTarget); // preview only — NO player write

    if (this.scrubDebounce) clearTimeout(this.scrubDebounce);
    this.scrubDebounce = setTimeout(this.commitScrub, SCRUB_IDLE_MS);
  };

  private commitScrub = () => {
    if (!this.isScrubbing) return;
    this.isScrubbing = false;
    if (this.scrubDebounce) {
      clearTimeout(this.scrubDebounce);
      this.scrubDebounce = null;
    }
    this.seek(this.scrubTarget); // the single real currentTime write
    this.callbacks.onScrubTime(null); // hand UI back to timeupdate-driven currentTime
    this.scrubStep = SCRUB_STEP_BASE;
    if (this.wasPlaying && this.videoPlayer && this.canPlayFired) {
      this.videoPlayer.play();
      this.callbacks.onPausedChange(false);
    }
  };

  togglePausePlay = () => {
    if (this.isScrubbing) this.commitScrub();
    if (!this.videoPlayer || !this.canPlayFired) return;
    if (this.videoPlayer.paused) {
      this.videoPlayer.play();
      this.callbacks.onPausedChange(false);
    } else {
      this.videoPlayer.pause();
      this.callbacks.onPausedChange(true);
    }
  };

  attachSurface = (surfaceHandle: string) => {
    this.surfaceHandle = surfaceHandle;
    this.videoPlayer?.setSurfaceHandle(surfaceHandle);

    if (this.hlsReady && this.hlsPlayer) {
      this.hlsReady = false;
      const { uri, startPosition } = this.pendingPlayback;
      // Resume/reload offset is handled by hls.js (config.startPosition) so it loads
      // the fragment at the offset first — no frag-0 fetch, no post-load client seek.
      this.hlsPlayer.load(
        {
          uri,
          secure: 'false',
          drm_scheme: '',
          drm_license_uri: '',
          startPosition: startPosition ?? -1,
        },
        false,
      );
    }

    if (this.canPlayFired && this.videoPlayer) {
      this.videoPlayer.play();
      this.callbacks.onPausedChange(false);
    }
  };

  detachSurface = (surfaceHandle: string) => {
    // Guard against clearing a handle on a newly created VideoPlayer after a reinit.
    // destroy() nulls surfaceHandle before state triggers the unmount callback.
    if (this.surfaceHandle === surfaceHandle) {
      this.videoPlayer?.clearSurfaceHandle(surfaceHandle);
      this.surfaceHandle = null;
    }
  };

  attachCaption = (captionHandle: string) => {
    this.captionHandle = captionHandle;
    this.videoPlayer?.setCaptionViewHandle(captionHandle);
  };

  detachCaption = (captionHandle: string) => {
    if (this.captionHandle === captionHandle) {
      this.videoPlayer?.clearCaptionViewHandle(captionHandle);
      this.captionHandle = null;
    }
  };
}
