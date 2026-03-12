import type { Canvas } from "fabric";

export type HistoryCommandSource = "ui" | "hotkey" | "system" | "interaction";

export type HistoryTransactionMeta = {
  label: string;
  startedAt: number;
  source?: HistoryCommandSource;
  objectIds?: string[];
};

export type HistoryContext = {
  canvas: Canvas;
  getObjectId: (obj: any) => string | undefined;
  findObjectById: (id: string) => any | undefined;
  serializeObject: (obj: any) => Record<string, unknown>;
  enlivenObject: (serialized: Record<string, unknown>) => Promise<any>;
  addObject: (obj: any, index?: number) => void;
  removeObject: (obj: any) => void;
  render: () => void;
};

export interface HistoryCommand {
  label: string;
  objectIds?: string[];
  apply(ctx: HistoryContext): void | Promise<void>;
  revert(ctx: HistoryContext): void | Promise<void>;
  merge?(next: HistoryCommand): boolean;
  serialize?(): Record<string, unknown>;
}

export type HistoryTransaction = {
  commands: HistoryCommand[];
  meta: HistoryTransactionMeta;
};
