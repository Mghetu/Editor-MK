import { Rect } from "fabric";
import type { Canvas } from "fabric";

export type CropOverlay = {
  frame: any;
  refresh: () => void;
  destroy: () => void;
};

const getFrameCorners = (frame: any) => {
  const coords = frame?.aCoords;
  if (coords?.tl && coords?.tr && coords?.br && coords?.bl) {
    return [coords.tl, coords.tr, coords.br, coords.bl] as Array<{ x: number; y: number }>;
  }

  const left = frame.left ?? 0;
  const top = frame.top ?? 0;
  const width = Math.max(1, (frame.width ?? 1) * (frame.scaleX ?? 1));
  const height = Math.max(1, (frame.height ?? 1) * (frame.scaleY ?? 1));
  return [
    { x: left, y: top },
    { x: left + width, y: top },
    { x: left + width, y: top + height },
    { x: left, y: top + height }
  ];
};

export const createCropOverlay = (canvas: Canvas, left: number, top: number, width: number, height: number): CropOverlay => {
  const frame = new Rect({
    left,
    top,
    width,
    height,
    fill: "rgba(0,0,0,0)",
    stroke: "#0ea5e9",
    strokeWidth: 2,
    hasRotatingPoint: false,
    lockRotation: true,
    cornerColor: "#0ea5e9",
    transparentCorners: false
  }) as any;

  frame.set("data", { id: crypto.randomUUID(), type: "crop-frame", name: "Crop Frame" });

  const drawOverlay = () => {
    const ctx = (canvas as any).contextContainer as CanvasRenderingContext2D | undefined;
    if (!ctx) return;

    const vt = canvas.viewportTransform;
    if (!vt) return;

    frame.setCoords();
    const corners = getFrameCorners(frame);
    const zoom = canvas.getZoom() || 1;
    const sceneW = canvas.getWidth() / zoom;
    const sceneH = canvas.getHeight() / zoom;
    const sceneLeft = -vt[4] / vt[0];
    const sceneTop = -vt[5] / vt[3];

    ctx.save();
    ctx.transform(vt[0], vt[1], vt[2], vt[3], vt[4], vt[5]);
    ctx.beginPath();
    ctx.rect(sceneLeft, sceneTop, sceneW, sceneH);
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i += 1) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(15,23,42,0.45)";
    ctx.fill("evenodd");
    ctx.restore();
  };

  canvas.on("after:render", drawOverlay);
  canvas.add(frame);
  canvas.setActiveObject(frame);

  const refresh = () => {
    frame.setCoords();
    canvas.requestRenderAll();
  };

  const destroy = () => {
    canvas.off("after:render", drawOverlay);
    canvas.remove(frame);
  };

  refresh();
  return { frame, refresh, destroy };
};
