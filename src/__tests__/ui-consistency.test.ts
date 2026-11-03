import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseHTML } from "linkedom";
import fs from "node:fs";
import path from "node:path";
import {
  PAT_SORT_OPTIONS,
  generatePatSortMenuHtml,
  togglePatSortMenu,
  closePatSortMenu,
  setPatSortOrder,
  getPatSortOrder,
  sortPatTokens,
  renderPersonalTokens,
  setLoadedPatTokens
} from "../client/modals/settings";

describe("UI Consistency & System Dialog Audit", () => {
  const htmlRoot = path.resolve(__dirname, "../client/html");

  function getHtmlFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getHtmlFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it("ensures no native <select> elements exist in any modal or workspace templates", () => {
    const allHtmlFiles = getHtmlFiles(htmlRoot);
    expect(allHtmlFiles.length).toBeGreaterThan(5);

    const violations: { file: string; line: number; match: string }[] = [];

    for (const file of allHtmlFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (/<select\b/i.test(line)) {
          violations.push({
            file: path.relative(htmlRoot, file),
            line: idx + 1,
            match: line.trim()
          });
        }
      });
    }

    expect(
      violations,
      `Found native <select> elements which degrade visual consistency across OS platforms. Replace with .card-dropdown-menu and .menu-item components:\n${violations.map(v => `${v.file}:${v.line} -> ${v.match}`).join("\n")}`
    ).toEqual([]);
  });

  it("ensures no native system dialogs (prompt, alert, confirm) exist in client source code", () => {
    const clientRoot = path.resolve(__dirname, "../client");
    function getTsFiles(dir: string): string[] {
      const files: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...getTsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".ts")) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const allTsFiles = getTsFiles(clientRoot);
    expect(allTsFiles.length).toBeGreaterThan(10);

    const violations: { file: string; line: number; match: string }[] = [];
    const systemDialogRegex = /(?:\bwindow\.(?:prompt|alert|confirm)\s*\(|\bprompt\s*\(|\balert\s*\(|(?<!show[A-Za-z0-9_]*|handle[A-Za-z0-9_]*)\bconfirm\s*\()/;

    for (const file of allTsFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        if (systemDialogRegex.test(line)) {
          violations.push({
            file: path.relative(clientRoot, file),
            line: idx + 1,
            match: trimmed
          });
        }
      });
    }

    expect(
      violations,
      `Found native system dialogs (prompt/alert/confirm) which degrade visual consistency across OS platforms. Replace with custom modal dialogs (e.g. showPromptDialog, showConfirmDialog):\n${violations.map(v => `${v.file}:${v.line} -> ${v.match}`).join("\n")}`
    ).toEqual([]);
  });

  it("verifies all dropdown menus utilize standard .card-dropdown-menu and .menu-item conventions", () => {
    const settingsHtml = fs.readFileSync(path.join(htmlRoot, "modals/settings.html"), "utf-8");
    const articleListHtml = fs.readFileSync(path.join(htmlRoot, "workspace/article-list.html"), "utf-8");

    // Settings PAT sort menu
    expect(settingsHtml).toContain('id="patSortBtn"');
    expect(settingsHtml).toContain('id="patSortDropdownMenu"');
    expect(settingsHtml).toContain('class="search-dropdown-menu card-dropdown-menu open-down"');
    expect(settingsHtml).toContain('togglePatSortMenu()');

    // Article list sort menu
    expect(articleListHtml).toContain('id="sortBtn"');
    expect(articleListHtml).toContain('id="sortDropdownMenu"');
    expect(articleListHtml).toContain('card-dropdown-menu');
    expect(articleListHtml).toContain('menu-item');
  });
});

