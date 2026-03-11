import { Textbox } from "fabric";
import type { Canvas } from "fabric";
import { AddObjectCommand } from "../history/commands/basic";
import { createFabricHistoryContext } from "../history/fabricHistoryContext";

export const addText = async (canvas: Canvas) => {
  const text = new Textbox("Edit me", {
    left: 120,
    top: 120,
    width: 420,
    fontSize: 48,
    fill: "#111827",
    splitByGrapheme: true
  }) as any;
  text.data = { id: crypto.randomUUID(), type: "text", name: "Text" };

  const commandHistory = (window as any).__commandHistory;
  if (!commandHistory) {
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    return;
  }

  const ctx = createFabricHistoryContext(canvas);
  await commandHistory.execute(AddObjectCommand.fromObject(text, ctx, "Add text"), { source: "ui" });
};
