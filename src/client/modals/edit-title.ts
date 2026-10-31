import { openModal, closeModal } from "./manager";
import { showToast } from "../components/toast";

export function openEditTitleModal(id: number): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  const item = allEntries.find((e: any) => e.id === id);
  if (!item) return;

  const idInput = document.getElementById("editTitleEntryId") as HTMLInputElement | null;
  const titleInput = document.getElementById("editTitleInput") as HTMLInputElement | null;

  if (idInput) idInput.value = String(id);
  if (titleInput) {
    titleInput.value = item.title || "";
    setTimeout(() => {
      if (typeof titleInput.focus === "function") titleInput.focus();
      if (typeof titleInput.select === "function") titleInput.select();
    }, 50);
  }

  openModal("editTitleModal");
}

export async function handleSaveTitle(e: Event): Promise<void> {
  if (e) e.preventDefault();
  const idInput = document.getElementById("editTitleEntryId") as HTMLInputElement | null;
  const titleInput = document.getElementById("editTitleInput") as HTMLInputElement | null;

  const id = idInput ? parseInt(idInput.value, 10) : NaN;
  const newTitle = titleInput ? titleInput.value.trim() : "";
  if (!id || !newTitle) return;

  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  const item = allEntries.find((e: any) => e.id === id);

  if (item) {
    item.title = newTitle;
    if (w.activeArticleId === id) {
      const readerTitle = document.getElementById("readerTitle");
      if (readerTitle) readerTitle.textContent = newTitle;
    }
    if (typeof w.syncLocalEntriesCache === "function") {
      w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
    }
  }

  closeModal("editTitleModal");
  if (typeof w.filterArticles === "function") {
    w.filterArticles();
  }
  showToast("✓ Title updated");

  if (typeof w.enqueueMutation === "function") {
    w.enqueueMutation("edit_title", { id, title: newTitle });
  }
}

export function batchEditTitle(): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const selectedIds = w.selectedArticleIds;
  const ids = Array.isArray(selectedIds)
    ? selectedIds
    : selectedIds instanceof Set
    ? Array.from(selectedIds)
    : [];

  if (ids.length === 1) {
    if (typeof w.closeAllCardMenus === "function") {
      w.closeAllCardMenus();
    }
    openEditTitleModal(Number(ids[0]));
  }
}

if (typeof window !== "undefined") {
  const w = window as any;
  w.openEditTitleModal = openEditTitleModal;
  w.handleSaveTitle = handleSaveTitle;
  w.batchEditTitle = batchEditTitle;
}
