import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

export const INSPECTOR_DEFAULT_WIDTH = 400;
export const INSPECTOR_MIN_WIDTH = 340;
export const INSPECTOR_MAX_WIDTH = 760;

const INSPECTOR_WIDTH_KEY = 'frkt-inspector-width';

function storedInspectorWidth(): number {
  try {
    const value = Number(window.localStorage.getItem(INSPECTOR_WIDTH_KEY));
    return Number.isFinite(value)
      ? Math.min(INSPECTOR_MAX_WIDTH, Math.max(INSPECTOR_MIN_WIDTH, value))
      : INSPECTOR_DEFAULT_WIDTH;
  } catch {
    return INSPECTOR_DEFAULT_WIDTH;
  }
}

/** Keeps inspector resizing, persistence and pointer cleanup outside the feature component. */
export function useInspectorResize() {
  const inspectorRef = useRef<HTMLElement | null>(null);
  const [inspectorWidth, setInspectorWidth] = useState(storedInspectorWidth);
  const inspectorWidthRef = useRef(inspectorWidth);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const inspectorMaxWidth = () => {
    const parentWidth = inspectorRef.current?.parentElement?.getBoundingClientRect().width
      ?? window.innerWidth;
    return Math.max(
      INSPECTOR_MIN_WIDTH,
      Math.min(INSPECTOR_MAX_WIDTH, Math.floor(parentWidth - 48))
    );
  };

  const updateInspectorWidth = (value: number, persist = false) => {
    const next = Math.min(inspectorMaxWidth(), Math.max(INSPECTOR_MIN_WIDTH, Math.round(value)));
    inspectorWidthRef.current = next;
    setInspectorWidth(next);
    if (!persist) return;
    try {
      window.localStorage.setItem(INSPECTOR_WIDTH_KEY, String(next));
    } catch {
      // The selected width remains valid for the current session.
    }
  };

  const stopInspectorResize = () => {
    resizeCleanupRef.current?.();
    resizeCleanupRef.current = null;
  };

  const startInspectorResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 782 || !inspectorRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    stopInspectorResize();
    document.body.classList.add('frkt-is-resizing-inspector');

    const onMove = (moveEvent: PointerEvent) => {
      const right = inspectorRef.current?.getBoundingClientRect().right;
      if (right == null) return;
      updateInspectorWidth(right - moveEvent.clientX);
    };
    const onStop = () => {
      try {
        window.localStorage.setItem(INSPECTOR_WIDTH_KEY, String(inspectorWidthRef.current));
      } catch {
        // The selected width remains valid for the current session.
      }
      stopInspectorResize();
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onStop);
      window.removeEventListener('pointercancel', onStop);
      document.body.classList.remove('frkt-is-resizing-inspector');
    };
    resizeCleanupRef.current = cleanup;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onStop, { once: true });
    window.addEventListener('pointercancel', onStop, { once: true });
  };

  const resizeInspectorWithKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 16;
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = inspectorWidthRef.current + step;
    if (event.key === 'ArrowRight') next = inspectorWidthRef.current - step;
    if (event.key === 'Home') next = INSPECTOR_MIN_WIDTH;
    if (event.key === 'End') next = inspectorMaxWidth();
    if (next == null) return;
    event.preventDefault();
    event.stopPropagation();
    updateInspectorWidth(next, true);
  };

  useEffect(() => () => stopInspectorResize(), []);

  return {
    inspectorRef,
    inspectorWidth,
    inspectorMaxWidth,
    updateInspectorWidth,
    startInspectorResize,
    resizeInspectorWithKeyboard,
  };
}
