import { openModal, closeModal } from "./manager";
import { pushOverlayHistory, popOverlayHistory } from "../utils/overlay-history";
import { showToast } from "../components/toast";
import { showConfirmDialog } from "./confirm";
import {
  getEffectiveGlobalTags,
  loadGlobalTags,
  renderSidebarTags,
  getCachedGlobalTags,
  setCachedGlobalTags,
  filterByTag
} from "../components/sidebar";
import { escapeHtml } from "../utils/dom";

let activeTagModalIds: number[] = [];

export function getActiveTagModalIds(): number[] {
  return [...activeTagModalIds];
}

export function setActiveTagModalIds(ids: number[]): void {
  activeTagModalIds = [...ids];
}

export function openTagModal(target?: number | number[]): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  if (typeof target === "number") activeTagModalIds = [target];
  else if (Array.isArray(target)) activeTagModalIds = target;
  else if (w.activeArticleId) activeTagModalIds = [w.activeArticleId];

  if (activeTagModalIds.length === 0) return;

  const titleEl = document.getElementById("tagModalHeaderTitle");
  const articleTitleEl = document.getElementById("tagModalArticleTitle");
  const allEntries = w.allEntries || [];

  if (activeTagModalIds.length === 1) {
    const item = allEntries.find((e: any) => e.id === activeTagModalIds[0]);
    if (titleEl) titleEl.textContent = "Manage Tags";
    if (articleTitleEl) articleTitleEl.textContent = item ? item.title : "";
  } else {
    if (titleEl) titleEl.textContent = "Batch Tag Editor (" + activeTagModalIds.length + " articles)";
    if (articleTitleEl) articleTitleEl.textContent = "Editing tags across " + activeTagModalIds.length + " selected articles";
  }

  renderTagModalUI();
  document.getElementById("tagModal")?.classList.add("open");
  pushOverlayHistory("tagModal", () => closeTagModal());
}

export function closeTagModal(): void {
  activeTagModalIds = [];
  document.getElementById("tagModal")?.classList.remove("open");
  popOverlayHistory("tagModal");
}

export function openTagModalForSelection(): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const selected = w.selectedArticleIds;
  const ids = selected instanceof Set ? Array.from(selected) : Array.isArray(selected) ? selected : [];
  if (ids.length === 0) {
    showToast("No articles selected");
    return;
  }
  openTagModal(ids);
}

export function handleAddTagBtnClick(btn: HTMLElement): void {
  const parent = btn.closest(".tag-badge");
  const enc = (parent && parent.getAttribute("data-tag")) || btn.getAttribute("data-tag");
  if (enc) addQuickTagToActiveArticles(decodeURIComponent(enc));
}

export function handleRemoveTagBtnClick(btn: HTMLElement): void {
  const parent = btn.closest(".tag-badge");
  const enc = (parent && parent.getAttribute("data-tag")) || btn.getAttribute("data-tag");
  if (enc) removeTagFromActiveArticles(decodeURIComponent(enc));
}

export function handleFilterByTagClick(btn: HTMLElement): void {
  const enc = btn.getAttribute("data-tag");
  if (!enc) return;
  closeModal("settingsModal");
  closeGlobalTagModal();
  filterByTag(decodeURIComponent(enc));
}

export function handleDeleteGlobalTagClick(btn: HTMLElement): void {
  const enc = btn.getAttribute("data-tag");
  if (!enc) return;
  deleteGlobalTag(decodeURIComponent(enc));
}

