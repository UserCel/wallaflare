import { state } from "../state";
import { openModal, closeModal } from "./manager";
import { showToast } from "../components/toast";
import { apiPost } from "../sync/api";
import { $id, getInputValue, setInputValue, setHtml } from "../utils/dom";

let addTextCustomTags: string[] = [];

export function handleAddArticleBtnClick(): void {
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

  const btn = $id<HTMLButtonElement>("submitUrlBtn");
  if (btn) btn.disabled = true;

  try {
    const { ok } = await apiPost("/api/entries.json", { url });
    if (ok) {
      showToast("Article saved successfully!");
      closeModal("addUrlModal");
      setInputValue("urlInput", "");
      if ((window as any).loadArticles) (window as any).loadArticles(false);
    } else {
      showToast("Failed to save article", true);
    }
  } catch (err) {
    showToast("Network error saving article", true);
  } finally {
    if (btn) btn.disabled = false;
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
