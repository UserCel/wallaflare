import { escapeHtml } from "../utils/dom";

export interface TagItem {
  id: number | string;
  label: string;
  slug: string;
  count: number;
}

function getStoredCachedGlobalTags(): any[] {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("wf_cached_tags");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {}
  return [];
}

export const sidebarState = {
  isSidebarTagsCollapsed: false,
  selectedTagFilter: null as string | null,
  cachedGlobalTags: getStoredCachedGlobalTags()
};

export function getSelectedTagFilter(): string | null {
  if (typeof window !== "undefined" && (window as any).selectedTagFilter !== undefined) {
    return (window as any).selectedTagFilter;
  }
  return sidebarState.selectedTagFilter;
}

export function setSelectedTagFilter(val: string | null): void {
  sidebarState.selectedTagFilter = val;
  if (typeof window !== "undefined") {
    (window as any).selectedTagFilter = val;
  }
}

export function getCachedGlobalTags(): any[] {
  if (typeof window !== "undefined" && (window as any).cachedGlobalTags !== undefined) {
    return (window as any).cachedGlobalTags;
  }
  return sidebarState.cachedGlobalTags;
}

export function setCachedGlobalTags(val: any[]): void {
  const arr = Array.isArray(val) ? val : [];
  sidebarState.cachedGlobalTags = arr;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("wf_cached_tags", JSON.stringify(arr));
    }
  } catch (e) {}
  if (typeof window !== "undefined") {
    (window as any).cachedGlobalTags = arr;
  }
}

export function getIsSidebarTagsCollapsed(): boolean {
  if (typeof window !== "undefined" && (window as any).isSidebarTagsCollapsed !== undefined) {
    return (window as any).isSidebarTagsCollapsed;
  }
  return sidebarState.isSidebarTagsCollapsed;
}

export function setIsSidebarTagsCollapsed(val: boolean): void {
  sidebarState.isSidebarTagsCollapsed = val;
  if (typeof window !== "undefined") {
    (window as any).isSidebarTagsCollapsed = val;
  }
}

export function getEffectiveGlobalTags(entries?: any[], cachedTags?: any[]): TagItem[] {
  const currentEntries = entries || (typeof window !== "undefined" && (window as any).allEntries) || [];
  const currentCached = cachedTags || getCachedGlobalTags() || [];
  const map = new Map<string, TagItem>();

  (currentCached || []).forEach((t: any) => {
    const label = (typeof t === "string" ? t : (t.label || t.name || t.slug || "")).trim();
    const slug = (typeof t === "string" ? t : (t.slug || t.label || t.name || "")).trim();
    const key = (slug || label).toLowerCase();
    const initialCount = (typeof t === "object" && (typeof t.count === "number" ? t.count : typeof t.entry_count === "number" ? t.entry_count : 0)) || 0;
    if (key) {
      map.set(key, {
        id: t.id || Date.now(),
        label: label || slug,
        slug: slug || label,
        count: initialCount,
        entry_count: initialCount
      });
    }
  });

  const localCounts = new Map<string, number>();
  (currentEntries || []).forEach((entry: any) => {
    (entry.tags || []).forEach((t: any) => {
      const label = (typeof t === "string" ? t : (t.label || t.name || t.slug || "")).trim();
      const slug = (typeof t === "string" ? t : (t.slug || t.label || t.name || "")).trim();
      const key = (slug || label).toLowerCase();
      if (key) {
        localCounts.set(key, (localCounts.get(key) || 0) + 1);
        if (!map.has(key)) {
          map.set(key, {
            id: (typeof t === "object" && t.id) ? t.id : Date.now(),
            label: label || slug,
            slug: slug || label,
            count: 0,
            entry_count: 0
          });
        }
      }
    });
  });

  if (currentEntries && currentEntries.length > 0) {
    for (const [key, item] of map.entries()) {
      const local = localCounts.get(key) || 0;
      item.count = Math.max(item.count || 0, local);
      item.entry_count = item.count;
    }
  }

  return Array.from(map.values());
}

