import { Circle, Rect } from "fabric";
import type { Canvas } from "fabric";
import { AddObjectCommand } from "../history/commands/basic";
import { createFabricHistoryContext } from "../history/fabricHistoryContext";

type ShapeKind = "rect" | "square" | "circle";

const SHAPE_STYLE = {
  fill: "#E2E8F0",
  stroke: "#334155",
  strokeWidth: 1,
  strokeUniform: true
} as const;

const finalize = async (canvas: Canvas, obj: any, name: string, shapeKind: ShapeKind) => {
  const cornerRadiusPx = shapeKind === "circle" ? undefined : Math.max(0, Number(obj?.rx ?? obj?.ry ?? 0));
  obj.data = { id: crypto.randomUUID(), type: "shape", name, shapeKind, cornerRadiusPx };

  const commandHistory = (window as any).__commandHistory;
  if (!commandHistory) {
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    return;
  }

  const ctx = createFabricHistoryContext(canvas);
  await commandHistory.execute(AddObjectCommand.fromObject(obj, ctx, `Add ${name.toLowerCase()}`), { source: "ui" });
};

export const addRectangle = (canvas: Canvas) => {
  const rect = new Rect({
    left: 120,
    top: 120,
    width: 240,
    height: 140,
    rx: 0,
    ry: 0,
    ...SHAPE_STYLE
  }) as any;

  void finalize(canvas, rect, "Rectangle", "rect");
};

export const addSquare = (canvas: Canvas) => {
  const square = new Rect({
    left: 140,
    top: 140,
    width: 180,
    height: 180,
    rx: 0,
    ry: 0,
    ...SHAPE_STYLE
  }) as any;

  void finalize(canvas, square, "Square", "square");
};

export const addCircle = (canvas: Canvas) => {
  const circle = new Circle({
    left: 160,
    top: 160,
    radius: 90,
    ...SHAPE_STYLE
  }) as any;

  void finalize(canvas, circle, "Circle", "circle");
};
