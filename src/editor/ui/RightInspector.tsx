import { useEditorStore } from "../state/useEditorStore";
import { ImageInspector } from "./inspector/ImageInspector";
import { ObjectContextMenu } from "./inspector/ObjectContextMenu";
import { ShapeInspector } from "./inspector/ShapeInspector";
import { TableInspector } from "./inspector/TableInspector";
import { TextInspector } from "./inspector/TextInspector";

export function RightInspector() {
  const { selectedObjectType } = useEditorStore();

  return (
    <div className="h-full border-l bg-white p-3 text-sm">
      {!selectedObjectType && <p className="text-slate-500">Select an object to edit</p>}
      {selectedObjectType && <ObjectContextMenu />}

      <div className="mt-4">
        {selectedObjectType === "text" && <TextInspector />}
        {selectedObjectType === "image" && <ImageInspector />}
        {selectedObjectType === "table" && <TableInspector />}
        {selectedObjectType === "shape" && <ShapeInspector />}
      </div>
    </div>
  );
}
