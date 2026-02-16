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

  undo() {
    if (this.undoStack.length < 2) return Promise.resolve();
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    return loadCanvasJson(this.canvas, this.undoStack[this.undoStack.length - 1]);
  }

  redo() {
    const next = this.redoStack.pop();
    if (!next) return Promise.resolve();
    this.undoStack.push(next);
    return loadCanvasJson(this.canvas, next);
  }
}


export default HistoryManager;
