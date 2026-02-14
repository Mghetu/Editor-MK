import { FabricImage } from "fabric";
import type { Canvas } from "fabric";

export const addImageFromFile = async (canvas: Canvas, file: File) => {
  const url = URL.createObjectURL(file);
  const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
  (img as any).set("data", { id: crypto.randomUUID(), type: "image", name: file.name });
  img.set({ left: 100, top: 100 });
  canvas.add(img);
  canvas.setActiveObject(img);
  canvas.renderAll();
};
