import { openModal, closeModal } from "./manager";
import { state } from "../state";

let localConfirmResolve: ((val: boolean) => void) | null = null;

export function showConfirmDialog(
  title: string,
  message: string,
  confirmBtnText: string = "Confirm",
  isDanger: boolean = false
): Promise<boolean> {
  return new Promise((resolve) => {
    localConfirmResolve = resolve;
    state.confirmResolve = resolve;
    const titleEl = document.getElementById("confirmModalTitle");
    const msgEl = document.getElementById("confirmModalMsg");
    const btn = document.getElementById("confirmModalBtn") as HTMLElement | null;

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (btn) {
      btn.textContent = confirmBtnText;
      btn.className = isDanger ? "btn btn-primary" : "btn btn-primary";
    }
    openModal("confirmModal");
  });
}

export function handleConfirmModalOk(): void {
  const modalEl = document.getElementById("confirmModal");
  if (modalEl) {
    modalEl.style.pointerEvents = "";
    modalEl.removeAttribute("aria-hidden");
  }
  try {
    if (typeof document !== "undefined" && document.activeElement && typeof (document.activeElement as HTMLElement).blur === "function") {
      (document.activeElement as HTMLElement).blur();
    }
  } catch (e) {}
  closeModal("confirmModal");

  const resolve = localConfirmResolve || state.confirmResolve;
  localConfirmResolve = null;
  state.confirmResolve = null;
  if (resolve) {
    resolve(true);
  }
}

export function handleConfirmModalCancel(): void {
  const modalEl = document.getElementById("confirmModal");
  if (modalEl) {
    modalEl.style.pointerEvents = "none";
    modalEl.setAttribute("aria-hidden", "true");
  }
  try {
    if (typeof document !== "undefined" && document.activeElement && typeof (document.activeElement as HTMLElement).blur === "function") {
      (document.activeElement as HTMLElement).blur();
    }
  } catch (e) {}

  closeModal("confirmModal");
  if (modalEl) modalEl.style.pointerEvents = "";

  const resolve = localConfirmResolve || state.confirmResolve;
  localConfirmResolve = null;
  state.confirmResolve = null;
  if (resolve) {
    resolve(false);
  }
}
