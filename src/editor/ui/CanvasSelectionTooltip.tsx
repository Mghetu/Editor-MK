import { Copy, Layers, Lock, Trash2, Unlock } from "lucide-react";
import { useEffect, useState } from "react";
import { duplicateObjectWithHistory, removeObjectWithHistory, reorderObjectWithHistory, applyObjectMutation } from "../engine/history/mutator";

type TooltipState = {
  visible: boolean;
  top: number;
  left: number;
  locked: boolean;
  object: any | null;
};

const isLockedObject = (obj: any) =>
  !obj?.selectable ||
  !obj?.evented ||
  Boolean(obj?.lockMovementX && obj?.lockMovementY && obj?.lockScalingX && obj?.lockScalingY && obj?.lockRotation);

const toTooltipState = (): TooltipState => {
  const canvas = (window as any).__editorCanvas;
  const obj = canvas?.getActiveObject?.() as any;
  if (!canvas || !obj || obj?.data?.isCropOverlay) {
    return { visible: false, top: 0, left: 0, object: null, locked: false };
  }

  const canvasEl = canvas.upperCanvasEl as HTMLCanvasElement | undefined;
  const canvasRect = canvasEl?.getBoundingClientRect?.();
  const objectBounds = obj.getBoundingRect?.(true, true);
  if (!canvasRect || !objectBounds) {
    return { visible: false, top: 0, left: 0, object: null, locked: false };
  }

  return {
    visible: true,
    top: Math.max(12, canvasRect.top + Number(objectBounds.top ?? 0) - 44),
    left: canvasRect.left + Number(objectBounds.left ?? 0) + Number(objectBounds.width ?? 0) / 2,
    locked: isLockedObject(obj),
    object: obj
  };
};

export function CanvasSelectionTooltip() {
  const [state, setState] = useState<TooltipState>(() => toTooltipState());

  useEffect(() => {
    let unbind: (() => void) | null = null;

    const bindIfReady = () => {
      if (unbind) return true;
      const canvas = (window as any).__editorCanvas;
      if (!canvas) return false;

      const sync = () => setState(toTooltipState());
      sync();

      canvas.on("selection:created", sync);
      canvas.on("selection:updated", sync);
      canvas.on("selection:cleared", sync);
      canvas.on("object:moving", sync);
      canvas.on("object:scaling", sync);
      canvas.on("object:rotating", sync);
      canvas.on("object:modified", sync);
      canvas.on("after:render", sync);
      window.addEventListener("resize", sync);
      window.addEventListener("scroll", sync, true);

      unbind = () => {
        canvas.off("selection:created", sync);
        canvas.off("selection:updated", sync);
        canvas.off("selection:cleared", sync);
        canvas.off("object:moving", sync);
        canvas.off("object:scaling", sync);
        canvas.off("object:rotating", sync);
        canvas.off("object:modified", sync);
        canvas.off("after:render", sync);
        window.removeEventListener("resize", sync);
        window.removeEventListener("scroll", sync, true);
        unbind = null;
      };

      return true;
    };

    if (bindIfReady()) return () => unbind?.();

    const interval = window.setInterval(() => {
      if (bindIfReady()) {
        window.clearInterval(interval);
      }
    }, 100);

    return () => {
      window.clearInterval(interval);
      unbind?.();
    };
  }, []);

  if (!state.visible || !state.object) return null;

  const canvas = (window as any).__editorCanvas;

  const toggleLock = () => {
    if (!canvas || !state.object) return;
    const lock = !isLockedObject(state.object);
    void applyObjectMutation(
      canvas,
      state.object,
      (obj) => {
        Object.assign(obj, {
          selectable: !lock,
          evented: !lock,
          lockMovementX: lock,
          lockMovementY: lock,
          lockScalingX: lock,
          lockScalingY: lock,
          lockRotation: lock
        });
      },
      lock ? "Lock object" : "Unlock object"
    ).finally(() => setState(toTooltipState()));
  };

  return (
    <div
      className="fixed z-50 flex -translate-x-1/2 items-center gap-1 rounded-md border border-[#4a4a4a] bg-[#111111e6] p-1 shadow-lg backdrop-blur"
      style={{ top: state.top, left: state.left }}
    >
      <button className="rounded p-1.5 text-slate-200 hover:bg-[#2a2a2a]" title="Duplicate" onClick={() => { void duplicateObjectWithHistory(canvas, state.object, "Duplicate object"); }}>
        <Copy size={14} />
      </button>
      <button className="rounded p-1.5 text-slate-200 hover:bg-[#2a2a2a]" title="Bring forward" onClick={() => { void reorderObjectWithHistory(canvas, state.object, 1, "Bring forward"); }}>
        <Layers size={14} />
      </button>
      <button className="rounded p-1.5 text-slate-200 hover:bg-[#2a2a2a]" title={state.locked ? "Unlock" : "Lock"} onClick={toggleLock}>
        {state.locked ? <Unlock size={14} /> : <Lock size={14} />}
      </button>
      <button className="rounded p-1.5 text-rose-400 hover:bg-[#2a2a2a]" title="Delete" onClick={() => { void removeObjectWithHistory(canvas, state.object, "Delete object"); }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}
