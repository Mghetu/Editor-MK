import { addPage, deletePage, duplicateActivePage } from "../../features/pages/pagesController";
import { loadCanvasJson, saveCanvasJson } from "../../engine/serialize";
import { useEditorStore } from "../../state/useEditorStore";

export function PagesPanel() {
  const { doc, updateDoc } = useEditorStore();
  const saveCurrent = () => {
    const canvas = (window as any).__editorCanvas;
    const json = saveCanvasJson(canvas);
    updateDoc((d) => ({ ...d, pages: d.pages.map((p) => (p.id === d.activePageId ? { ...p, fabricJson: json } : p)) }));
  };

  const switchTo = async (id: string) => {
    saveCurrent();
    updateDoc((d) => ({ ...d, activePageId: id }));
    const next = useEditorStore.getState().doc.pages.find((p) => p.id === id);
    if (next) await loadCanvasJson((window as any).__editorCanvas, next.fabricJson);
  };

  return (
    <div>
      <h3 className="mb-2 font-semibold">Pages</h3>
      <div className="mb-2 flex gap-2">
        <button className="rounded border px-2 py-1" onClick={() => updateDoc(addPage)}>Add</button>
        <button className="rounded border px-2 py-1" onClick={() => updateDoc(duplicateActivePage)}>Duplicate</button>
      </div>
      {doc.pages.map((p) => (
        <div key={p.id} className="mb-2 flex items-center justify-between rounded border p-2">
          <button onClick={() => switchTo(p.id)} className="text-left">{p.name}</button>
          <button onClick={() => updateDoc((d) => deletePage(d, p.id))}>x</button>
        </div>
      ))}
    </div>
  );
}
