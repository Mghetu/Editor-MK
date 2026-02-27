import { saveAs } from "file-saver";
import type { Canvas } from "fabric";

const getPageBounds = (canvas: Canvas) => {
  const page = (canvas as any).__pageBounds;
  if (page) return page;
  return { left: 0, top: 0, width: canvas.getWidth(), height: canvas.getHeight() };
};

export const exportCurrentPage = (canvas: Canvas, format: "png" | "jpg", multiplier = 1, name = "page") => {
  const bounds = getPageBounds(canvas);
  const dataUrl = canvas.toDataURL({
    format: format === "jpg" ? "jpeg" : "png",
    multiplier,
    quality: 0.95,
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height
  });
  saveAs(dataUrl, `${name}.${format}`);
};
