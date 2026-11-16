import { useEffect, useState } from 'react';

const frameCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

/**
 * Capture roughly the first visible frame of a video as a JPEG data URL.
 * Cached in memory by source URL. Returns null while loading / on failure.
 */
export function captureVideoFirstFrame(src: string): Promise<string | null> {
  if (!src) return Promise.resolve(null);
  const cached = frameCache.get(src);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(src);
  if (pending) return pending;

  const task = new Promise<string | null>((resolve) => {
    const video = document.createElement('video');
    let settled = false;

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (value) frameCache.set(src, value);
      inflight.delete(src);
      resolve(value);
    };

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
    };

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    try {
      const parsed = new URL(src, window.location.href);
      if (parsed.origin !== window.location.origin) {
        video.crossOrigin = 'anonymous';
      }
    } catch {
      // keep default (no crossOrigin) for relative / odd URLs
    }

    const snap = () => {
      try {
        const w = video.videoWidth || 0;
        const h = video.videoHeight || 0;
        if (w < 2 || h < 2) {
          finish(null);
          return;
        }
        // Cap canvas size for grid thumbs.
        const max = 480;
        const scale = Math.min(1, max / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, cw, ch);
        finish(canvas.toDataURL('image/jpeg', 0.82));
      } catch {
        // Tainted canvas (CORS) or decode failure.
        finish(null);
      }
    };

    video.onerror = () => finish(null);

    video.onloadedmetadata = () => {
      // Seek slightly past 0 — some codecs return a black first frame at t=0.
      const t = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(0.1, video.duration * 0.01)
        : 0.1;
      try {
        video.currentTime = t;
      } catch {
        // Some browsers fire seeked only after play; try snap on loadeddata.
        snap();
      }
    };

    video.onseeked = () => snap();

    // Fallback if seeked never fires (rare).
    window.setTimeout(() => {
      if (!settled && video.readyState >= 2) snap();
      else if (!settled) finish(null);
    }, 8000);

    video.src = src;
    video.load();
  });

  inflight.set(src, task);
  return task;
}

/** React helper: first-frame data URL for a video source, or null. */
export function useVideoFirstFrame(src: string | null | undefined): string | null {
  const [frame, setFrame] = useState<string | null>(() =>
    src ? frameCache.get(src) || null : null
  );

  useEffect(() => {
    if (!src) {
      setFrame(null);
      return;
    }
    const cached = frameCache.get(src);
    if (cached) {
      setFrame(cached);
      return;
    }
    let cancelled = false;
    setFrame(null);
    void captureVideoFirstFrame(src).then((data) => {
      if (!cancelled) setFrame(data);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return frame;
}
