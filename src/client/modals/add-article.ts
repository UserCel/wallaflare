import { openModal, closeModal } from "./manager";
import { showToast } from "../components/toast";
import { saveArticleWithFallback } from "../extractor";
import { normalizeUrl } from "../utils/format";
import { escapeHtml } from "../utils/dom";

let addTextCustomTags: string[] = [];

export function getAddTextCustomTags(): string[] {
  return [...addTextCustomTags];
}

export function setAddTextCustomTags(tags: string[]): void {
  addTextCustomTags = [...tags];
}

export function handleAddArticleBtnClick(): void {
  const isOffline = typeof window !== "undefined" && (window as any).isOfflineMode;
  if (isOffline) {
    showToast("Connecting to server...");
    const loadArticles = typeof window !== "undefined" && (window as any).loadArticles;
    if (typeof loadArticles === "function") loadArticles(false);
    return;
  }
  openModal("addUrlModal");
}

export function handleAddTextBtnClick(): void {
  addTextCustomTags = [];
  const input = (document.getElementById("textTags") || document.getElementById("addTextTagsInput")) as HTMLInputElement | null;
  if (input) input.value = "";
  renderAddTextTagChips();
  openModal("addTextModal");
}

export function renderAddTextTagChips(): void {
  const container = document.getElementById("addTextAvailableTags") || document.getElementById("addTextTagsChips");
  const wrapper = document.getElementById("addTextTagsContainer");
  if (!container) return;

  if (!addTextCustomTags || addTextCustomTags.length === 0) {
    container.innerHTML = "";
    if (wrapper) wrapper.style.display = "none";
    return;
  }

  if (wrapper) wrapper.style.display = "block";
  container.innerHTML = addTextCustomTags
    .map(
      (tag) =>
        '<span class="tag-chip">' +
        escapeHtml(tag) +
        '<button type="button" class="tag-chip-del" onclick="removeAddTextTag(\'' +
        escapeHtml(tag).replace(/'/g, "\\'") +
        '\')">&times;</button></span>'
    )
    .join("");
}

export function removeAddTextTag(tag: string): void {
  addTextCustomTags = (addTextCustomTags || []).filter((t) => t !== tag);
  const input = (document.getElementById("textTags") || document.getElementById("addTextTagsInput")) as HTMLInputElement | null;
  if (input) input.value = addTextCustomTags.join(", ");
  renderAddTextTagChips();
}

export function syncAddTextTagChips(): void {
  const input = (document.getElementById("textTags") || document.getElementById("addTextTagsInput")) as HTMLInputElement | null;
  const raw = (input?.value || "").trim();
  addTextCustomTags = raw
    ? raw
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];
  renderAddTextTagChips();
}

