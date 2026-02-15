import { addCircle, addRectangle, addSquare } from "../../engine/factories/addShape";

export function ShapesPanel() {
  const canvas = (window as any).__editorCanvas;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Shapes</h3>
      <div className="grid grid-cols-1 gap-2">
        <button className="rounded border px-3 py-1 text-left" onClick={() => addRectangle(canvas)}>
          Add rectangle
        </button>
        <button className="rounded border px-3 py-1 text-left" onClick={() => addSquare(canvas)}>
          Add square
        </button>
        <button className="rounded border px-3 py-1 text-left" onClick={() => addCircle(canvas)}>
          Add circle
        </button>
      </div>
    </div>
  );
}
