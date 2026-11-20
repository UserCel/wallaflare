import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseHTML } from "linkedom";

const { mockShowToast } = vi.hoisted(() => ({ mockShowToast: vi.fn() }));
vi.mock("../client/components/toast", () => ({ showToast: mockShowToast }));

import {
  findBookmarkTargetElement,
  jumpToReaderBookmark,
  updateReaderBookmarkUI,
  handleBookmarkSelection,
  jumpToActiveBookmark,
  clearActiveBookmark,
  applyBookmarkMarkerToReader
} from "../client/reader/bookmark";
import { applyAnnotationsToReader } from "../client/reader/annotations";
import app from "../index";
import { createMockD1Database } from "./mock-db";

describe("Single Per-Article Bookmark Engine", () => {
  let doc: any;
  let win: any;

  beforeEach(() => {
    const { document, window } = parseHTML(`
      <!DOCTYPE html>
      <html>
        <body>
          <button id="readerBookmarkBtn" title="">
            <svg id="readerBookmarkIcon" fill="none"></svg>
          </button>
          <section id="readerScrollContainer">
            <article id="readerBody">
              <p id="p1">First paragraph at the very top of the article.</p>
              <p id="p2">Second paragraph deep in the middle of the story.</p>
              <p id="p3">Third paragraph near the conclusion of the article.</p>
            </article>
          </section>
        </body>
      </html>
    `);

    doc = document;
    win = window;
    (global as any).document = doc;
    (global as any).window = win;
    (global as any).NodeFilter = { SHOW_TEXT: 4 };

    win.allEntries = [
      {
        id: 1,
        title: "Long Read",
        content: doc.getElementById("readerBody").innerHTML,
        bookmark: null,
        annotations: []
      }
    ];
    win.activeArticleId = 1;
    win.syncLocalEntriesCache = vi.fn();
    win.enqueueMutation = vi.fn();
    mockShowToast.mockClear();
    win.clearActiveTextSelection = vi.fn();

    const scrollEl = doc.getElementById("readerScrollContainer");
    Object.defineProperty(scrollEl, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(scrollEl, "clientHeight", { value: 400, configurable: true });
    scrollEl.scrollTop = 0;
  });

  it("sets and moves the single bookmark line above the bookmarked paragraph", () => {
    const scrollEl = doc.getElementById("readerScrollContainer");
    scrollEl.scrollTop = 300;

    // 1. Select text in p1 and bookmark it
    win.getActiveSelectionInfo = () => ({ quote: "First paragraph at the very top", range: null });
    handleBookmarkSelection();

    expect(win.allEntries[0].bookmark).not.toBeNull();
    expect(win.allEntries[0].bookmark.quote).toBe("First paragraph at the very top");
    expect(win.enqueueMutation).toHaveBeenLastCalledWith("set_bookmark", {
      id: 1,
      bookmark: win.allEntries[0].bookmark
    });
    expect(doc.getElementById("readerBookmarkBtn").className).toContain("active-bookmark");
    expect(doc.getElementById("readerBookmarkIcon").getAttribute("fill")).toBe("currentColor");
    const line1 = doc.querySelector('[data-bookmark-marker="true"]');
    expect(line1).not.toBeNull();
    expect(line1.nextElementSibling.id).toBe("p1");

    // 2. Select text in p2 and bookmark it -> moves bookmark line above p2 (only 1 line exists)
    win.getActiveSelectionInfo = () => ({ quote: "Second paragraph deep in the middle", range: null });
    handleBookmarkSelection();

    expect(win.allEntries[0].bookmark.quote).toBe("Second paragraph deep in the middle");
    const lines = doc.querySelectorAll('[data-bookmark-marker="true"]');
    expect(lines.length).toBe(1);
    expect(lines[0].nextElementSibling.id).toBe("p2");
  });

  it("disambiguates single-word bookmarks using position and prefix instead of picking the first paragraph", () => {
    // Word "paragraph" appears in p1, p2, and p3
    const p1Len = doc.getElementById("p1").textContent.length;
    const p2Len = doc.getElementById("p2").textContent.length;

    const target = findBookmarkTargetElement(doc.getElementById("readerBody"), {
      quote: "paragraph",
      prefix: "Third ",
      position: p1Len + p2Len + 6,
      updated_at: new Date().toISOString()
    });
    expect(target?.id).toBe("p3");
  });

  it("removes the bookmark when clicking the in-reader bookmark line marker", () => {
    win.allEntries[0].bookmark = {
      quote: "Second paragraph deep in the middle",
      progress: 0.5,
      updated_at: new Date().toISOString()
    };
    updateReaderBookmarkUI(win.allEntries[0]);

    const line = doc.querySelector('[data-bookmark-marker="true"]');
    expect(line).not.toBeNull();
    const markerBtn = line.querySelector(".reader-bookmark-marker");
    expect(markerBtn).not.toBeNull();

    markerBtn.onclick({ stopPropagation: () => {} });

    expect(win.allEntries[0].bookmark).toBeNull();
    expect(doc.querySelectorAll('[data-bookmark-marker="true"]').length).toBe(0);
    expect(doc.getElementById("readerBookmarkBtn").className).not.toContain("active-bookmark");
    expect(doc.getElementById("readerBookmarkIcon").getAttribute("fill")).toBe("none");
    expect(win.enqueueMutation).toHaveBeenLastCalledWith("set_bookmark", { id: 1, bookmark: null });
  });

  it("top bar button only jumps to the bookmark (never sets or removes it)", () => {
    // No bookmark set -> shows toast and does not create one
    jumpToActiveBookmark();
    expect(win.allEntries[0].bookmark).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith("No bookmark set — select text to bookmark");

    // Bookmark set -> jumps to p2 and keeps bookmark intact
    const p2 = doc.getElementById("p2");
    p2.scrollIntoView = vi.fn();
    win.allEntries[0].bookmark = {
      quote: "Second paragraph deep in the middle",
      position: 50,
      progress: 0.5,
      updated_at: new Date().toISOString()
    };

    const found = findBookmarkTargetElement(doc.getElementById("readerBody"), win.allEntries[0].bookmark);
    expect(found).toBe(p2);

    jumpToActiveBookmark();
    expect(p2.scrollIntoView).toHaveBeenCalled();
    expect(p2.className).toContain("reader-bookmark-flash");
    expect(win.allEntries[0].bookmark).not.toBeNull();

    // Fallback to progress ratio when quote doesn't match
    const scrollEl = doc.getElementById("readerScrollContainer");
    scrollEl.scrollTop = 0;
    const jumped = jumpToReaderBookmark({
      bookmark: { quote: "Non-existent text", progress: 0.75, updated_at: new Date().toISOString() }
    });
    expect(jumped).toBe(true);
    expect(scrollEl.scrollTop).toBe(450);
  });

  it("preserves the in-reader bookmark marker when applyAnnotationsToReader re-renders", () => {
    win.allEntries[0].bookmark = {
      quote: "Third paragraph near the conclusion",
      progress: 0.8,
      updated_at: new Date().toISOString()
    };
    win.allEntries[0].annotations = [
      { id: 5, quote: "First paragraph", color: "yellow", text: "A note" }
    ];

    applyAnnotationsToReader(win.allEntries[0]);

    expect(doc.querySelector('mark[data-annotation-id="5"]')).not.toBeNull();
    const bmLine = doc.querySelector('[data-bookmark-marker="true"]');
    expect(bmLine).not.toBeNull();
    expect(bmLine.nextElementSibling.id).toBe("p3");

    clearActiveBookmark();
    expect(doc.querySelectorAll('[data-bookmark-marker="true"]').length).toBe(0);
  });
});

describe("Bookmark API & Sync Persistence", () => {
  it("persists and clears entry bookmark via PATCH /api/entries/:id.json and exposes it in sync", async () => {
    const db = createMockD1Database();
    const env = { DB: db, AUTH_TOKEN: "" };

    const createRes = await app.request(
      "/api/entries.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Bookmarked Article",
          content: "<p>Paragraph one.</p><p>Paragraph two.</p>"
        })
      },
      env as any
    );
    expect(createRes.status).toBe(200);
    const created: any = await createRes.json();

    const bookmark = {
      quote: "Paragraph two.",
      position: 14,
      progress: 0.55,
      updated_at: "2026-11-20T08:00:00.000Z"
    };
    const patchRes = await app.request(
      `/api/entries/${created.id}.json`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmark })
      },
      env as any
    );
    expect(patchRes.status).toBe(200);
    const patched: any = await patchRes.json();
    expect(patched.bookmark).toEqual(bookmark);

    const syncRes = await app.request("/api/sync.json", { method: "GET" }, env as any);
    expect(syncRes.status).toBe(200);
    const syncData: any = await syncRes.json();
    const syncedEntry = syncData.entries.find((e: any) => e.id === created.id);
    expect(syncedEntry.bookmark).toEqual(bookmark);

    const clearRes = await app.request(
      `/api/entries/${created.id}.json`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmark: null })
      },
      env as any
    );
    expect(clearRes.status).toBe(200);
    const cleared: any = await clearRes.json();
    expect(cleared.bookmark).toBeNull();
  });
});
