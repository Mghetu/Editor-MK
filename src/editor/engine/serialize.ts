import type { Canvas } from "fabric";

export const saveCanvasJson = (canvas: Canvas) => (canvas as any).toJSON(["data", "crop", "table"]);

export const loadCanvasJson = async (canvas: Canvas, json: unknown) => {
  await canvas.loadFromJSON(json as object);
  canvas.renderAll();
};
