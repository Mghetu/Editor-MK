import { addText } from "../../engine/factories/addText";

export function TextPanel() {
  return (
    <div>
      <h3 className="mb-2 font-semibold">Text</h3>
      <button className="rounded border px-3 py-1" onClick={() => addText((window as any).__editorCanvas)}>Add text</button>
    </div>
  );
}
