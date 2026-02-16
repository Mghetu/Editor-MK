import { create } from "zustand";
import { createBlankDoc, type DocModel, type ExportFormat } from "./documentModel";

export type PanelTab = "select" | "templates" | "uploads" | "text" | "shapes" | "tables" | "pages" | "layers" | "settings";

type EditorStore = {
  doc: DocModel;
  activeTab: PanelTab;
  selectedObjectType?: "text" | "image" | "table" | "shape";
  selectedObjectId?: string;
  setTab: (tab: PanelTab) => void;
  setSelection: (id?: string, type?: EditorStore["selectedObjectType"]) => void;
  setExportFormat: (format: ExportFormat) => void;
  updateDoc: (updater: (doc: DocModel) => DocModel) => void;
};

export const useEditorStore = create<EditorStore>((set) => ({
  doc: createBlankDoc(),
  activeTab: "select",
  setTab: (tab) => set({ activeTab: tab }),
  setSelection: (selectedObjectId, selectedObjectType) => set({ selectedObjectId, selectedObjectType }),
  setExportFormat: (format) =>
    set((s) => ({ doc: { ...s.doc, export: { ...s.doc.export, format } } })),
  updateDoc: (updater) => set((s) => ({ doc: updater(s.doc) }))
}));
