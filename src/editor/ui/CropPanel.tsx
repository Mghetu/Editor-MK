import type { CropPreset } from "../features/crop/cropTypes";

const PRESETS: CropPreset[] = [
  { label: "Free", aspect: null },
  { label: "1:1", aspect: 1 },
  { label: "4:3", aspect: 4 / 3 },
  { label: "16:9", aspect: 16 / 9 },
  { label: "4:5", aspect: 4 / 5 },
  { label: "3:2", aspect: 3 / 2 }
];

export function CropPanel({
  active,
  selectedAspect,
  rotationNormalized,
  onStart,
  onPreset,
  onApply,
  onApplyPermanently,
  onCancel
}: {
  active: boolean;
  selectedAspect: number | null;
  rotationNormalized?: boolean;
  onStart: () => void;
  onPreset: (aspect: number | null) => void;
  onApply: () => void;
  onApplyPermanently: () => void;
  onCancel: () => void;
}) {
  if (!active) {
    return (
      <button className="rounded border border-[#555] bg-[#252525] px-3 py-1 text-slate-100 hover:bg-[#333]" onClick={onStart}>
        Crop
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded border border-[#555] bg-[#1a1a1a] p-3 text-slate-200">
      <div className="rounded border border-sky-700/60 bg-sky-900/20 px-2 py-1 text-xs text-sky-200">
        <strong>Crop mode is active.</strong> Press <kbd className="rounded border border-sky-500/60 bg-sky-950/60 px-1">Enter</kbd> to apply, <kbd className="rounded border border-sky-500/60 bg-sky-950/60 px-1">Esc</kbd> to cancel, or click outside the crop area to exit.
      </div>
      {rotationNormalized && (
        <div className="rounded border border-amber-700/70 bg-amber-900/20 px-2 py-1 text-xs text-amber-300">
          Rotation is temporarily normalized while cropping for stable bounds.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            className={`rounded border px-2 py-1 ${selectedAspect === preset.aspect ? "border-violet-400 bg-violet-600/30 text-violet-100" : "border-[#555] bg-[#252525] hover:bg-[#333]"}`}
            onClick={() => onPreset(preset.aspect)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-[#383838] pt-2">
        <button className="rounded bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500" onClick={onApply}>
          Apply Crop (Enter)
        </button>
        <button className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500" onClick={onApplyPermanently}>
          Apply Permanently
        </button>
        <button className="rounded border border-[#555] bg-[#252525] px-3 py-1.5 text-sm hover:bg-[#333]" onClick={onCancel}>
          Exit Crop Mode (Esc)
        </button>
      </div>
    </div>
  );
}
