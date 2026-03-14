import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";

type CropControllerBridge = {
  isActive?: () => boolean;
  apply?: () => void;
  cancel?: () => void;
};

const readController = () => ((window as any).__cropController ?? null) as CropControllerBridge | null;

const readCropActive = () => {
  const controller = readController();
  if (controller?.isActive) return Boolean(controller.isActive());
  return Boolean((window as any).__cropModeActive);
};

export function CanvasCropToolbar() {
  const [active, setActive] = useState(readCropActive);

  useEffect(() => {
    const sync = (event?: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean }> | undefined)?.detail;
      setActive(Boolean(detail?.active ?? readCropActive()));
    };

    const interval = window.setInterval(() => setActive(readCropActive()), 250);
    window.addEventListener("editor:crop-mode-changed", sync as EventListener);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("editor:crop-mode-changed", sync as EventListener);
    };
  }, []);

  if (!active) return null;

  const onApply = () => {
    const controller = readController();
    if (typeof controller?.apply === "function") {
      controller.apply();
      return;
    }

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  };

  const onCancel = () => {
    const controller = readController();
    if (typeof controller?.cancel === "function") {
      controller.cancel();
      return;
    }

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  };

  return (
    <div className="pointer-events-none fixed left-1/2 top-[110px] z-50 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-violet-500/70 bg-[#101116f0] px-3 py-2 shadow-xl backdrop-blur">
        <span className="text-xs text-slate-200">Crop mode active</span>
        <button className="inline-flex items-center gap-1 rounded bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-500" onClick={onApply}>
          <Check size={14} /> Apply
        </button>
        <button className="inline-flex items-center gap-1 rounded border border-[#555] bg-[#252525] px-2 py-1 text-xs text-slate-100 hover:bg-[#333]" onClick={onCancel}>
          <X size={14} /> Cancel
        </button>
        <span className="text-[11px] text-slate-400">Enter / Esc</span>
      </div>
    </div>
  );
}
