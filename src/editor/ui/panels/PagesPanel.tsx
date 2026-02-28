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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Pages</h3>
        <button className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs" onClick={() => updateDoc(addPage)}>
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
                className={`w-full rounded border bg-white p-2 text-left transition ${active ? "border-sky-500 ring-2 ring-sky-200" : "border-slate-200 hover:border-slate-300"}`}
                onClick={() => switchTo(p.id)}
              >
                <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                  <span>{index + 1}. {p.name}</span>
                  {active && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-700">Active</span>}
                </div>

                <div className="relative aspect-video w-full overflow-hidden rounded bg-slate-100">
                  {thumb ? (
                    <img src={thumb} alt={p.name} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">No preview yet</div>
                  )}
                </div>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs" onClick={() => updateDoc((d) => movePage(d, p.id, "up"))} disabled={index === 0}>
                  <MoveUp size={12} /> Up
                </button>
                <button className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs" onClick={() => updateDoc((d) => movePage(d, p.id, "down"))} disabled={index === doc.pages.length - 1}>
                  <MoveDown size={12} /> Down
                </button>
                <button className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs" onClick={() => {
                  if (!active) switchTo(p.id);
                  updateDoc(duplicateActivePage);
                }}>
                  <Copy size={12} /> Duplicate
                </button>
                <button className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-rose-600" onClick={() => updateDoc((d) => deletePage(d, p.id))}>
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
