import { saveAs } from "file-saver";

const toBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();

export const exportSelectedImage = async (
  image: any,
  format: "png" | "jpg" = "png",
  multiplier = 1,
  name = "image-crop"
) => {
  if (!image || image?.data?.type !== "image") {
    throw new Error("Please select an image object to export.");
  }

  const element = image.getElement?.() as HTMLImageElement | undefined;
  if (!element) {
    throw new Error("Image source is unavailable.");
  }

  const sx = Math.max(0, Math.round(image.cropX ?? 0));
  const sy = Math.max(0, Math.round(image.cropY ?? 0));
  const sw = Math.max(1, Math.round(image.width ?? element.naturalWidth ?? 1));
  const sh = Math.max(1, Math.round(image.height ?? element.naturalHeight ?? 1));

  // Export at the current on-canvas displayed size (not original source size),
  // then apply optional multiplier.
  const displayW = Math.max(1, Math.round(Math.abs(image.getScaledWidth?.() ?? sw)));
  const displayH = Math.max(1, Math.round(Math.abs(image.getScaledHeight?.() ?? sh)));
  const outW = Math.max(1, Math.round(displayW * Math.max(0.1, multiplier)));
  const outH = Math.max(1, Math.round(displayH * Math.max(0.1, multiplier)));

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const ctx = outCanvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create export context.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(element, sx, sy, sw, sh, 0, 0, outW, outH);

  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  const dataUrl = outCanvas.toDataURL(mime, 0.95);
  const blob = await toBlob(dataUrl);
  saveAs(blob, `${name}.${format}`);
};
