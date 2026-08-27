import { state } from "../state";

export function openModal(id: string): void {
  // Clear any active text selection
  state.activeSelectionRange = null;
  state.activeSelectedQuote = "";
  const modalEl = document.getElementById(id);
  if (modalEl) {
    modalEl.classList.add("open");
    if (id === "addUrlModal") {
      setTimeout(() => document.getElementById("urlInput")?.focus(), 60);
    } else if (id === "addTextModal") {
      setTimeout(() => document.getElementById("textTitle")?.focus(), 60);
    } else if (id === "syncModal") {
      const syncUrlEl = document.getElementById("syncServerUrl");
      if (syncUrlEl) {
        // @ts-ignore
        syncUrlEl.textContent = (window.getEffectiveServerUrl && window.getEffectiveServerUrl()) || window.location.origin;
      }
    }
  }
}

export function closeModal(id: string): void {
  const modalEl = document.getElementById(id);
  if (modalEl) modalEl.classList.remove("open");
}

export function initGlobalModalListeners(): void {
  // Close modals on escape or backdrop click
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = document.querySelectorAll(".modal-overlay.open");
      openModals.forEach((m) => m.classList.remove("open"));
    }
  });

  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("open");
      }
    });
  });
}
