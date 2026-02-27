import { Minimize2, ZoomIn, ZoomOut } from "lucide-react";

const getZoomCenterPoint = (canvas: any) => {
  if (typeof canvas?.getCenterPoint === "function") {
    const pt = canvas.getCenterPoint();
    return { x: Number(pt?.x ?? 0), y: Number(pt?.y ?? 0) };
  }

  const center = canvas?.getCenter?.();
  return { x: Number(center?.left ?? 0), y: Number(center?.top ?? 0) };
};

export function Footer() {
  const getCanvas = () => (window as any).__editorCanvas;

  const zoomBy = (delta: number) => {
    const canvas = getCanvas();
    if (!canvas) return;
    const next = Math.max(0.2, Math.min(2, canvas.getZoom() + delta));
    const center = getZoomCenterPoint(canvas);
    canvas.zoomToPoint({ x: center.x, y: center.y }, next);
    canvas.requestRenderAll?.();
    canvas.renderAll?.();
  };

  const fit = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const base = (canvas as any).__workspaceViewportTransform;
    if (Array.isArray(base) && base.length === 6) {
      canvas.setViewportTransform([...base]);
    } else {
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    }

    canvas.requestRenderAll?.();
    canvas.renderAll?.();
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
