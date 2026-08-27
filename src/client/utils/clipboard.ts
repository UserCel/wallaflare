import { showToast } from "../components/toast";

export async function copyToClipboard(text: string, successMsg?: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    if (successMsg) showToast(successMsg);
    return true;
  } catch (err) {
    showToast("Failed to copy to clipboard", true);
    return false;
  }
}
