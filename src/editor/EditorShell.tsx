import { useEffect, useState } from "react";
import { CanvasStage, type StageApi } from "./CanvasStage";
import { bindHotkeys } from "./hotkeys";
import { LeftSidebar } from "./ui/LeftSidebar";
import { RightInspector } from "./ui/RightInspector";
import { TopBar } from "./ui/TopBar";
import { Footer } from "./ui/Footer";

export function EditorShell() {
  const [stage, setStage] = useState<StageApi | null>(null);

  useEffect(() => {
    if (!stage) return;
    (window as any).__editorCanvas = stage.canvas;
    const off = bindHotkeys({ undo: () => stage.history.undo(), redo: () => stage.history.redo() });
    return off;
  }, [stage]);

  return (
    <div className="grid h-full grid-rows-[56px_1fr] bg-slate-50">
      <TopBar undo={() => stage?.history.undo()} redo={() => stage?.history.redo()} />
      <div className="grid h-full grid-cols-[360px_1fr_300px]">
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
