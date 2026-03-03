import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Canvas } from "fabric";
import type { DocModel } from "../../state/documentModel";
import { loadCanvasJson, saveCanvasJson } from "../serialize";

const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();

export const exportAllPagesZip = async (canvas: Canvas, doc: DocModel) => {
  const zip = new JSZip();
  const activeObjectId = (canvas.getActiveObject?.() as any)?.data?.id as string | undefined;
  const originalSnapshot = saveCanvasJson(canvas);

  try {
    for (let i = 0; i < doc.pages.length; i++) {
      const page = doc.pages[i];
      await loadCanvasJson(canvas, page.fabricJson);
      const dataUrl = canvas.toDataURL({
        format: doc.export.format === "jpg" ? "jpeg" : "png",
        multiplier: doc.export.multiplier
      });
      const blob = await dataUrlToBlob(dataUrl);
      const ext = doc.export.format;
      zip.file(`page-${String(i + 1).padStart(2, "0")}.${ext}`, blob);
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${doc.title.replace(/\s+/g, "-").toLowerCase()}_pages.zip`);
  } finally {
    await loadCanvasJson(canvas, originalSnapshot);
    if (activeObjectId) {
      const objectToRestore = canvas.getObjects().find((obj: any) => obj?.data?.id === activeObjectId);
      if (objectToRestore) {
        canvas.setActiveObject?.(objectToRestore);
      }
    }
    canvas.requestRenderAll?.();
  }
};
