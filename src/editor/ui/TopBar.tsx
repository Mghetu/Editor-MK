import { Download, Redo2, Undo2 } from "lucide-react";
import { exportCurrentPage } from "../engine/export/exportPage";
import { exportAllPagesZip } from "../engine/export/exportZip";
import { useEditorStore } from "../state/useEditorStore";

export function TopBar({ undo, redo }: { undo: () => void; redo: () => void }) {
  const { doc, setExportFormat } = useEditorStore();

  return (
    <div className="flex h-14 items-center gap-2 border-b bg-white px-3">
      <button className="rounded bg-slate-900 px-3 py-1 text-white" onClick={() => location.reload()}>New</button>
      <button className="rounded border px-2 py-1" onClick={undo}><Undo2 size={16} /></button>
      <button className="rounded border px-2 py-1" onClick={redo}><Redo2 size={16} /></button>
      <div className="ml-auto flex items-center gap-2 text-sm">
        <button className="rounded border px-2 py-1" onClick={() => setExportFormat("png")}>PNG</button>
        <button className="rounded border px-2 py-1" onClick={() => setExportFormat("jpg")}>JPG</button>
        <button
          className="rounded bg-sky-600 px-3 py-1 text-white"
          onClick={() => exportCurrentPage((window as any).__editorCanvas, doc.export.format, doc.export.multiplier, doc.pages.find(p=>p.id===doc.activePageId)?.name || "page")}
        >
          <Download size={14} className="mr-1 inline" /> Export
        </button>
        <button className="rounded bg-indigo-600 px-3 py-1 text-white" onClick={() => exportAllPagesZip((window as any).__editorCanvas, doc)}>
          Export ZIP
        </button>
      </div>
    </div>
  );
}
