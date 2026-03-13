export type Rgb = { r: number; g: number; b: number; a?: number };
export type Hsl = { h: number; s: number; l: number; a?: number };
export type Cmyk = { c: number; m: number; y: number; k: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeHex = (value: string) => {
  const hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex.split("").map((ch) => ch + ch).join("")}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex}`.toLowerCase();
  return null;
};

export const rgbToHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b]
    .map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;

export const hexToRgb = (hexValue: string): Rgb | null => {
  const hex = normalizeHex(hexValue);
  if (!hex) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
};

export const rgbToHsl = ({ r, g, b }: Rgb): Hsl => {
  const nr = clamp(r, 0, 255) / 255;
  const ng = clamp(g, 0, 255) / 255;
  const nb = clamp(b, 0, 255) / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === nr) h = ((ng - nb) / delta) % 6;
    else if (max === ng) h = (nb - nr) / delta + 2;
    else h = (nr - ng) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
};

export const hslToRgb = ({ h, s, l }: Hsl): Rgb => {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hh < 60) [r1, g1, b1] = [c, x, 0];
  else if (hh < 120) [r1, g1, b1] = [x, c, 0];
  else if (hh < 180) [r1, g1, b1] = [0, c, x];
  else if (hh < 240) [r1, g1, b1] = [0, x, c];
  else if (hh < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  };
};

export const rgbToCmyk = ({ r, g, b }: Rgb): Cmyk => {
  const rr = clamp(r, 0, 255) / 255;
  const gg = clamp(g, 0, 255) / 255;
  const bb = clamp(b, 0, 255) / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - rr - k) / (1 - k);
  const m = (1 - gg - k) / (1 - k);
  const y = (1 - bb - k) / (1 - k);
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  };
};

export const cmykToRgb = ({ c, m, y, k }: Cmyk): Rgb => {
  const cc = clamp(c, 0, 100) / 100;
  const mm = clamp(m, 0, 100) / 100;
  const yy = clamp(y, 0, 100) / 100;
  const kk = clamp(k, 0, 100) / 100;
  return {
    r: Math.round(255 * (1 - cc) * (1 - kk)),
    g: Math.round(255 * (1 - mm) * (1 - kk)),
    b: Math.round(255 * (1 - yy) * (1 - kk))
  };
};

export const invertHex = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex({ r: 255 - rgb.r, g: 255 - rgb.g, b: 255 - rgb.b });
};

export const complementaryHex = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  return rgbToHex(hslToRgb({ ...hsl, h: (hsl.h + 180) % 360 }));
};

export const harmonyHexes = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return [] as Array<{ label: string; colors: string[] }>;
  const hsl = rgbToHsl(rgb);
  const mk = (dh: number, s = hsl.s, l = hsl.l) => rgbToHex(hslToRgb({ h: (hsl.h + dh + 360) % 360, s, l }));
  return [
    { label: "Analogous", colors: [mk(-30), hex, mk(30)] },
    { label: "Complementary", colors: [hex, mk(180)] },
    { label: "Triadic", colors: [hex, mk(120), mk(240)] },
    { label: "Split", colors: [hex, mk(150), mk(210)] },
    { label: "Monochrome", colors: [mk(0, hsl.s, clamp(hsl.l - 20, 0, 100)), hex, mk(0, hsl.s, clamp(hsl.l + 20, 0, 100))] }
  ];
};
