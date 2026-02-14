import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, Strikethrough, Underline } from "lucide-react";
import { useState } from "react";

export function TextInspector() {
  const [, setTick] = useState(0);
  const canvas = (window as any).__editorCanvas;
  const obj = canvas?.getActiveObject() as any;

  const mutate = (fn: () => void) => {
    if (!obj) return;
    fn();
    canvas?.renderAll();
    setTick((v) => v + 1);
  };

  const setTextAlign = (value: "left" | "center" | "right" | "justify") => {
    mutate(() => obj.set("textAlign", value));
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Text</h3>

      <div className="grid grid-cols-4 gap-1">
        <button className={`rounded border p-2 ${obj?.fontWeight >= 700 ? "bg-slate-100" : ""}`} onClick={() => mutate(() => obj.set("fontWeight", obj.fontWeight >= 700 ? 400 : 700))}><Bold size={14} /></button>
        <button className={`rounded border p-2 ${obj?.fontStyle === "italic" ? "bg-slate-100" : ""}`} onClick={() => mutate(() => obj.set("fontStyle", obj.fontStyle === "italic" ? "normal" : "italic"))}><Italic size={14} /></button>
        <button className={`rounded border p-2 ${obj?.underline ? "bg-slate-100" : ""}`} onClick={() => mutate(() => obj.set("underline", !obj.underline))}><Underline size={14} /></button>
        <button className={`rounded border p-2 ${obj?.linethrough ? "bg-slate-100" : ""}`} onClick={() => mutate(() => obj.set("linethrough", !obj.linethrough))}><Strikethrough size={14} /></button>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-600">Font size</label>
        <input
          type="number"
          defaultValue={obj?.fontSize || 48}
          className="w-full rounded border p-2"
          onChange={(e) => mutate(() => obj.set("fontSize", Number(e.target.value)))}
        />
      </div>

      <div className="grid grid-cols-4 gap-1">
        <button className={`rounded border p-2 ${obj?.textAlign === "left" ? "bg-slate-100" : ""}`} onClick={() => setTextAlign("left")}><AlignLeft size={14} /></button>
        <button className={`rounded border p-2 ${obj?.textAlign === "center" ? "bg-slate-100" : ""}`} onClick={() => setTextAlign("center")}><AlignCenter size={14} /></button>
        <button className={`rounded border p-2 ${obj?.textAlign === "right" ? "bg-slate-100" : ""}`} onClick={() => setTextAlign("right")}><AlignRight size={14} /></button>
        <button className={`rounded border p-2 ${obj?.textAlign === "justify" ? "bg-slate-100" : ""}`} onClick={() => setTextAlign("justify")}><AlignJustify size={14} /></button>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-600">Line height</label>
        <input
          type="number"
          step="0.1"
          min="0.5"
          defaultValue={obj?.lineHeight ?? 1.16}
          className="w-full rounded border p-2"
          onChange={(e) => mutate(() => obj.set("lineHeight", Number(e.target.value)))}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-600">Letter spacing</label>
        <input
          type="number"
          step="10"
          defaultValue={obj?.charSpacing ?? 0}
          className="w-full rounded border p-2"
          onChange={(e) => mutate(() => obj.set("charSpacing", Number(e.target.value)))}
        />
      </div>
    </div>
  );
}
