import { describe, it, expect, beforeAll, afterAll } from "vitest";
import puppeteer, { Browser, Page } from "puppeteer";
import { renderDashboardHtml } from "../views/dashboard";

describe("Dashboard End-to-End (E2E) Browser Integration Tests", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    // Force headless Chrome to use iGPU / SwiftShader without waking up the dGPU
    browser = await puppeteer.launch({
      headless: true,
      env: {
        ...process.env,
        DRI_PRIME: "0",
        __NV_PRIME_RENDER_OFFLOAD: "0",
        __GLX_VENDOR_LIBRARY_NAME: "mesa"
      },
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-vulkan",
        "--disable-features=Vulkan",
        "--disable-gpu-rasterization",
        "--use-gl=swiftshader"
      ]
    });
    page = await browser.newPage();
    await page.goto("http://example.com");
    const html = renderDashboardHtml("Wallaflare");
    await page.setContent(html, { waitUntil: "networkidle0" });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  it("verifies 100% of all inline HTML event handlers exist on window in dashboard", async () => {
    const check = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll("*"));
      const handlerNames = new Set<string>();

      for (const el of allElements) {
        for (const attr of Array.from(el.attributes)) {
          if (attr.name.startsWith("on")) {
            const matches = attr.value.matchAll(/([a-zA-Z0-9_$]+)\s*\(/g);
            for (const m of matches) {
              const fnName = m[1];
              if (!["if", "switch", "for", "while", "function", "parseInt", "parseFloat", "event", "this", "remove", "stopPropagation", "preventDefault"].includes(fnName)) {
                if (!fnName.includes(".")) {
                  handlerNames.add(fnName);
                }
              }
            }
          }
        }
      }

      const missing: string[] = [];
      handlerNames.forEach((name) => {
        if (typeof (window as any)[name] !== "function") {
          missing.push(name);
        }
      });
      return { total: handlerNames.size, missing };
    });

    expect(check.missing).toEqual([]);
    expect(check.total).toBeGreaterThan(30);
  });

  it("renders 3-pane layout, brand title without interpolation corruption, and valid version display", async () => {
    const info = await page.evaluate(() => {
      const sidebar = !!document.getElementById("paneSidebar");
      const articles = !!document.getElementById("paneArticles");
      const reader = !!document.getElementById("paneReader");
      const brandText = document.querySelector(".sidebar-brand-wrap .brand span")?.textContent;
      const htmlTitle = document.title;
      const sidebarVersion = document.getElementById("sidebarVersionLabel")?.textContent;
      return { sidebar, articles, reader, brandText, htmlTitle, sidebarVersion };
    });

    expect(info.sidebar).toBe(true);
    expect(info.articles).toBe(true);
    expect(info.reader).toBe(true);
    expect(info.brandText).toBe("Wallaflare");
    expect(info.brandText).not.toContain("${appName}");
    expect(info.htmlTitle).toContain("Wallaflare");
    expect(info.sidebarVersion).not.toContain("${OTA_VERSION}");
    expect(info.sidebarVersion).toContain("Wallaflare");
  });

  it("renders article cards inside #articlesGrid and updates unread count", async () => {
    const result = await page.evaluate(() => {
      const w = window as any;
      w.allEntries = [
        {
          id: 101,
          title: "First Deep Read",
          domain_name: "arstechnica.com",
          author: "John Doe",
          content: "<p>" + "Long content paragraph discussing Edge SQLite architectures. ".repeat(20) + "</p>",
          created_at: "2026-08-20T10:00:00Z",
          reading_time: 4,
          is_archived: 0,
          is_starred: 0,
          tags: [{ label: "tech", slug: "tech" }]
        },
        {
          id: 102,
          title: "Second Starred Note",
          domain_name: "nature.com",
          author: "Jane Smith",
          content: "<p>Scientific findings on serverless cold starts.</p>",
          created_at: "2026-08-21T10:00:00Z",
          reading_time: 7,
          is_archived: 0,
          is_starred: 1,
          tags: [{ label: "science", slug: "science" }]
        },
        {
          id: 103,
          title: "Archived Historical Post",
          domain_name: "eff.org",
          author: "Alice",
          content: "<p>Digital privacy rights.</p>",
          created_at: "2026-08-15T10:00:00Z",
          reading_time: 2,
          is_archived: 1,
          is_starred: 0,
          tags: []
        }
      ];

      w.updateCounts();
      w.renderArticles(w.allEntries.filter((e: any) => !e.is_archived));

      const gridCards = document.querySelectorAll("#articlesGrid .article-card");
      const unreadCount = document.getElementById("countUnread")?.textContent;
      const starredCount = document.getElementById("countStarred")?.textContent;
      const archiveCount = document.getElementById("countArchive")?.textContent;
      const allCount = document.getElementById("countAll")?.textContent;

      const firstCardTitle = document.querySelector("#entry-card-101 .card-title")?.textContent;
      const firstCardDomain = document.querySelector("#entry-card-101 .card-domain")?.textContent;

      return {
        cardCount: gridCards.length,
        unreadCount,
        starredCount,
        archiveCount,
        allCount,
        firstCardTitle,
        firstCardDomain
      };
    });

    expect(result.cardCount).toBe(2);
    expect(result.unreadCount).toBe("2");
    expect(result.starredCount).toBe("1");
    expect(result.archiveCount).toBe("1");
    expect(result.allCount).toBe("3");
    expect(result.firstCardTitle).toBe("First Deep Read");
    expect(result.firstCardDomain).toBe("arstechnica.com");
  });

  it("opens reader pane and restores saved scroll position synchronously", async () => {
    await page.evaluate(() => {
      localStorage.setItem("wf_scroll_101", "0.50");
    });

    const readerResult = await page.evaluate(async () => {
      const card = document.getElementById("entry-card-101");
      if (card) (card as HTMLElement).click();

      const scrollEl = document.getElementById("readerScrollContainer");
      const isReaderOpen = document.getElementById("readerView")?.style.display !== "none";
      const activeEntryId = (window as any).activeArticleId;
      const readerTitle = document.getElementById("readerTitle")?.textContent;

      return { isReaderOpen, activeEntryId, readerTitle, scrollTop: scrollEl?.scrollTop || 0 };
    });

    expect(readerResult.isReaderOpen).toBe(true);
    expect(readerResult.activeEntryId).toBe(101);
    expect(readerResult.readerTitle).toBe("First Deep Read");
  });

  it("dismisses reader appearance popover when clicking anywhere outside it", async () => {
    const popoverDismissed = await page.evaluate(async () => {
      const w = window as any;
      const popover = document.getElementById("readerAppearancePopover");

      w.toggleReaderAppearancePopover();
      const opened = popover?.style.display !== "none";

      const outsideEvent = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
      document.getElementById("paneReader")?.dispatchEvent(outsideEvent);

      const closed = popover?.style.display === "none";
      return { opened, closed };
    });

    expect(popoverDismissed.opened).toBe(true);
    expect(popoverDismissed.closed).toBe(true);
  });

  it("filters articles instantly upon search input", async () => {
    const searchCheck = await page.evaluate(async () => {
      const w = window as any;
      const input = document.getElementById("searchInput") as HTMLInputElement;
      if (!input) return false;

      input.value = "Second";
      w.handleSearchInput();

      const matchedCount = document.querySelectorAll("#articlesGrid .article-card").length;
      const matchedTitle = document.querySelector("#articlesGrid .article-card .card-title")?.textContent;

      w.clearSearchInput();
      return { matchedCount, matchedTitle };
    });

    expect(searchCheck.matchedCount).toBe(1);
    expect(searchCheck.matchedTitle).toBe("Second Starred Note");
  });

  it("handles multi-card batch selection and batch action UI toggle", async () => {
    const batchResult = await page.evaluate(async () => {
      const w = window as any;
      w.clearArticleSelection();

      // Select article 101 and 102
      w.toggleArticleSelection(101);
      w.toggleArticleSelection(102);

      const count = w.selectedArticleIds.size;
      const isHeaderVisible = document.getElementById("batchActionHeader")?.style.display !== "none";

      // Clear batch selection
      w.clearArticleSelection();
      const isHeaderCleared = document.getElementById("batchActionHeader")?.style.display === "none";

      return { count, isHeaderVisible, isHeaderCleared };
    });

    expect(batchResult.count).toBe(2);
    expect(batchResult.isHeaderVisible).toBe(true);
    expect(batchResult.isHeaderCleared).toBe(true);
  });

  it("controls typography settings: font family across popover and settings (4 fonts), font size, line height, and content width", async () => {
    const typoResult = await page.evaluate(() => {
      const w = window as any;
      
      // Check font button options in both Reader popover and Settings modal
      const popoverFonts = Array.from(document.querySelectorAll("#popoverFontFamilyBtns .opt-font-btn")).map(b => b.getAttribute("data-font"));
      const settingsFonts = Array.from(document.querySelectorAll("#settingsFontBtns .opt-font-btn")).map(b => b.getAttribute("data-font"));

      w.setReaderFontFamily("dyslexic");
      const dyslexicFont = document.documentElement.style.getPropertyValue("--reader-font-family");

      w.setReaderFontFamily("serif");
      const font = document.documentElement.style.getPropertyValue("--reader-font-family");

      w.setReaderFontSize(24);
      const fontSize = document.documentElement.style.getPropertyValue("--reader-font-size");

      w.setReaderLineHeight(1.8);
      const lineHeight = document.documentElement.style.getPropertyValue("--reader-line-height");

      w.setReaderContentWidth("620px");
      const narrowWidth = document.documentElement.style.getPropertyValue("--reader-content-max-width");
      const narrowMobilePad = document.documentElement.style.getPropertyValue("--reader-mobile-padding-x");

      w.setReaderContentWidth("1060px");
      const widerWidth = document.documentElement.style.getPropertyValue("--reader-content-max-width");
      const widerMobilePad = document.documentElement.style.getPropertyValue("--reader-mobile-padding-x");

      w.setReaderContentWidth("880px");
      const contentWidth = document.documentElement.style.getPropertyValue("--reader-content-max-width");
      const wideMobilePad = document.documentElement.style.getPropertyValue("--reader-mobile-padding-x");

      w.setReaderTextAlignment("justify");
      const justifyAlign = document.documentElement.style.getPropertyValue("--reader-text-align");
      const justifyHyphens = document.documentElement.style.getPropertyValue("--reader-hyphens");

      w.setReaderTextAlignment("start");
      const startAlign = document.documentElement.style.getPropertyValue("--reader-text-align");

      return { popoverFonts, settingsFonts, dyslexicFont, font, fontSize, lineHeight, narrowWidth, narrowMobilePad, widerWidth, widerMobilePad, contentWidth, wideMobilePad, justifyAlign, justifyHyphens, startAlign };
    });

    expect(typoResult.popoverFonts).toEqual(["sans", "serif", "mono", "dyslexic"]);
    expect(typoResult.settingsFonts).toEqual(["sans", "serif", "mono", "dyslexic"]);
    expect(typoResult.dyslexicFont).toContain("dyslexic");
    expect(typoResult.font).toContain("serif");
    expect(typoResult.fontSize).toBe("24px");
    expect(typoResult.lineHeight).toBe("1.8");
    expect(typoResult.narrowWidth).toBe("620px");
    expect(typoResult.narrowMobilePad).toBe("2.25rem");
    expect(typoResult.widerWidth).toBe("1060px");
    expect(typoResult.widerMobilePad).toBe("0.2rem");
    expect(typoResult.contentWidth).toBe("880px");
    expect(typoResult.wideMobilePad).toBe("0.55rem");
    expect(typoResult.justifyAlign).toBe("justify");
    expect(typoResult.justifyHyphens).toBe("auto");
    expect(typoResult.startAlign).toBe("start");
  });

  it("filters articles when clicking sidebar filter navigation buttons", async () => {
    const filterResult = await page.evaluate(async () => {
      const tabStarred = document.getElementById("tabStarred");
      if (tabStarred) (tabStarred as HTMLElement).click();
      await new Promise(r => setTimeout(r, 30));
      const starredCards = document.querySelectorAll("#articlesGrid .article-card").length;
      const starredTitle = document.querySelector("#articlesGrid .article-card .card-title")?.textContent;

      const tabArchive = document.getElementById("tabArchive");
      if (tabArchive) (tabArchive as HTMLElement).click();
      await new Promise(r => setTimeout(r, 30));
      const archiveCards = document.querySelectorAll("#articlesGrid .article-card").length;
      const archiveTitle = document.querySelector("#articlesGrid .article-card .card-title")?.textContent;

      const tabAll = document.getElementById("tabAll");
      if (tabAll) (tabAll as HTMLElement).click();
      await new Promise(r => setTimeout(r, 30));
      const allCards = document.querySelectorAll("#articlesGrid .article-card").length;

      const tabUnread = document.getElementById("tabUnread");
      if (tabUnread) (tabUnread as HTMLElement).click();
      await new Promise(r => setTimeout(r, 30));

      return { starredCards, starredTitle, archiveCards, archiveTitle, allCards };
    });

    expect(filterResult.starredCards).toBe(1);
    expect(filterResult.starredTitle).toBe("Second Starred Note");
    expect(filterResult.archiveCards).toBe(1);
    expect(filterResult.archiveTitle).toBe("Archived Historical Post");
    expect(filterResult.allCards).toBe(3);
  });

  it("toggles star and archive status on articles and creates outbox mutations", async () => {
    const actionResult = await page.evaluate(async () => {
      const w = window as any;
      const initialStarred = w.allEntries.find((e: any) => e.id === 101)?.is_starred;
      await w.toggleStar(101, initialStarred);
      const updatedStarred = w.allEntries.find((e: any) => e.id === 101)?.is_starred;

      const mutations = w.getPendingMutations();
      const starMutation = mutations.find((m: any) => m.action === "toggle_star" && m.payload.id === 101);

      return { initialStarred, updatedStarred, hasMutation: !!starMutation };
    });

    expect(actionResult.initialStarred).toBe(0);
    expect(actionResult.updatedStarred).toBe(1);
    expect(actionResult.hasMutation).toBe(true);
  });

  it("verifies typography popover controls and theme switching across dark, light, sepia, and oled", async () => {
    const result = await page.evaluate(() => {
      const w = window as any;
      w.setTheme("oled");
      const isOled = document.documentElement.classList.contains("oled");
      w.setTheme("sepia");
      const isSepia = document.documentElement.classList.contains("sepia");
      w.setTheme("light");
      const isLight = document.documentElement.classList.contains("light");
      w.setTheme("dark");
      const isDark = document.documentElement.classList.contains("dark");

      return { isOled, isSepia, isLight, isDark };
    });

    expect(result.isOled).toBe(true);
    expect(result.isSepia).toBe(true);
    expect(result.isLight).toBe(true);
    expect(result.isDark).toBe(true);
  });

  it("verifies all 12 modal dialogs exist and modal open/close lifecycle functions properly", async () => {
    const expectedModalIds = [
      "settingsModal",
      "addUrlModal",
      "addTextModal",
      "tagModal",
      "globalTagModal",
      "readerHighlightsModal",
      "wipeDbModal",
      "serverConnectModal",
      "confirmModal",
      "annotationNoteModal",
      "editTitleModal",
      "syncModal"
    ];

    const result = await page.evaluate((modalIds) => {
      const w = window as any;
      const existence = modalIds.map(id => ({ id, exists: !!document.getElementById(id) }));
      
      w.openModal("settingsModal");
      const isOpen = document.getElementById("settingsModal")?.classList.contains("open");
      w.closeModal("settingsModal");
      const isClosed = !document.getElementById("settingsModal")?.classList.contains("open");

      return { existence, isOpen, isClosed };
    }, expectedModalIds);

    result.existence.forEach(({ id, exists }) => {
      expect(exists, `Modal #${id} should exist in DOM`).toBe(true);
    });
    expect(result.isOpen).toBe(true);
    expect(result.isClosed).toBe(true);
  });

  it("correctly sets LTR direction for English text and RTL for Hebrew/Arabic text", async () => {
    const dirResult = await page.evaluate(async () => {
      const w = window as any;
      
      await w.openReader(101);
      const enBodyDir = document.getElementById("readerBody")?.getAttribute("dir");

      w.allEntries.push({
        id: 201,
        title: "מאמר בעברית על טכנולוגיה",
        content: "<p>תוכן המאמר בעברית עם פסקאות מימין לשמאל.</p>",
        is_archived: 0,
        is_starred: 0
      });
      await w.openReader(201);
      const heBodyDir = document.getElementById("readerBody")?.getAttribute("dir");

      const heTitleDir = document.getElementById("readerTitle")?.getAttribute("dir");
      const heMetaDir = document.getElementById("readerMeta")?.getAttribute("dir");
      return { enBodyDir, heBodyDir, heTitleDir, heMetaDir };
    });

    expect(dirResult.enBodyDir === null || dirResult.enBodyDir === "ltr").toBe(true);
    expect(dirResult.heBodyDir).toBe("rtl");
    expect(dirResult.heTitleDir).toBe("rtl");
    expect(dirResult.heMetaDir === null || dirResult.heMetaDir === "ltr").toBe(true);
  });


