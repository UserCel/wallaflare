import { state } from "../state";
import { openModal, closeModal } from "./manager";
import { showToast } from "../components/toast";
import { authFetch } from "../sync/api";
import { enqueueMutation } from "../storage/outbox";
import { getEffectiveGlobalTags, renderSidebarTags } from "../components/sidebar";

export function openTagModal(): void {
  renderTagModalUI();
  openModal("tagModal");
}

export function closeTagModal(): void {
  closeModal("tagModal");
}

export function renderTagModalUI(): void {
  const container = document.getElementById("tagModalCurrentTags");
  if (!container) return;

  const activeArticle = state.allEntries.find((e) => e.id === state.activeArticleId);
  const tags = activeArticle?.tags || [];

  if (tags.length === 0) {
    container.innerHTML = '<span class="text-secondary text-sm">No tags on this article</span>';
    return;
  }

  container.innerHTML = tags
    .map((t) => {
      const label = typeof t === "string" ? t : t.label;
      return `<span class="tag-chip">${label}<button type="button" class="tag-chip-del" onclick="removeTagFromActiveArticles('${label}')">&times;</button></span>`;
    })
    .join("");
}

export async function addQuickTagToActiveArticles(tag: string): Promise<void> {
  if (!state.activeArticleId) return;
  try {
    await authFetch(`/api/entries/${state.activeArticleId}/tags.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: tag })
    });
    showToast(`Added tag #${tag}`);
    if ((window as any).loadArticles) (window as any).loadArticles(false);
  } catch (e) {
    enqueueMutation("add_tag", { id: state.activeArticleId, tag });
    showToast(`Queued tag #${tag} (offline)`);
  }
}

export async function removeTagFromActiveArticles(tag: string): Promise<void> {
  if (!state.activeArticleId) return;
  try {
    await authFetch(`/api/entries/${state.activeArticleId}/tags/${encodeURIComponent(tag)}.json`, {
      method: "DELETE"
    });
    showToast(`Removed tag #${tag}`);
    if ((window as any).loadArticles) (window as any).loadArticles(false);
  } catch (e) {
    enqueueMutation("remove_tag", { id: state.activeArticleId, tag });
    showToast(`Queued tag removal #${tag} (offline)`);
  }
}

export function openGlobalTagManager(): void {
  renderGlobalTagManagerUI();
  openModal("globalTagModal");
}

export function closeGlobalTagModal(): void {
  closeModal("globalTagModal");
}

export function renderGlobalTagManagerUI(): void {
  const container = document.getElementById("globalTagManagerList");
  if (!container) return;

  const tags = getEffectiveGlobalTags();
  if (tags.length === 0) {
    container.innerHTML = '<div class="text-secondary text-sm">No tags found in library</div>';
    return;
  }

  let html = "";
  for (const tag of tags) {
    html += `<div class="global-tag-row">
      <span class="global-tag-name"># ${tag.label} (${tag.count})</span>
      <button class="btn btn-sm btn-danger" onclick="deleteGlobalTag('${tag.label}')">Delete</button>
    </div>`;
  }
  container.innerHTML = html;
}

export async function deleteGlobalTag(tag: string): Promise<void> {
  try {
    await authFetch(`/api/tags/${encodeURIComponent(tag)}.json`, {
      method: "DELETE"
    });
    showToast(`Deleted tag #${tag}`);
    renderSidebarTags();
    renderGlobalTagManagerUI();
    if ((window as any).loadArticles) (window as any).loadArticles(false);
  } catch (e) {
    showToast("Failed to delete tag", true);
  }
}
