export const bindHotkeys = (handlers: {
  undo: () => void;
  redo: () => void;
  prevPage?: () => void;
  nextPage?: () => void;
}) => {
  const onKey = (e: KeyboardEvent) => {
    if ((e.key === "PageUp" || (e.altKey && e.key === "ArrowUp")) && handlers.prevPage) {
      e.preventDefault();
      handlers.prevPage();
      return;
    }

    if ((e.key === "PageDown" || (e.altKey && e.key === "ArrowDown")) && handlers.nextPage) {
      e.preventDefault();
      handlers.nextPage();
      return;
    }

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
