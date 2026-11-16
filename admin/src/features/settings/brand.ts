import { useSyncExternalStore } from 'react';

type BrandUrls = { logoUrl: string; iconUrl: string };

let logoUrl = '';
let iconUrl = '';
let version = 0;
const listeners = new Set<() => void>();

function emit(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getVersion(): number {
  return version;
}

export function brandLogoUrl(): string {
  return logoUrl || window.FRKT_BOOT?.brandLogo || '';
}

export function useBrandLogo(): string {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return brandLogoUrl();
}

export function setBrand(next: Partial<BrandUrls>): void {
  if (next.logoUrl !== undefined) {
    logoUrl = next.logoUrl;
    if (window.FRKT_BOOT) window.FRKT_BOOT.brandLogo = next.logoUrl;
  }
  if (next.iconUrl !== undefined) {
    iconUrl = next.iconUrl;
    if (window.FRKT_BOOT) window.FRKT_BOOT.brandIcon = next.iconUrl;
  }
  applyMenuIcon(next.iconUrl !== undefined ? next.iconUrl : iconUrl || window.FRKT_BOOT?.brandIcon || '');
  emit();
}

/** Swap the WordPress admin menu icon without a reload. */
export function applyMenuIcon(url: string): void {
  const slot = document.querySelector('#toplevel_page_foldrocket .wp-menu-image');
  if (!(slot instanceof HTMLElement)) return;
  slot.classList.remove('dashicons-before', 'dashicons-images-alt2');
  slot.replaceChildren();
  if (!url) {
    slot.classList.add('dashicons-before', 'dashicons-images-alt2');
    return;
  }
  const img = document.createElement('img');
  img.alt = '';
  img.width = 20;
  img.height = 20;
  img.src = url;
  slot.appendChild(img);
}

/** Update the WordPress admin menu label while the Name field is edited. */
export function applyAdminMenuLabel(label: string): void {
  const fallback = window.FRKT_BOOT?.defaultMenuLabel || 'FoldRocket';
  const text = label.trim().slice(0, 40) || fallback;
  const item = document.getElementById('toplevel_page_foldrocket');
  if (!item) return;
  item.querySelectorAll('.wp-menu-name, .wp-submenu-head').forEach((node) => {
    node.textContent = text;
  });
  const link = item.querySelector(':scope > a');
  if (link instanceof HTMLElement) link.setAttribute('aria-label', text);
}
