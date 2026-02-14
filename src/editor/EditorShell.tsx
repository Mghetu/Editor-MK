import { useEffect, useState } from "react";
import { CanvasStage, type StageApi } from "./CanvasStage";
import { bindHotkeys } from "./hotkeys";
import { LeftSidebar } from "./ui/LeftSidebar";
import { RightInspector } from "./ui/RightInspector";
import { TopBar } from "./ui/TopBar";
import { Footer } from "./ui/Footer";
import { Toolbar } from "./ui/Toolbar";
import { useEditorStore } from "./state/useEditorStore";

export function EditorShell() {
  const [stage, setStage] = useState<StageApi | null>(null);
  const { activeTab } = useEditorStore();

  useEffect(() => {
    if (!stage) return;
    (window as any).__editorCanvas = stage.canvas;
    const off = bindHotkeys({ undo: () => stage.history.undo(), redo: () => stage.history.redo() });
    return off;
  }, [stage]);

  const leftWidth = activeTab === "select" ? "74px" : "360px";

  return (
    <div className="grid h-full grid-rows-[56px_44px_1fr] bg-slate-50">
      <TopBar undo={() => stage?.history.undo()} redo={() => stage?.history.redo()} />
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
