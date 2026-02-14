import { IText } from "fabric";
import type { Canvas } from "fabric";

export const addText = (canvas: Canvas) => {
  const text = new IText("Edit me", {
    left: 120,
    top: 120,
    fontSize: 48,
    fill: "#111827"
  }) as any;
  text.set("data", { id: crypto.randomUUID(), type: "text", name: "Text" });
  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.renderAll();
};
