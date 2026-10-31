import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseHTML } from "linkedom";
import {
  openTagModal,
  closeTagModal,
  renderTagModalUI,
  addQuickTagToActiveArticles,
  removeTagFromActiveArticles,
  submitAddTag,
  openGlobalTagManager,
  closeGlobalTagModal,
  submitCreateGlobalTag,
  deleteGlobalTag,
  getActiveTagModalIds
} from "../client/modals/tags";
import { setCachedGlobalTags } from "../client/components/sidebar";

describe("Tag Modal & Global Tag Manager Unit Tests", () => {
  beforeEach(() => {
    const { document, window } = parseHTML(`
      <!DOCTYPE html>
      <html>
        <body>
          <div class="tag-modal-overlay" id="tagModal">
            <h3 id="tagModalHeaderTitle"></h3>
            <p id="tagModalArticleTitle"></p>
            <div id="tagModalCurrentTags"></div>
            <input id="newTagInput" />
            <div id="quickTagsSection" style="display: none;">
              <div id="tagModalAvailableTags"></div>
            </div>
          </div>
          <div class="tag-modal-overlay" id="globalTagModal">
            <input id="newGlobalTagInput" />
            <span id="globalTagCountLabel"></span>
            <div id="globalTagListContainer"></div>
          </div>
          <div id="sidebarTagList"></div>
          <span id="sidebarTagCount">0</span>
          <div id="sidebarTagListMobile"></div>
          <span id="sidebarTagCountMobile">0</span>
        </body>
      </html>
    `);

    (global as any).document = document;
    (global as any).window = window;
    (window as any).allEntries = [
      { id: 101, title: "First Article", tags: ["tech", "ai"] },
      { id: 102, title: "Second Article", tags: ["tech", "cloud"] }
    ];
    (window as any).cachedGlobalTags = [
      { id: 1, label: "tech", slug: "tech", count: 2 },
      { id: 2, label: "ai", slug: "ai", count: 1 },
      { id: 3, label: "cloud", slug: "cloud", count: 1 }
    ];
    setCachedGlobalTags((window as any).cachedGlobalTags);
  });

  it("opens tag modal for a single article with header and tags", () => {
    openTagModal(101);

    expect(getActiveTagModalIds()).toEqual([101]);
    const modal = document.getElementById("tagModal");
    expect(modal?.classList.contains("open")).toBe(true);

    const title = document.getElementById("tagModalHeaderTitle");
    const articleTitle = document.getElementById("tagModalArticleTitle");
    expect(title?.textContent).toBe("Manage Tags");
    expect(articleTitle?.textContent).toBe("First Article");

    const currentTags = document.getElementById("tagModalCurrentTags");
    expect(currentTags?.innerHTML).toContain("tech");
    expect(currentTags?.innerHTML).toContain("ai");
  });

  it("opens batch tag editor when multiple article IDs are passed", () => {
    openTagModal([101, 102]);

    expect(getActiveTagModalIds()).toEqual([101, 102]);
    const title = document.getElementById("tagModalHeaderTitle");
    expect(title?.textContent).toBe("Batch Tag Editor (2 articles)");

    const currentTags = document.getElementById("tagModalCurrentTags");
    // tech is in both (full), ai is in 1 (partial)
    expect(currentTags?.innerHTML).toContain("tech");
    expect(currentTags?.innerHTML).toContain("ai");
    expect(currentTags?.innerHTML).toContain("tag-badge-partial");
  });

  it("addQuickTagToActiveArticles adds new tag to current target articles", () => {
    openTagModal(101);
    addQuickTagToActiveArticles("productivity");

    const entry = (window as any).allEntries.find((e: any) => e.id === 101);
    const hasTag = entry.tags.some((t: any) => (typeof t === "string" ? t : t.label) === "productivity");
    expect(hasTag).toBe(true);

    const currentTags = document.getElementById("tagModalCurrentTags");
    expect(currentTags?.innerHTML).toContain("productivity");
  });

  it("removeTagFromActiveArticles removes tag from target articles", () => {
    openTagModal(101);
    removeTagFromActiveArticles("ai");

    const entry = (window as any).allEntries.find((e: any) => e.id === 101);
    const hasAi = entry.tags.some((t: any) => (typeof t === "string" ? t : t.label) === "ai");
    expect(hasAi).toBe(false);

    const currentTags = document.getElementById("tagModalCurrentTags");
    expect(currentTags?.innerHTML).not.toContain("ai");
  });

  it("submitAddTag parses comma-separated input and adds all tags", () => {
    openTagModal(101);
    const input = document.getElementById("newTagInput") as HTMLInputElement;
    input.value = "javascript, coding, web";

    submitAddTag();

    const entry = (window as any).allEntries.find((e: any) => e.id === 101);
    const labels = entry.tags.map((t: any) => (typeof t === "string" ? t : t.label));
    expect(labels).toContain("javascript");
    expect(labels).toContain("coding");
    expect(labels).toContain("web");
    expect(input.value).toBe("");
  });

  it("openGlobalTagManager renders tags and opens globalTagModal", () => {
    openGlobalTagManager();

    const modal = document.getElementById("globalTagModal");
    expect(modal?.classList.contains("open")).toBe(true);

    const list = document.getElementById("globalTagListContainer");
    expect(list?.innerHTML).toContain("#tech");
    expect(list?.innerHTML).toContain("#ai");
    expect(list?.innerHTML).toContain("#cloud");
  });

  it("submitCreateGlobalTag creates tag immediately and displays in manager list", async () => {
    (window as any).authFetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      if (opts?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ id: 4, label: "serverless", slug: "serverless", count: 0 })
        };
      }
      return {
        ok: true,
        json: async () => [
          { id: 1, label: "tech", slug: "tech", count: 2 },
          { id: 2, label: "ai", slug: "ai", count: 1 },
          { id: 3, label: "cloud", slug: "cloud", count: 1 },
          { id: 4, label: "serverless", slug: "serverless", count: 0 }
        ]
      };
    });

    const input = document.getElementById("newGlobalTagInput") as HTMLInputElement;
    input.value = "serverless";

    await submitCreateGlobalTag();

    const list = document.getElementById("globalTagListContainer");
    expect(list?.innerHTML).toContain("serverless");
    expect(input.value).toBe("");
  });
});
