import { openModal, closeModal } from "./manager";
import { showToast } from "../components/toast";

export function showCreatedTokenModal(token: string, label: string): void {
  const modalEl = document.getElementById("tokenDisplayModal");
  const valEl = document.getElementById("tokenDisplayValue") as HTMLInputElement | null;
  const lblEl = document.getElementById("tokenDisplayLabel");

  if (valEl) valEl.value = token;
  if (lblEl) lblEl.textContent = "Token: " + (label || "Personal Access Token");

  openModal("tokenDisplayModal");

  setTimeout(() => {
    if (typeof valEl?.focus === "function") valEl.focus();
    if (typeof valEl?.select === "function") valEl.select();
  }, 50);
}

export function copyTokenDisplayValue(btn: HTMLElement): void {
  const valEl = document.getElementById("tokenDisplayValue") as HTMLInputElement | null;
  if (!valEl || !valEl.value) return;

  const nav = (typeof navigator !== "undefined" && navigator.clipboard)
    ? navigator
    : ((typeof window !== "undefined" && (window as any).navigator) || null);
  if (nav && nav.clipboard && nav.clipboard.writeText) {
    nav.clipboard.writeText(valEl.value).then(() => {
      const old = btn.textContent;
      btn.textContent = "Copied!";
      btn.classList.add("btn-success");
      setTimeout(() => {
        btn.textContent = old;
        btn.classList.remove("btn-success");
      }, 2000);
    }).catch(() => {
      if (typeof valEl.select === "function") valEl.select();
      if (typeof document !== "undefined" && typeof document.execCommand === "function") {
        document.execCommand("copy");
      }
      showToast("Token copied to clipboard");
    });
  } else {
    if (typeof valEl.select === "function") valEl.select();
    if (typeof document !== "undefined" && typeof document.execCommand === "function") {
      document.execCommand("copy");
    }
    showToast("Token copied to clipboard");
  }
}

export function closeTokenDisplayModal(): void {
  closeModal("tokenDisplayModal");
}

if (typeof window !== "undefined") {
  const w = window as any;
  w.showCreatedTokenModal = showCreatedTokenModal;
  w.copyTokenDisplayValue = copyTokenDisplayValue;
  w.closeTokenDisplayModal = closeTokenDisplayModal;
}
