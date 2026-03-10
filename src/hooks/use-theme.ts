/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useAccentColor } from '@/hooks/use-accent';
import { useColorScheme } from '@/hooks/use-color-scheme';

function mixColors(foreground: string, background: string, amount: number) {
  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  const parse = (hex: string) => {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3 ? normalized.replace(/./g, '$&$&') : normalized;
    const num = parseInt(value, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };
  const toHex = (value: number) => clamp(Math.round(value)).toString(16).padStart(2, '0');

  const fg = parse(foreground);
  const bg = parse(background);
  const mix = (fgValue: number, bgValue: number) => bgValue + (fgValue - bgValue) * amount;

  return `#${toHex(mix(fg.r, bg.r))}${toHex(mix(fg.g, bg.g))}${toHex(mix(fg.b, bg.b))}`;
}

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;
  const { accent } = useAccentColor();
  const base = Colors[theme];
  const primary = accent.value;
  const primarySoft = mixColors(primary, base.background, theme === 'dark' ? 0.4 : 0.3);
  const primaryMuted = mixColors(primary, base.backgroundElement, theme === 'dark' ? 0.55 : 0.5);

  return {
    ...base,
    primary,
    primarySoft,
    primaryMuted,
  };
}
