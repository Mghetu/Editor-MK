import { Textbox } from "fabric";
import type { Canvas } from "fabric";

export const addText = (canvas: Canvas) => {
  const text = new Textbox("Edit me", {
    left: 120,
    top: 120,
    width: 420,
    fontSize: 48,
    fill: "#111827",
    splitByGrapheme: true
  }) as any;
  text.set("data", { id: crypto.randomUUID(), type: "text", name: "Text" });
  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.renderAll();
};
