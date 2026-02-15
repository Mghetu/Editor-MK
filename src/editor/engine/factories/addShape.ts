import { Circle, Rect } from "fabric";
import type { Canvas } from "fabric";

type ShapeKind = "rect" | "square" | "circle";

const SHAPE_STYLE = {
  fill: "#E2E8F0",
  stroke: "#334155",
  strokeWidth: 1,
  strokeUniform: true
} as const;

const finalize = (canvas: Canvas, obj: any, name: string, shapeKind: ShapeKind) => {
  obj.set("data", { id: crypto.randomUUID(), type: "shape", name, shapeKind });
  canvas.add(obj);
  canvas.setActiveObject(obj);
  canvas.renderAll();
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

  finalize(canvas, rect, "Rectangle", "rect");
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

  finalize(canvas, square, "Square", "square");
};

export const addCircle = (canvas: Canvas) => {
  const circle = new Circle({
    left: 160,
    top: 160,
    radius: 90,
    ...SHAPE_STYLE
  }) as any;

  finalize(canvas, circle, "Circle", "circle");
};
