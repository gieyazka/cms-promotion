import type { CSSProperties } from 'react';
import { LText, TextColor } from '@/types/article';

export const TEXT_COLORS: { value: TextColor; label: LText; hex: string }[] = [
  { value: 'default', label: { th: 'ค่าเริ่มต้น', en: 'Default' }, hex: '#2D3748' },
  { value: 'blue', label: { th: 'ฟ้า', en: 'Blue' }, hex: '#5BA4F0' },
  { value: 'navy', label: { th: 'น้ำเงิน', en: 'Navy' }, hex: '#1E3A6E' },
  { value: 'red', label: { th: 'แดง', en: 'Red' }, hex: '#E24C41' },
  { value: 'green', label: { th: 'เขียว', en: 'Green' }, hex: '#4CAF50' },
  { value: 'gold', label: { th: 'ทอง', en: 'Gold' }, hex: '#D4AF37' },
];

/**
 * 'default' (and absent) deliberately return no style at all, rather than the 'default'
 * swatch's own hex — that keeps the block on its existing className/PALETTE colour, which
 * already has dark-mode handling. Pinning it to a light-mode hex would break dark mode.
 */
export function textColorStyle(color?: TextColor): CSSProperties | undefined {
  if (!color || color === 'default') return undefined;
  const hex = TEXT_COLORS.find((c) => c.value === color)?.hex;
  return hex ? { color: hex } : undefined;
}
