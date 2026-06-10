import { IComponentInstance } from '@amazon-devices/react-native-kepler';
import { VideoPlayer } from '@amazon-devices/react-native-w3cmedia';
import { HlsJsPlayer } from '../../hlsjsplayer/HlsJsPlayer';
import { installPolyfills } from '../../hlsjsplayer/polyfills';

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

  constructor(
    initialUri: string,
    componentInstance: IComponentInstance | null,
    callbacks: VideoPlayerCallbacks,
  ) {
    this.componentInstance = componentInstance;
    this.callbacks = callbacks;
    this.pendingPlayback = { uri: initialUri };
  }

  getCurrentTime() {
    return this.currentTime;
  }

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
    });
    vp.addEventListener('timeupdate', () => {
      if (!isActive()) return;
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

  destroy = () => {
    this.hlsReady = false;
    this.canPlayFired = false;
    this.nearEnd = false;
    if (this.surfaceHandle && this.videoPlayer) {
      this.videoPlayer.clearSurfaceHandle(this.surfaceHandle);
      this.surfaceHandle = null;
    }
    if (this.captionHandle && this.videoPlayer) {
      this.videoPlayer.clearCaptionViewHandle(this.captionHandle);
      this.captionHandle = null;
    }
    this.hlsPlayer?.destroy();
    this.hlsPlayer = null;
    this.videoPlayer?.deinitialize();
    (global as any).gmedia = null;
    this.videoPlayer = null;
    this.callbacks.onPlayerReady(false);
    this.callbacks.onInitialized(false);
    this.callbacks.onBuffering(true);
    this.callbacks.onPausedChange(true);
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

  seekBy = (delta: number) => {
    this.seek(this.currentTime + delta);
  };

  togglePausePlay = () => {
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
      if (startPosition) this.seek(startPosition);

      this.hlsPlayer.load(
        { uri, secure: 'false', drm_scheme: '', drm_license_uri: '' },
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
