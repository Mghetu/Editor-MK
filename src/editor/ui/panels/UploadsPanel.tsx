import { addImageFromFile } from "../../engine/factories/addImage";

export function UploadsPanel() {
  return (
    <div className="space-y-2 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="mb-2 font-semibold text-slate-100">Uploads</h3>
      <input className="w-full rounded border border-[#555] bg-[#141414] p-2 text-sm text-slate-200 file:mr-2 file:rounded file:border-0 file:bg-violet-600 file:px-2 file:py-1 file:text-white" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && addImageFromFile((window as any).__editorCanvas, e.target.files[0])} />
    </div>
  );
}