export function renderTagModalUI(): void {
  const container = document.getElementById("tagModalCurrentTags");
  const availContainer = document.getElementById("tagModalAvailableTags");
  const quickSection = document.getElementById("quickTagsSection");
  if (!container) return;

  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  const totalSelected = activeTagModalIds.length;

  // Count occurrences of each tag across selected articles
  const tagCounts = new Map<string, { label: string; count: number; slug: string }>();
  activeTagModalIds.forEach((id) => {
    const item = allEntries.find((e: any) => e.id === id);
    if (item && item.tags) {
      const seenInArticle = new Set<string>();
      item.tags.forEach((t: any) => {
        const label = (typeof t === "string" ? t : (t.label || t.name || t.slug || "")).trim();
        const slug = (typeof t === "string" ? t : (t.slug || t.label || t.name || "")).trim();
        const key = (label || slug).toLowerCase();
        const slugKey = (slug || label).toLowerCase();
        if (key && !seenInArticle.has(key)) {
          seenInArticle.add(key);
          seenInArticle.add(slugKey);
          const existing = tagCounts.get(key) || tagCounts.get(slugKey) || { label, slug, count: 0 };
          existing.count++;
          tagCounts.set(key, existing);
          tagCounts.set(slugKey, existing);
        }
      });
    }
  });

  const seenBadgeKeys = new Set<string>();
  const allApplied: { label: string; count: number; slug: string }[] = [];
  tagCounts.forEach((val) => {
    const normalized = val.label.toLowerCase();
    if (!seenBadgeKeys.has(normalized)) {
      seenBadgeKeys.add(normalized);
      allApplied.push(val);
    }
  });

  if (allApplied.length === 0) {
    container.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No tags applied</span>';
  } else {
    container.innerHTML = allApplied
      .map(({ label, count }) => {
        const enc = encodeURIComponent(label);
        const isPartial = totalSelected > 1 && count < totalSelected;

        if (isPartial) {
          return (
            '<span class="tag-badge tag-badge-partial" style="cursor: default; display: inline-flex; align-items: center; gap: 0.4rem; background: var(--bg-tertiary); border: 1px dashed var(--accent); color: var(--text-primary); padding: 3px 7px; border-radius: var(--radius-sm);" data-tag="' +
            enc +
            '" title="Applied to ' +
            count +
            " of " +
            totalSelected +
            ' selected articles">' +
            "<span>#" +
            escapeHtml(label) +
            "</span>" +
            '<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">(' +
            count +
            "/" +
            totalSelected +
            ")</span>" +
            '<div style="display: inline-flex; align-items: center; gap: 0.25rem; border-left: 1px solid var(--border-color); padding-left: 0.35rem; margin-left: 0.1rem;">' +
            '<button type="button" style="background: none; border: none; color: var(--accent); cursor: pointer; padding: 0 2px; font-size: 0.85rem; line-height: 1; font-weight: 700;" onclick="handleAddTagBtnClick(this)" title="Apply to all ' +
            totalSelected +
            ' articles">+</button>' +
            '<button type="button" style="background: none; border: none; color: var(--danger, #ef4444); cursor: pointer; padding: 0 2px; font-size: 0.85rem; line-height: 1;" onclick="handleRemoveTagBtnClick(this)" title="Remove from all selected articles">&times;</button>' +
            "</div>" +
            "</span>"
          );
        }

        return (
          '<span class="tag-badge" style="cursor: default; display: inline-flex; align-items: center; gap: 0.35rem;" data-tag="' +
          enc +
          '">' +
          "#" +
          escapeHtml(label) +
          '<button type="button" style="background: none; border: none; color: currentColor; cursor: pointer; padding: 0; font-size: 0.85rem; line-height: 1;" onclick="handleRemoveTagBtnClick(this)" title="Remove tag">&times;</button>' +
          "</span>"
        );
      })
      .join(" ");
  }

  // Available quick library tags to choose from (tags not present on ANY selected article)
  const allLibTags = getEffectiveGlobalTags();
  const availableQuickTags = allLibTags.filter((t) => {
    const key = (t.label || t.slug || "").toLowerCase();
    const slugKey = (t.slug || t.label || "").toLowerCase();
    return !tagCounts.has(key) && !tagCounts.has(slugKey);
  });

  if (availContainer && quickSection) {
    if (availableQuickTags.length > 0) {
      quickSection.style.display = "block";
      availContainer.innerHTML = availableQuickTags
        .map((t) => {
          const enc = encodeURIComponent(t.label);
          return (
            '<button type="button" class="tag-badge" style="cursor: pointer; background: var(--bg-tertiary); border: 1px dashed var(--border-color);" data-tag="' +
            enc +
            '" onclick="handleAddTagBtnClick(this)" title="Add tag to all selected">' +
            "+ #" +
            escapeHtml(t.label) +
            "</button>"
          );
        })
        .join(" ");
    } else {
      quickSection.style.display = "none";
      availContainer.innerHTML = "";
    }
  }
}

