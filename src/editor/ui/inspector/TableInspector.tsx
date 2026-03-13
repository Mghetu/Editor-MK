export function TableInspector() {
  const obj = (window as any).__editorCanvas?.getActiveObject() as any;
  return (
    <div className="space-y-1 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3 text-slate-200">
      <h3 className="mb-2 font-semibold text-slate-100">Table</h3>
      <p>Rows: {obj?.table?.rows ?? "-"}</p>
      <p>Columns: {obj?.table?.cols ?? "-"}</p>
    </div>
  );
}
