import type { Canvas } from "fabric";
import { applyObjectHandleStyle } from "./handleStyle";

type JsonLike = Record<string, unknown>;

const TEXT_TYPES = new Set(["i-text", "text", "textbox"]);

const isObject = (value: unknown): value is JsonLike => typeof value === "object" && value !== null;

const sanitizeFabricObject = (node: unknown): unknown => {
  if (Array.isArray(node)) {
    return node.map(sanitizeFabricObject);
  }

  if (!isObject(node)) {
    return node;
  }

  const clone: JsonLike = {};

  for (const [key, value] of Object.entries(node)) {
    clone[key] = sanitizeFabricObject(value);
  }

  const type = typeof clone.type === "string" ? clone.type : undefined;
  const looksLikeText =
    (type && TEXT_TYPES.has(type)) ||
    typeof clone.fontFamily === "string" ||
    typeof clone.fontSize === "number";

  if (looksLikeText && typeof clone.text !== "string") {
    clone.text = "";
  }

  return clone;
};

export const saveCanvasJson = (canvas: Canvas) => (canvas as any).toJSON(["data", "crop", "cropN", "table"]);

export const loadCanvasJson = async (canvas: Canvas, json: unknown) => {
  const input = typeof json === "string" ? JSON.parse(json) : json;
  const safeJson = sanitizeFabricObject(input);
  await canvas.loadFromJSON(safeJson as object);
  canvas.getObjects().forEach((obj: any) => applyObjectHandleStyle(obj));
  canvas.renderAll();
};