export function addQuickTagToActiveArticles(tagName: string): void {
  if (!tagName || activeTagModalIds.length === 0) return;
  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  const ids = [...activeTagModalIds];

  for (const id of ids) {
    const item = allEntries.find((e: any) => e.id === id);
    if (item) {
      if (!item.tags) item.tags = [];
      const exists = item.tags.some((t: any) => {
        const l = (typeof t === "string" ? t : (t.label || t.name || t.slug || "")).trim().toLowerCase();
        return l === tagName.toLowerCase();
      });
      if (!exists) {
        item.tags.push({ label: tagName, slug: tagName.toLowerCase() });
      }
    }
  }

  let cached = getCachedGlobalTags() || [];
  let tagItem = cached.find((t) => (t.label || "").toLowerCase() === tagName.toLowerCase() || (t.slug || "").toLowerCase() === tagName.toLowerCase());
  if (tagItem) {
    const cur = typeof tagItem.count === "number" ? tagItem.count : (typeof tagItem.entry_count === "number" ? tagItem.entry_count : 0);
    tagItem.count = cur + ids.length;
    tagItem.entry_count = tagItem.count;
  } else {
    cached.push({ id: Date.now(), label: tagName, slug: tagName.toLowerCase(), count: ids.length, entry_count: ids.length });
  }
  setCachedGlobalTags(cached);

  if (typeof w.syncLocalEntriesCache === "function") {
    w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
  }
  renderTagModalUI();
  renderSidebarTags();
  if (typeof w.filterArticles === "function") w.filterArticles();
  showToast("Tag #" + tagName + " added");

  const enqueue = w.enqueueMutation;
  if (typeof enqueue === "function") {
    if (ids.length === 1) {
      enqueue("add_tag", { id: ids[0], tag: tagName });
    } else {
      enqueue("batch_add_tag", { ids, tag: tagName });
    }
  }
}

export function removeTagFromActiveArticles(tagName: string): void {
  if (!tagName || activeTagModalIds.length === 0) return;
  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  const ids = [...activeTagModalIds];
  const tagLower = tagName.toLowerCase();

  for (const id of ids) {
    const item = allEntries.find((e: any) => e.id === id);
    if (item && item.tags) {
      item.tags = item.tags.filter((t: any) => {
        const l = (typeof t === "string" ? t : (t.label || t.name || t.slug || "")).trim().toLowerCase();
        return l !== tagLower;
      });
    }
  }

  let cached = getCachedGlobalTags() || [];
  let tagItem = cached.find((t) => (t.label || "").toLowerCase() === tagLower || (t.slug || "").toLowerCase() === tagLower);
  if (tagItem) {
    const cur = typeof tagItem.count === "number" ? tagItem.count : (typeof tagItem.entry_count === "number" ? tagItem.entry_count : 0);
    tagItem.count = Math.max(0, cur - ids.length);
    tagItem.entry_count = tagItem.count;
    setCachedGlobalTags(cached);
  }

  if (typeof w.syncLocalEntriesCache === "function") {
    w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
  }
  renderTagModalUI();
  renderSidebarTags();
  if (typeof w.filterArticles === "function") w.filterArticles();
  showToast("Tag #" + tagName + " removed");

  const enqueue = w.enqueueMutation;
  if (typeof enqueue === "function") {
    if (ids.length === 1) {
      enqueue("remove_tag", { id: ids[0], tag: tagName });
    } else {
      enqueue("batch_remove_tag", { ids, tag: tagName });
    }
  }
}

