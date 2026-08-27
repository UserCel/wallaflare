import { state } from "../state";
import { Article } from "../types";
import { openReader } from "../reader/view";
import { escapeHtml } from "../reader/export";
import { handleCardContextMenu } from "./context-menu";
import { enqueueMutation } from "../storage/outbox";
import { authFetch } from "../sync/api";
import { updateCounts } from "./sidebar";
import { showToast } from "./toast";

export const RENDER_CHUNK_SIZE = 40;

export function getFilteredEntries(): Article[] {
  let list = [...state.allEntries];

  if (state.currentFilter === "unread") {
    list = list.filter((e) => !e.is_archived);
  } else if (state.currentFilter === "starred") {
    list = list.filter((e) => e.is_starred);
  } else if (state.currentFilter === "archive") {
    list = list.filter((e) => e.is_archived);
  } else if (state.currentFilter === "tag" && state.activeFilterTag) {
    list = list.filter((e) => {
      if (!Array.isArray(e.tags)) return false;
      return e.tags.some((t) => (typeof t === "string" ? t : (t.label || t.name || t.slug)) === state.activeFilterTag);
    });
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter((e) => {
      return (
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.domain_name && e.domain_name.toLowerCase().includes(q)) ||
        (e.content && e.content.toLowerCase().includes(q))
      );
    });
  }

  return sortEntriesLocally(list, state.currentSortOrder);
}

export function sortEntriesLocally(entries: Article[], order: string): Article[] {
  return sortEntries(entries, order);
}

