import { state } from "../state";

export function openModal(id: string): void {
  if (typeof window !== "undefined") {
    const fn = (window as any).clearActiveTextSelection;
    if (typeof fn === "function") {
      fn();
    } else {
      const sel = window.getSelection?.();
      if (sel) {
        try { sel.removeAllRanges(); } catch (e) {}
      }
      state.activeSelectionRange = null;
      state.activeSelectedQuote = "";
    }
  }

  const modalEl = document.getElementById(id);
  if (modalEl) {
    modalEl.classList.add("open");
    if (id === "addUrlModal") {
      setTimeout(() => document.getElementById("urlInput")?.focus(), 60);
    } else if (id === "addTextModal") {
      const renderAddTextTagChips = (window as any).renderAddTextTagChips;
      if (typeof renderAddTextTagChips === "function") renderAddTextTagChips();
      setTimeout(() => document.getElementById("textTitle")?.focus(), 60);
    } else if (id === "syncModal") {
      const syncUrlEl = document.getElementById("syncServerUrl");
      if (syncUrlEl) {
        const getEffectiveServerUrl = (window as any).getEffectiveServerUrl;
        syncUrlEl.textContent = (typeof getEffectiveServerUrl === "function" && getEffectiveServerUrl()) || (typeof window !== "undefined" ? window.location.origin : "");
      }
    }
  }
}

export function closeModal(id: string): void {
  const modalEl = document.getElementById(id);
  if (modalEl) {
    modalEl.classList.remove("open");
    modalEl.style.display = "";
  }
  try {
    if (typeof document !== "undefined" && document.activeElement && typeof (document.activeElement as HTMLElement).blur === "function") {
      (document.activeElement as HTMLElement).blur();
    }
  } catch (e) {}
}

export function initGlobalModalListeners(): void {
  // Close modals on escape or backdrop click
  if (typeof document === "undefined") return;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = document.querySelectorAll(".modal-overlay.open, .modal-backdrop.open");
      openModals.forEach((m) => m.classList.remove("open"));
    }
  });

  document.querySelectorAll(".modal-overlay, .modal-backdrop").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("open");
      }
    });
  });
}
