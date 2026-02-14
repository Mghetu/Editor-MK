import type { DocModel, PageModel } from "../../state/documentModel";

export const addPage = (doc: DocModel): DocModel => {
  const page: PageModel = { id: crypto.randomUUID(), name: `Page ${doc.pages.length + 1}`, fabricJson: { version: "6", objects: [] } };
  return { ...doc, pages: [...doc.pages, page], activePageId: page.id };
};

export const duplicateActivePage = (doc: DocModel): DocModel => {
  const source = doc.pages.find((p) => p.id === doc.activePageId);
  if (!source) return doc;
  const dupe = { ...source, id: crypto.randomUUID(), name: `${source.name} Copy` };
  return { ...doc, pages: [...doc.pages, dupe], activePageId: dupe.id };
};

export const deletePage = (doc: DocModel, id: string): DocModel => {
  if (doc.pages.length === 1) return doc;
  const pages = doc.pages.filter((p) => p.id !== id);
  return { ...doc, pages, activePageId: pages[0].id };
};
