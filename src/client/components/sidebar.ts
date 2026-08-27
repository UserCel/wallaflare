import { state } from "../state";
import { Tag } from "../types";
import { setText, $id, setHtml } from "../utils/dom";

export function updateCounts(): void {
  const total = state.allEntries.length;
  const unread = state.allEntries.filter((e) => !e.is_archived).length;
  const starred = state.allEntries.filter((e) => e.is_starred).length;
  const archive = state.allEntries.filter((e) => e.is_archived).length;

  setText("countUnread", unread);
  setText("countStarred", starred);
  setText("countArchive", archive);
  setText("countAll", total);
}

export function getEffectiveGlobalTags(): Tag[] {
  const tagMap = new Map<string, number>();
  for (const entry of state.allEntries) {
    if (Array.isArray(entry.tags)) {
      for (const t of entry.tags) {
        const label = typeof t === "string" ? t : t.label;
        if (label) {
          tagMap.set(label, (tagMap.get(label) || 0) + 1);
        }
      }
    }
  }
  const result: Tag[] = [];
  tagMap.forEach((count, label) => {
    result.push({ label, count });
  });
  return result.sort((a, b) => a.label.localeCompare(b.label));
}

export function renderSidebarTags(): void {
  const container = $id("sidebarTagList") || $id("sidebarTagsList");
  if (!container) return;

  const tags = getEffectiveGlobalTags();
  if (tags.length === 0) {
    setHtml(container, '<div class="sidebar-empty-tags">No tags yet</div>');
    return;
  }

  let html = "";
  for (const tag of tags) {
    const isActive = state.currentFilter === "tag" && state.activeFilterTag === tag.label;
    html += `<button class="sidebar-item ${isActive ? "active" : ""}" onclick="filterByTag('${tag.label}')">
      <span class="sidebar-item-label"># ${tag.label}</span>
      <span class="sidebar-item-badge">${tag.count}</span>
    </button>`;
  }
  setHtml(container, html);
}

export function toggleSidebarTagsCollapse(): void {
  state.sidebarTagsCollapsed = !state.sidebarTagsCollapsed;
  const el = $id("sidebarTagsSection");
  if (el) {
    el.classList.toggle("collapsed", state.sidebarTagsCollapsed);
  }
}
