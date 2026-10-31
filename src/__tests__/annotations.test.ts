import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseHTML } from "linkedom";
import {
  isRtlText,
  highlightTextInNode,
  applyAnnotationsToReader,
  adjustAnnotationSelection
} from "../client/reader/annotations";
import {
  updateHighlightsBadge,
  getSortedAnnotations,
  formatAnnotationReadable,
  formatAllAnnotationsReadable,
  openArticleHighlightsModal,
  filterHighlightsModalList,
  setHighlightsSort,
  batchOpenHighlights
} from "../client/modals/highlights";

describe("Annotations & In-Reader Highlights Engine Unit Tests", () => {
  let doc: any;
  let win: any;

  beforeEach(() => {
    const { document, window } = parseHTML(`
      <!DOCTYPE html>
      <html>
        <body>
          <!-- Reader DOM -->
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

          <!-- Highlights Modal -->
          <div class="modal-backdrop" id="readerHighlightsModal" style="display: none;">
            <div id="highlightsFilterPills">
              <button class="hl-filter-pill active" data-filter="all">All</button>
              <button class="hl-filter-pill" id="hlFilterNotes" data-filter="notes">Notes</button>
              <button class="hl-filter-pill" id="hlFilterYellow" data-filter="yellow">Yellow</button>
            </div>
            <div id="highlightsSortWrap">
              <button class="hl-sort-btn active" id="btnSortPosition">Order</button>
              <button class="hl-sort-btn" id="btnSortTime">Time</button>
            </div>
            <span class="badge" id="modalHighlightsCountBadge">0</span>
            <div id="modalHighlightsList"></div>
          </div>

          <!-- Popovers & Note Modal -->
          <div id="highlightPopover" style="display: none;">
            <span id="highlightPopoverColorDot"></span>
            <span id="highlightPopoverQuotePreview"></span>
            <div id="highlightPopoverNotePreview"></div>
          </div>

          <div id="annotationNoteModal" class="modal-backdrop" style="display: none;">
            <div id="annotationNoteQuotePreview"></div>
            <textarea id="annotationNoteInput"></textarea>
            <input type="hidden" id="annotationNoteQuoteInput" value="" />
          </div>
        </body>
      </html>
    `);

    doc = document;
    win = window;
    (global as any).document = doc;
    (global as any).window = win;
    win.allEntries = [];
    win.activeArticleId = 1;
    win.selectedArticleIds = new Set();
    win.showToast = vi.fn();
    win.closeAllCardMenus = vi.fn();
  });

  describe("BiDi & Text Direction Detection", () => {
    it("detects RTL correctly for Hebrew and Arabic text", () => {
      expect(isRtlText("שלום עולם")).toBe(true);
      expect(isRtlText("مرحبا بالعالم")).toBe(true);
      expect(isRtlText("Hello world")).toBe(false);
      expect(isRtlText("12345")).toBe(false);
      expect(isRtlText("")).toBe(false);
    });
  });

  describe("DOM Highlight Marking (highlightTextInNode)", () => {
    it("splits text node and wraps matching quote in mark.reader-hl", () => {
      const container = doc.createElement("p");
      container.textContent = "The quick brown fox jumps over the lazy dog";
      doc.body.appendChild(container);

      highlightTextInNode(container, {
        id: "ann-42",
        quote: "brown fox",
        color: "yellow",
        text: "Important detail"
      });

      const mark = container.querySelector("mark.reader-hl");
      expect(mark).not.toBeNull();
      expect(mark.textContent).toBe("brown fox");
      expect(mark.classList.contains("reader-hl-yellow")).toBe(true);
      expect(mark.classList.contains("has-note")).toBe(true);
      expect(mark.getAttribute("data-annotation-id")).toBe("ann-42");
    });
  });

  describe("applyAnnotationsToReader", () => {
    it("renders annotations into readerBody and updates badge", () => {
      const readerBody = doc.getElementById("readerBody");
      readerBody.innerHTML = "<p>Cloudflare Workers provide ultra-fast edge compute for serverless applications.</p>";

      const item = {
        id: 1,
        title: "Cloudflare Edge",
        content: readerBody.innerHTML,
        annotations: [
          {
            id: 101,
            quote: "ultra-fast edge compute",
            color: "green",
            text: "Core architectural pillar",
            created_at: "2026-01-01T10:00:00Z"
          }
        ]
      };
      win.allEntries = [item];

      applyAnnotationsToReader(item);

      const mark = readerBody.querySelector("mark.reader-hl");
      expect(mark).not.toBeNull();
      expect(mark.textContent).toBe("ultra-fast edge compute");
      expect(mark.classList.contains("reader-hl-green")).toBe(true);

      const badge = doc.getElementById("readerHighlightsBadge");
      expect(badge.textContent).toBe("1");
      expect(badge.style.display).toBe("inline-flex");
    });

    it("restores clean HTML before reapplying annotations to prevent nesting corruption", () => {
      const readerBody = doc.getElementById("readerBody");
      const cleanHTML = "<p>First paragraph with critical insights and data points.</p>";
      readerBody.innerHTML = cleanHTML;

      const item = {
        id: 1,
        title: "Insights",
        content: cleanHTML,
        annotations: [
          { id: 201, quote: "critical insights", color: "yellow" },
          { id: 202, quote: "data points", color: "blue" }
        ]
      };
      win.allEntries = [item];

      // First run
      applyAnnotationsToReader(item);
      expect(readerBody.querySelectorAll("mark.reader-hl").length).toBe(2);

      // Re-run with one annotation removed
      item.annotations = [{ id: 201, quote: "critical insights", color: "yellow" }];
      applyAnnotationsToReader(item);

      const marks = readerBody.querySelectorAll("mark.reader-hl");
      expect(marks.length).toBe(1);
      expect(marks[0].textContent).toBe("critical insights");
    });
  });

  describe("Highlights Badge (updateHighlightsBadge)", () => {
    it("hides badge when count is zero and shows count when positive", () => {
      const badgeDesk = doc.getElementById("readerHighlightsBadge");
      const badgeMob = doc.getElementById("readerHighlightsBadgeMobile");

      updateHighlightsBadge(0);
      expect(badgeDesk.style.display).toBe("none");
      expect(badgeMob.style.display).toBe("none");

      updateHighlightsBadge(5);
      expect(badgeDesk.style.display).toBe("inline-flex");
      expect(badgeDesk.textContent).toBe("5");
      expect(badgeMob.textContent).toBe("5");
    });
  });

  describe("Annotation Sorting (getSortedAnnotations)", () => {
    const item = {
      annotations: [
        { id: 1, quote: "Quote A", created_at: "2026-01-01T12:00:00Z" },
        { id: 2, quote: "Quote B", created_at: "2026-01-02T12:00:00Z" },
        { id: 3, quote: "Quote C", created_at: "2026-01-03T12:00:00Z" }
      ]
    };

    it("sorts by newest time", () => {
      const sorted = getSortedAnnotations(item, "time");
      expect(sorted.map(a => a.id)).toEqual([3, 2, 1]);
    });

    it("returns annotations copy for position", () => {
      const sorted = getSortedAnnotations(item, "position");
      expect(sorted.length).toBe(3);
    });
  });

  describe("Readable Text Formatting for Clipboard", () => {
    it("formats a single annotation with quote and note", () => {
      const ann = {
        quote: "Edge compute sub-millisecond cold starts",
        text: "Highlighting performance gains",
        color: "yellow"
      };
      const formatted = formatAnnotationReadable(ann);
      expect(formatted).toContain('"Edge compute sub-millisecond cold starts"');
      expect(formatted).toContain("Note: Highlighting performance gains");
    });

    it("formats all annotations as readable text with article title", () => {
      const annotations = [
        { quote: "Point 1", text: "First note" },
        { quote: "Point 2", text: "" }
      ];
      const result = formatAllAnnotationsReadable(annotations, "Architecture Overview");
      expect(result).toContain("Highlights & Notes: Architecture Overview");
      expect(result).toContain('"Point 1"');
      expect(result).toContain("Note: First note");
      expect(result).toContain('"Point 2"');
    });
  });

  describe("Highlights Navigator Modal UI", () => {
    it("opens highlights modal and displays list of annotations", () => {
      const item = {
        id: 77,
        title: "Test Article With Highlights",
        annotations: [
          { id: "h1", quote: "Alpha quote", text: "Alpha note", color: "yellow", created_at: "2026-01-01" },
          { id: "h2", quote: "Beta quote", text: "", color: "blue", created_at: "2026-01-02" }
        ]
      };
      win.allEntries = [item];

      openArticleHighlightsModal(77);

      const modal = doc.getElementById("readerHighlightsModal");
      expect(modal.classList.contains("open")).toBe(true);
      const content = doc.getElementById("modalHighlightsList");
      expect(content.innerHTML).toContain("Alpha quote");
      expect(content.innerHTML).toContain("Beta quote");
      expect(content.innerHTML).toContain("Alpha note");
    });

    it("filters highlights modal list by notes and color", () => {
      const item = {
        id: 88,
        title: "Filtered Article",
        annotations: [
          { id: "h1", quote: "Quote with note", text: "My Note", color: "yellow" },
          { id: "h2", quote: "Quote without note", text: "", color: "yellow" }
        ]
      };
      win.allEntries = [item];
      openArticleHighlightsModal(88);

      const content = doc.getElementById("modalHighlightsList");

      // Filter by notes only
      filterHighlightsModalList("notes", doc.getElementById("hlFilterNotes"));
      expect(content.innerHTML).toContain("Quote with note");
      expect(content.innerHTML).not.toContain("Quote without note");
    });

    it("changes sort mode and updates active button state", () => {
      const item = {
        id: 99,
        title: "Sorted Article",
        annotations: [
          { id: 1, quote: "First", created_at: "2026-01-01" },
          { id: 2, quote: "Second", created_at: "2026-01-02" }
        ]
      };
      win.allEntries = [item];
      openArticleHighlightsModal(99);

      const btnTime = doc.getElementById("btnSortTime");
      setHighlightsSort("time", btnTime);
      expect(btnTime.classList.contains("active")).toBe(true);
    });

    it("batchOpenHighlights opens modal for single selected article", () => {
      const item = { id: 123, title: "Batch Target", annotations: [] };
      win.allEntries = [item];
      win.selectedArticleIds = new Set([123]);

      batchOpenHighlights();

      const modal = doc.getElementById("readerHighlightsModal");
      expect(modal.classList.contains("open")).toBe(true);
    });
  });

  describe("Selection Adjustment (adjustAnnotationSelection)", () => {
    it("returns false if mark element is not found in DOM or missing active article", () => {
      win.activeArticleId = null;
      const result = adjustAnnotationSelection({ id: "missing" }, "end", "expand");
      expect(result).toBe(false);
    });

    it("expands end selection to include following text", () => {
      const p = doc.createElement("p");
      p.innerHTML = '<mark class="reader-hl" data-annotation-id="ann-test">Initial</mark> following words in paragraph';
      doc.getElementById("readerBody").appendChild(p);

      const item = {
        id: 1,
        title: "Selection Article",
        content: "<p>Initial following words in paragraph</p>",
        annotations: []
      };
      win.allEntries = [item];
      win.activeArticleId = 1;

      const ann = { id: "ann-test", quote: "Initial" };
      const updated = adjustAnnotationSelection(ann, "end", "expand");
      expect(updated).toBe(true);
      expect(ann.quote).toBe("Initial following");
    });
  });
});
