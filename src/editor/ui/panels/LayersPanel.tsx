import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { useEffect, useState } from "react";
import {
  bringForward,
  listLayers,
  selectLayer,
  sendBackward,
  toggleHideLayer,
  toggleLockLayer,
  type LayerItem
} from "../../features/layers/layersController";

export function LayersPanel() {
  const [layers, setLayers] = useState<LayerItem[]>([]);

  useEffect(() => {
    const canvas = (window as any).__editorCanvas;
    if (!canvas) return;

    const refresh = () => setLayers(listLayers(canvas));
    refresh();

    canvas.on("object:added", refresh);
    canvas.on("object:removed", refresh);
    canvas.on("object:modified", refresh);
    canvas.on("selection:created", refresh);
    canvas.on("selection:updated", refresh);
    canvas.on("selection:cleared", refresh);

    const timer = window.setInterval(refresh, 600);

    return () => {
      window.clearInterval(timer);
      canvas.off("object:added", refresh);
      canvas.off("object:removed", refresh);
      canvas.off("object:modified", refresh);
      canvas.off("selection:created", refresh);
      canvas.off("selection:updated", refresh);
      canvas.off("selection:cleared", refresh);
    };
  }, []);

  const canvas = (window as any).__editorCanvas;

  return (
    <div>
      <h3 className="mb-2 font-semibold">Layers</h3>
      <div className="space-y-2">
        {layers.length === 0 && <p className="text-xs text-slate-500">No objects yet.</p>}
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`rounded border p-2 ${layer.active ? "border-sky-400 bg-sky-50" : ""}`}
          >
            <div className="flex items-center gap-2">
              <button className="flex-1 text-left text-xs" onClick={() => selectLayer(canvas, layer.id)}>
                <span className="font-medium">{layer.name}</span>
                <span className="ml-1 text-[10px] uppercase text-slate-500">({layer.type})</span>
              </button>
              <button className="rounded p-1 hover:bg-slate-100" title="Bring forward" onClick={() => { bringForward(canvas, layer.id); setLayers(listLayers(canvas)); }}><ArrowUp size={13} /></button>
              <button className="rounded p-1 hover:bg-slate-100" title="Send backward" onClick={() => { sendBackward(canvas, layer.id); setLayers(listLayers(canvas)); }}><ArrowDown size={13} /></button>
              <button className="rounded p-1 hover:bg-slate-100" title={layer.locked ? "Unlock" : "Lock"} onClick={() => { toggleLockLayer(canvas, layer.id); setLayers(listLayers(canvas)); }}>
                {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
              </button>
              <button className="rounded p-1 hover:bg-slate-100" title={layer.hidden ? "Show" : "Hide"} onClick={() => { toggleHideLayer(canvas, layer.id); setLayers(listLayers(canvas)); }}>
                {layer.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
