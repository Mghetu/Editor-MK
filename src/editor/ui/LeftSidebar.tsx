import { AppWindow, Layers, LayoutTemplate, Table2, Type, Upload, Files } from "lucide-react";
import { useEditorStore, type PanelTab } from "../state/useEditorStore";
import { LayersPanel } from "./panels/LayersPanel";
import { PagesPanel } from "./panels/PagesPanel";
import { TablesPanel } from "./panels/TablesPanel";
import { TemplatesPanel } from "./panels/TemplatesPanel";
import { TextPanel } from "./panels/TextPanel";
import { UploadsPanel } from "./panels/UploadsPanel";

const tabs: { key: PanelTab; label: string; icon: any }[] = [
  { key: "templates", label: "Templates", icon: LayoutTemplate },
  { key: "uploads", label: "Uploads", icon: Upload },
  { key: "text", label: "Text", icon: Type },
  { key: "tables", label: "Tables", icon: Table2 },
  { key: "pages", label: "Pages", icon: Files },
  { key: "layers", label: "Layers", icon: Layers }
];

export function LeftSidebar() {
  const { activeTab, setTab } = useEditorStore();

  return (
    <div className="grid h-full grid-cols-[74px_1fr] border-r bg-white">
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
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-medium text-slate-700">
          <AppWindow size={14} /> {tabs.find((t) => t.key === activeTab)?.label}
        </div>
        <div className="p-3 text-sm overflow-auto">
          {activeTab === "templates" && <TemplatesPanel />}
          {activeTab === "uploads" && <UploadsPanel />}
          {activeTab === "text" && <TextPanel />}
          {activeTab === "tables" && <TablesPanel />}
          {activeTab === "pages" && <PagesPanel />}
          {activeTab === "layers" && <LayersPanel />}
        </div>
      </div>
    </div>
  );
}
