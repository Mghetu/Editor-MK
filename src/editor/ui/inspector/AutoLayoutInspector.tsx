import { updateSelectedAutoLayout, type AutoLayoutData } from "../../features/autoLayout";

const getActiveAutoLayout = (): AutoLayoutData | null => {
  const canvas = (window as any).__editorCanvas;
  const obj = canvas?.getActiveObject?.() as any;
  return obj?.data?.type === "autoLayout" ? (obj.data as AutoLayoutData) : null;
};

export function AutoLayoutInspector() {
  const canvas = (window as any).__editorCanvas;
  const data = getActiveAutoLayout();
  if (!data) return null;

  const mutate = (patch: Partial<AutoLayoutData>) => updateSelectedAutoLayout(canvas, patch);

  return (
    <div className="space-y-3 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="font-semibold text-slate-100">Auto Layout</h3>

      <label className="block text-xs text-slate-300">
        Direction
        <select
          className="mt-1 w-full rounded border border-[#4a4a4a] bg-[#262626] px-2 py-1 text-sm"
          value={data.direction}
          onChange={(e) => mutate({ direction: e.target.value as AutoLayoutData["direction"] })}
        >
          <option value="row">Row</option>
          <option value="column">Column</option>
        </select>
      </label>

      <label className="block text-xs text-slate-300">
        Align
        <select
          className="mt-1 w-full rounded border border-[#4a4a4a] bg-[#262626] px-2 py-1 text-sm"
          value={data.align}
          onChange={(e) => mutate({ align: e.target.value as AutoLayoutData["align"] })}
        >
          <option value="start">Start</option>
          <option value="center">Center</option>
          <option value="end">End</option>
        </select>
      </label>

      <label className="block text-xs text-slate-300">
        Gap
        <input
          className="mt-1 w-full rounded border border-[#4a4a4a] bg-[#262626] px-2 py-1 text-sm"
          type="number"
          min={0}
          max={200}
          value={Math.round(data.gap)}
          onChange={(e) => mutate({ gap: Number(e.target.value) })}
        />
      </label>

      <label className="block text-xs text-slate-300">
        Padding
        <input
          className="mt-1 w-full rounded border border-[#4a4a4a] bg-[#262626] px-2 py-1 text-sm"
          type="number"
          min={0}
          max={240}
          value={Math.round(data.padding)}
          onChange={(e) => mutate({ padding: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}
