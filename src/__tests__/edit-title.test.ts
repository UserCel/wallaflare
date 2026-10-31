import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseHTML } from "linkedom";
import { openEditTitleModal, handleSaveTitle, batchEditTitle } from "../client/modals/edit-title";

describe("Edit Title Modal Subsystem", () => {
  let mockAllEntries: any[];
  let mutations: any[];

  beforeEach(() => {
    const { document, window } = parseHTML(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="editTitleModal" class="modal-backdrop">
            <input type="hidden" id="editTitleEntryId" />
            <input type="text" id="editTitleInput" />
          </div>
          <div id="readerTitle">Original Reader Title</div>
        </body>
      </html>
    `);

    (global as any).document = document;
    (global as any).window = window;

    mockAllEntries = [
      { id: 10, title: "Old Article Title", is_archived: false, is_starred: false },
      { id: 20, title: "Second Title", is_archived: false, is_starred: false }
    ];
    mutations = [];

    (window as any).allEntries = mockAllEntries;
    (window as any).activeArticleId = 10;
    (window as any).selectedArticleIds = new Set([10]);
    (window as any).cachedGlobalTags = [];
    (window as any).serverLibraryCounts = { unread: 2, total: 2 };
    (window as any).syncLocalEntriesCache = vi.fn();
    (window as any).filterArticles = vi.fn();
    (window as any).enqueueMutation = vi.fn((type, payload) => {
      mutations.push({ type, payload });
    });
    (window as any).closeAllCardMenus = vi.fn();
  });

  it("opens edit title modal with current title and entry ID populated", () => {
    openEditTitleModal(10);
    const modal = document.getElementById("editTitleModal");
    const idInput = document.getElementById("editTitleEntryId") as HTMLInputElement;
    const titleInput = document.getElementById("editTitleInput") as HTMLInputElement;

    expect(modal?.classList.contains("open")).toBe(true);
    expect(idInput.value).toBe("10");
    expect(titleInput.value).toBe("Old Article Title");
  });

  it("ignores invalid entry id on openEditTitleModal", () => {
    openEditTitleModal(999);
    const modal = document.getElementById("editTitleModal");
    expect(modal?.classList.contains("open")).toBe(false);
  });

  it("updates title, updates reader title when active, enqueues mutation, and syncs local cache", async () => {
    openEditTitleModal(10);
    const titleInput = document.getElementById("editTitleInput") as HTMLInputElement;
    titleInput.value = "New Updated Title";

    const fakeEvent = { preventDefault: vi.fn() } as unknown as Event;
    await handleSaveTitle(fakeEvent);

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    const item = mockAllEntries.find((e) => e.id === 10);
    expect(item.title).toBe("New Updated Title");

    // Check reader title update
    const readerTitle = document.getElementById("readerTitle");
    expect(readerTitle?.textContent).toBe("New Updated Title");

    // Modal closed
    const modal = document.getElementById("editTitleModal");
    expect(modal?.classList.contains("open")).toBe(false);

    // Sync and filter called
    expect((window as any).syncLocalEntriesCache).toHaveBeenCalled();
    expect((window as any).filterArticles).toHaveBeenCalled();

    // Enqueued mutation
    expect(mutations).toHaveLength(1);
    expect(mutations[0]).toEqual({
      type: "edit_title",
      payload: { id: 10, title: "New Updated Title" }
    });
  });

  it("batchEditTitle opens modal when exactly one item is selected", () => {
    (window as any).selectedArticleIds = new Set([20]);
    batchEditTitle();

    const idInput = document.getElementById("editTitleEntryId") as HTMLInputElement;
    const titleInput = document.getElementById("editTitleInput") as HTMLInputElement;
    expect(idInput.value).toBe("20");
    expect(titleInput.value).toBe("Second Title");
    expect((window as any).closeAllCardMenus).toHaveBeenCalled();
  });

  it("batchEditTitle does nothing when multiple items are selected", () => {
    (window as any).selectedArticleIds = new Set([10, 20]);
    batchEditTitle();

    const modal = document.getElementById("editTitleModal");
    expect(modal?.classList.contains("open")).toBe(false);
  });
});
