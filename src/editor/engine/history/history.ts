import { Canvas, FabricImage } from "fabric";
import { applyGlobalHandleStyle, applyObjectHandleStyle } from "./handleStyle";
import { ensureRectRadiusMetadata, ensureShapeStrokeUniform, normalizeRectAfterTransform } from "../features/shapes/shapeGeometry";

FabricImage.customProperties = Array.from(new Set([...(FabricImage.customProperties ?? []), "cropN"]));

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

  canvas.on("object:modified", ({ target }) => {
    if (!target) return;
    normalizeRectAfterTransform(target as any);
    target.setCoords();
    canvas.requestRenderAll();
  });

  return canvas;
};
