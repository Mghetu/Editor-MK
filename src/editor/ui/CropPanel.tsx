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
  onStart,
  onPreset,
  onApply,
  onCancel
}: {
  active: boolean;
  onStart: () => void;
  onPreset: (aspect: number | null) => void;
  onApply: () => void;
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
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button key={preset.label} className="rounded border border-[#555] bg-[#252525] px-2 py-1 hover:bg-[#333]" onClick={() => onPreset(preset.aspect)}>
            {preset.label}
          </button>
        ))}
      </div>
      <div className="space-x-2">
        <button className="rounded bg-violet-600 px-2 py-1 text-white hover:bg-violet-500" onClick={onApply}>
          Apply
        </button>
        <button className="rounded border border-[#555] bg-[#252525] px-2 py-1 hover:bg-[#333]" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
