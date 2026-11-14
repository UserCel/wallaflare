import { isCapacitorApp } from "../sync/api";

const SCROLL_HIDE_DELAY_MS = 900;
const SCROLLING_CLASS = "is-scrolling";
const TRACK_WIDTH_PX = 12;
const EDGE_HOVER_PROXIMITY_PX = 22;
const MIN_THUMB_HEIGHT_PX = 28;

interface ScrollbarEntry {
  track: HTMLDivElement;
  thumb: HTMLDivElement;
  hideTimer: ReturnType<typeof setTimeout> | null;
  isTrackHovered: boolean;
  isDragging: boolean;
  trackTop: number;
  trackHeight: number;
  thumbHeight: number;
}

/**
 * Returns true when running in a desktop pointer environment (fine pointer + hover)
 * and not inside the native Capacitor Android shell.
 */
export function isDesktopPointerEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  if (isCapacitorApp()) return false;
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function getReaderTopClearance(containerRectTop: number, el: Element): number {
  const isReader = el.id === "readerScrollContainer" || el.classList.contains("reader-main-scroll");
  if (!isReader) return 4;

  const topBar = document.getElementById("readerTopBar");
  if (!topBar || topBar.classList.contains("is-hidden")) return 4;

  const barRect = topBar.getBoundingClientRect();
  if (barRect.bottom > containerRectTop) {
    return Math.max(4, barRect.bottom - containerRectTop + 4);
  }
  return 4;
}

function updateScrollbarGeometry(el: Element, entry: ScrollbarEntry): boolean {
  if (!el.isConnected) {
    entry.track.classList.remove("is-visible");
    return false;
  }

  const scrollHeight = (el as HTMLElement).scrollHeight || 0;
  const clientHeight = (el as HTMLElement).clientHeight || 0;
  if (clientHeight <= 0 || scrollHeight <= clientHeight + 1) {
    entry.track.classList.remove("is-visible");
    return false;
  }

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    entry.track.classList.remove("is-visible");
    return false;
  }

  const topOffset = getReaderTopClearance(rect.top, el);
  const trackTop = rect.top + topOffset;
  const trackHeight = Math.max(MIN_THUMB_HEIGHT_PX, rect.height - topOffset - 4);
  const thumbHeight = Math.max(
    MIN_THUMB_HEIGHT_PX,
    Math.min(trackHeight, Math.round((clientHeight / scrollHeight) * trackHeight))
  );

  const maxScroll = scrollHeight - clientHeight;
  const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, (el as HTMLElement).scrollTop / maxScroll)) : 0;
  const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
  const thumbTop = Math.round(ratio * maxThumbTop);

  entry.trackTop = trackTop;
  entry.trackHeight = trackHeight;
  entry.thumbHeight = thumbHeight;

  entry.track.style.top = `${trackTop}px`;
  entry.track.style.left = `${rect.right - TRACK_WIDTH_PX}px`;
  entry.track.style.height = `${trackHeight}px`;

  const inModal = Boolean(el.closest?.(".modal-backdrop, .tag-modal-overlay"));
  entry.track.classList.toggle("is-modal", inModal);

  entry.thumb.style.height = `${thumbHeight}px`;
  entry.thumb.style.transform = `translateY(${thumbTop}px)`;
  return true;
}

function findScrollableContainer(start: EventTarget | null): Element | null {
  let curr = start as Element | null;
  while (curr && curr !== document.documentElement && curr !== document.body) {
    if (curr.classList?.contains("app-scrollbar-track")) return null;
    const htmlEl = curr as HTMLElement;
    if (htmlEl.scrollHeight > htmlEl.clientHeight + 1) {
      const style = typeof window.getComputedStyle === "function" ? window.getComputedStyle(curr) : null;
      const overflowY = style ? style.overflowY : "";
      if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay" || !style) {
        return curr;
      }
    }
    curr = curr.parentElement;
  }
  return null;
}

/**
 * Initializes unified, cross-browser app-native overlay scrollbars on desktop.
 * Renders a consistent custom pill thumb across Chrome and Firefox, clears the
 * reader top bar when visible, and auto-hides after inactivity.
 * Disabled on mobile/touch devices and Capacitor so native OS scrollbars remain untouched.
 */
