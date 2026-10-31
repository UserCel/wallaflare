import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseHTML } from "linkedom";
import {
  handleAddArticleBtnClick,
  handleAddTextBtnClick,
  renderAddTextTagChips,
  removeAddTextTag,
  syncAddTextTagChips,
  getAddTextCustomTags,
  setAddTextCustomTags,
  handleIngestUrl,
  handleIngestText
} from "../client/modals/add-article";

describe("Add Article & Custom Text Modal Unit Tests", () => {
  beforeEach(() => {
    const { document, window } = parseHTML(`
      <!DOCTYPE html>
      <html>
        <body>
          <div class="modal-backdrop" id="addUrlModal">
            <input id="urlInput" />
            <button id="ingestUrlBtn">Fetch &amp; Save</button>
            <div id="addUrlErrorMsg"></div>
          </div>
          <div class="modal-backdrop" id="addTextModal">
            <input id="textTitle" />
            <textarea id="textContent"></textarea>
            <input id="textAuthor" />
            <input id="textTags" />
            <input id="textUrl" />
            <input id="textPreviewPicture" />
            <input id="textPublishedAt" />
            <div id="addTextTagsContainer" style="display: none;">
              <div id="addTextAvailableTags"></div>
            </div>
            <button id="ingestTextBtn">Save Entry</button>
          </div>
        </body>
      </html>
    `);

    (global as any).document = document;
    (global as any).window = window;
    (window as any).isOfflineMode = false;
    (window as any).allEntries = [];
    setAddTextCustomTags([]);
  });

  it("handleAddArticleBtnClick opens addUrlModal when online", () => {
    const modal = document.getElementById("addUrlModal");
    expect(modal?.classList.contains("open")).toBe(false);

    handleAddArticleBtnClick();
    expect(modal?.classList.contains("open")).toBe(true);
  });

  it("handleAddArticleBtnClick triggers loadArticles when offline", () => {
    (window as any).isOfflineMode = true;
    const loadMock = vi.fn();
    (window as any).loadArticles = loadMock;

    handleAddArticleBtnClick();
    expect(loadMock).toHaveBeenCalledWith(false);
  });

  it("syncAddTextTagChips splits comma-separated tags and renders chips", () => {
    const input = document.getElementById("textTags") as HTMLInputElement;
    input.value = "tech, news, artificial intelligence";

    syncAddTextTagChips();

    expect(getAddTextCustomTags()).toEqual(["tech", "news", "artificial intelligence"]);
    const container = document.getElementById("addTextAvailableTags");
    expect(container?.innerHTML).toContain("tech");
    expect(container?.innerHTML).toContain("news");
    expect(container?.innerHTML).toContain("artificial intelligence");
  });

  it("removeAddTextTag removes specific tag and updates input and chip container", () => {
    setAddTextCustomTags(["alpha", "beta", "gamma"]);
    renderAddTextTagChips();

    removeAddTextTag("beta");

    expect(getAddTextCustomTags()).toEqual(["alpha", "gamma"]);
    const input = document.getElementById("textTags") as HTMLInputElement;
    expect(input.value).toBe("alpha, gamma");
    const container = document.getElementById("addTextAvailableTags");
    expect(container?.innerHTML).toContain("alpha");
    expect(container?.innerHTML).not.toContain("beta");
  });

  it("handleIngestText sends custom text to api and updates allEntries", async () => {
    const titleInput = document.getElementById("textTitle") as HTMLInputElement;
    const contentInput = document.getElementById("textContent") as HTMLTextAreaElement;
    titleInput.value = "My Great Story";
    contentInput.value = "Once upon a time in a faraway land...";

    const fakeEntry = { id: 999, title: "My Great Story", content: "Once upon a time in a faraway land..." };
    (window as any).authFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeEntry
    });

    const modal = document.getElementById("addTextModal");
    modal?.classList.add("open");

    await handleIngestText();

    expect((window as any).authFetch).toHaveBeenCalled();
    expect((window as any).allEntries[0]).toEqual(fakeEntry);
    expect(modal?.classList.contains("open")).toBe(false);
    expect(titleInput.value).toBe("");
    expect(contentInput.value).toBe("");
  });
});
