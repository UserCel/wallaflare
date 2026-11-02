import { isCapacitorApp } from "../sync/api";

export interface OverlayItem {
  id: string;
  close: () => void;
}

const overlayStack: OverlayItem[] = [];
let suppressPopstateCount = 0;
let isClosingFromPopstate = false;

/**
 * Returns a copy of the active overlay stack IDs (topmost overlay last).
 */
export function getOverlayStack(): string[] {
  return overlayStack.map((item) => item.id);
}

/**
 * Resets overlay stack and suppress counters (useful for unit tests).
 */
export function clearOverlayHistory(): void {
  overlayStack.length = 0;
  suppressPopstateCount = 0;
  isClosingFromPopstate = false;
}

/**
 * Checks whether an overlay is currently tracked in the overlay stack.
 */
export function isOverlayActive(id: string): boolean {
  return overlayStack.some((item) => item.id === id);
}

/**
 * Pushes an overlay to the overlay stack and creates a transient history entry in the browser.
 * On Capacitor native apps, history.pushState is skipped as native onBackPressed handles gestures.
 */
export function pushOverlayHistory(id: string, closeFn: () => void): void {
  if (typeof window === "undefined") return;

  // Avoid pushing duplicate entry if already on top of the stack
  const top = overlayStack[overlayStack.length - 1];
  if (top && top.id === id) return;

  overlayStack.push({ id, close: closeFn });

  // Native Capacitor handles Android hardware back directly via BridgeActivity.onBackPressed
  if (isCapacitorApp()) return;

  try {
    if (typeof window.history !== "undefined" && typeof window.history.pushState === "function") {
      const currentState = window.history.state || {};
      window.history.pushState(
        { ...currentState, wfOverlay: id, wfOverlayDepth: overlayStack.length },
        "",
        window.location?.href || ""
      );
    }
  } catch (e) {
    console.warn("Failed to push overlay history state:", e);
  }
}

/**
 * Removes an overlay from the stack.
 * If this close was initiated by user action (e.g. clicking 'X' button or backdrop)
 * rather than a browser back gesture (popstate), pop the history entry.
 */
export function popOverlayHistory(id?: string): void {
  if (overlayStack.length === 0) return;

  // If this dismiss was triggered by popstate, do NOT call history.back()
  if (isClosingFromPopstate) {
    if (id) {
      const idx = overlayStack.findIndex((item) => item.id === id);
      if (idx !== -1) overlayStack.splice(idx, 1);
    }
    return;
  }

  let index = -1;
  if (id) {
    for (let i = overlayStack.length - 1; i >= 0; i--) {
      if (overlayStack[i].id === id) {
        index = i;
        break;
      }
    }
  } else {
    index = overlayStack.length - 1;
  }

  if (index !== -1) {
    overlayStack.splice(index, 1);
  }

  // Pop browser history if running in standard browser and not Capacitor
  if (typeof window !== "undefined" && !isCapacitorApp()) {
    try {
      if (typeof window.history !== "undefined" && typeof window.history.back === "function") {
        suppressPopstateCount++;
        window.history.back();
      }
    } catch (e) {
      suppressPopstateCount = Math.max(0, suppressPopstateCount - 1);
    }
  }
}

/**
 * Intercepts popstate events on mobile/desktop browsers.
 * If an overlay is active, dismisses it and returns true to signal that
 * route changes / reader closing should NOT occur.
 */
export function handleOverlayPopstate(): boolean {
  // If popstate was triggered by our own manual close via history.back(), suppress it
  if (suppressPopstateCount > 0) {
    suppressPopstateCount--;
    return true;
  }

  // 1. Pop and close topmost overlay in stack
  if (overlayStack.length > 0) {
    const top = overlayStack.pop();
    if (top) {
      isClosingFromPopstate = true;
      try {
        top.close();
      } finally {
        isClosingFromPopstate = false;
      }
      return true;
    }
  }

  // 2. Fallback: Check if window.handleAndroidBackButton can dismiss anything active in DOM
  if (typeof window !== "undefined") {
    const w = window as any;
    if (typeof w.handleAndroidBackButton === "function") {
      const speedModal = document.getElementById("speedReadModal");
      const isSpeedOpen = speedModal && (speedModal.classList.contains("open") || speedModal.style.display !== "none");
      const anyModalOpen = document.querySelector(".modal-backdrop.open, .modal-overlay.open, .tag-modal-overlay.open, .modal.open");
      const searchBar = document.getElementById("readerSearchBar");
      const isSearchOpen = searchBar && searchBar.style.display !== "none";
      const openCardMenu = document.querySelector(".card-dropdown-menu.open");
      const popover = document.getElementById("readerAppearancePopover");
      const isPopoverOpen = popover && popover.style.display !== "none";

      if (isSpeedOpen || anyModalOpen || isSearchOpen || openCardMenu || isPopoverOpen) {
        isClosingFromPopstate = true;
        try {
          const handled = w.handleAndroidBackButton();
          if (handled) return true;
        } finally {
          isClosingFromPopstate = false;
        }
      }
    }
  }

  return false;
}
