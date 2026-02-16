import { AppWindow, Files, Layers, LayoutTemplate, MousePointerClick, Settings, Shapes, Table2, Type, Upload, X } from "lucide-react";
import { useEditorStore, type PanelTab } from "../state/useEditorStore";
import { LayersPanel } from "./panels/LayersPanel";
import { PagesPanel } from "./panels/PagesPanel";
import { TablesPanel } from "./panels/TablesPanel";
import { TemplatesPanel } from "./panels/TemplatesPanel";
import { TextPanel } from "./panels/TextPanel";
import { UploadsPanel } from "./panels/UploadsPanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import { ShapesPanel } from "./panels/ShapesPanel";

const tabs: { key: PanelTab; label: string; icon: any }[] = [
  { key: "select", label: "Select", icon: MousePointerClick },
  { key: "templates", label: "Templates", icon: LayoutTemplate },
  { key: "uploads", label: "Uploads", icon: Upload },
  { key: "text", label: "Text", icon: Type },
  { key: "shapes", label: "Shapes", icon: Shapes },
  { key: "tables", label: "Tables", icon: Table2 },
  { key: "pages", label: "Pages", icon: Files },
  { key: "layers", label: "Layers", icon: Layers },
  { key: "settings", label: "Settings", icon: Settings }
];

export function LeftSidebar() {
  const { activeTab, setTab } = useEditorStore();
  const panelOpen = activeTab !== "select";

  return (
    <div className={`grid h-full border-r bg-white ${panelOpen ? "grid-cols-[74px_1fr]" : "grid-cols-[74px]"}`}>
      <div className="border-r p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`mb-2 flex w-full flex-col items-center rounded px-1 py-2 text-[10px] ${activeTab === tab.key ? "bg-slate-100 text-sky-700" : "hover:bg-slate-50 text-slate-600"}`}
              onClick={() => setTab(tab.key)}
            >
              <Icon size={16} className="mb-1" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {panelOpen && (
        <div className="flex h-full min-w-[286px] flex-col">
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium text-slate-700">
            <div className="flex items-center gap-2"><AppWindow size={14} /> {tabs.find((t) => t.key === activeTab)?.label}</div>
            <button className="rounded p-1 hover:bg-slate-100" onClick={() => setTab("select")}><X size={14} /></button>
          </div>
          <div className="overflow-auto p-3 text-sm">
            {activeTab === "templates" && <TemplatesPanel />}
            {activeTab === "uploads" && <UploadsPanel />}
            {activeTab === "text" && <TextPanel />}
            {activeTab === "shapes" && <ShapesPanel />}
            {activeTab === "tables" && <TablesPanel />}
            {activeTab === "pages" && <PagesPanel />}
            {activeTab === "layers" && <LayersPanel />}
            {activeTab === "settings" && <SettingsPanel />}
          </div>
        </div>
      )}
    </div>
  );
}
