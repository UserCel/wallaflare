import { state } from "../state";
import { openModal, closeModal } from "./manager";
import { showToast } from "../components/toast";
import { apiPost } from "../sync/api";
import { saveArticleWithFallback } from "../extractor";
import { $id, getInputValue, setInputValue, setHtml } from "../utils/dom";

let addTextCustomTags: string[] = [];

export function handleAddArticleBtnClick(): void {
  const errEl = $id("addUrlErrorMsg");
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }
  openModal("addUrlModal");
}

export function handleAddTextBtnClick(): void {
  addTextCustomTags = [];
  renderAddTextTagChips();
  openModal("addTextModal");
}

export function renderAddTextTagChips(): void {
  const container = $id("addTextTagsChips");
  if (!container) return;
  const html = addTextCustomTags
    .map(
      (tag) =>
        `<span class="tag-chip">${tag}<button type="button" class="tag-chip-del" onclick="removeAddTextTag('${tag}')">&times;</button></span>`
    )
    .join("");
  setHtml(container, html);
}

export function removeAddTextTag(tag: string): void {
  addTextCustomTags = addTextCustomTags.filter((t) => t !== tag);
  renderAddTextTagChips();
}

export async function handleIngestUrl(): Promise<void> {
  const url = getInputValue("urlInput");
  if (!url) return;

  const btn = $id<HTMLButtonElement>("submitUrlBtn") || $id<HTMLButtonElement>("ingestUrlBtn");
  const errEl = $id("addUrlErrorMsg");
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Extracting...";
  }

  try {
    const res = await saveArticleWithFallback(url);
    if (res.ok) {
      if (res.alreadyExists) {
        showToast("Article is already in your library!");
      } else if (res.emptyContent) {
        showToast("⚠️ Saved link only (article text was blocked or empty)", true, 5000);
      } else {
        showToast(res.parserUsed === "device" ? "✓ Article extracted on device & saved!" : "✓ Article saved successfully!");
      }
      closeModal("addUrlModal");
      setInputValue("urlInput", "");
      if ((window as any).loadArticles) (window as any).loadArticles(false);
    } else {
      let friendlyError = res.error || "Failed to save article";
      if (res.cpuLimitExceeded || /exceeded CPU time limit|CPU limit/i.test(friendlyError)) {
        friendlyError = "⚡ Cloudflare Worker exceeded CPU time limit parsing this large webpage. Tip: Extract via the Wallaflare Android App (device parser) or save as Custom Text.";
      } else if (/NetworkError|CORS|Failed to fetch/i.test(friendlyError)) {
        friendlyError = "⚠️ Device extraction failed due to browser CORS security restrictions. Standard desktop browsers cannot scrape external websites directly. Switch to 'Auto' in Settings for server fallback, or use the Wallaflare Android App.";
      }
      if (errEl) {
        errEl.textContent = friendlyError;
        errEl.style.display = "block";
      }
      showToast(friendlyError, true, 7000);
    }
  } catch (err: any) {
    let friendlyError = err?.message || "Network error saving article";
    if (/exceeded CPU time limit|CPU limit/i.test(friendlyError)) {
      friendlyError = "⚡ Cloudflare Worker exceeded CPU time limit parsing this large webpage. Tip: Extract via the Wallaflare Android App (device parser) or save as Custom Text.";
    } else if (/NetworkError|CORS|Failed to fetch/i.test(friendlyError)) {
      friendlyError = "⚠️ Device extraction failed due to browser CORS security restrictions. Standard desktop browsers cannot scrape external websites directly. Switch to 'Auto' in Settings for server fallback, or use the Wallaflare Android App.";
    }
    if (errEl) {
      errEl.textContent = friendlyError;
      errEl.style.display = "block";
    }
    showToast(friendlyError, true, 7000);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Fetch & Save";
    }
  }
}

export async function handleIngestText(): Promise<void> {
  const title = getInputValue("textTitle") || "Untitled Note";
  const content = getInputValue("textContent");
  const author = getInputValue("textAuthor");
  const sourceUrl = getInputValue("textSourceUrl");

  if (!content) {
    showToast("Please enter content", true);
    return;
  }

  const btn = $id<HTMLButtonElement>("submitTextBtn");
  if (btn) btn.disabled = true;

  try {
    const { ok } = await apiPost("/api/entries.json", {
      title,
      content,
      author,
      url: sourceUrl || "wallaflare://custom-text",
      tags: addTextCustomTags.join(",")
    });

    if (ok) {
      showToast("Custom text saved successfully!");
      closeModal("addTextModal");
      setInputValue("textTitle", "");
      setInputValue("textContent", "");
      setInputValue("textAuthor", "");
      setInputValue("textSourceUrl", "");
      addTextCustomTags = [];
      if ((window as any).loadArticles) (window as any).loadArticles(false);
    } else {
      showToast("Failed to save custom text", true);
    }
  } catch (err) {
    showToast("Network error saving text", true);
  } finally {
    if (btn) btn.disabled = false;
  }
}
