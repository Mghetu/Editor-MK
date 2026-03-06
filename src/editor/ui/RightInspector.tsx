import { useEffect, useRef, useState } from "react";
import { inferSelectionType } from "../engine/selection";
import { useEditorStore } from "../state/useEditorStore";
import { ImageInspector } from "./inspector/ImageInspector";
import { ObjectContextMenu } from "./inspector/ObjectContextMenu";
import { ShapeInspector } from "./inspector/ShapeInspector";
import { TableInspector } from "./inspector/TableInspector";
import { TextInspector } from "./inspector/TextInspector";
import { ImageGridInspector } from "./inspector/ImageGridInspector";
import { AutoLayoutInspector } from "./inspector/AutoLayoutInspector";

export function RightInspector() {
  const { selectedObjectType } = useEditorStore();
  const [tick, setTick] = useState(0);
  const unbindRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const bindIfReady = () => {
      if (unbindRef.current) return true;
      const canvas = (window as any).__editorCanvas;
      if (!canvas) return false;

      const refresh = () => setTick((v) => v + 1);
      canvas.on("selection:created", refresh);
      canvas.on("selection:updated", refresh);
      canvas.on("selection:cleared", refresh);
      canvas.on("object:modified", refresh);
      canvas.on("object:added", refresh);
      canvas.on("object:removed", refresh);

      unbindRef.current = () => {
        canvas.off("selection:created", refresh);
        canvas.off("selection:updated", refresh);
        canvas.off("selection:cleared", refresh);
        canvas.off("object:modified", refresh);
        canvas.off("object:added", refresh);
        canvas.off("object:removed", refresh);
        unbindRef.current = null;
      };
      return true;
    };

    if (bindIfReady()) return () => unbindRef.current?.();

    const interval = window.setInterval(() => {
      if (bindIfReady()) {
        window.clearInterval(interval);
      }
    }, 100);

    return () => {
      window.clearInterval(interval);
      unbindRef.current?.();
    };
  }, []);

  void tick;
  const canvas = (window as any).__editorCanvas;
  const active = canvas?.getActiveObject?.() as any;
  const inferredType = inferSelectionType(active);
  const effectiveType = selectedObjectType ?? inferredType;

  return (
    <div className="h-full border-l border-[#313131] bg-[#1f1f1f] p-3 text-sm text-slate-200">
      {!effectiveType && <p className="text-slate-400">Select an object to edit</p>}
      {effectiveType && <ObjectContextMenu />}

      <div className="mt-4">
        {effectiveType === "text" && <TextInspector />}
        {effectiveType === "image" && <ImageInspector />}
        {effectiveType === "table" && <TableInspector />}
        {effectiveType === "shape" && <ShapeInspector />}
        {effectiveType === "imageGrid" && <ImageGridInspector />}
        {effectiveType === "autoLayout" && <AutoLayoutInspector />}
      </div>
    </div>
  );
}