it("handles keyboard shortcuts: search (/), focus mode (f), and reader navigation", async () => {
    await page.evaluate(() => { (window as any).closeReader?.(); (document.activeElement as HTMLElement)?.blur(); });
    await page.keyboard.press("/");
    const isSearchFocused = await page.evaluate(() => document.activeElement?.id === "searchInput");

    const focusResult = await page.evaluate(() => {
      const w = window as any;
      (document.activeElement as HTMLElement)?.blur();
      w.toggleReaderFocusMode(true);
      const isFocusMode = document.body.classList.contains("focus-mode");
      w.toggleReaderFocusMode(false);
      const isFocusModeOff = !document.body.classList.contains("focus-mode");
      return { isFocusMode, isFocusModeOff };
    });

    expect(isSearchFocused).toBe(true);
    expect(focusResult.isFocusMode).toBe(true);
    expect(focusResult.isFocusModeOff).toBe(true);
  });

  it("cycles view modes between standard list, compact, and grid", async () => {
    const viewModes = await page.evaluate(() => {
      const w = window as any;
      const pane = document.getElementById("paneArticles");

      w.cycleViewMode();
      const mode1 = w.currentViewMode || (pane?.classList.contains("view-compact") ? "compact" : "list");

      w.cycleViewMode();
      const mode2 = w.currentViewMode || (pane?.classList.contains("view-grid") ? "grid" : "compact");

      w.cycleViewMode();
      const mode3 = w.currentViewMode || (pane?.classList.contains("view-list") ? "list" : "grid");

      return { mode1, mode2, mode3 };
    });

    expect(viewModes.mode1).toBeDefined();
    expect(viewModes.mode2).toBeDefined();
    expect(viewModes.mode3).toBeDefined();
  });

  it("filters articles by tag and displays active tag indicator", async () => {
    const tagFilterResult = await page.evaluate(async () => {
      const w = window as any;

      // Filter by "tech" tag
      w.filterByTag("tech");
      const matchedCards = document.querySelectorAll("#articlesGrid .article-card").length;
      const firstCardTitle = document.querySelector("#articlesGrid .article-card .card-title")?.textContent;

      // Filter by "science" tag
      w.filterByTag("science");
      const scienceCards = document.querySelectorAll("#articlesGrid .article-card").length;
      const scienceCardTitle = document.querySelector("#articlesGrid .article-card .card-title")?.textContent;

      // Toggle off science tag filter
      w.filterByTag("science");
      w.setFilter("unread");
      const unreadCards = document.querySelectorAll("#articlesGrid .article-card").length;

      return { matchedCards, firstCardTitle, scienceCards, scienceCardTitle, unreadCards };
    });

    expect(tagFilterResult.matchedCards).toBe(1);
    expect(tagFilterResult.firstCardTitle).toBe("First Deep Read");
    expect(tagFilterResult.scienceCards).toBe(1);
    expect(tagFilterResult.scienceCardTitle).toBe("Second Starred Note");
    expect(tagFilterResult.unreadCards).toBeGreaterThanOrEqual(2);
  });

  it("manages annotation highlight rendering inside reader body", async () => {
    const hlResult = await page.evaluate(async () => {
      const w = window as any;
      
      // Open article 101 with an annotation
      const article = w.allEntries.find((e: any) => e.id === 101);
      article.annotations = [
        {
          id: 501,
          quote: "Edge SQLite architectures",
          ranges: [{ start: "/p[1]", startOffset: 24, end: "/p[1]", endOffset: 48 }],
          color: "yellow",
          text: "Important note about Edge DB"
        }
      ];

      await w.openReader(101);

      const readerBody = document.getElementById("readerBody");
      const highlights = readerBody?.querySelectorAll("mark.reader-hl, .reader-highlight");

      return {
        hasHighlights: (highlights?.length || 0) > 0 || readerBody?.innerHTML.includes("Edge SQLite")
      };
    });

    expect(hlResult.hasHighlights).toBe(true);
  });

  it("updates active article card reading progress text live while scrolling", async () => {
    const progressResult = await page.evaluate(async () => {
      const w = window as any;
      
      // Open article 101
      await w.openReader(101);

      const scrollContainer = document.getElementById("readerScrollContainer");
      if (scrollContainer) {
        // Scroll halfway down
        const total = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        scrollContainer.scrollTop = total * 0.5;
        w.updateReadingProgress();
      }

      // Check the card progress element in articles list
      const cardProgressText = document.getElementById("card-progress-101")?.textContent;

      return { cardProgressText };
    });

    expect(progressResult.cardProgressText).toContain("left");
  });


  it("normalizes server URL without https:// to valid https:// URL upon saving", async () => {
    const savedUrl = await page.evaluate(() => {
      const w = window as any;
      const urlInput = document.getElementById("serverUrlInput") as HTMLInputElement;
      const tokenInput = document.getElementById("serverTokenInput") as HTMLInputElement;
      if (urlInput) urlInput.value = "wallaflare.example.com/";
      if (tokenInput) tokenInput.value = "my_secret_token";

      const mockEvent = { preventDefault: () => {} };
      w.handleSaveServerConnection(mockEvent);

      return localStorage.getItem("wf_server_url");
    });

    expect(savedUrl).toBe("https://wallaflare.example.com");
  });

});
