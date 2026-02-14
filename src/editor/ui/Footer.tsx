import { Minimize2, ZoomIn, ZoomOut } from "lucide-react";

export function Footer() {
  const getCanvas = () => (window as any).__editorCanvas;

  const zoomBy = (delta: number) => {
    const canvas = getCanvas();
    if (!canvas) return;
    const next = Math.max(0.2, Math.min(2, canvas.getZoom() + delta));
    const center = canvas.getCenter();
    canvas.zoomToPoint({ x: center.left, y: center.top }, next);
    canvas.renderAll();
  };

  const fit = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();
  };

  return (
    <footer className="flex h-12 items-center justify-end gap-1 border-t bg-white px-3">
      <button className="rounded p-2 hover:bg-slate-100" onClick={() => zoomBy(-0.05)} title="Zoom out">
        <ZoomOut size={16} />
      </button>
      <button className="rounded p-2 hover:bg-slate-100" onClick={() => zoomBy(0.05)} title="Zoom in">
        <ZoomIn size={16} />
      </button>
      <button className="rounded p-2 hover:bg-slate-100" onClick={fit} title="Reset zoom">
        <Minimize2 size={16} />
      </button>
    </footer>
  );
}
