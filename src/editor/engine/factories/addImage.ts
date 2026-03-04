import { FabricImage } from "fabric";
import type { Canvas } from "fabric";
import { AddObjectCommand } from "../history/commands/basic";
import { createFabricHistoryContext } from "../history/fabricHistoryContext";

export const addImageFromFile = async (canvas: Canvas, file: File) => {
  const url = URL.createObjectURL(file);
  try {
    const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    (img as any).set("data", { id: crypto.randomUUID(), type: "image", name: file.name });
    img.set({ left: 100, top: 100 });

    const commandHistory = (window as any).__commandHistory;
    if (!commandHistory) {
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      return;
    }

    const ctx = createFabricHistoryContext(canvas);
    await commandHistory.execute(AddObjectCommand.fromObject(img, ctx, "Add image"), { source: "ui" });
  } finally {
    URL.revokeObjectURL(url);
  }
};
