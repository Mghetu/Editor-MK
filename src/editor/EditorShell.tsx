import { useEffect, useState } from "react";
import { CanvasStage, type StageApi } from "./CanvasStage";
import { bindHotkeys } from "./hotkeys";
import { LeftSidebar } from "./ui/LeftSidebar";
import { RightInspector } from "./ui/RightInspector";
import { TopBar } from "./ui/TopBar";
import { Footer } from "./ui/Footer";
import { Toolbar } from "./ui/Toolbar";
import { useEditorStore } from "./state/useEditorStore";
import { setActivePageByOffset } from "./features/pages/pagesController";
import { inferSelectionType } from "./engine/selection";

const readCanvasSelection = (canvas: any) => {
  const active = canvas?.getActiveObject?.() as any;
  const target = String(active?.type ?? "").toLowerCase() === "activeselection" && Array.isArray(active?._objects) && active._objects.length === 1
    ? active._objects[0]
    : active;

  const type = inferSelectionType(target);
  const id = (target?.data?.id ?? target?.id) as string | undefined;
  return { id, type };
};

export function EditorShell() {
  const [stage, setStage] = useState<StageApi | null>(null);
  const [historyState, setHistoryState] = useState<{ canUndo: boolean; canRedo: boolean; lastLabel?: string }>({
    canUndo: false,
    canRedo: false
  });
  const { activeTab, updateDoc, setSelection } = useEditorStore();

  const syncSelectionFromCanvas = () => {
    const canvas = stage?.canvas ?? (window as any).__editorCanvas;
    if (!canvas) {
      setSelection(undefined, undefined);
      return;
    }
    const { id, type } = readCanvasSelection(canvas);
    setSelection(id, type);
  };

  useEffect(() => {
    if (!stage) return;
    (window as any).__editorCanvas = stage.canvas;
    const off = bindHotkeys({
      undo: async () => {
        await (stage.commandHistory ? stage.commandHistory.undo() : stage.history.undo());
        syncSelectionFromCanvas();
      },
      redo: async () => {
        await (stage.commandHistory ? stage.commandHistory.redo() : stage.history.redo());
        syncSelectionFromCanvas();
      },
      prevPage: () => updateDoc((doc) => setActivePageByOffset(doc, -1)),
      nextPage: () => updateDoc((doc) => setActivePageByOffset(doc, 1))
    });
    return off;
  }, [stage, updateDoc]);

  const leftWidth = activeTab === "select" ? "74px" : "360px";

  useEffect(() => {
    if (!stage?.commandHistory) {
      setHistoryState({ canUndo: true, canRedo: true, lastLabel: undefined });
      return;
    }
    return stage.commandHistory.subscribe((state) => {
      setHistoryState({ canUndo: state.canUndo, canRedo: state.canRedo, lastLabel: state.lastLabel });
    });
  }, [stage]);

  return (
    <div className="grid h-full grid-rows-[56px_44px_1fr] bg-[#121212] text-slate-100">
      <TopBar
        canUndo={historyState.canUndo}
        canRedo={historyState.canRedo}
        lastActionLabel={historyState.lastLabel}
        undo={() => {
          if (!stage) return;
          void (async () => {
            await (stage.commandHistory ? stage.commandHistory.undo() : stage.history.undo());
            syncSelectionFromCanvas();
          })();
        }}
        redo={() => {
          if (!stage) return;
          void (async () => {
            await (stage.commandHistory ? stage.commandHistory.redo() : stage.history.redo());
            syncSelectionFromCanvas();
          })();
        }}
      />
      <Toolbar />
      <div className="grid h-full" style={{ gridTemplateColumns: `${leftWidth} 1fr 300px` }}>
        <LeftSidebar />
        <div className="grid h-full grid-rows-[1fr_48px]">
          <CanvasStage onReady={setStage} />
          <Footer />
        </div>
        <RightInspector />
      </div>
    </div>
  );
}
