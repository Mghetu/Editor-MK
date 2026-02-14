export const bindHotkeys = (handlers: { undo: () => void; redo: () => void }) => {
  const onKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key.toLowerCase() === "z") {
      e.preventDefault();
      e.shiftKey ? handlers.redo() : handlers.undo();
    }
    if (e.key.toLowerCase() === "y") {
      e.preventDefault();
      handlers.redo();
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
};
