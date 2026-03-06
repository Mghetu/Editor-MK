import { Group, IText, Line, Rect } from "fabric";
import type { Canvas } from "fabric";
import { AddObjectCommand } from "../history/commands/basic";
import { createFabricHistoryContext } from "../history/fabricHistoryContext";

export const addTable = async (canvas: Canvas, rows = 3, cols = 3) => {
  const cellW = 140;
  const cellH = 52;
  const children: any[] = [new Rect({ left: 0, top: 0, width: cols * cellW, height: rows * cellH, fill: "#fff" })];

  for (let r = 0; r <= rows; r++) {
    children.push(new Line([0, r * cellH, cols * cellW, r * cellH], { stroke: "#334155", strokeWidth: 1 }));
  }
  for (let c = 0; c <= cols; c++) {
    children.push(new Line([c * cellW, 0, c * cellW, rows * cellH], { stroke: "#334155", strokeWidth: 1 }));
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      children.push(
        new IText("", {
          left: c * cellW + 8,
          top: r * cellH + 8,
          fontSize: 16,
          width: cellW - 16
        })
      );
    }
  }

  const group = new Group(children as any, { left: 120, top: 120 }) as any;
  group.data = { id: crypto.randomUUID(), type: "table", name: "Table" };
  group.table = { rows, cols, cellW, cellH, borderColor: "#334155", bgColor: "#ffffff" };

  const commandHistory = (window as any).__commandHistory;
  if (!commandHistory) {
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    return;
  }

  const ctx = createFabricHistoryContext(canvas);
  await commandHistory.execute(AddObjectCommand.fromObject(group, ctx, "Add table"), { source: "ui" });
};
