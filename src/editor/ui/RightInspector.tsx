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

  return (
    <div className="h-full border-l border-[#313131] bg-[#1f1f1f] p-3 text-sm text-slate-200">
      {!selectedObjectType && <p className="text-slate-400">Select an object to edit</p>}
      {selectedObjectType && <ObjectContextMenu />}

      <div className="mt-4">
        {selectedObjectType === "text" && <TextInspector />}
        {selectedObjectType === "image" && <ImageInspector />}
        {selectedObjectType === "table" && <TableInspector />}
        {selectedObjectType === "shape" && <ShapeInspector />}
        {selectedObjectType === "imageGrid" && <ImageGridInspector />}
        {selectedObjectType === "autoLayout" && <AutoLayoutInspector />}
      </div>
    </div>
  );
}