export async function loadGlobalTags(): Promise<void> {
  try {
    const authFetch = (typeof window !== "undefined" && (window as any).authFetch) || fetch;
    const res = await authFetch("/api/tags.json?_t=" + Date.now(), { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setCachedGlobalTags(data);
      renderSidebarTags();
      if (typeof window !== "undefined" && typeof (window as any).renderGlobalTagManagerUI === "function") {
        (window as any).renderGlobalTagManagerUI();
      }
    }
  } catch (e) {}
}

export function renderSidebarTags(): void {
  const listEl = document.getElementById("sidebarTagList");
  const countEl = document.getElementById("sidebarTagCount");
  const listMobileEl = document.getElementById("sidebarTagListMobile");
  const countMobileEl = document.getElementById("sidebarTagCountMobile");

  const tags = getEffectiveGlobalTags();
  if (countEl) countEl.textContent = String(tags.length);
  if (countMobileEl) countMobileEl.textContent = String(tags.length);

  const activeTag = getSelectedTagFilter();
  const htmlContent = tags.length === 0
    ? '<div style="font-size: 0.75rem; color: var(--text-muted); padding: 0.35rem 0.5rem; font-style: italic;">No tags yet</div>'
    : tags.map(t => {
        const count = typeof t.count === "number" ? t.count : (typeof t.entry_count === "number" ? t.entry_count : 0);
        const isActive = activeTag && activeTag.toLowerCase() === (t.slug || t.label).toLowerCase();
        return '<button class="sidebar-tag-item ' + (isActive ? 'active' : '') + '" onclick="filterByTag(\'' + escapeHtml(t.slug || t.label).replace(/'/g, "\\'") + '\')">' +
          '<span>#' + escapeHtml(t.label) + '</span>' +
          (count > 0 ? '<span class="badge-count">' + count + '</span>' : '') +
        '</button>';
      }).join('');

  if (listEl) listEl.innerHTML = htmlContent;
  if (listMobileEl) listMobileEl.innerHTML = htmlContent;
}

export function toggleSidebarTagsCollapse(): void {
  const current = getIsSidebarTagsCollapsed();
  setIsSidebarTagsCollapsed(!current);
  const isCollapsed = getIsSidebarTagsCollapsed();

  const listEl = document.getElementById("sidebarTagList");
  const chevron = document.getElementById("sidebarTagChevron");
  const listMobileEl = document.getElementById("sidebarTagListMobile");
  const chevronMobile = document.getElementById("sidebarTagChevronMobile");

  if (listEl) listEl.classList.toggle("collapsed", isCollapsed);
  if (chevron) chevron.style.transform = isCollapsed ? "rotate(-90deg)" : "none";
  if (listMobileEl) listMobileEl.classList.toggle("collapsed", isCollapsed);
  if (chevronMobile) chevronMobile.style.transform = isCollapsed ? "rotate(-90deg)" : "none";
}

export function filterByTag(slug: string | null): void {
  const current = getSelectedTagFilter();
  if (current === slug) {
    setSelectedTagFilter(null);
  } else {
    setSelectedTagFilter(slug);
  }
  renderSidebarTags();
  if (typeof window !== "undefined" && typeof (window as any).filterArticles === "function") {
    (window as any).filterArticles();
  }
}

export function setFilter(filter: string, updateHistory: boolean = true): void {
  if (typeof window !== "undefined") {
    (window as any).currentFilter = filter;
  }
  document.querySelectorAll(".sidebar-nav-item").forEach(b => b.classList.remove("active"));
  const activeBtn = document.getElementById("tab" + filter.charAt(0).toUpperCase() + filter.slice(1));
  const activeMobileBtn = document.getElementById("tab" + filter.charAt(0).toUpperCase() + filter.slice(1) + "Mobile");
  if (activeBtn) activeBtn.classList.add("active");
  if (activeMobileBtn) activeMobileBtn.classList.add("active");

  if (typeof window !== "undefined" && typeof (window as any).filterArticles === "function") {
    (window as any).filterArticles();
  }

  if (updateHistory && typeof window !== "undefined") {
    const newPath = filter === "unread" ? "/" : ("/" + filter);
    if (window.location.pathname !== newPath) {
      window.history.pushState({ filter }, "", newPath);
    }
  }
}

function getStoredCachedCounts(): { unread: number; starred: number; archive: number; total: number } | null {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("wf_cached_counts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.total === "number") return parsed;
      }
    }
  } catch (e) {}
  return null;
}

export function updateCounts(entries?: any[], counts?: any): void {
  const allEntries = entries || (typeof window !== "undefined" && (window as any).allEntries) || [];
  const serverCounts = counts || (typeof window !== "undefined" && (window as any).serverLibraryCounts) || getStoredCachedCounts();

  let unread = 0;
  let starred = 0;
  let archive = 0;
  let total = 0;

  if (serverCounts && typeof serverCounts.total === "number" && (allEntries.length === 0 || serverCounts.total > allEntries.length)) {
    unread = serverCounts.unread ?? 0;
    starred = serverCounts.starred ?? 0;
    archive = serverCounts.archive ?? 0;
    total = serverCounts.total ?? 0;
  } else {
    for (const e of allEntries) {
      if (!e.is_archived) unread++;
      if (e.is_starred) starred++;
      if (e.is_archived) archive++;
      total++;
    }
  }

  const unreadEl = document.getElementById("countUnread");
  const starredEl = document.getElementById("countStarred");
  const archiveEl = document.getElementById("countArchive");
  const totalEl = document.getElementById("countAll");

  const unreadMobileEl = document.getElementById("countUnreadMobile");
  const starredMobileEl = document.getElementById("countStarredMobile");
  const archiveMobileEl = document.getElementById("countArchiveMobile");
  const totalMobileEl = document.getElementById("countAllMobile");

  if (unreadEl) unreadEl.textContent = String(unread);
  if (starredEl) starredEl.textContent = String(starred);
  if (archiveEl) archiveEl.textContent = String(archive);
  if (totalEl) totalEl.textContent = String(total);

  if (unreadMobileEl) unreadMobileEl.textContent = String(unread);
  if (starredMobileEl) starredMobileEl.textContent = String(starred);
  if (archiveMobileEl) archiveMobileEl.textContent = String(archive);
  if (totalMobileEl) totalMobileEl.textContent = String(total);
}
