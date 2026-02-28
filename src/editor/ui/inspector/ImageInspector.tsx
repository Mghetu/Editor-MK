import { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "../../state/useEditorStore";
import { exportSelectedImage } from "../../engine/export/exportImage";
import { CropModeController } from "../../features/crop/CropModeController";
import { CropPanel } from "../CropPanel";

const getActiveImage = (canvas: any) => {
  const active = canvas?.getActiveObject?.() as any;
  return active?.data?.type === "image" ? active : null;
};

export function ImageInspector() {
  const { doc, selectedObjectType } = useEditorStore();
  const canvas = (window as any).__editorCanvas;
  const [selectedImage, setSelectedImage] = useState<any>(() => getActiveImage(canvas));
  const [cropActive, setCropActive] = useState(false);

  const cropController = useMemo(() => {
    if (!canvas) return null;
    return new CropModeController(canvas, () => setCropActive(false));
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;

    const sync = () => {
      setSelectedImage(getActiveImage(canvas));
    };

    sync();
    canvas.on("selection:created", sync);
    canvas.on("selection:updated", sync);
    canvas.on("selection:cleared", sync);

    return () => {
      canvas.off("selection:created", sync);
      canvas.off("selection:updated", sync);
      canvas.off("selection:cleared", sync);
    };
  }, [canvas, selectedObjectType]);

  useEffect(() => {
    if (!selectedImage && cropActive) {
      cropController?.cancel();
      setCropActive(false);
    }
  }, [selectedImage, cropActive, cropController]);

  const onStartCrop = () => {
    if (!selectedImage || !cropController) return;
    cropController.enter(selectedImage);
    setCropActive(true);
  };

  const onCancelCrop = () => {
    if (!cropController) return;
    cropController.cancel();
    setCropActive(false);
    setSelectedImage(getActiveImage(canvas));
  };

  const onApplyCrop = () => {
    if (!cropController) return;
    cropController.apply();
    setCropActive(false);
    setSelectedImage(getActiveImage(canvas));
  };

  const onPreset = (aspect: number | null) => {
    cropController?.setPreset(aspect);
  };

  return (
    <div>
      <h3 className="mb-2 font-semibold">Image</h3>
      <label className="mb-1 block text-xs">Opacity</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={selectedImage?.opacity ?? 1}
        className="mb-3 w-full"
        onChange={(e) => {
          selectedImage?.set("opacity", Number(e.target.value));
          canvas?.renderAll();
        }}
        disabled={cropActive}
      />

      {selectedImage && <CropPanel active={cropActive} onStart={onStartCrop} onPreset={onPreset} onApply={onApplyCrop} onCancel={onCancelCrop} />}

      <button
        className="mt-2 rounded border px-3 py-1"
        disabled={!selectedImage || cropActive}
        onClick={async () => {
          try {
            await exportSelectedImage(selectedImage, doc.export.format, doc.export.multiplier, selectedImage?.data?.name || "image");
          } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to export image.");
          }
        }}
      >
        Export Image
      </button>
    </div>
  );
}
