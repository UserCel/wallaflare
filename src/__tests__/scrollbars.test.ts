import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseHTML } from "linkedom";
import { initAppScrollbars, isDesktopPointerEnvironment } from "../client/utils/scrollbars";
import { clientDashboardCss } from "../views/dashboard-bundle";

function mockScrollableMetrics(el: any, opts: { scrollHeight: number; clientHeight: number; rect: { top: number; bottom: number; left: number; right: number; width: number; height: number } }) {
  Object.defineProperty(el, "scrollHeight", { value: opts.scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: opts.clientHeight, configurable: true });
  Object.defineProperty(el, "scrollTop", { value: 0, writable: true, configurable: true });
  el.getBoundingClientRect = () => opts.rect;
}

describe("Desktop App-Native Overlay Scrollbars", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    const { document, window } = parseHTML(
      "<!DOCTYPE html><html><body><div id='readerTopBar'></div><div id='readerScrollContainer'></div><div id='pane'></div></body></html>"
    );
    (globalThis as any).document = document;
    (globalThis as any).window = window;
    (window as any).location = { protocol: "https:", hostname: "wallaflare.example.com" };
    (window as any).matchMedia = vi.fn().mockReturnValue({ matches: true });
    delete (window as any).Capacitor;

    const pane = document.getElementById("pane");
    mockScrollableMetrics(pane, {
      scrollHeight: 1000,
      clientHeight: 400,
      rect: { top: 0, bottom: 400, left: 0, right: 300, width: 300, height: 400 },
    });

    const topBar = document.getElementById("readerTopBar");
    topBar.getBoundingClientRect = () => ({ top: 0, bottom: 54, left: 0, right: 800, width: 800, height: 54 });

    const readerScroll = document.getElementById("readerScrollContainer");
    mockScrollableMetrics(readerScroll, {
      scrollHeight: 2000,
      clientHeight: 600,
      rect: { top: 0, bottom: 600, left: 300, right: 1100, width: 800, height: 600 },
    });
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.useRealTimers();
    delete (globalThis as any).document;
    delete (globalThis as any).window;
  });

  it("detects desktop pointer environment and excludes touch/Capacitor", () => {
    expect(isDesktopPointerEnvironment()).toBe(true);

    (globalThis as any).window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(isDesktopPointerEnvironment()).toBe(false);

    (globalThis as any).window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    (globalThis as any).window.Capacitor = { isNativePlatform: () => true };
    expect(isDesktopPointerEnvironment()).toBe(false);
  });

  it("renders overlay scrollbar on scroll and removes it after inactivity delay", () => {
    const doc = (globalThis as any).document;
    const pane = doc.getElementById("pane");
    const addListenerSpy = vi.spyOn(doc, "addEventListener");

    cleanup = initAppScrollbars(900);
    const scrollHandler = addListenerSpy.mock.calls.find(([type]) => type === "scroll")?.[1] as (e: Event) => void;
    expect(scrollHandler).toBeTypeOf("function");

    const dispatchScrollOnPane = () => {
      scrollHandler({ target: pane } as unknown as Event);
    };

    dispatchScrollOnPane();
    expect(pane.classList.contains("is-scrolling")).toBe(true);
    const track = doc.querySelector(".app-scrollbar-track");
    expect(track).toBeTruthy();
    expect(track.classList.contains("is-visible")).toBe(true);

    // Advance partway and scroll again to ensure timer resets
    vi.advanceTimersByTime(500);
    expect(track.classList.contains("is-visible")).toBe(true);
    dispatchScrollOnPane();

    vi.advanceTimersByTime(500);
    expect(track.classList.contains("is-visible")).toBe(true);

    vi.advanceTimersByTime(450);
    expect(pane.classList.contains("is-scrolling")).toBe(false);
    expect(track.classList.contains("is-visible")).toBe(false);
  });

  it("offsets the reader scrollbar track below #readerTopBar when visible", () => {
    const doc = (globalThis as any).document;
    const readerScroll = doc.getElementById("readerScrollContainer");
    const topBar = doc.getElementById("readerTopBar");
    const addListenerSpy = vi.spyOn(doc, "addEventListener");

    cleanup = initAppScrollbars(900);
    const scrollHandler = addListenerSpy.mock.calls.find(([type]) => type === "scroll")?.[1] as (e: Event) => void;

    // Top bar visible (bottom = 54) -> track top should be >= 58px
    scrollHandler({ target: readerScroll } as unknown as Event);
    const track = doc.querySelector(".app-scrollbar-track") as HTMLElement;
    expect(parseInt(track.style.top, 10)).toBe(58);

    // Top bar hidden -> track top should return to 4px
    topBar.classList.add("is-hidden");
    scrollHandler({ target: readerScroll } as unknown as Event);
    expect(parseInt(track.style.top, 10)).toBe(4);
  });

  it("does not attach scrollbars on mobile/touch environments", () => {
    (globalThis as any).window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    cleanup = initAppScrollbars(900);
    const doc = (globalThis as any).document;
    expect(doc.querySelector(".app-scrollbar-track")).toBeNull();
  });

  it("scopes unified overlay scrollbar CSS to desktop pointer devices and non-Capacitor", () => {
    expect(clientDashboardCss).toMatch(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/);
    expect(clientDashboardCss).toContain(".app-scrollbar-track");
    expect(clientDashboardCss).toContain(".app-scrollbar-thumb");
    expect(clientDashboardCss).toContain("scrollbar-width:none");
  });
});
