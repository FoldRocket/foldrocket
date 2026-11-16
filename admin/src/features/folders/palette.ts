export const DEFAULT_FOLDER_COLOR_PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#64748b',
];

export function normalizeFolderColorPalette(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_FOLDER_COLOR_PALETTE];
  const colors = value
    .filter((color): color is string => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color))
    .map((color) => color.toLowerCase())
    .slice(0, 24);
  return colors.length ? colors : [...DEFAULT_FOLDER_COLOR_PALETTE];
}
