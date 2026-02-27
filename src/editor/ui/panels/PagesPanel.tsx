import { addPage, deletePage, duplicateActivePage } from "../../features/pages/pagesController";
import { useEditorStore } from "../../state/useEditorStore";

export function PagesPanel() {
  const { doc, updateDoc } = useEditorStore();

  const switchTo = (id: string) => {
    if (id === doc.activePageId) return;
    updateDoc((state) => ({ ...state, activePageId: id }));
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
