import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseHTML } from "linkedom";
import {
  applyAnnotationsToReader,
  openHighlightPopover,
  openAnnotationNoteModal,
  handleSaveAnnotationNoteForm,
  handleCreateHighlight,
  closeAnnotationNoteModal
} from "../client/reader/annotations";
import {
  openArticleHighlightsModal,
  editModalAnnotation,
  renderModalHighlightsList
} from "../client/modals/highlights";
import { reconcileDeltaSync } from "../client/sync/reconciliation";

/**
 * Deterministic PRNG (Mulberry32) so randomized stress runs are reproducible.
 */
function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Annotation Note Update Stress & Concurrency Regression Tests", () => {
  let doc: any;
  let win: any;

  // Simulated server state
  let serverEntries: any[];
  let nextAnnId: number;
  let syncRev: number;
  let postDelayMs: number;
  let patchDelayMs: number;
  let syncDelayMs: number;

  function cloneEntries(entries: any[]) {
    return JSON.parse(JSON.stringify(entries));
  }

  function setupDom() {
    const { document, window } = parseHTML(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="readerView" style="display: block;">
            <div id="readerTopBarDefault" style="display: flex;"></div>
            <div id="readerTopBarAnnotation" style="display: none;">
              <span id="readerTopBarSelCount"></span>
            </div>
            <div id="readerHighlightToolbar" style="display: none;"></div>
            <div id="readerScrollContainer">
              <div id="readerBody"></div>
            </div>
            <span id="readerHighlightsBadge" style="display: none;">0</span>
            <span id="readerHighlightsBadgeMobile" style="display: none;">0</span>
          </div>

          <div class="modal-backdrop" id="readerHighlightsModal" style="display: none;">
            <div id="highlightsFilterPills">
              <button class="hl-filter-pill active" data-filter="all">All</button>
              <button class="hl-filter-pill" data-filter="notes">Notes</button>
            </div>
            <div id="highlightsSortWrap">
              <button class="hl-sort-btn active" id="btnSortPosition">Order</button>
              <button class="hl-sort-btn" id="btnSortTime">Time</button>
            </div>
            <span class="badge" id="modalHighlightsCountBadge">0</span>
            <div id="modalHighlightsList"></div>
          </div>

          <div id="highlightPopover" style="display: none;">
            <span id="popoverQuoteText"></span>
            <div id="popoverNoteText"></div>
            <span id="popoverNoteActionLabel"></span>
          </div>

          <div id="annotationNoteModal" class="modal-backdrop" style="display: none;">
            <div id="modalNoteColors">
              <button class="hl-color-btn active-color" data-color="yellow"></button>
              <button class="hl-color-btn" data-color="green"></button>
              <button class="hl-color-btn" data-color="blue"></button>
            </div>
            <div id="annotationNoteQuotePreview"></div>
            <input type="hidden" id="annotationNoteQuoteInput" value="" />
            <textarea id="annotationNoteInput"></textarea>
          </div>
        </body>
      </html>
    `);

    doc = document;
    win = window;
    (global as any).document = doc;
    (global as any).window = win;
    (global as any).NodeFilter = { SHOW_TEXT: 4 };

    // Ensure getBoundingClientRect works on linkedom elements
    const proto = doc.createElement("div").constructor.prototype;
    if (!proto.getBoundingClientRect) {
      proto.getBoundingClientRect = () => ({ top: 100, bottom: 120, left: 50, right: 150, width: 100, height: 20 });
    }
    const markProto = doc.createElement("mark").constructor.prototype;
    if (!markProto.getBoundingClientRect) {
      markProto.getBoundingClientRect = () => ({ top: 100, bottom: 120, left: 50, right: 150, width: 100, height: 20 });
    }
    if (!markProto.scrollIntoView) {
      markProto.scrollIntoView = vi.fn();
    }

    win.showToast = vi.fn();
    win.closeAllCardMenus = vi.fn();
    win.filterArticles = vi.fn();
    win.syncLocalEntriesCache = vi.fn();
    win.applyAnnotationsToReader = applyAnnotationsToReader;
    win.openAnnotationNoteModal = openAnnotationNoteModal;
  }

  function setupMockServerAndFetch() {
    nextAnnId = 100;
    syncRev = 1;
    postDelayMs = 10;
    patchDelayMs = 10;
    syncDelayMs = 10;

    serverEntries = [
      {
        id: 1,
        title: "Test Article",
        url: "https://example.com/article",
        content: "<p>The quick brown fox jumps over the lazy dog in the quiet forest.</p>",
        annotations: [
          {
            id: 10,
            entry_id: 1,
            quote: "quick brown fox",
            text: "Initial note",
            color: "yellow",
            target: { selector: { type: "TextQuoteSelector", exact: "quick brown fox" } },
            created_at: "2026-01-01T00:00:00.000Z"
          }
        ]
      }
    ];

    const mockAuthFetch = vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method || "GET").toUpperCase();
      const body = init?.body ? JSON.parse(String(init.body)) : {};

      // POST /api/annotations/:entryId.json
      const postMatch = url.match(/\/api\/annotations\/(\d+)\.json/);
      if (method === "POST" && postMatch) {
        const entryId = Number(postMatch[1]);
        await sleep(postDelayMs);
        const entry = serverEntries.find((e) => e.id === entryId);
        if (!entry) return { ok: false, status: 404, json: async () => ({ error: "Entry not found" }) };
        const created = {
          id: ++nextAnnId,
          entry_id: entryId,
          quote: body.quote || "",
          text: body.text || "",
          color: body.color || "yellow",
          target: body.target || null,
          created_at: new Date().toISOString()
        };
        entry.annotations.push(created);
        syncRev++;
        return { ok: true, status: 201, json: async () => cloneEntries([created])[0] };
      }

      // PATCH /api/annotations/:id.json
      const patchMatch = url.match(/\/api\/annotations\/([^/]+)\.json/);
      if (method === "PATCH" && patchMatch) {
        const rawId = patchMatch[1];
        const annId = Number(rawId);
        await sleep(patchDelayMs);
        if (isNaN(annId) || annId <= 0) {
          return { ok: false, status: 400, json: async () => ({ error: "Invalid annotation ID" }) };
        }
        for (const entry of serverEntries) {
          const ann = entry.annotations.find((a: any) => a.id === annId);
          if (ann) {
            if (body.text !== undefined) ann.text = body.text;
            if (body.color !== undefined) ann.color = body.color;
            if (body.quote !== undefined) ann.quote = body.quote;
            syncRev++;
            return { ok: true, status: 200, json: async () => cloneEntries([ann])[0] };
          }
        }
        return { ok: false, status: 404, json: async () => ({ error: "Annotation not found" }) };
      }

      // GET /api/sync.json
      if (method === "GET" && url.startsWith("/api/sync.json")) {
        // Snapshot server state at request start (simulates DB read before concurrent PATCH commits)
        const snapshot = cloneEntries(serverEntries);
        const rev = syncRev;
        await sleep(syncDelayMs);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            up_to_date: false,
            sync_rev: rev,
            entries: snapshot,
            deleted_ids: [],
            total: snapshot.length
          })
        };
      }

      return { ok: false, status: 404, json: async () => ({}) };
    });

    win.authFetch = mockAuthFetch;
    return mockAuthFetch;
  }

  /**
   * Simulates the webapp's loadArticles() sync & reconciliation pipeline.
   */
  async function simulateSyncRefresh() {
    const res = await win.authFetch("/api/sync.json?page=1&perPage=50");
    if (!res.ok) return;
    const data = await res.json();
    win.allEntries = reconcileDeltaSync(win.allEntries, data, true);
    win.syncLocalEntriesCache(win.allEntries);
    if (win.activeArticleId) {
      const activeItem = win.allEntries.find((e: any) => e.id === win.activeArticleId);
      if (activeItem) {
        applyAnnotationsToReader(activeItem);
      }
    }
    renderModalHighlightsList();
  }

  function renderInitialArticle() {
    win.allEntries = cloneEntries(serverEntries);
    win.activeArticleId = 1;
    const readerBody = doc.getElementById("readerBody");
    readerBody.innerHTML = win.allEntries[0].content;
    (readerBody as any)._rawCleanContent = win.allEntries[0].content;
    applyAnnotationsToReader(win.allEntries[0]);
    openArticleHighlightsModal(1);
    doc.getElementById("readerHighlightsModal").classList.remove("open");
  }

  function assertUiMatchesNote(annId: number, expectedText: string) {
    const entry = win.allEntries.find((e: any) => e.id === 1);
    const ann = entry?.annotations?.find((a: any) => a.id === annId);
    expect(ann).toBeDefined();
    expect(ann.text).toBe(expectedText);

    const mark = doc.querySelector(`mark[data-annotation-id="${annId}"]`);
    expect(mark).not.toBeNull();
    if (expectedText) {
      expect(mark.className).toContain("has-note");
      expect(mark.title).toContain(expectedText);
    }

    // Simulate clicking the mark to open the popover
    mark.onclick({ stopPropagation: () => {} });
    expect(doc.getElementById("popoverNoteText").textContent).toBe(expectedText);

    // Check highlights modal list
    renderModalHighlightsList();
    if (expectedText) {
      expect(doc.getElementById("modalHighlightsList").innerHTML).toContain(expectedText);
    }
  }

  beforeEach(() => {
    setupDom();
    closeAnnotationNoteModal();
    setupMockServerAndFetch();
    renderInitialArticle();
  });

  it("updates UI immediately when a background sync replaces allEntries while the note modal is open", async () => {
    const originalAnn = win.allEntries[0].annotations[0];
    openAnnotationNoteModal(originalAnn);

    // While user is typing in the modal, a background sync (e.g., focus/visibilitychange) runs and replaces entry objects in allEntries
    await simulateSyncRefresh();

    // User submits the updated note
    const input = doc.getElementById("annotationNoteInput");
    input.value = "Updated while sync ran";
    await handleSaveAnnotationNoteForm({ preventDefault: () => {} } as any);

    // Server has the updated note
    expect(serverEntries[0].annotations[0].text).toBe("Updated while sync ran");

    // Webapp UI must also reflect the updated note immediately without needing a refresh
    assertUiMatchesNote(10, "Updated while sync ran");
  });

  it("preserves updated note in UI when a stale in-flight sync resolves after PATCH starts", async () => {
    syncDelayMs = 35;
    patchDelayMs = 60;

    // 1. Background sync starts BEFORE the user saves (snapshots "Initial note")
    const inFlightSync = simulateSyncRefresh();
    await sleep(5);

    // 2. User edits and saves the note
    const ann = win.allEntries[0].annotations[0];
    openAnnotationNoteModal(ann);
    doc.getElementById("annotationNoteInput").value = "Fresh note after sync started";
    const savePromise = handleSaveAnnotationNoteForm({ preventDefault: () => {} } as any);

    // 3. Both settle
    await Promise.all([inFlightSync, savePromise]);

    // Server committed the PATCH
    expect(serverEntries[0].annotations[0].text).toBe("Fresh note after sync started");

    // Webapp UI must show the fresh note, NOT revert to the stale sync snapshot
    assertUiMatchesNote(10, "Fresh note after sync started");
  });

  it("persists note in both UI and server when added immediately to a newly created highlight before POST resolves", async () => {
    postDelayMs = 45;
    patchDelayMs = 15;

    const readerBody = doc.getElementById("readerBody");
    const p = readerBody.querySelector("p");
    const textNode = p.firstChild;
    const range = {
      startContainer: textNode,
      startOffset: 0,
      endContainer: textNode,
      endOffset: 0,
      toString: () => "lazy dog"
    };
    win.getSelection = () => ({
      rangeCount: 1,
      isCollapsed: false,
      getRangeAt: () => range,
      toString: () => "lazy dog",
      removeAllRanges: () => {}
    });

    // User creates highlight (POST is in flight for 45ms)
    handleCreateHighlight("yellow");
    const createdTempAnn = win.allEntries[0].annotations.find((a: any) => String(a.id).startsWith("tmp_"));
    expect(createdTempAnn).toBeDefined();

    // User immediately clicks the highlight and adds a note before POST resolves
    openAnnotationNoteModal(createdTempAnn);
    doc.getElementById("annotationNoteInput").value = "Immediate note on new highlight";
    await handleSaveAnnotationNoteForm({ preventDefault: () => {} } as any);

    // Wait for initial POST to also finish
    await sleep(postDelayMs + 20);

    // Server must have the note saved on the newly created annotation
    const serverAnn = serverEntries[0].annotations.find((a: any) => a.quote === "lazy dog");
    expect(serverAnn).toBeDefined();
    expect(serverAnn.text).toBe("Immediate note on new highlight");

    // UI must also show the note on the resolved annotation ID
    assertUiMatchesNote(serverAnn.id, "Immediate note on new highlight");
  });

  it("stress test: 50 randomized iterations of interleaved note updates and background syncs never leave stale UI", async () => {
    const rng = createRng(20261120);

    for (let i = 1; i <= 50; i++) {
      postDelayMs = Math.floor(rng() * 20);
      patchDelayMs = Math.floor(rng() * 25);
      syncDelayMs = Math.floor(rng() * 25);

      const expectedNote = `Stress note revision #${i}`;
      const syncFirst = rng() < 0.5;
      const syncWhileModalOpen = rng() < 0.4;

      let bgSyncPromise: Promise<void> | null = null;
      if (syncFirst) {
        bgSyncPromise = simulateSyncRefresh();
        await sleep(Math.floor(rng() * 10));
      }

      const currentAnn = win.allEntries[0].annotations.find((a: any) => a.id === 10);
      expect(currentAnn).toBeDefined();

      if (rng() < 0.5) {
        openAnnotationNoteModal(currentAnn);
      } else {
        editModalAnnotation(10, 1);
      }

      if (syncWhileModalOpen) {
        await simulateSyncRefresh();
      }

      doc.getElementById("annotationNoteInput").value = expectedNote;
      const savePromise = handleSaveAnnotationNoteForm({ preventDefault: () => {} } as any);

      if (!syncFirst && rng() < 0.6) {
        await sleep(Math.floor(rng() * 10));
        bgSyncPromise = simulateSyncRefresh();
      }

      await Promise.all([savePromise, bgSyncPromise].filter(Boolean));

      expect(serverEntries[0].annotations.find((a: any) => a.id === 10)?.text).toBe(expectedNote);
      assertUiMatchesNote(10, expectedNote);
    }
  });
});
