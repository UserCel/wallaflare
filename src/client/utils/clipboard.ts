import { showToast } from "../components/toast";

export async function copyToClipboard(text: string, successMsg?: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else if (typeof document !== "undefined") {
      fallbackCopyText(text);
    }
    if (successMsg) showToast(successMsg);
    return true;
  } catch (err) {
    showToast("Failed to copy to clipboard", true);
    return false;
  }
}

export function fallbackCopyText(text: string, callback?: () => void): void {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    if (typeof textarea.select === "function") textarea.select();
    if (typeof document.execCommand === "function") document.execCommand("copy");
    document.body.removeChild(textarea);
    if (callback) callback();
  } catch (err) {
    showToast("Failed to copy to clipboard", true);
  }
}

export function copyDirectText(text: string, btn: HTMLElement | null = null, successMessage: string = "✓ Copied to clipboard"): void {
  if (!text) return;
  const onCopied = () => {
    showToast(successMessage);
    if (btn) {
      const original = btn.innerHTML;
      btn.innerHTML = typeof btn.innerHTML === "string" && btn.innerHTML.includes("<svg") ? "✓" : "✓ Copied!";
      setTimeout(() => { btn.innerHTML = original; }, 1600);
    }
  };

  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onCopied).catch(() => {
      fallbackCopyText(text, onCopied);
    });
  } else {
    fallbackCopyText(text, onCopied);
  }
}

if (typeof window !== "undefined") {
  const w = window as any;
  w.copyDirectText = copyDirectText;
}
