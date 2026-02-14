import { useEditorStore, type PanelTab } from "../state/useEditorStore";
import { LayersPanel } from "./panels/LayersPanel";
import { PagesPanel } from "./panels/PagesPanel";
import { TablesPanel } from "./panels/TablesPanel";
import { TemplatesPanel } from "./panels/TemplatesPanel";
import { TextPanel } from "./panels/TextPanel";
import { UploadsPanel } from "./panels/UploadsPanel";

const tabs: PanelTab[] = ["templates", "uploads", "text", "tables", "pages", "layers"];

export function LeftSidebar() {
  const { activeTab, setTab } = useEditorStore();
  return (
    <div className="grid h-full grid-cols-[92px_1fr] border-r bg-white">
      <div className="border-r p-2">
        {tabs.map((tab) => (
          <button key={tab} className={`mb-2 w-full rounded px-2 py-1 text-left text-xs ${activeTab === tab ? "bg-sky-100" : "bg-slate-100"}`} onClick={() => setTab(tab)}>
            {tab}
          </button>
        ))}
      </div>
      <div className="p-3 text-sm">
        {activeTab === "templates" && <TemplatesPanel />}
        {activeTab === "uploads" && <UploadsPanel />}
        {activeTab === "text" && <TextPanel />}
        {activeTab === "tables" && <TablesPanel />}
        {activeTab === "pages" && <PagesPanel />}
        {activeTab === "layers" && <LayersPanel />}
      </div>
    </div>
  );
}
