import { Copy, MoveDown, MoveUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { addPage, deletePage, duplicateActivePage, movePage } from "../../features/pages/pagesController";
import { useEditorStore } from "../../state/useEditorStore";

export function PagesPanel() {
  const { doc, updateDoc } = useEditorStore();
  const activeCardRef = useRef<HTMLDivElement | null>(null);

  const switchTo = (id: string) => {
    if (id === doc.activePageId) return;
    updateDoc((state) => ({ ...state, activePageId: id }));
  };

  useEffect(() => {
    activeCardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [doc.activePageId]);

  return (
    <div className="space-y-3 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-100">Pages</h3>
        <button className="inline-flex items-center gap-1 rounded border border-[#555] bg-[#252525] px-2 py-1 text-xs text-slate-100 hover:bg-[#333]" onClick={() => updateDoc(addPage)}>
          <Plus size={12} /> Add page
        </button>
      </div>

      <div className="max-h-[calc(100vh-180px)] space-y-2 overflow-auto pr-1">
        {doc.pages.map((p, index) => {
          const active = p.id === doc.activePageId;
          const thumb = p.thumbnail;

          return (
            <div key={p.id} className="space-y-2" ref={active ? activeCardRef : undefined}>
              <button
                className={`w-full rounded border bg-[#252525] p-2 text-left transition ${active ? "border-violet-500 ring-2 ring-violet-300/40" : "border-[#555] hover:border-[#666]"}`}
                onClick={() => switchTo(p.id)}
              >
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{index + 1}. {p.name}</span>
                  {active && <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300">Active</span>}
                </div>

                <div className="relative aspect-video w-full overflow-hidden rounded bg-[#2f2f2f]">
                  {thumb ? (
                    <img src={thumb} alt={p.name} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">No preview yet</div>
                  )}
                </div>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button className="inline-flex items-center gap-1 rounded border border-[#555] bg-[#252525] px-2 py-1 text-xs text-slate-100 hover:bg-[#333] disabled:opacity-40" onClick={() => updateDoc((d) => movePage(d, p.id, "up"))} disabled={index === 0}>
                  <MoveUp size={12} /> Up
                </button>
                <button className="inline-flex items-center gap-1 rounded border border-[#555] bg-[#252525] px-2 py-1 text-xs text-slate-100 hover:bg-[#333] disabled:opacity-40" onClick={() => updateDoc((d) => movePage(d, p.id, "down"))} disabled={index === doc.pages.length - 1}>
                  <MoveDown size={12} /> Down
                </button>
                <button className="inline-flex items-center gap-1 rounded border border-[#555] bg-[#252525] px-2 py-1 text-xs text-slate-100 hover:bg-[#333]" onClick={() => {
                  if (!active) switchTo(p.id);
                  updateDoc(duplicateActivePage);
                }}>
                  <Copy size={12} /> Duplicate
                </button>
                <button className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-[#252525] px-2 py-1 text-xs text-rose-400 hover:bg-[#333]" onClick={() => updateDoc((d) => deletePage(d, p.id))}>
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
