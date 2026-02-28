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
  const deletedIndex = doc.pages.findIndex((p) => p.id === id);
  const nextIndex = Math.max(0, Math.min(deletedIndex, pages.length - 1));
  const nextActive = doc.activePageId === id ? pages[nextIndex]?.id : doc.activePageId;
  return { ...doc, pages, activePageId: nextActive ?? pages[0].id };
};

export const movePage = (doc: DocModel, pageId: string, direction: "up" | "down"): DocModel => {
  const index = doc.pages.findIndex((p) => p.id === pageId);
  if (index < 0) return doc;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= doc.pages.length) return doc;

  const pages = [...doc.pages];
  const [page] = pages.splice(index, 1);
  pages.splice(target, 0, page);
  return { ...doc, pages };
};

export const setActivePageByOffset = (doc: DocModel, offset: number): DocModel => {
  const currentIndex = doc.pages.findIndex((p) => p.id === doc.activePageId);
  if (currentIndex < 0) return doc;
  const nextIndex = Math.max(0, Math.min(doc.pages.length - 1, currentIndex + offset));
  return { ...doc, activePageId: doc.pages[nextIndex].id };
};

export const setActivePageByNumber = (doc: DocModel, pageNumber: number): DocModel => {
  const index = Math.max(0, Math.min(doc.pages.length - 1, pageNumber - 1));
  return { ...doc, activePageId: doc.pages[index].id };
};