export function initAppScrollbars(hideDelayMs: number = SCROLL_HIDE_DELAY_MS): () => void {
  if (typeof document === "undefined" || !isDesktopPointerEnvironment()) {
    return () => {};
  }

  const entries = new Map<Element, ScrollbarEntry>();

  const scheduleHide = (el: Element, entry: ScrollbarEntry) => {
    if (entry.hideTimer !== null) {
      clearTimeout(entry.hideTimer);
    }
    entry.hideTimer = setTimeout(() => {
      entry.hideTimer = null;
      el.classList.remove(SCROLLING_CLASS);
      if (!entry.isTrackHovered && !entry.isDragging) {
        entry.track.classList.remove("is-visible");
      }
    }, hideDelayMs);
  };

  const revealScrollbar = (el: Element) => {
    const entry = ensureEntry(el);
    if (!updateScrollbarGeometry(el, entry)) return;
    el.classList.add(SCROLLING_CLASS);
    entry.track.classList.add("is-visible");
    scheduleHide(el, entry);
  };

  const ensureEntry = (el: Element): ScrollbarEntry => {
    const existing = entries.get(el);
    if (existing) return existing;

    const track = document.createElement("div");
    track.className = "app-scrollbar-track";
    const thumb = document.createElement("div");
    thumb.className = "app-scrollbar-thumb";
    track.appendChild(thumb);
    document.body.appendChild(track);

    const entry: ScrollbarEntry = {
      track,
      thumb,
      hideTimer: null,
      isTrackHovered: false,
      isDragging: false,
      trackTop: 0,
      trackHeight: 0,
      thumbHeight: MIN_THUMB_HEIGHT_PX,
    };

    track.addEventListener("pointerenter", () => {
      entry.isTrackHovered = true;
      if (updateScrollbarGeometry(el, entry)) {
        entry.track.classList.add("is-visible");
      }
    });

    track.addEventListener("pointerleave", () => {
      entry.isTrackHovered = false;
      if (!entry.isDragging && entry.hideTimer === null) {
        entry.track.classList.remove("is-visible");
      }
    });

    thumb.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      entry.isDragging = true;
      entry.track.classList.add("is-dragging", "is-visible");
      thumb.setPointerCapture?.(e.pointerId);

      const startY = e.clientY;
      const startScrollTop = (el as HTMLElement).scrollTop;

      const onMove = (moveEvt: PointerEvent) => {
        const scrollableDist = (el as HTMLElement).scrollHeight - (el as HTMLElement).clientHeight;
        const travel = Math.max(1, entry.trackHeight - entry.thumbHeight);
        const deltaY = moveEvt.clientY - startY;
        (el as HTMLElement).scrollTop = startScrollTop + (deltaY / travel) * scrollableDist;
        updateScrollbarGeometry(el, entry);
      };

      const onUp = (upEvt: PointerEvent) => {
        entry.isDragging = false;
        entry.track.classList.remove("is-dragging");
        try { thumb.releasePointerCapture?.(upEvt.pointerId); } catch {}
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        scheduleHide(el, entry);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });

    track.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.target !== track || e.button !== 0) return;
      e.preventDefault();
      updateScrollbarGeometry(el, entry);
      const clickOffset = e.clientY - entry.trackTop - entry.thumbHeight / 2;
      const travel = Math.max(1, entry.trackHeight - entry.thumbHeight);
      const ratio = Math.min(1, Math.max(0, clickOffset / travel));
      const scrollableDist = (el as HTMLElement).scrollHeight - (el as HTMLElement).clientHeight;
      (el as HTMLElement).scrollTop = ratio * scrollableDist;
      revealScrollbar(el);
    });

    entries.set(el, entry);
    return entry;
  };

  const handleScroll = (event: Event) => {
    const target = event.target;
    if (!target || typeof (target as Element).classList === "undefined") return;
    revealScrollbar(target as Element);
  };

  const handlePointerMove = (event: PointerEvent) => {
    const container = findScrollableContainer(event.target);
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (event.clientX >= rect.right - EDGE_HOVER_PROXIMITY_PX && event.clientX <= rect.right + 2) {
      revealScrollbar(container);
    }
  };

  const handleResize = () => {
    entries.forEach((entry, el) => {
      if (!el.isConnected) {
        if (entry.hideTimer !== null) clearTimeout(entry.hideTimer);
        entry.track.remove();
        entries.delete(el);
      } else if (entry.track.classList.contains("is-visible")) {
        updateScrollbarGeometry(el, entry);
      }
    });
  };

  let topBarObserver: MutationObserver | null = null;
  const readerTopBar = document.getElementById("readerTopBar");
  const readerScroll = document.getElementById("readerScrollContainer");
  if (readerTopBar && readerScroll && typeof MutationObserver !== "undefined") {
    topBarObserver = new MutationObserver(() => {
      const entry = entries.get(readerScroll);
      if (entry && entry.track.classList.contains("is-visible")) {
        updateScrollbarGeometry(readerScroll, entry);
      }
    });
    topBarObserver.observe(readerTopBar, { attributes: true, attributeFilter: ["class"] });
  }

  document.addEventListener("scroll", handleScroll, { capture: true, passive: true });
  document.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("resize", handleResize, { passive: true });

  return () => {
    document.removeEventListener("scroll", handleScroll, { capture: true });
    document.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("resize", handleResize);
    topBarObserver?.disconnect();
    entries.forEach((entry) => {
      if (entry.hideTimer !== null) clearTimeout(entry.hideTimer);
      entry.track.remove();
    });
    entries.clear();
  };
}
