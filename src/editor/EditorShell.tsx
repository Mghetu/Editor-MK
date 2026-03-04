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

export function EditorShell() {
  const [stage, setStage] = useState<StageApi | null>(null);
  const [historyState, setHistoryState] = useState<{ canUndo: boolean; canRedo: boolean; lastLabel?: string }>({
    canUndo: false,
    canRedo: false
  });
  const { activeTab, updateDoc } = useEditorStore();

  useEffect(() => {
    if (!stage) return;
    (window as any).__editorCanvas = stage.canvas;
    const off = bindHotkeys({
      undo: () => (stage.commandHistory ? stage.commandHistory.undo() : stage.history.undo()),
      redo: () => (stage.commandHistory ? stage.commandHistory.redo() : stage.history.redo()),
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
          void (stage.commandHistory ? stage.commandHistory.undo() : stage.history.undo());
        }}
        redo={() => {
          if (!stage) return;
          void (stage.commandHistory ? stage.commandHistory.redo() : stage.history.redo());
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
