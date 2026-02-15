import { useEffect, useState } from "react";
import { useEditorStore } from "../state/useEditorStore";
import { ImageInspector } from "./inspector/ImageInspector";
import { TableInspector } from "./inspector/TableInspector";
import { TextInspector } from "./inspector/TextInspector";

type Dimensions = { width: number; height: number } | null;

const readActiveDimensions = (): Dimensions => {
  const canvas = (window as any).__editorCanvas;
  const obj = canvas?.getActiveObject?.() as any;
  if (!obj) return null;
  return {
    width: Math.max(1, Math.round(obj.getScaledWidth?.() ?? obj.width ?? 0)),
    height: Math.max(1, Math.round(obj.getScaledHeight?.() ?? obj.height ?? 0))
  };
};

export function RightInspector() {
  const { selectedObjectType } = useEditorStore();
  const [dimensions, setDimensions] = useState<Dimensions>(null);

  useEffect(() => {
    const canvas = (window as any).__editorCanvas;
    if (!canvas) return;

    const sync = () => setDimensions(readActiveDimensions());
    sync();

    canvas.on("selection:created", sync);
    canvas.on("selection:updated", sync);
    canvas.on("selection:cleared", sync);
    canvas.on("object:moving", sync);
    canvas.on("object:scaling", sync);
    canvas.on("object:modified", sync);

    return () => {
      canvas.off("selection:created", sync);
      canvas.off("selection:updated", sync);
      canvas.off("selection:cleared", sync);
      canvas.off("object:moving", sync);
      canvas.off("object:scaling", sync);
      canvas.off("object:modified", sync);
    };
  }, [selectedObjectType]);

  return (
    <div className="h-full border-l bg-white p-3 text-sm">
      {!selectedObjectType && <p className="text-slate-500">Select an object to edit</p>}
      {selectedObjectType === "text" && <TextInspector />}
      {selectedObjectType === "image" && <ImageInspector />}
      {selectedObjectType === "table" && <TableInspector />}

      <div className="mt-4 border-t pt-3">
        <h4 className="mb-1 font-semibold">Dimensions</h4>
        {dimensions ? (
          <p className="text-slate-700">
            W: {dimensions.width}px · H: {dimensions.height}px
          </p>
        ) : (
          <p className="text-slate-500">No object selected</p>
        )}
      </div>
    </div>
  );
}
