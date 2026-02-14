import type { Canvas } from "fabric";

type JsonLike = Record<string, unknown>;

const isObject = (value: unknown): value is JsonLike => typeof value === "object" && value !== null;

const sanitizeFabricObject = (node: unknown): unknown => {
  if (Array.isArray(node)) {
    return node.map(sanitizeFabricObject);
  }

  if (!isObject(node)) {
    return node;
  }

  const clone: JsonLike = { ...node };

  if ((clone.type === "i-text" || clone.type === "text" || clone.type === "textbox") && typeof clone.text !== "string") {
    clone.text = "";
  }

  if (Array.isArray(clone.objects)) {
    clone.objects = clone.objects.map(sanitizeFabricObject);
  }

  return clone;
};

export const saveCanvasJson = (canvas: Canvas) => (canvas as any).toJSON(["data", "crop", "table"]);

export const loadCanvasJson = async (canvas: Canvas, json: unknown) => {
  const safeJson = sanitizeFabricObject(json);
  await canvas.loadFromJSON(safeJson as object);
  canvas.renderAll();
};
