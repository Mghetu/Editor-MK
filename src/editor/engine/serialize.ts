import type { Canvas } from "fabric";
import { applyObjectHandleStyle } from "./handleStyle";
import { ensureRectRadiusMetadata, ensureShapeStrokeUniform } from "../features/shapes/shapeGeometry";

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

const waitForFontsReady = async () => {
  if (typeof document === "undefined" || !("fonts" in document) || !document.fonts?.ready) return;
  try {
    await document.fonts.ready;
  } catch {
    // Ignore font readiness issues and continue rendering.
  }
};

const reapplyCanvasObjectRuntime = (canvas: Canvas) => {
  canvas.getObjects().forEach((obj: any) => {
    applyObjectHandleStyle(obj);
    ensureShapeStrokeUniform(obj);
    ensureRectRadiusMetadata(obj);
    obj.setCoords?.();
  });
};

export const saveCanvasJson = (canvas: Canvas) => {
  const json = (canvas as any).toJSON(["data", "crop", "cropN", "table"]);
  if (Array.isArray((json as any)?.objects)) {
    (json as any).objects = (json as any).objects.filter((obj: any) => obj?.data?.type !== "workspace-guide");
  }
  return json;
};

export const loadCanvasJson = async (canvas: Canvas, json: unknown) => {
  const input = typeof json === "string" ? JSON.parse(json) : json;
  const safeJson = sanitizeFabricObject(input);

  canvas.clear();
  await canvas.loadFromJSON(safeJson as object);
  await waitForFontsReady();

  reapplyCanvasObjectRuntime(canvas);
  canvas.renderAll();
};
