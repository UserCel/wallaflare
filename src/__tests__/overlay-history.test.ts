import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseHTML } from "linkedom";
import {
  pushOverlayHistory,
  popOverlayHistory,
  handleOverlayPopstate,
  getOverlayStack,
  clearOverlayHistory,
  isOverlayActive
} from "../client/utils/overlay-history";

describe("Overlay History & Back Gesture Navigation", () => {
  let win: any;
  let doc: any;

  beforeEach(() => {
    const dom = parseHTML(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div id="speedReadModal" class="speed-read-overlay" style="display: none;"></div>
          <div id="settingsModal" class="modal-backdrop" style="display: none;"></div>
          <div id="siteCookieModal" class="modal-backdrop" style="display: none;"></div>
          <div id="readerSearchBar" style="display: none;"></div>
        </body>
      </html>
    `);
    win = dom.window;
    doc = dom.document;

    win.location = {
      href: "http://localhost:8787/read/101",
      protocol: "http:",
      hostname: "localhost"
    };

    // Attach minimal history mock
    win.history = {
      state: {},
      pushState: vi.fn((state: any) => {
        win.history.state = state;
      }),
      back: vi.fn()
    };

    (globalThis as any).window = win;
    (globalThis as any).document = doc;

    clearOverlayHistory();
    vi.restoreAllMocks();
  });

  it("pushes an overlay into the stack and calls history.pushState on browser", () => {
    const pushStateSpy = vi.spyOn(win.history, "pushState");
    const closeMock = vi.fn();

    pushOverlayHistory("speedReadModal", closeMock);

    expect(getOverlayStack()).toEqual(["speedReadModal"]);
    expect(isOverlayActive("speedReadModal")).toBe(true);
    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(pushStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ wfOverlay: "speedReadModal", wfOverlayDepth: 1 }),
      "",
      win.location.href
    );
  });

  it("does not push duplicate entries if the same overlay is already on top", () => {
    const pushStateSpy = vi.spyOn(win.history, "pushState");
    const closeMock = vi.fn();

    pushOverlayHistory("settingsModal", closeMock);
    pushOverlayHistory("settingsModal", closeMock);

    expect(getOverlayStack()).toEqual(["settingsModal"]);
    expect(pushStateSpy).toHaveBeenCalledTimes(1);
  });

  it("handles popstate by dismissing the top overlay and consuming the event", () => {
    const closeSettings = vi.fn();
    const closeCookieVault = vi.fn();

    pushOverlayHistory("settingsModal", closeSettings);
    pushOverlayHistory("siteCookieModal", closeCookieVault);

    expect(getOverlayStack()).toEqual(["settingsModal", "siteCookieModal"]);

    // First back gesture pops siteCookieModal
    const handled1 = handleOverlayPopstate();
    expect(handled1).toBe(true);
    expect(closeCookieVault).toHaveBeenCalledTimes(1);
    expect(closeSettings).not.toHaveBeenCalled();
    expect(getOverlayStack()).toEqual(["settingsModal"]);

    // Second back gesture pops settingsModal
    const handled2 = handleOverlayPopstate();
    expect(handled2).toBe(true);
    expect(closeSettings).toHaveBeenCalledTimes(1);
    expect(getOverlayStack()).toEqual([]);

    // Third back gesture has no overlays left, returns false to let route change proceed
    const handled3 = handleOverlayPopstate();
    expect(handled3).toBe(false);
  });

  it("suppresses popstate when an overlay is closed manually via popOverlayHistory", () => {
    const backSpy = vi.spyOn(win.history, "back");
    const closeMock = vi.fn();

    pushOverlayHistory("speedReadModal", closeMock);
    expect(getOverlayStack()).toEqual(["speedReadModal"]);

    // User taps 'X' button or done
    popOverlayHistory("speedReadModal");
    expect(getOverlayStack()).toEqual([]);
    expect(backSpy).toHaveBeenCalledTimes(1);

    // Browser fires popstate asynchronously from the history.back() call
    const handled = handleOverlayPopstate();
    // Must be consumed without closing anything again
    expect(handled).toBe(true);
    expect(closeMock).not.toHaveBeenCalled();
  });

  it("skips history.pushState when running inside native Capacitor app", () => {
    doc.documentElement.classList.add("is-capacitor-app");
    const pushStateSpy = vi.spyOn(win.history, "pushState");
    const closeMock = vi.fn();

    pushOverlayHistory("speedReadModal", closeMock);

    // Stack is tracked for internal state, but history.pushState was not touched
    expect(getOverlayStack()).toEqual(["speedReadModal"]);
    expect(pushStateSpy).not.toHaveBeenCalled();

    popOverlayHistory("speedReadModal");
    expect(getOverlayStack()).toEqual([]);
  });

  it("falls back to window.handleAndroidBackButton if DOM overlay is open without stack entry", () => {
    const backButtonSpy = vi.fn().mockReturnValue(true);
    win.handleAndroidBackButton = backButtonSpy;

    // Open speedReadModal directly in DOM
    const modalEl = doc.getElementById("speedReadModal");
    modalEl.classList.add("open");

    const handled = handleOverlayPopstate();
    expect(handled).toBe(true);
    expect(backButtonSpy).toHaveBeenCalledTimes(1);
  });
});
