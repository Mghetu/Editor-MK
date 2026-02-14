import { addTable } from "../../engine/factories/addTable";

export function TablesPanel() {
  return (
    <div>
      <h3 className="mb-2 font-semibold">Tables</h3>
      <button className="rounded border px-3 py-1" onClick={() => addTable((window as any).__editorCanvas, 3, 3)}>Add 3x3 table</button>
    </div>
  );
}
