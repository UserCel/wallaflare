import { describe, it, expect, beforeEach } from "vitest";
import { parseHTML } from "linkedom";
import {
  getEffectiveGlobalTags,
  updateCounts,
  renderSidebarTags,
  toggleSidebarTagsCollapse,
  filterByTag,
  getSelectedTagFilter,
  setSelectedTagFilter,
  setCachedGlobalTags
} from "../client/components/sidebar";

describe("Sidebar Component Unit Tests", () => {
  beforeEach(() => {
    const { document, window } = parseHTML(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="sidebarTagList"></div>
          <span id="sidebarTagCount">0</span>
          <div id="sidebarTagListMobile"></div>
          <span id="sidebarTagCountMobile">0</span>
          <div id="sidebarTagChevron"></div>
          <div id="sidebarTagChevronMobile"></div>

          <span id="countUnread">0</span>
          <span id="countStarred">0</span>
          <span id="countArchive">0</span>
          <span id="countAll">0</span>

          <span id="countUnreadMobile">0</span>
          <span id="countStarredMobile">0</span>
          <span id="countArchiveMobile">0</span>
          <span id="countAllMobile">0</span>
        </body>
      </html>
    `);

    (global as any).document = document;
    (global as any).window = window;
    setSelectedTagFilter(null);
    setCachedGlobalTags([]);
  });

  it("calculates effective global tags correctly across entries and cached tags", () => {
    const entries = [
      { id: 1, tags: ["Tech", "News"] },
      { id: 2, tags: [{ label: "tech", slug: "tech" }, "Opinion"] },
      { id: 3, tags: ["NEWS"] },
      { id: 4, tags: [] }
    ];
    const cachedTags = [{ label: "Science", slug: "science" }];

    const result = getEffectiveGlobalTags(entries, cachedTags);

    expect(result.length).toBe(4);
    const tech = result.find(t => t.slug === "tech" || t.label.toLowerCase() === "tech");
    expect(tech).toBeDefined();
    expect(tech?.count).toBe(2);

    const news = result.find(t => t.slug === "news" || t.label.toLowerCase() === "news");
    expect(news).toBeDefined();
    expect(news?.count).toBe(2);

    const opinion = result.find(t => t.slug === "opinion" || t.label.toLowerCase() === "opinion");
    expect(opinion).toBeDefined();
    expect(opinion?.count).toBe(1);

    const science = result.find(t => t.slug === "science" || t.label.toLowerCase() === "science");
    expect(science).toBeDefined();
    expect(science?.count).toBe(0);
  });

  it("updates unread, starred, archive, and total counts for both desktop and mobile elements", () => {
    const entries = [
      { id: 1, is_archived: 0, is_starred: 1 },
      { id: 2, is_archived: 0, is_starred: 0 },
      { id: 3, is_archived: 1, is_starred: 1 },
      { id: 4, is_archived: 1, is_starred: 0 }
    ];

    updateCounts(entries);

    expect(document.getElementById("countUnread")?.textContent).toBe("2");
    expect(document.getElementById("countStarred")?.textContent).toBe("2");
    expect(document.getElementById("countArchive")?.textContent).toBe("2");
    expect(document.getElementById("countAll")?.textContent).toBe("4");

    expect(document.getElementById("countUnreadMobile")?.textContent).toBe("2");
    expect(document.getElementById("countStarredMobile")?.textContent).toBe("2");
    expect(document.getElementById("countArchiveMobile")?.textContent).toBe("2");
    expect(document.getElementById("countAllMobile")?.textContent).toBe("4");
  });

  it("renders sidebar tag buttons with escaping, active states, and badge counts", () => {
    (window as any).allEntries = [
      { id: 1, tags: ["<script>alert(1)</script>", "AI"] }
    ];

    renderSidebarTags();

    const listHtml = document.getElementById("sidebarTagList")?.innerHTML || "";
    expect(listHtml).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(listHtml).toContain("class=\"sidebar-tag-item");
    expect(listHtml).toContain("<span class=\"badge-count\">1</span>");

    // Test filterByTag
    filterByTag("ai");
    expect(getSelectedTagFilter()).toBe("ai");

    // Re-render and check active class
    renderSidebarTags();
    const updatedHtml = document.getElementById("sidebarTagList")?.innerHTML || "";
    expect(updatedHtml).toContain("sidebar-tag-item active");

    // Toggle filterByTag off
    filterByTag("ai");
    expect(getSelectedTagFilter()).toBeNull();
  });

  it("toggles sidebar tags collapse and rotates chevron indicator", () => {
    const listEl = document.getElementById("sidebarTagList");
    const chevron = document.getElementById("sidebarTagChevron");

    toggleSidebarTagsCollapse();
    expect(listEl?.classList.contains("collapsed")).toBe(true);
    expect(chevron?.style.transform).toBe("rotate(-90deg)");

    toggleSidebarTagsCollapse();
    expect(listEl?.classList.contains("collapsed")).toBe(false);
    expect(chevron?.style.transform).toBe("none");
  });

  it("synchronously restores cached tags and counts from localStorage on initial load", () => {
    const mockStorage: Record<string, string> = {
      wf_cached_tags: JSON.stringify([{ label: "OfflineTag", slug: "offlinetag", count: 0 }]),
      wf_cached_counts: JSON.stringify({ unread: 42, starred: 7, archive: 15, total: 57 })
    };
    (global as any).localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => { mockStorage[key] = val; }
    };

    // When entries are not yet loaded (empty on cold boot)
    updateCounts([]);
    expect(document.getElementById("countUnread")?.textContent).toBe("42");
    expect(document.getElementById("countAll")?.textContent).toBe("57");

    // Setting cached tags should persist to localStorage
    setCachedGlobalTags([{ label: "PersistedTag", slug: "persistedtag", count: 0 }]);
    expect(mockStorage["wf_cached_tags"]).toContain("PersistedTag");
  });
});
