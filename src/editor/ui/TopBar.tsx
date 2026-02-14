import { ChevronDown, Download, Redo2, Undo2 } from "lucide-react";
import { exportCurrentPage } from "../engine/export/exportPage";
import { exportAllPagesZip } from "../engine/export/exportZip";
import { useEditorStore } from "../state/useEditorStore";

export function TopBar({ undo, redo }: { undo: () => void; redo: () => void }) {
  const { doc, setExportFormat } = useEditorStore();

  return (
    <div className="flex h-14 items-center gap-2 border-b bg-white px-4">
      <div className="text-sm font-semibold text-slate-800">Editor MK</div>
      <button className="rounded px-3 py-1.5 text-sm hover:bg-slate-100" onClick={() => location.reload()}>
        File <ChevronDown size={14} className="ml-1 inline" />
      </button>

      <div className="mx-1 h-6 w-px bg-slate-200" />

      <button className="rounded p-2 hover:bg-slate-100" onClick={undo} title="Undo"><Undo2 size={16} /></button>
      <button className="rounded p-2 hover:bg-slate-100" onClick={redo} title="Redo"><Redo2 size={16} /></button>

      <div className="ml-auto flex items-center gap-2 text-sm">
        <button className={`rounded border px-2 py-1 ${doc.export.format === "png" ? "bg-slate-900 text-white" : ""}`} onClick={() => setExportFormat("png")}>PNG</button>
        <button className={`rounded border px-2 py-1 ${doc.export.format === "jpg" ? "bg-slate-900 text-white" : ""}`} onClick={() => setExportFormat("jpg")}>JPG</button>
        <button
          className="rounded bg-sky-600 px-3 py-1 text-white"
          onClick={() => exportCurrentPage((window as any).__editorCanvas, doc.export.format, doc.export.multiplier, doc.pages.find((p) => p.id === doc.activePageId)?.name || "page")}
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
