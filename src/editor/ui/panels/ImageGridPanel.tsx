import { createImageGrid, IMAGE_GRID_PRESETS } from "../../features/imageGrid";

export function ImageGridPanel() {
  const canvas = (window as any).__editorCanvas;

  return (
    <div className="space-y-3 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="font-semibold text-slate-100">Image Grid</h3>
      <p className="text-xs text-slate-400">Create responsive collage grids with editable gap/padding.</p>
      <div className="grid grid-cols-1 gap-2">
        {IMAGE_GRID_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className="rounded border border-[#555] bg-[#252525] px-3 py-2 text-left hover:bg-[#333]"
            onClick={() => canvas && void createImageGrid(canvas, preset.id)}
          >
            <div className="text-sm font-medium text-slate-100">{preset.name}</div>
            <div className="text-xs text-slate-400">{preset.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
