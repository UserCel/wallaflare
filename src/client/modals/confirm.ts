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
  closeModal("confirmModal");
  if (state.confirmResolve) {
    state.confirmResolve(true);
    state.confirmResolve = null;
  }
}

export function handleConfirmModalCancel(): void {
  closeModal("confirmModal");
  if (state.confirmResolve) {
    state.confirmResolve(false);
    state.confirmResolve = null;
  }
}
