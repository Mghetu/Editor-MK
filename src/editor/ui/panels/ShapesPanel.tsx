import { addCircle, addRectangle, addSquare } from "../../engine/factories/addShape";

export function ShapesPanel() {
  const canvas = (window as any).__editorCanvas;

  return (
    <div className="space-y-2 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="font-semibold text-slate-100">Shapes</h3>
      <div className="grid grid-cols-1 gap-2">
        <button className="rounded border border-[#555] bg-[#252525] px-3 py-1 text-left text-slate-100 hover:bg-[#333]" onClick={() => addRectangle(canvas)}>
          Add rectangle
        </button>
        <button className="rounded border border-[#555] bg-[#252525] px-3 py-1 text-left text-slate-100 hover:bg-[#333]" onClick={() => addSquare(canvas)}>
          Add square
        </button>
        <button className="rounded border border-[#555] bg-[#252525] px-3 py-1 text-left text-slate-100 hover:bg-[#333]" onClick={() => addCircle(canvas)}>
          Add circle
        </button>
      </div>
    </div>
  );
}
