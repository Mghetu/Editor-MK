import { applyObjectProperties } from "../../engine/history/mutator";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, Strikethrough, Underline } from "lucide-react";
import { useState } from "react";

export function TextInspector() {
  const [, setTick] = useState(0);
  const canvas = (window as any).__editorCanvas;
  const obj = canvas?.getActiveObject() as any;

  const mutate = (values: Record<string, unknown>, label = "Edit text") => {
    if (!obj) return;
    void applyObjectProperties(canvas, obj, values, label);
    setTick((v) => v + 1);
  };

  const setTextAlign = (value: "left" | "center" | "right" | "justify") => {
    mutate({ textAlign: value }, "Set text align");
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="font-semibold text-slate-100">Text</h3>

      <div className="grid grid-cols-4 gap-1">
        <button className={`rounded border border-[#555] p-2 ${obj?.fontWeight >= 700 ? "bg-[#3a3a3a]" : "bg-[#252525]"}`} onClick={() => mutate({ fontWeight: obj.fontWeight >= 700 ? 400 : 700 }, "Toggle bold")}><Bold size={14} /></button>
        <button className={`rounded border border-[#555] p-2 ${obj?.fontStyle === "italic" ? "bg-[#3a3a3a]" : "bg-[#252525]"}`} onClick={() => mutate({ fontStyle: obj.fontStyle === "italic" ? "normal" : "italic" }, "Toggle italic")}><Italic size={14} /></button>
        <button className={`rounded border border-[#555] p-2 ${obj?.underline ? "bg-[#3a3a3a]" : "bg-[#252525]"}`} onClick={() => mutate({ underline: !obj.underline }, "Toggle underline")}><Underline size={14} /></button>
        <button className={`rounded border border-[#555] p-2 ${obj?.linethrough ? "bg-[#3a3a3a]" : "bg-[#252525]"}`} onClick={() => mutate({ linethrough: !obj.linethrough }, "Toggle strikethrough")}><Strikethrough size={14} /></button>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Font size</label>
        <input
          type="number"
          defaultValue={obj?.fontSize || 48}
          className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
          onChange={(e) => mutate({ fontSize: Number(e.target.value) }, "Set font size")}
        />
      </div>

      <div className="grid grid-cols-4 gap-1">
        <button className={`rounded border border-[#555] p-2 ${obj?.textAlign === "left" ? "bg-[#3a3a3a]" : "bg-[#252525]"}`} onClick={() => setTextAlign("left")}><AlignLeft size={14} /></button>
        <button className={`rounded border border-[#555] p-2 ${obj?.textAlign === "center" ? "bg-[#3a3a3a]" : "bg-[#252525]"}`} onClick={() => setTextAlign("center")}><AlignCenter size={14} /></button>
        <button className={`rounded border border-[#555] p-2 ${obj?.textAlign === "right" ? "bg-[#3a3a3a]" : "bg-[#252525]"}`} onClick={() => setTextAlign("right")}><AlignRight size={14} /></button>
        <button className={`rounded border border-[#555] p-2 ${obj?.textAlign === "justify" ? "bg-[#3a3a3a]" : "bg-[#252525]"}`} onClick={() => setTextAlign("justify")}><AlignJustify size={14} /></button>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Line height</label>
        <input
          type="number"
          step="0.1"
          min="0.5"
          defaultValue={obj?.lineHeight ?? 1.16}
          className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
          onChange={(e) => mutate({ lineHeight: Number(e.target.value) }, "Set line height")}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Letter spacing</label>
        <input
          type="number"
          step="10"
          defaultValue={obj?.charSpacing ?? 0}
          className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
          onChange={(e) => mutate({ charSpacing: Number(e.target.value) }, "Set letter spacing")}
        />
      </div>
    </div>
  );
}
