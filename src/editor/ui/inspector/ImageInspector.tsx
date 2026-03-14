import { useEffect, useMemo, useRef, useState } from "react";
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
  const [cropImage, setCropImage] = useState<any>(null);
  const [cropActive, setCropActive] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<number | null>(null);
  const [customWidth, setCustomWidth] = useState("16");
  const [customHeight, setCustomHeight] = useState("9");
  const [cropZoom, setCropZoom] = useState(100);

  const cropControllerRef = useRef<CropModeController | null>(null);
  const cropController = useMemo(() => {
    if (!canvas) {
      cropControllerRef.current = null;
      return null;
    }

    let controller: CropModeController;
    controller = new CropModeController(canvas, () => {
      const active = controller.isActive();
      setCropActive(active);
      if (!active) {
        setCropImage(null);
        setSelectedImage(getActiveImage(canvas));
      }
    });

    cropControllerRef.current = controller;
    return controller;
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;

    const sync = () => {
      const activeImage = getActiveImage(canvas);
      setSelectedImage((prev: any) => {
        if (cropActive && !activeImage) return prev;
        return activeImage;
      });
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
  }, [canvas, selectedObjectType, cropActive]);

  useEffect(() => {
    if (!selectedImage && !cropImage && cropActive) {
      cropController?.cancel();
      setCropActive(false);
    }
  }, [selectedImage, cropImage, cropActive, cropController]);

  const onStartCrop = () => {
    if (!selectedImage || !cropController) return;
    setCropImage(selectedImage);
    const existing = (selectedImage.cropState ?? selectedImage.__cropState ?? null) as { aspect?: number | null } | null;
    setSelectedAspect(existing?.aspect ?? null);
    cropController.enter(selectedImage);
    cropController.setCropZoomPercent(100);
    setCropZoom(100);
    setCropActive(true);
  };

  const onCancelCrop = () => {
    if (!cropController) return;
    cropController.cancel();
    setCropActive(false);
    setCropImage(null);
    setSelectedImage(getActiveImage(canvas));
  };

  const onApplyCrop = () => {
    if (!cropController) return;
    cropController.apply();
    setCropActive(false);
    setCropImage(null);
    setSelectedImage(getActiveImage(canvas));
  };

  const onApplyCropPermanently = async () => {
    if (!cropController) return;
    await cropController.applyPermanently();
    setCropActive(false);
    setCropImage(null);
    setSelectedImage(getActiveImage(canvas));
  };

  const onPreset = (aspect: number | null) => {
    setSelectedAspect(aspect);
    cropController?.setPreset(aspect);
  };

  const onApplyCustomAspect = () => {
    const w = Math.max(1, Number(customWidth) || 1);
    const h = Math.max(1, Number(customHeight) || 1);
    const next = w / h;
    onPreset(next);
  };

  const onCropZoomChange = (value: number) => {
    setCropZoom(value);
    cropController?.setCropZoomPercent(value);
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="font-semibold text-slate-100">Image</h3>
      {(selectedImage || cropImage) && (
        <CropPanel
          active={cropActive}
          selectedAspect={selectedAspect}
          rotationNormalized={cropController?.isRotationNormalizedForCrop()}
          onStart={onStartCrop}
          onPreset={onPreset}
          onApply={onApplyCrop}
          onApplyPermanently={onApplyCropPermanently}
          onCancel={onCancelCrop}
        />
      )}

      {cropActive && (
        <div className="space-y-2 rounded border border-[#3a3a3a] bg-[#181818] p-2">
          <div className="text-xs text-slate-300">
            Drag image inside crop frame to reposition. Use <strong>Apply Crop</strong>, <strong>Exit Crop Mode</strong>, or keyboard shortcuts <strong>Enter/Esc</strong>.
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span>Zoomed crop viewport</span>
              <span>{cropZoom}%</span>
            </div>
            <input
              className="w-full"
              type="range"
              min={50}
              max={300}
              step={5}
              value={cropZoom}
              onChange={(e) => onCropZoomChange(Number(e.target.value))}
            />
          </div>
          <div className="text-xs text-slate-400">Custom ratio</div>
          <div className="flex items-center gap-2">
            <input
              className="w-16 rounded border border-[#555] bg-[#121212] px-2 py-1 text-xs text-slate-100"
              inputMode="numeric"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
            />
            <span className="text-slate-400">:</span>
            <input
              className="w-16 rounded border border-[#555] bg-[#121212] px-2 py-1 text-xs text-slate-100"
              inputMode="numeric"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
            />
            <button className="rounded border border-[#555] bg-[#252525] px-2 py-1 text-xs hover:bg-[#333]" onClick={onApplyCustomAspect}>
              Set
            </button>
          </div>
        </div>
      )}

      <button
        className="rounded border border-[#555] bg-[#252525] px-3 py-1 text-slate-100 hover:bg-[#333]"
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
