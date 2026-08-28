import { openModal, closeModal } from "./manager";
import { state } from "../state";

export function showConfirmDialog(title: string, message: string, confirmBtnText: string = "Confirm", isDanger: boolean = false): Promise<boolean> {
  return new Promise((resolve) => {
    state.confirmResolve = resolve;
    const titleEl = document.getElementById("confirmModalTitle");
    const msgEl = document.getElementById("confirmModalMsg");
    const btn = document.getElementById("confirmModalBtn");

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (btn) {
      btn.textContent = confirmBtnText;
      btn.className = isDanger ? "btn btn-danger" : "btn btn-primary";
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
  try { (document.activeElement as HTMLElement)?.blur(); } catch (e) {}
  closeModal("confirmModal");

  if (state.confirmResolve) {
    const resolve = state.confirmResolve;
    state.confirmResolve = null;
    resolve(true);
  }
}

export function handleConfirmModalCancel(): void {
  const modalEl = document.getElementById("confirmModal");
  if (modalEl) {
    modalEl.style.pointerEvents = "none";
    modalEl.setAttribute("aria-hidden", "true");
  }
  try { (document.activeElement as HTMLElement)?.blur(); } catch (e) {}

  closeModal("confirmModal");
  if (modalEl) modalEl.style.pointerEvents = "";

  if (state.confirmResolve) {
    const resolve = state.confirmResolve;
    state.confirmResolve = null;
    resolve(false);
  }
}
