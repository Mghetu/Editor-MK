import { Pipette, Save, Sparkles, Wand2 } from "lucide-react";
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

type StudioTab = "picker" | "models" | "harmony";

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
    localStorage.setItem(SWATCH_KEY, JSON.stringify(swatches.slice(0, 48)));
  } catch {
    // ignore storage errors
  }
};

const gradientPresets = [
  ["#8b5cf6", "#ec4899"],
  ["#0ea5e9", "#22d3ee"],
  ["#f59e0b", "#ef4444"],
  ["#14b8a6", "#3b82f6"],
  ["#eab308", "#84cc16"],
  ["#f43f5e", "#8b5cf6"]
];

const buildGradientPreview = (value: ColorSelection) => {
  if (value.mode === "solid") return value.hex;
  const stops = value.gradient.stops
    .slice()
    .sort((a, b) => a.offset - b.offset)
    .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
    .join(", ");
  const angle = Number(value.gradient.angle ?? 0);
  return `${value.gradient.type === "radial" ? "radial-gradient(circle" : `linear-gradient(${angle}deg`}, ${stops})`;
};

const TabButton = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button
    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${active ? "bg-[#4f46e5] text-white" : "bg-[#2a2a2a] text-slate-300 hover:bg-[#333]"}`}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

export function ColorStudio({ value, onChange, allowGradient = true }: { value: ColorSelection; onChange: (v: ColorSelection) => void; allowGradient?: boolean }) {
  const [saved, setSaved] = useState<string[]>(() => readSavedSwatches());
  const [tab, setTab] = useState<StudioTab>("picker");

  const activeHex = value.mode === "solid" ? value.hex : value.gradient.stops[0]?.color ?? "#000000";
  const validHex = normalizeHex(activeHex) ?? "#000000";
  const rgb = useMemo(() => hexToRgb(validHex) ?? { r: 0, g: 0, b: 0 }, [validHex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb]);

  const setSolidHex = (nextHex: string) => {
    const normalized = normalizeHex(nextHex);
    if (!normalized) return;
    onChange({ mode: "solid", hex: normalized });
  };

  const setModelHex = (creator: () => string) => setSolidHex(creator());

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

  const gradientPreview = buildGradientPreview(value);

  return (
    <div className="space-y-3 rounded-xl border border-[#454545] bg-[#222] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Color</p>
          <p className="text-[11px] text-slate-500">Studio</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded-md bg-[#2a2a2a] p-1.5 text-slate-400 hover:bg-[#333]" title="Eyedropper (coming soon)"><Pipette size={13} /></button>
          <button type="button" className="rounded-md bg-[#2a2a2a] p-1.5 text-slate-400 hover:bg-[#333]" title="Save swatch" onClick={() => addSwatch(validHex)}><Save size={13} /></button>
        </div>
      </div>

      <div className="grid grid-cols-[56px_1fr] gap-2 rounded-lg border border-[#3b3b3b] bg-[#1b1b1b] p-2">
        <button type="button" className="h-12 w-12 rounded-md border border-black/30" style={{ background: gradientPreview }} onClick={() => value.mode === "gradient" ? onChange({ mode: "solid", hex: validHex }) : undefined} />
        <div className="space-y-1">
          <input
            value={validHex}
            className="w-full rounded-md border border-[#555] bg-[#111] px-2 py-1 text-xs text-slate-100"
            onChange={(e) => setSolidHex(e.target.value)}
          />
          <div className="flex gap-1">
            <button type="button" className={`flex-1 rounded-md px-2 py-1 text-[11px] ${value.mode === "solid" ? "bg-violet-600 text-white" : "bg-[#2b2b2b] text-slate-300"}`} onClick={() => onChange({ mode: "solid", hex: validHex })}>Solid</button>
            {allowGradient && (
              <button
                type="button"
                className={`flex-1 rounded-md px-2 py-1 text-[11px] ${value.mode === "gradient" ? "bg-violet-600 text-white" : "bg-[#2b2b2b] text-slate-300"}`}
                onClick={() => onChange({ mode: "gradient", gradient: { type: "linear", angle: 45, stops: [{ offset: 0, color: validHex }, { offset: 1, color: complementaryHex(validHex) }] } })}
              >
                Gradient
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1">
        <TabButton active={tab === "picker"} onClick={() => setTab("picker")}>Picker</TabButton>
        <TabButton active={tab === "models"} onClick={() => setTab("models")}>Models</TabButton>
        <TabButton active={tab === "harmony"} onClick={() => setTab("harmony")}>Harmony</TabButton>
      </div>

      {tab === "picker" && (
        <div className="space-y-2 rounded-lg border border-[#3b3b3b] bg-[#1d1d1d] p-2">
          <input type="color" value={validHex} className="h-10 w-full rounded-md border border-[#555] bg-transparent p-1" onChange={(e) => setSolidHex(e.target.value)} />
          <label className="block text-[11px] text-slate-400">Hue
            <input type="range" min={0} max={360} value={hsl.h} className="mt-1 w-full" onChange={(e) => setModelHex(() => rgbToHex(hslToRgb({ ...hsl, h: Number(e.target.value) })))} />
          </label>
          <label className="block text-[11px] text-slate-400">Saturation
            <input type="range" min={0} max={100} value={hsl.s} className="mt-1 w-full" onChange={(e) => setModelHex(() => rgbToHex(hslToRgb({ ...hsl, s: Number(e.target.value) })))} />
          </label>
          <label className="block text-[11px] text-slate-400">Lightness
            <input type="range" min={0} max={100} value={hsl.l} className="mt-1 w-full" onChange={(e) => setModelHex(() => rgbToHex(hslToRgb({ ...hsl, l: Number(e.target.value) })))} />
          </label>
          <div className="flex flex-wrap gap-1">
            <button type="button" className="rounded-md bg-[#2f2f2f] px-2 py-1 text-[11px] text-slate-200" onClick={() => setSolidHex(invertHex(validHex))}><Wand2 size={11} className="mr-1 inline" />Invert</button>
            <button type="button" className="rounded-md bg-[#2f2f2f] px-2 py-1 text-[11px] text-slate-200" onClick={() => setSolidHex(complementaryHex(validHex))}><Sparkles size={11} className="mr-1 inline" />Complementary</button>
          </div>
        </div>
      )}

      {tab === "models" && (
        <div className="space-y-2 rounded-lg border border-[#3b3b3b] bg-[#1d1d1d] p-2 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <label>R<input type="number" min={0} max={255} value={rgb.r} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex({ ...rgb, r: Number(e.target.value) }))} /></label>
            <label>G<input type="number" min={0} max={255} value={rgb.g} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex({ ...rgb, g: Number(e.target.value) }))} /></label>
            <label>B<input type="number" min={0} max={255} value={rgb.b} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex({ ...rgb, b: Number(e.target.value) }))} /></label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label>H<input type="number" min={0} max={360} value={hsl.h} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(hslToRgb({ ...hsl, h: Number(e.target.value) })))} /></label>
            <label>S<input type="number" min={0} max={100} value={hsl.s} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(hslToRgb({ ...hsl, s: Number(e.target.value) })))} /></label>
            <label>L<input type="number" min={0} max={100} value={hsl.l} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(hslToRgb({ ...hsl, l: Number(e.target.value) })))} /></label>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <label>C<input type="number" min={0} max={100} value={cmyk.c} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(cmykToRgb({ ...cmyk, c: Number(e.target.value) })))} /></label>
            <label>M<input type="number" min={0} max={100} value={cmyk.m} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(cmykToRgb({ ...cmyk, m: Number(e.target.value) })))} /></label>
            <label>Y<input type="number" min={0} max={100} value={cmyk.y} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(cmykToRgb({ ...cmyk, y: Number(e.target.value) })))} /></label>
            <label>K<input type="number" min={0} max={100} value={cmyk.k} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => setModelHex(() => rgbToHex(cmykToRgb({ ...cmyk, k: Number(e.target.value) })))} /></label>
          </div>
        </div>
      )}

      {tab === "harmony" && (
        <div className="space-y-2 rounded-lg border border-[#3b3b3b] bg-[#1d1d1d] p-2">
          {harmonyHexes(validHex).map((harmony) => (
            <div key={harmony.label} className="flex items-center gap-2">
              <span className="w-20 text-[11px] text-slate-400">{harmony.label}</span>
              <div className="flex gap-1">
                {harmony.colors.map((color) => (
                  <button key={`${harmony.label}-${color}`} type="button" className="h-6 w-6 rounded border border-black/30" style={{ background: color }} onClick={() => setSolidHex(color)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {value.mode === "gradient" && (
        <div className="space-y-2 rounded-lg border border-[#3b3b3b] bg-[#1d1d1d] p-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <label>Type
              <select value={value.gradient.type} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => onChange({ ...value, gradient: { ...value.gradient, type: e.target.value as "linear" | "radial" } })}>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </label>
            <label>Angle
              <input type="number" value={value.gradient.angle} className="mt-1 w-full rounded border border-[#555] bg-[#111] px-2 py-1" onChange={(e) => onChange({ ...value, gradient: { ...value.gradient, angle: Number(e.target.value) } })} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {value.gradient.stops.map((stop, i) => (
              <label key={i}>Stop {Math.round(stop.offset * 100)}%
                <input type="color" value={stop.color} className="mt-1 h-9 w-full rounded border border-[#555] bg-transparent p-1" onChange={(e) => setGradientStop(i, e.target.value)} />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {gradientPresets.map((pair, i) => (
              <button
                key={i}
                type="button"
                className="h-7 rounded border border-[#555]"
                style={{ background: `linear-gradient(90deg, ${pair[0]}, ${pair[1]})` }}
                onClick={() => onChange({ ...value, gradient: { ...value.gradient, stops: [{ offset: 0, color: pair[0] }, { offset: 1, color: pair[1] }] } })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-[11px] text-slate-400">Saved swatches</p>
        <div className="flex flex-wrap gap-1">
          {saved.length === 0 && <span className="text-[11px] text-slate-500">No saved swatches yet.</span>}
          {saved.map((color) => (
            <button key={color} type="button" className="h-6 w-6 rounded border border-black/40" style={{ background: color }} onClick={() => setSolidHex(color)} />
          ))}
        </div>
      </div>
    </div>
  );
}