export async function handleIngestUrl(e?: Event): Promise<void> {
  if (e) e.preventDefault();
  const input = document.getElementById("urlInput") as HTMLInputElement | null;
  const btn = (document.getElementById("ingestUrlBtn") || document.getElementById("submitUrlBtn")) as HTMLButtonElement | null;
  const errEl = document.getElementById("addUrlErrorMsg");

  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }

  let url = (input?.value || "").trim();
  if (!url) return;
  url = normalizeUrl(url);

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Extracting...";
  }

  try {
    const result = await saveArticleWithFallback(url);
    if (!result.ok) throw new Error(result.error || "Failed to save article");
    const item = result.data;

    closeModal("addUrlModal");
    if (input) input.value = "";

    const w = typeof window !== "undefined" ? (window as any) : {};
    if (item && item.id) {
      if (Array.isArray(w.allEntries)) {
        w.allEntries.unshift(item);
      }
      if (typeof w.syncLocalEntriesCache === "function") {
        w.syncLocalEntriesCache(w.allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
      }
      if (typeof w.checkNativePendingSavedArticles === "function") w.checkNativePendingSavedArticles();
      if (typeof w.updateCounts === "function") w.updateCounts();
      if (typeof w.renderSidebarTags === "function") w.renderSidebarTags();
      if (typeof w.filterArticles === "function") w.filterArticles();

      if (result.alreadyExists) {
        showToast("Article is already in your library!");
      } else if (result.emptyContent) {
        showToast("⚠️ Saved link only (article text was blocked or empty)", true, 5000);
      } else {
        showToast(result.parserUsed === "device" ? "✓ Article extracted on device & saved!" : "✓ Article saved successfully!");
      }

      if (typeof w.openReader === "function") {
        w.openReader(item.id);
      }
    } else {
      showToast(result.alreadyExists ? "Article is already in your library!" : "✓ Article saved successfully!");
      if (typeof w.loadArticles === "function") w.loadArticles(false);
    }
  } catch (err: any) {
    let friendlyError = err?.message || "Failed to save article";
    if (/exceeded CPU time limit|CPU limit/i.test(friendlyError)) {
      friendlyError =
        "⚡ Cloudflare Worker exceeded CPU time limit parsing this large webpage. Tip: Extract via the Wallaflare Android App (device parser) or save as Custom Text.";
    } else if (/NetworkError|CORS|Failed to fetch/i.test(friendlyError)) {
      friendlyError =
        "⚠️ Device extraction failed due to browser CORS security restrictions. Standard desktop browsers cannot scrape external websites directly. Switch to 'Auto' in Settings for server fallback, or use the Wallaflare Android App.";
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

export async function handleIngestText(e?: Event): Promise<void> {
  if (e) e.preventDefault();
  const title = ((document.getElementById("textTitle") as HTMLInputElement)?.value || "").trim();
  const content = ((document.getElementById("textContent") as HTMLTextAreaElement)?.value || "").trim();
  const author = ((document.getElementById("textAuthor") as HTMLInputElement)?.value || "").trim();
  const tags = ((document.getElementById("textTags") as HTMLInputElement)?.value || "").trim();
  const url = ((document.getElementById("textUrl") as HTMLInputElement)?.value || "").trim();
  const previewPicture = ((document.getElementById("textPreviewPicture") as HTMLInputElement)?.value || "").trim();
  const publishedAt = ((document.getElementById("textPublishedAt") as HTMLInputElement)?.value || "").trim();
  const btn = document.getElementById("ingestTextBtn") as HTMLButtonElement | null;

  if (!title || !content) return;
  if (btn) btn.disabled = true;

  try {
    const w = typeof window !== "undefined" ? (window as any) : {};
    const authFetch = w.authFetch || fetch;
    const res = await authFetch("/api/entries.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        author,
        tags,
        url,
        preview_picture: previewPicture,
        published_at: publishedAt || undefined
      })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const item = await res.json();

    closeModal("addTextModal");
    const titleInput = document.getElementById("textTitle") as HTMLInputElement | null;
    const contentInput = document.getElementById("textContent") as HTMLTextAreaElement | null;
    const authorInput = document.getElementById("textAuthor") as HTMLInputElement | null;
    const tagsInput = (document.getElementById("textTags") || document.getElementById("addTextTagsInput")) as HTMLInputElement | null;
    const urlInput = document.getElementById("textUrl") as HTMLInputElement | null;
    const previewInput = document.getElementById("textPreviewPicture") as HTMLInputElement | null;
    const publishedAtInput = document.getElementById("textPublishedAt") as HTMLInputElement | null;

    if (titleInput) titleInput.value = "";
    if (contentInput) contentInput.value = "";
    if (authorInput) authorInput.value = "";
    if (tagsInput) tagsInput.value = "";
    if (urlInput) urlInput.value = "";
    if (previewInput) previewInput.value = "";
    if (publishedAtInput) publishedAtInput.value = "";

    addTextCustomTags = [];
    renderAddTextTagChips();

    if (Array.isArray(w.allEntries)) {
      w.allEntries.unshift(item);
    }
    if (typeof w.syncLocalEntriesCache === "function") {
      w.syncLocalEntriesCache(w.allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
    }
    if (typeof w.checkNativePendingSavedArticles === "function") w.checkNativePendingSavedArticles();
    if (typeof w.updateCounts === "function") w.updateCounts();
    if (typeof w.renderSidebarTags === "function") w.renderSidebarTags();
    if (typeof w.filterArticles === "function") w.filterArticles();
    showToast("✓ Custom entry saved");
    if (typeof w.openReader === "function") {
      w.openReader(item.id);
    }
  } catch (err: any) {
    showToast("Failed to save custom text: " + (err?.message || "Unknown error"), true);
  } finally {
    if (btn) btn.disabled = false;
  }
}
