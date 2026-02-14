import { bringForward, sendBackward } from "../../features/layers/layersController";

export function LayersPanel() {
  return (
    <div>
      <h3 className="mb-2 font-semibold">Layers</h3>
      <div className="space-x-2">
        <button className="rounded border px-2 py-1" onClick={() => bringForward((window as any).__editorCanvas)}>Bring forward</button>
        <button className="rounded border px-2 py-1" onClick={() => sendBackward((window as any).__editorCanvas)}>Send back</button>
      </div>
    </div>
  );
}
