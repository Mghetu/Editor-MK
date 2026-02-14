import { saveAs } from "file-saver";
import type { Canvas } from "fabric";

export const exportCurrentPage = (canvas: Canvas, format: "png" | "jpg", multiplier = 1, name = "page") => {
  const dataUrl = canvas.toDataURL({ format: format === "jpg" ? "jpeg" : "png", multiplier, quality: 0.95 });
  saveAs(dataUrl, `${name}.${format}`);
};
