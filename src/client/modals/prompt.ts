import { openModal, closeModal } from "./manager";

let localPromptResolve: ((val: string | null) => void) | null = null;

export function showPromptDialog(
  title: string,
  message: string,
  defaultValue: string = "",
  confirmBtnText: string = "Save",
  placeholder: string = ""
): Promise<string | null> {
  return new Promise((resolve) => {
    localPromptResolve = resolve;

    const titleEl = document.getElementById("promptModalTitle");
    const msgEl = document.getElementById("promptModalMsg");
    const inputEl = document.getElementById("promptModalInput") as HTMLInputElement | null;
    const btn = document.getElementById("promptModalBtn") as HTMLElement | null;

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = (message || "").replace(/\\n/g, "\n");
    if (btn) btn.textContent = confirmBtnText;

    if (inputEl) {
      inputEl.value = defaultValue;
      inputEl.placeholder = placeholder;
      setTimeout(() => {
        if (typeof inputEl.focus === "function") inputEl.focus();
        if (typeof inputEl.select === "function") inputEl.select();
      }, 50);
    }

    openModal("promptModal");
  });
}

export function handlePromptModalSubmit(e?: Event): void {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
  }
  const inputEl = document.getElementById("promptModalInput") as HTMLInputElement | null;
  const val = inputEl ? inputEl.value : "";
  closeModal("promptModal");

  const resolve = localPromptResolve;
  localPromptResolve = null;
  if (resolve) {
    resolve(val);
  }
}

export function handlePromptModalCancel(): void {
  closeModal("promptModal");
  const resolve = localPromptResolve;
  localPromptResolve = null;
  if (resolve) {
    resolve(null);
  }
}
