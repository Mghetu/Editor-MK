import { createAutoLayoutFromSelection } from "../../features/autoLayout";

export function AutoLayoutPanel() {
  const canvas = (window as any).__editorCanvas;

  return (
    <div className="space-y-2 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="font-semibold text-slate-100">Auto Layout</h3>
      <p className="text-xs text-slate-400">Select 2+ objects and convert them into an auto layout group.</p>
      <button
        className="w-full rounded border border-[#555] bg-[#252525] px-3 py-2 text-left text-slate-100 hover:bg-[#333]"
        onClick={() => createAutoLayoutFromSelection(canvas)}
      >
        Create from selection
      </button>
    </div>
  );
}
