export type ThemeId = "base" | "emerald" | "indigo" | "red";

export interface Theme {
  id: ThemeId;
  label: string;
  /** Tailwind v4 CSS custom property overrides applied to <html> element */
  cssVars: Record<string, string>;
}

export const THEMES: Record<ThemeId, Theme> = {
  base: {
    id: "base",
    label: "기본",
    cssVars: {
      "--background": "#fafafa",
      // Tailwind 기본 zinc 값 (다른 테마에서 돌아올 때 리셋용)
      "--color-zinc-50":  "oklch(98.5% 0     0)",
      "--color-zinc-100": "oklch(96.7% 0.001 286.375)",
      "--color-zinc-200": "oklch(92%   0.004 286.32)",
      "--color-zinc-300": "oklch(87.1% 0.006 286.286)",
      "--color-zinc-400": "oklch(70.5% 0.015 286.067)",
      "--color-zinc-500": "oklch(55.2% 0.016 285.938)",
      "--color-zinc-600": "oklch(44.2% 0.017 285.786)",
      "--color-zinc-700": "oklch(37%   0.013 285.805)",
      "--color-zinc-800": "oklch(27.4% 0.006 286.033)",
      "--color-zinc-900": "oklch(21%   0.006 285.885)",
      // 중성 gray 계열 primary accent
      "--color-primary-50":  "oklch(98%   0.002 30)",
      "--color-primary-100": "oklch(95%   0.005 30)",
      "--color-primary-200": "oklch(90%   0.008 30)",
      "--color-primary-400": "oklch(70%   0.010 30)",
      "--color-primary-500": "oklch(55%   0.009 30)",
      "--color-primary-600": "oklch(44%   0.008 30)",
      "--color-primary-700": "oklch(37%   0.007 30)",
      "--color-primary-800": "oklch(28%   0.005 30)",
      "--color-primary-900": "oklch(21%   0.005 30)",
    },
  },
  emerald: {
    id: "emerald",
    label: "에메랄드",
    cssVars: {
      "--background": "#f0faf4",
      // 따뜻한 warmgray 계열 zinc
      "--color-zinc-50": "oklch(98.2% 0.004 150)",
      "--color-zinc-100": "oklch(96.2% 0.007 150)",
      "--color-zinc-200": "oklch(91.5% 0.012 150)",
      "--color-zinc-300": "oklch(86.0% 0.018 150)",
      "--color-zinc-400": "oklch(69.5% 0.022 150)",
      "--color-zinc-500": "oklch(54.5% 0.020 150)",
      "--color-zinc-600": "oklch(43.5% 0.018 150)",
      "--color-zinc-700": "oklch(36.5% 0.015 150)",
      "--color-zinc-800": "oklch(27.0% 0.010 150)",
      "--color-zinc-900": "oklch(20.5% 0.010 150)",
      // 진한 에메랄드 accent
      "--color-primary-50":  "oklch(97.5% 0.028 160)",
      "--color-primary-100": "oklch(94.0% 0.062 161)",
      "--color-primary-200": "oklch(88.5% 0.108 162)",
      "--color-primary-400": "oklch(73.0% 0.195 163)",
      "--color-primary-500": "oklch(64.5% 0.185 162)",
      "--color-primary-600": "oklch(54.5% 0.158 163)",
      "--color-primary-700": "oklch(46.0% 0.130 165)",
      "--color-primary-800": "oklch(39.5% 0.105 167)",
      "--color-primary-900": "oklch(34.5% 0.085 169)",
    },
  },
  indigo: {
    id: "indigo",
    label: "인디고",
    cssVars: {
      "--background": "#f0f2fa",
      // 차가운 coolGray 계열 zinc
      "--color-zinc-50": "oklch(98.3% 0.005 275)",
      "--color-zinc-100": "oklch(96.3% 0.010 275)",
      "--color-zinc-200": "oklch(91.2% 0.018 275)",
      "--color-zinc-300": "oklch(85.5% 0.028 275)",
      "--color-zinc-400": "oklch(69.0% 0.030 275)",
      "--color-zinc-500": "oklch(53.5% 0.028 275)",
      "--color-zinc-600": "oklch(42.5% 0.025 275)",
      "--color-zinc-700": "oklch(35.5% 0.022 275)",
      "--color-zinc-800": "oklch(26.5% 0.015 275)",
      "--color-zinc-900": "oklch(20.0% 0.015 275)",
      // primary 슬롯을 indigo 색상으로 교체
      "--color-primary-50":  "oklch(96.2% 0.018 272.314)",
      "--color-primary-100": "oklch(93%   0.034 272.788)",
      "--color-primary-200": "oklch(87%   0.065 274.039)",
      "--color-primary-400": "oklch(67.3% 0.182 276.935)",
      "--color-primary-500": "oklch(58.5% 0.233 277.117)",
      "--color-primary-600": "oklch(51.1% 0.262 276.966)",
      "--color-primary-700": "oklch(45.7% 0.240 277.023)",
      "--color-primary-800": "oklch(39.8% 0.195 277.366)",
      "--color-primary-900": "oklch(35.9% 0.144 278.697)",
    },
  },
  red: {
    id: "red",
    label: "레드",
    cssVars: {
      "--background": "#faf0f0",
      // 붉은 warmgray 계열 zinc
      "--color-zinc-50":  "oklch(98.3% 0.005 20)",
      "--color-zinc-100": "oklch(96.2% 0.008 20)",
      "--color-zinc-200": "oklch(91.0% 0.015 20)",
      "--color-zinc-300": "oklch(85.5% 0.022 20)",
      "--color-zinc-400": "oklch(69.0% 0.025 20)",
      "--color-zinc-500": "oklch(53.5% 0.022 20)",
      "--color-zinc-600": "oklch(42.5% 0.020 20)",
      "--color-zinc-700": "oklch(35.5% 0.018 20)",
      "--color-zinc-800": "oklch(26.5% 0.012 20)",
      "--color-zinc-900": "oklch(20.0% 0.012 20)",
      // primary 슬롯을 레드/로즈 색상으로 교체
      "--color-primary-50":  "oklch(97.1% 0.013 17.38)",
      "--color-primary-100": "oklch(93.6% 0.032 17.717)",
      "--color-primary-200": "oklch(88.5% 0.062 18.334)",
      "--color-primary-400": "oklch(70.4% 0.191 22.216)",
      "--color-primary-500": "oklch(63.7% 0.237 25.331)",
      "--color-primary-600": "oklch(57.7% 0.245 27.325)",
      "--color-primary-700": "oklch(50.5% 0.213 27.518)",
      "--color-primary-800": "oklch(44.4% 0.177 26.899)",
      "--color-primary-900": "oklch(39.6% 0.141 25.723)",
    },
  },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const DEFAULT_THEME_ID: ThemeId = "base";
