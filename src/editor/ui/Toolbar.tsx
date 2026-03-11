import { Copy, Layers, Trash2 } from "lucide-react";
import { useEditorStore } from "../state/useEditorStore";
import { applyObjectProperties, duplicateObjectWithHistory, removeObjectWithHistory, reorderObjectWithHistory } from "../engine/history/mutator";

const fonts = ["Arial", "Inter", "Georgia", "Times New Roman", "Courier New"];

export function Toolbar() {
  const { selectedObjectType } = useEditorStore();
  const canvas = (window as any).__editorCanvas;
  const active = canvas?.getActiveObject() as any;

  if (!active) {
    return (
      <div className="flex h-11 items-center gap-2 border-b border-[#313131] bg-[#1f1f1f] px-3 text-xs text-slate-400">
        Select an object to edit quick properties.
      </div>
    );
  }

  const mutate = (values: Record<string, unknown>, label = "Update object") => {
    void applyObjectProperties(canvas, active, values, label);
  };

  return (
    <div className="flex h-11 items-center gap-2 border-b border-[#313131] bg-[#1f1f1f] px-3 text-xs text-slate-200">
      {(selectedObjectType === "text" || selectedObjectType === "table") && (
        <>
          <label className="text-slate-300">Fill</label>
          <input
            type="color"
            defaultValue={(active.fill as string) || "#111827"}
            onChange={(e) => mutate({ fill: e.target.value }, "Set fill") }
          />
        </>
      )}

      {selectedObjectType === "text" && (
        <>
          <select
            className="rounded border border-[#5a5a5a] bg-[#202020] px-2 py-1"
            defaultValue={active.fontFamily || "Arial"}
            onChange={(e) => mutate({ fontFamily: e.target.value }, "Set font family") }
          >
            {fonts.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
          <input
            type="number"
            className="w-16 rounded border border-[#5a5a5a] bg-[#202020] px-2 py-1"
            defaultValue={active.fontSize || 48}
            onChange={(e) => mutate({ fontSize: Number(e.target.value) }, "Set font size") }
          />
        </>
      )}

      {(selectedObjectType === "image" || selectedObjectType === "table") && (
        <>
          <label className="text-slate-300">Opacity</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            defaultValue={active.opacity ?? 1}
            onChange={(e) => mutate({ opacity: Number(e.target.value) }, "Set opacity") }
          />
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          className="rounded p-1.5 hover:bg-[#2a2a2a]"
          title="Duplicate"
          onClick={() => { void duplicateObjectWithHistory(canvas, active, "Duplicate object"); }}
        >
          <Copy size={14} />
        </button>
        <button className="rounded p-1.5 hover:bg-[#2a2a2a]" title="Bring forward" onClick={() => { void reorderObjectWithHistory(canvas, active, 1, "Bring forward"); }}>
          <Layers size={14} />
        </button>
        <button className="rounded p-1.5 text-rose-400 hover:bg-[#2a2a2a]" title="Delete" onClick={() => { void removeObjectWithHistory(canvas, active, "Delete object"); }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
