import { Canvas, FabricImage } from "fabric";
import { applyGlobalHandleStyle, applyObjectHandleStyle } from "./handleStyle";
import { ensureRectRadiusMetadata, ensureShapeStrokeUniform, normalizeRectAfterTransform } from "../features/shapes/shapeGeometry";
import { enableImageGridReflowBehavior } from "../features/imageGrid";

FabricImage.customProperties = Array.from(new Set([...(FabricImage.customProperties ?? []), "cropN", "cropState", "__cropState"]));

const normalizeTextboxWidth = (target: any) => {
  if (String(target?.type ?? "").toLowerCase() !== "textbox") return;

  const baseWidth = Math.max(1, Number(target.width ?? 1));
  const scaleX = Number(target.scaleX ?? 1);
  const scaleSign = scaleX < 0 ? -1 : 1;
  const nextWidth = Math.max(1, Math.round(baseWidth * Math.abs(scaleX)));

  target.set({
    width: nextWidth,
    scaleX: scaleSign
  });
};

export const createCanvas = (el: HTMLCanvasElement, width: number, height: number, background: string) => {
  applyGlobalHandleStyle();

  const canvas = new Canvas(el, {
    preserveObjectStacking: true,
    controlsAboveOverlay: true,
    selection: true,
    backgroundColor: background,
    width,
    height
  });

  canvas.on("object:added", ({ target }) => {
    if (!target) return;
    applyObjectHandleStyle(target as any);
    ensureShapeStrokeUniform(target as any);
    ensureRectRadiusMetadata(target as any);
    target.setCoords();
    canvas.requestRenderAll();
  });

  canvas.on("object:scaling", ({ target }) => {
    if (!target) return;
    normalizeTextboxWidth(target as any);
    target.setCoords();
    canvas.requestRenderAll();
  });

  canvas.on("object:modified", ({ target }) => {
    if (!target) return;
    normalizeTextboxWidth(target as any);
    normalizeRectAfterTransform(target as any);
    target.setCoords();
    canvas.requestRenderAll();
  });

  enableImageGridReflowBehavior(canvas);

  return canvas;
};

export default createCanvas;
