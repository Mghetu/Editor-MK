import { addImageFromFile } from "../../engine/factories/addImage";

export function UploadsPanel() {
  return (
    <div>
      <h3 className="mb-2 font-semibold">Uploads</h3>
      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && addImageFromFile((window as any).__editorCanvas, e.target.files[0])} />
    </div>
  );
}
