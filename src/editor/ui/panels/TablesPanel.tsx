import { addTable } from "../../engine/factories/addTable";

export function TablesPanel() {
  return (
    <div className="space-y-2 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="mb-2 font-semibold text-slate-100">Tables</h3>
      <button className="rounded border border-[#555] bg-[#252525] px-3 py-1 text-slate-100 hover:bg-[#333]" onClick={() => { void addTable((window as any).__editorCanvas, 3, 3); }}>Add 3x3 table</button>
    </div>
  );
}