describe("Personal Access Tokens (PAT) Sort Menu Unit Tests", () => {
  beforeEach(() => {
    const { document, window } = parseHTML(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="patSortBar" style="display: none;">
            <span id="patTokensCount">0 tokens</span>
            <div class="card-menu-wrap" style="position: relative;">
              <button type="button" id="patSortBtn" onclick="togglePatSortMenu()">
                <span>Sort:</span>
                <span id="patSortBtnLabel">Recently Used</span>
              </button>
              <div id="patSortDropdownMenu" class="search-dropdown-menu card-dropdown-menu open-down"></div>
            </div>
          </div>
          <div id="patTokensContainer"></div>
        </body>
      </html>
    `);

    (global as any).document = document;
    (global as any).window = window;

    // LocalStorage mock
    const store: Record<string, string> = {};
    const localStorageMock = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { for (const k in store) delete store[k]; })
    };
    (global as any).localStorage = localStorageMock;
  });

  it("PAT_SORT_OPTIONS defines all expected sorting options with labels and icons", () => {
    const ids = PAT_SORT_OPTIONS.map(o => o.id);
    expect(ids).toEqual([
      "last_used_desc",
      "unused_first",
      "created_desc",
      "created_asc",
      "label_asc"
    ]);
    for (const opt of PAT_SORT_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(opt.iconSvg).toContain("<");
    }
  });

  it("generatePatSortMenuHtml marks the active option with .active and checkmark ✓", () => {
    const html = generatePatSortMenuHtml("unused_first");
    expect(html).toContain('class="menu-item active"');
    expect(html).toContain("✓");
    expect(html).toContain("Unused First");
    expect(html).toContain("setPatSortOrder('unused_first')");
    expect(html).toContain("setPatSortOrder('last_used_desc')");
  });

  it("togglePatSortMenu opens and closes patSortDropdownMenu", () => {
    const menu = document.getElementById("patSortDropdownMenu");
    expect(menu?.classList.contains("open")).toBe(false);

    togglePatSortMenu();
    expect(menu?.classList.contains("open")).toBe(true);
    expect(menu?.innerHTML).toContain("Recently Used");

    togglePatSortMenu();
    expect(menu?.classList.contains("open")).toBe(false);
  });

  it("closePatSortMenu closes the menu cleanly", () => {
    const menu = document.getElementById("patSortDropdownMenu");
    menu?.classList.add("open");
    closePatSortMenu();
    expect(menu?.classList.contains("open")).toBe(false);
  });

  it("setPatSortOrder persists selection to localStorage and updates button label", () => {
    setLoadedPatTokens([
      { id: 1, label: "Beta Token", token_prefix: "wf_123", created_at: "2026-10-01T10:00:00Z" }
    ]);

    setPatSortOrder("label_asc");

    expect(localStorage.getItem("wf_pat_sort")).toBe("label_asc");
    expect(getPatSortOrder()).toBe("label_asc");

    const labelEl = document.getElementById("patSortBtnLabel");
    expect(labelEl?.textContent).toBe("Label (A–Z)");
  });

  it("sortPatTokens correctly sorts by unused_first, last_used_desc, created, and label", () => {
    const tokens = [
      { id: 1, label: "Zeta Token", created_at: "2026-10-01T10:00:00Z", last_used_at: "2026-10-25T12:00:00Z" },
      { id: 2, label: "Alpha Unused", created_at: "2026-10-10T10:00:00Z", last_used_at: null },
      { id: 3, label: "Gamma Token", created_at: "2026-10-05T10:00:00Z", last_used_at: "2026-10-30T15:00:00Z" }
    ];

    // 1. unused_first
    const byUnused = sortPatTokens(tokens, "unused_first");
    expect(byUnused[0].id).toBe(2); // Alpha Unused first

    // 2. last_used_desc
    const byUsed = sortPatTokens(tokens, "last_used_desc");
    expect(byUsed[0].id).toBe(3); // Oct 30
    expect(byUsed[1].id).toBe(1); // Oct 25
    expect(byUsed[2].id).toBe(2); // never used

    // 3. label_asc
    const byLabel = sortPatTokens(tokens, "label_asc");
    expect(byLabel[0].label).toBe("Alpha Unused");
    expect(byLabel[1].label).toBe("Gamma Token");
    expect(byLabel[2].label).toBe("Zeta Token");

    // 4. created_asc
    const byCreatedAsc = sortPatTokens(tokens, "created_asc");
    expect(byCreatedAsc[0].id).toBe(1); // Oct 1
    expect(byCreatedAsc[1].id).toBe(3); // Oct 5
    expect(byCreatedAsc[2].id).toBe(2); // Oct 10
  });

  it("renderPersonalTokens shows unused count badge and hides sort bar when empty", () => {
    setLoadedPatTokens([]);
    renderPersonalTokens();

    const sortBar = document.getElementById("patSortBar");
    const container = document.getElementById("patTokensContainer");
    expect(sortBar?.style.display).toBe("none");
    expect(container?.textContent).toContain("No active tokens");

    setLoadedPatTokens([
      { id: 1, label: "Token 1", token_prefix: "wf_1", created_at: "2026-10-01", last_used_at: null },
      { id: 2, label: "Token 2", token_prefix: "wf_2", created_at: "2026-10-02", last_used_at: "2026-10-20" }
    ]);
    renderPersonalTokens();

    expect(sortBar?.style.display).toBe("flex");
    const countEl = document.getElementById("patTokensCount");
    expect(countEl?.textContent).toBe("2 tokens (1 unused)");
    expect(container?.innerHTML).toContain("Never used");
  });
});
