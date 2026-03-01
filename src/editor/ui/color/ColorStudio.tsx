import { useMemo, useState } from "react";
import {
  cmykToRgb,
  complementaryHex,
  harmonyHexes,
  hexToRgb,
  hslToRgb,
  invertHex,
  normalizeHex,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl
} from "./colorUtils";

export type ColorSelection =
  | { mode: "solid"; hex: string }
  | { mode: "gradient"; gradient: { type: "linear" | "radial"; angle: number; stops: Array<{ offset: number; color: string }> } };

const SWATCH_KEY = "editor-mk-color-swatches-v1";

const readSavedSwatches = (): string[] => {
  try {
    const raw = localStorage.getItem(SWATCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "string").map((v) => normalizeHex(v)).filter(Boolean) as string[];
  } catch {
    return [];
  }
};

const saveSwatches = (swatches: string[]) => {
  try {
    localStorage.setItem(SWATCH_KEY, JSON.stringify(swatches.slice(0, 40)));
  } catch {
    // ignore storage errors
  }
};

const presets = [
  ["#5b21b6", "#ec4899"],
  ["#0ea5e9", "#22c55e"],
  ["#f97316", "#ef4444"],
  ["#06b6d4", "#3b82f6"]
];

export function ColorStudio({ value, onChange, allowGradient = true }: { value: ColorSelection; onChange: (v: ColorSelection) => void; allowGradient?: boolean }) {
  const activeHex = value.mode === "solid" ? value.hex : value.gradient.stops[0]?.color ?? "#000000";
  const validHex = normalizeHex(activeHex) ?? "#000000";
  const [saved, setSaved] = useState<string[]>(() => readSavedSwatches());

  const rgb = useMemo(() => hexToRgb(validHex) ?? { r: 0, g: 0, b: 0 }, [validHex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb]);

  const setSolidHex = (nextHex: string) => {
    const normalized = normalizeHex(nextHex);
    if (!normalized) return;
    onChange({ mode: "solid", hex: normalized });
  };

  const setModelHex = (creator: () => string) => {
    setSolidHex(creator());
  };

  const addSwatch = (hex: string) => {
    const next = [hex, ...saved.filter((s) => s !== hex)];
    setSaved(next);
    saveSwatches(next);
  };

  const setGradientStop = (index: number, color: string) => {
    if (value.mode !== "gradient") return;
    const normalized = normalizeHex(color);
    if (!normalized) return;
    const stops = value.gradient.stops.map((stop, i) => (i === index ? { ...stop, color: normalized } : stop));
    onChange({ ...value, gradient: { ...value.gradient, stops } });
  };

  return (
    <div className="space-y-3 rounded-lg border border-[#5a5a5a] bg-[#252525] p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Color Studio</p>
        <div className="flex gap-1">
          <button className={`rounded px-2 py-1 text-xs ${value.mode === "solid" ? "bg-violet-600 text-white" : "bg-[#333]"}`} onClick={() => onChange({ mode: "solid", hex: validHex })}>Solid</button>
          {allowGradient && (
            <button
              className={`rounded px-2 py-1 text-xs ${value.mode === "gradient" ? "bg-violet-600 text-white" : "bg-[#333]"}`}
              onClick={() => onChange({ mode: "gradient", gradient: { type: "linear", angle: 45, stops: [{ offset: 0, color: validHex }, { offset: 1, color: complementaryHex(validHex) }] } })}
            >
              Gradient
            </button>
          )}
        </div>
      </div>

      {value.mode === "solid" && (
        <>
          <div className="grid grid-cols-[40px_1fr] gap-2">
            <input type="color" value={validHex} className="h-10 w-10 rounded border border-[#5a5a5a] bg-transparent p-1" onChange={(e) => setSolidHex(e.target.value)} />
            <input value={validHex} className="rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1 text-sm" onChange={(e) => setSolidHex(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <label>R<input type="number" min={0} max={255} value={rgb.r} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex({ ...rgb, r: Number(e.target.value) }))} /></label>
            <label>G<input type="number" min={0} max={255} value={rgb.g} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex({ ...rgb, g: Number(e.target.value) }))} /></label>
            <label>B<input type="number" min={0} max={255} value={rgb.b} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex({ ...rgb, b: Number(e.target.value) }))} /></label>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <label>H<input type="number" min={0} max={360} value={hsl.h} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(hslToRgb({ ...hsl, h: Number(e.target.value) })))} /></label>
            <label>S<input type="number" min={0} max={100} value={hsl.s} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(hslToRgb({ ...hsl, s: Number(e.target.value) })))} /></label>
            <label>L<input type="number" min={0} max={100} value={hsl.l} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(hslToRgb({ ...hsl, l: Number(e.target.value) })))} /></label>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <label>C<input type="number" min={0} max={100} value={cmyk.c} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(cmykToRgb({ ...cmyk, c: Number(e.target.value) })))} /></label>
            <label>M<input type="number" min={0} max={100} value={cmyk.m} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(cmykToRgb({ ...cmyk, m: Number(e.target.value) })))} /></label>
            <label>Y<input type="number" min={0} max={100} value={cmyk.y} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(cmykToRgb({ ...cmyk, y: Number(e.target.value) })))} /></label>
            <label>K<input type="number" min={0} max={100} value={cmyk.k} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(cmykToRgb({ ...cmyk, k: Number(e.target.value) })))} /></label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="rounded bg-[#333] px-2 py-1 text-xs" onClick={() => setSolidHex(invertHex(validHex))}>Invert</button>
            <button className="rounded bg-[#333] px-2 py-1 text-xs" onClick={() => setSolidHex(complementaryHex(validHex))}>Complementary</button>
            <button className="rounded bg-[#333] px-2 py-1 text-xs" onClick={() => addSwatch(validHex)}>Save swatch</button>
          </div>
        </>
      )}

      {value.mode === "gradient" && (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <label>Type
              <select value={value.gradient.type} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => onChange({ ...value, gradient: { ...value.gradient, type: e.target.value as "linear" | "radial" } })}>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </label>
            <label>Angle
              <input type="number" value={value.gradient.angle} className="mt-1 w-full rounded border border-[#5a5a5a] bg-[#1f1f1f] px-2 py-1" onChange={(e) => onChange({ ...value, gradient: { ...value.gradient, angle: Number(e.target.value) } })} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {value.gradient.stops.map((stop, i) => (
              <label key={i}>Stop {Math.round(stop.offset * 100)}%
                <input type="color" value={stop.color} className="mt-1 h-10 w-full rounded border border-[#5a5a5a] bg-transparent p-1" onChange={(e) => setGradientStop(i, e.target.value)} />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            {presets.map((pair, i) => (
              <button
                key={i}
                className="h-8 flex-1 rounded border border-[#5a5a5a]"
                style={{ background: `linear-gradient(90deg, ${pair[0]}, ${pair[1]})` }}
                onClick={() =>
                  onChange({ ...value, gradient: { ...value.gradient, stops: [{ offset: 0, color: pair[0] }, { offset: 1, color: pair[1] }] } })
                }
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs text-slate-400">Harmonies</p>
        {harmonyHexes(validHex).map((harmony) => (
          <div key={harmony.label} className="flex items-center gap-2 text-[11px]">
            <span className="w-20 text-slate-400">{harmony.label}</span>
            <div className="flex gap-1">
              {harmony.colors.map((color) => (
                <button key={`${harmony.label}-${color}`} className="h-5 w-5 rounded border border-black/30" style={{ background: color }} onClick={() => setSolidHex(color)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-slate-400">Saved swatches</p>
        <div className="flex flex-wrap gap-1">
          {saved.length === 0 && <span className="text-[11px] text-slate-500">No saved swatches yet.</span>}
          {saved.map((color) => (
            <button key={color} className="h-6 w-6 rounded border border-black/30" style={{ background: color }} onClick={() => setSolidHex(color)} />
          ))}
        </div>
      </div>
    </div>
  );
}
