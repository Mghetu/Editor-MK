import { useEffect, useState } from "react";
import { CanvasStage, type StageApi } from "./CanvasStage";
import { bindHotkeys } from "./hotkeys";
import { LeftSidebar } from "./ui/LeftSidebar";
import { RightInspector } from "./ui/RightInspector";
import { TopBar } from "./ui/TopBar";

export function EditorShell() {
  const [stage, setStage] = useState<StageApi | null>(null);

  useEffect(() => {
    if (!stage) return;
    (window as any).__editorCanvas = stage.canvas;
    const off = bindHotkeys({ undo: () => stage.history.undo(), redo: () => stage.history.redo() });
    return off;
  }, [stage]);

  return (
    <div className="grid h-full grid-rows-[56px_1fr]">
      <TopBar undo={() => stage?.history.undo()} redo={() => stage?.history.redo()} />
      <div className="grid h-full grid-cols-[340px_1fr_280px]">
        <LeftSidebar />
        <CanvasStage onReady={setStage} />
        <RightInspector />
      </div>
    </div>
  );
}
