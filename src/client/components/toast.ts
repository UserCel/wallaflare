let toastTimeout: any = null;

export function showToast(msg: string, isError: boolean = false, duration: number = 2800): void {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;
  toast.classList.remove("error");
  if (isError) toast.classList.add("error");
  toast.classList.add("show");

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    hideToast();
  }, duration);
}

export function hideToast(): void {
  const toast = document.getElementById("toast");
  if (toast) toast.classList.remove("show");
}