export function submitAddTag(): void {
  const input = document.getElementById("newTagInput") as HTMLInputElement | null;
  const rawVal = input ? input.value.trim() : "";
  if (!rawVal || activeTagModalIds.length === 0) return;

  const tagsToAdd = rawVal
    .split(",")
    .map((s) => s.trim().replace(/^#/, ""))
    .filter(Boolean);
  if (tagsToAdd.length === 0) return;

  for (const tag of tagsToAdd) {
    addQuickTagToActiveArticles(tag);
  }
  if (input) input.value = "";
  renderTagModalUI();
}

export function openGlobalTagManager(): void {
  renderGlobalTagManagerUI();
  openModal("globalTagModal");
  loadGlobalTags().then(() => renderGlobalTagManagerUI());
}

export function closeGlobalTagModal(): void {
  closeModal("globalTagModal");
}

export function renderGlobalTagManagerUI(): void {
  const containers = [
    document.getElementById("globalTagListContainer"),
    document.getElementById("settingsGlobalTagListContainer")
  ].filter(Boolean) as HTMLElement[];

  const countLabels = [
    document.getElementById("globalTagCountLabel"),
    document.getElementById("settingsGlobalTagCountLabel")
  ].filter(Boolean) as HTMLElement[];

  const tags = getEffectiveGlobalTags();
  countLabels.forEach((lbl) => {
    lbl.textContent = tags.length + " tag" + (tags.length === 1 ? "" : "s") + " total";
  });

  if (tags.length === 0) {
    containers.forEach((c) => {
      c.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.88rem;">No tags in library yet</div>';
    });
    return;
  }

  const html = tags
    .map((t) => {
      const enc = encodeURIComponent(t.slug || t.label);
      return (
        '<div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.65rem; background: var(--bg-tertiary); border-radius: var(--radius-sm);">' +
        '<div style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; flex: 1;" data-tag="' +
        enc +
        '" onclick="handleFilterByTagClick(this)">' +
        '<span style="font-weight: 600; font-size: 0.88rem; color: var(--accent);">#' +
        escapeHtml(t.label) +
        "</span>" +
        '<span class="badge-count" style="font-size: 0.72rem;">' +
        t.count +
        " article" +
        (t.count === 1 ? "" : "s") +
        "</span>" +
        "</div>" +
        '<button class="btn-icon" style="color: var(--text-muted); padding: 0.2rem 0.4rem; height: auto;" data-tag="' +
        enc +
        '" onclick="handleDeleteGlobalTagClick(this)" title="Remove tag from all articles">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
        "</button>" +
        "</div>"
      );
    })
    .join("");

  containers.forEach((c) => {
    c.innerHTML = html;
  });
}

export async function deleteGlobalTag(tagSlugOrLabel: string): Promise<void> {
  const tagLower = tagSlugOrLabel.toLowerCase();
  const tags = getEffectiveGlobalTags();
  const tagObj = tags.find(
    (t) => (t.slug || "").toLowerCase() === tagLower || (t.label || "").toLowerCase() === tagLower
  );
  const label = tagObj ? tagObj.label : tagSlugOrLabel;
  const count = tagObj ? tagObj.count : 0;

  let confirmMsg = 'Are you sure you want to delete tag "#' + label + '" from your library?';
  if (count > 0) {
    confirmMsg = 'Are you sure you want to delete "#' + label + '"? This will untag ' + count + " article" + (count === 1 ? "" : "s") + " across your library.";
  }

  const confirmed = await showConfirmDialog("Delete Tag", confirmMsg, "Delete Tag", true);
  if (!confirmed) return;

  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  let modified = false;

  for (const entry of allEntries) {
    if (entry.tags && entry.tags.length > 0) {
      const prevLen = entry.tags.length;
      entry.tags = entry.tags.filter((t: any) => {
        const l = (typeof t === "string" ? t : (t.label || t.name || t.slug || "")).trim().toLowerCase();
        return l !== tagLower;
      });
      if (entry.tags.length !== prevLen) modified = true;
    }
  }

  let cached = getCachedGlobalTags() || [];
  cached = cached.filter((t) => (t.slug || "").toLowerCase() !== tagLower && (t.label || "").toLowerCase() !== tagLower);
  setCachedGlobalTags(cached);

  if (modified) {
    if (typeof w.syncLocalEntriesCache === "function") {
      w.syncLocalEntriesCache(allEntries, cached, w.serverLibraryCounts);
    }
    renderSidebarTags();
    if (typeof w.filterArticles === "function") w.filterArticles();
  }
  renderGlobalTagManagerUI();
  showToast("Tag #" + label + " deleted");

  try {
    const authFetch = w.authFetch || fetch;
    await authFetch("/api/tags/" + encodeURIComponent(tagSlugOrLabel) + ".json", {
      method: "DELETE"
    });
  } catch (e) {}
}

export async function submitCreateGlobalTag(): Promise<void> {
  const input = document.getElementById("newGlobalTagInput") as HTMLInputElement | null;
  const val = input ? input.value.trim().replace(/^#/, "") : "";
  if (!val) return;

  let cached = getCachedGlobalTags() || [];
  const exists = cached.some(
    (t) => (t.label || "").toLowerCase() === val.toLowerCase() || (t.slug || "").toLowerCase() === val.toLowerCase()
  );
  if (!exists) {
    cached.push({ id: Date.now(), label: val, slug: val.toLowerCase(), count: 0 });
  }
  setCachedGlobalTags(cached);
  if (input) input.value = "";
  renderSidebarTags();
  renderGlobalTagManagerUI();
  showToast("Tag #" + val + " created");

  try {
    const w = typeof window !== "undefined" ? (window as any) : {};
    const authFetch = w.authFetch || fetch;
    const res = await authFetch("/api/tags.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: val })
    });
    if (res.ok) {
      const created = await res.json();
      cached = getCachedGlobalTags() || [];
      const idx = cached.findIndex(
        (t) => t.slug === created.slug || t.label.toLowerCase() === created.label.toLowerCase()
      );
      if (idx >= 0) cached[idx] = created;
      else cached.push(created);
      setCachedGlobalTags(cached);
    }
    await loadGlobalTags();
    renderGlobalTagManagerUI();
  } catch (e) {}
}

export async function cleanupUnusedTags(): Promise<void> {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  const usedTags = new Set<string>();

  allEntries.forEach((e: any) => {
    (e.tags || []).forEach((t: any) => {
      const l = (typeof t === "string" ? t : (t.label || t.name || t.slug || "")).trim().toLowerCase();
      if (l) usedTags.add(l);
    });
  });

  const cached = getCachedGlobalTags() || [];
  const unusedList = cached.filter((t) => {
    const l = (typeof t === "string" ? t : (t.label || t.name || t.slug || "")).trim().toLowerCase();
    return !usedTags.has(l);
  });

  if (unusedList.length === 0) {
    showToast("No unused tags in library");
    return;
  }

  const confirmed = await showConfirmDialog(
    "Clean Up Unused Tags",
    "Are you sure you want to delete " + unusedList.length + " unused tag" + (unusedList.length === 1 ? "" : "s") + " from your library?",
    "Delete Unused Tags",
    true
  );
  if (!confirmed) return;

  const filtered = cached.filter((t) => {
    const l = (typeof t === "string" ? t : (t.label || t.name || t.slug || "")).trim().toLowerCase();
    return usedTags.has(l);
  });
  setCachedGlobalTags(filtered);

  renderSidebarTags();
  renderGlobalTagManagerUI();
  showToast(unusedList.length + " unused tag" + (unusedList.length === 1 ? "" : "s") + " cleaned");

  const authFetch = w.authFetch || fetch;
  for (const t of unusedList) {
    const idOrSlug = t.id || t.slug || t.label;
    if (idOrSlug) {
      authFetch("/api/tags/" + encodeURIComponent(idOrSlug) + ".json", { method: "DELETE" }).catch(() => {});
    }
  }
}