export function sortEntries(entries: Article[], order: string): Article[] {
  const list = [...entries];
  if (order === "oldest") {
    return list.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  } else if (order === "az") {
    return list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else if (order === "za") {
    return list.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
  } else if (order === "reading_time_asc") {
    return list.sort((a, b) => (a.reading_time || 0) - (b.reading_time || 0));
  } else if (order === "reading_time_desc") {
    return list.sort((a, b) => (b.reading_time || 0) - (a.reading_time || 0));
  }
  return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

export function loadMoreRenderedCards(): void {
  state.currentRenderLimit += RENDER_CHUNK_SIZE;
  renderArticles();
}

export function renderArticlesChunked(entries?: Article[]): void {
  const grid = document.getElementById("articlesGrid") || document.getElementById("articlesListContainer");
  const empty = document.getElementById("emptyState") || document.getElementById("articlesEmptyState");
  if (!grid) return;

  const items = entries || getFilteredEntries();

  if (!items || items.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.style.display = "flex";
    updateArticlesFooterStatus();
    return;
  }

  if (empty) empty.style.display = "none";
  const visibleSlice = items.slice(0, state.currentRenderLimit);

  grid.innerHTML = visibleSlice
    .map((item) => {
      const domain = item.domain_name || "direct-input";
      const rawAuthor =
        item.author ||
        (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : "");
      const author = rawAuthor && rawAuthor !== "wallaflare" && rawAuthor !== "Unknown" ? rawAuthor : "";
      const date = item.created_at
        ? new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : "";
      const rawContentText =
        item.text ||
        item.excerpt ||
        (item.content ? item.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "");
      const excerpt = rawContentText
        ? rawContentText.length > 160
          ? rawContentText.slice(0, 160) + "..."
          : rawContentText
        : "No preview available";
      const isChecked = state.selectedArticleIds.has(item.id);
      const isReading = state.activeArticleId === item.id;

      const starSvg = item.is_starred
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

      const tags = Array.isArray(item.tags) ? item.tags : [];
      const tagsHtml =
        tags.length > 0
          ? '<div class="card-tags">' +
            tags
              .map((t) => {
                const label = typeof t === "string" ? t : t.label || t.name || t.slug;
                const slug = typeof t === "string" ? t : t.slug || t.label || t.name;
                return (
                  '<span class="tag-badge" onclick="event.stopPropagation(); filterByTag(\'' +
                  escapeHtml(slug) +
                  '\')">#' +
                  escapeHtml(label) +
                  "</span>"
                );
              })
              .join("") +
            "</div>"
          : "";

      const totalMin = item.reading_time || 1;
      let readingProgressText = totalMin + " min read";

      const imgHtml = item.preview_picture
        ? '<div class="card-image-wrap"><img src="' +
          escapeHtml(item.preview_picture) +
          '" alt="' +
          escapeHtml(item.title || "") +
          '" loading="lazy" class="card-image" onerror="this.parentElement.remove()" /></div>'
        : "";

      return (
        '<div class="article-card ' +
        (isChecked ? "is-selected " : "") +
        (isReading ? "is-reading" : "") +
        '" id="entry-card-' +
        item.id +
        '" data-id="' +
        item.id +
        '" oncontextmenu="handleCardContextMenu(event, ' +
        item.id +
        ')" onclick="handleCardClick(event, ' +
        item.id +
        ')">' +
        '<div class="card-select-wrap" onclick="event.stopPropagation(); toggleArticleSelection(' +
        item.id +
        ');">' +
        '<div class="card-checkbox ' +
        (isChecked ? "checked" : "") +
        '">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
        "</div>" +
        "</div>" +
        '<div class="card-main-content">' +
        '<div class="card-text-column">' +
        '<div class="card-meta">' +
        '<span class="card-domain">' +
        escapeHtml(domain) +
        "</span>" +
        (author ? "<span>by " + escapeHtml(author) + "</span>" : "") +
        "</div>" +
        '<h2 class="card-title">' +
        escapeHtml(item.title || "Untitled") +
        "</h2>" +
        '<p class="card-excerpt">' +
        escapeHtml(excerpt) +
        "</p>" +
        tagsHtml +
        "</div>" +
        imgHtml +
        "</div>" +
        '<div class="card-footer">' +
        '<span class="card-date">' +
        date +
        "</span>" +
        '<span style="font-size: 0.75rem; color: var(--text-muted);">' +
        readingProgressText +
        "</span>" +
        '<div style="display: flex; gap: 0.35rem;">' +
        '<button class="action-btn ' +
        (item.is_starred ? "active-star" : "") +
        '" title="Star" onclick="event.stopPropagation(); toggleStar(' +
        item.id +
        ", " +
        item.is_starred +
        ')">' +
        starSvg +
        "</button>" +
        '<button class="action-btn ' +
        (item.is_archived ? "active-archive" : "") +
        '" title="Archive" onclick="event.stopPropagation(); toggleArchive(' +
        item.id +
        ", " +
        item.is_archived +
        ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></button>' +
        "</div>" +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  updateArticlesFooterStatus();
}

export function renderArticles(entries?: Article[]): void {
  state.currentRenderLimit = 40;
  renderArticlesChunked(entries);
}

export function updateArticlesFooterStatus(): void {
  const statusEl = document.getElementById("articlesListFooterStatus") || document.getElementById("articlesFooterStatus");
  if (!statusEl) return;
  const filtered = getFilteredEntries();
  if (filtered.length === 0) {
    statusEl.style.display = "none";
    statusEl.textContent = "";
    return;
  }
  statusEl.style.display = "block";
  statusEl.textContent = "Showing " + Math.min(filtered.length, state.currentRenderLimit) + " of " + filtered.length + " articles";
}

export function toggleArticleSelection(id: number): void {
  if (state.selectedArticleIds.has(id)) {
    state.selectedArticleIds.delete(id);
  } else {
    state.selectedArticleIds.add(id);
  }
  renderArticles();
}

export function clearArticleSelection(): void {
  state.selectedArticleIds.clear();
  renderArticles();
}

export function toggleStar(id: number, currentStarred?: number): void {
  const item = state.allEntries.find((e) => e.id === id);
  if (!item) return;
  const newStarred = item.is_starred ? 0 : 1;
  item.is_starred = newStarred;
  enqueueMutation("toggle_star", { id, is_starred: newStarred });
  updateCounts();
  renderArticles();
  authFetch(`/api/entries/${id}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ starred: newStarred })
  }).catch(() => {});
}

export function toggleArchive(id: number, currentArchived?: number): void {
  const item = state.allEntries.find((e) => e.id === id);
  if (!item) return;
  const newArchived = item.is_archived ? 0 : 1;
  item.is_archived = newArchived;
  enqueueMutation("toggle_archive", { id, is_archived: newArchived });
  updateCounts();
  renderArticles();
  showToast(newArchived ? "Archived article" : "Restored to unread");
  authFetch(`/api/entries/${id}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archive: newArchived })
  }).catch(() => {});
}

let searchDebounceTimer: any = null;

export function handleSearchInput(value: string): void {
  state.searchQuery = value.trim();
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    state.currentRenderLimit = 40;
    renderArticles();
  }, 150);
}

export function clearSearch(): void {
  state.searchQuery = "";
  const input = document.getElementById("searchInput") as HTMLInputElement;
  if (input) input.value = "";
  renderArticles();
}
