export function TableInspector() {
  const obj = (window as any).__editorCanvas?.getActiveObject() as any;
  return (
    <div>
      <h3 className="mb-2 font-semibold">Table</h3>
      <p>Rows: {obj?.table?.rows ?? "-"}</p>
      <p>Columns: {obj?.table?.cols ?? "-"}</p>
    </div>
  );
}
