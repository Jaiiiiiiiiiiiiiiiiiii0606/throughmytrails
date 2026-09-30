import { useSyncExternalStore } from 'react';
import { assetUrl } from '../api/client';

/**
 * One destination preview plays at a time, site-wide.
 * - Cards call `request(id)` on hover/focus and `release(id)` on leave; the manager tells them who is active.
 * - Ambient sound (a separate audio file) runs through one shared <audio> with gentle fades.
 * - Browsers only allow sound after the visitor has interacted with the page. Until then previews play muted,
 *   and `blocked` is true so the UI can invite a tap to turn sound on.
 */

const STORE_KEY = 'tmt-sound';
const AMBIENT_VOLUME = 0.55;
const CLIP_VOLUME = 0.6;

type State = { activeId: string | null; soundOn: boolean; blocked: boolean };

function readPref(): boolean {
  try {
    return localStorage.getItem(STORE_KEY) !== 'off';
  } catch {
    return true;
  }
}

let state: State = { activeId: null, soundOn: typeof window === 'undefined' ? true : readPref(), blocked: false };
const listeners = new Set<() => void>();
const emit = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let audio: HTMLAudioElement | null = null;
/** Card instance currently using the ambient track. */
let ambientOwner: string | null = null;
const fades = new WeakMap<HTMLMediaElement, number>();

function fade(el: HTMLMediaElement, to: number, ms: number, done?: () => void) {
  cancelAnimationFrame(fades.get(el) ?? 0);
  const from = el.volume;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * t));
    if (t < 1) fades.set(el, requestAnimationFrame(step));
    else done?.();
  };
  fades.set(el, requestAnimationFrame(step));
}

/** Whether the page has had a click/tap/keypress (which unlocks audio in every browser). */
export function hasUserActivation(): boolean {
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return ua ? ua.hasBeenActive : unlockedByGesture;
}
let unlockedByGesture = false;
if (typeof window !== 'undefined') {
  const unlock = () => {
    unlockedByGesture = true;
    if (state.blocked) emit({ blocked: false });
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, unlock, { once: true, capture: true, passive: true }));
}

export const preview = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,

  request(id: string) {
    if (state.activeId !== id) emit({ activeId: id });
  },
  release(id: string) {
    if (state.activeId === id) emit({ activeId: null });
  },

  setSound(on: boolean) {
    try {
      localStorage.setItem(STORE_KEY, on ? 'on' : 'off');
    } catch {
      /* private mode: preference lasts for this page only */
    }
    emit({ soundOn: on, blocked: false });
    if (!on && ambientOwner) this.stopAmbient(ambientOwner, 150);
  },

  markBlocked() {
    if (!state.blocked) emit({ blocked: true });
  },

  /** Starts the shared ambient track for `owner`. Resolves false if the browser refused sound. */
  async playAmbient(owner: string, url: string): Promise<boolean> {
    if (!state.soundOn) return false;
    if (!audio) {
      audio = new Audio();
      audio.loop = true;
      audio.preload = 'none';
    }
    ambientOwner = owner;
    const src = assetUrl(url);
    if (audio.src !== src) {
      audio.src = src;
      audio.volume = 0;
    }
    try {
      await audio.play();
      if (ambientOwner !== owner) return false; // someone else took over while loading
      fade(audio, AMBIENT_VOLUME, 700);
      return true;
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') this.markBlocked();
      return false;
    }
  },

  /** Fades the ambient track out, but only if `owner` still holds it. */
  stopAmbient(owner: string, ms = 450) {
    const a = audio;
    if (!a || ambientOwner !== owner) return;
    ambientOwner = null;
    if (a.paused) return;
    fade(a, 0, ms, () => {
      if (ambientOwner === null) a.pause();
    });
  },

  /** Fades a clip's own soundtrack in, falling back to muted playback when sound is not allowed. */
  async playClip(video: HTMLVideoElement, withSound: boolean): Promise<void> {
    video.muted = !withSound;
    video.volume = withSound ? 0 : CLIP_VOLUME;
    try {
      await video.play();
      if (withSound) fade(video, CLIP_VOLUME, 700);
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return;
      if (withSound) {
        this.markBlocked();
        video.muted = true;
        await video.play().catch(() => undefined);
      }
    }
  },
};

export function usePreview() {
  return useSyncExternalStore(preview.subscribe, preview.get, preview.get);
}
