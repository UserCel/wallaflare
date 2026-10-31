let toastTimeout: any = null;

export function showToast(msg: string, durationOrError: number | boolean = 3000, duration: number = 3000): void {
  const isError = typeof durationOrError === "boolean" ? durationOrError : false;
  const dur = typeof durationOrError === "number" ? durationOrError : duration;
  const toast = document.getElementById("toast");
  const msgEl = document.getElementById("toastMsg");
  if (!toast || !msgEl) return;

  msgEl.textContent = msg;
  toast.classList.remove("error");
  if (isError) toast.classList.add("error");
  toast.classList.add("show");

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
    toastTimeout = null;
  }, dur);
}

export function hideToast(): void {
  const toast = document.getElementById("toast");
  if (toast) toast.classList.remove("show");
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
}
