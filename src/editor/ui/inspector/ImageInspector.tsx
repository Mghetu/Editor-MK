import { useEditorStore } from "../../state/useEditorStore";
import { exportSelectedImage } from "../../engine/export/exportImage";

export function ImageInspector() {
  const { doc } = useEditorStore();

  const canvas = (window as any).__editorCanvas;
  const image = canvas?.getActiveObject() as any;
  const selectedImage = image?.data?.type === "image" ? image : null;

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
      />
      <button
        className="rounded border px-3 py-1"
        disabled={!selectedImage || selectedImage?.data?.type !== "image"}
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
