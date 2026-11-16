export const FRKT_MEDIA_DRAG = 'application/x-frkt-media';
export const FRKT_FOLDER_DRAG = 'application/x-frkt-folder';

let activeFolderDrag: number | null = null;
let activeMediaIds: number[] = [];

export function draggingFolderId(): number | null {
  return activeFolderDrag;
}

export function writeMediaDrag(dt: DataTransfer, ids: number[]): void {
  const clean = ids.filter((id) => Number.isInteger(id) && id > 0);
  activeMediaIds = clean;
  const payload = clean.join(',');
  dt.setData(FRKT_MEDIA_DRAG, payload);
  dt.setData('text/plain', `frkt-media:${payload}`);
  dt.effectAllowed = 'move';
  document.documentElement.classList.add('frkt-media-dragging');
  window.addEventListener('dragover', keepMoveCursor);
}

function keepMoveCursor(event: DragEvent): void {
  if (!activeMediaIds.length) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
}

export function clearMediaDrag(): void {
  activeMediaIds = [];
  document.documentElement.classList.remove('frkt-media-dragging');
  window.removeEventListener('dragover', keepMoveCursor);
}

export function draggingMediaIds(): number[] {
  return activeMediaIds;
}

export function writeFolderDrag(dt: DataTransfer, id: number): void {
  activeFolderDrag = id;
  dt.setData(FRKT_FOLDER_DRAG, String(id));
  dt.setData('text/plain', `frkt-folder:${id}`);
  dt.effectAllowed = 'move';
}

export function clearFolderDrag(): void {
  activeFolderDrag = null;
}

export function acceptsFolderDrag(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes(FRKT_FOLDER_DRAG);
}

export function readFolderDrag(dt: DataTransfer): number | null {
  const custom = dt.getData(FRKT_FOLDER_DRAG);
  const plain = dt.getData('text/plain');
  const raw = custom || (plain.startsWith('frkt-folder:') ? plain.slice('frkt-folder:'.length) : '');
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function acceptsMediaDrag(dt: DataTransfer): boolean {
  const types = Array.from(dt.types);
  if (types.includes('Files') || types.includes(FRKT_FOLDER_DRAG)) return false;
  return types.includes(FRKT_MEDIA_DRAG) || types.includes('text/plain');
}

export function readMediaDrag(dt: DataTransfer): number[] {
  const custom = dt.getData(FRKT_MEDIA_DRAG);
  const plain = dt.getData('text/plain');
  const raw = custom || (plain.startsWith('frkt-media:') ? plain.slice('frkt-media:'.length) : '');
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => Number(part))
    .filter((id) => Number.isInteger(id) && id > 0);
}
