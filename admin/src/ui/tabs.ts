import type { KeyboardEvent } from 'react';

/** WAI-ARIA Tabs keyboard navigation with automatic activation. */
export function handleTablistKey<T extends string>(
  event: KeyboardEvent<HTMLElement>,
  tabs: readonly T[],
  active: T,
  activate: (tab: T) => void,
  idFor: (tab: T) => string
): void {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || tabs.length === 0) return;
  event.preventDefault();
  const current = Math.max(0, tabs.indexOf(active));
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.length - 1
      : event.key === 'ArrowRight'
        ? (current + 1) % tabs.length
        : (current - 1 + tabs.length) % tabs.length;
  const next = tabs[nextIndex];
  activate(next);
  window.requestAnimationFrame(() => document.getElementById(idFor(next))?.focus());
}
