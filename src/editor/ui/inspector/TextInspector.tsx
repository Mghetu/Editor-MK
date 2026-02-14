export function TextInspector() {
  const obj = (window as any).__editorCanvas?.getActiveObject();
  return (
    <div>
      <h3 className="mb-2 font-semibold">Text</h3>
      <label className="block">Font size</label>
      <input type="number" defaultValue={obj?.fontSize || 48} className="w-full rounded border p-1" onChange={(e) => { obj?.set("fontSize", Number(e.target.value)); (window as any).__editorCanvas?.renderAll(); }} />
    </div>
  );
}
