import { openModal } from "./manager";
import { escapeHtml } from "../utils/dom";
import { getReadingWpm, scaleReadingMinutes } from "../utils/reading-time";
import { showToast } from "../components/toast";
import { state } from "../state";

export interface ArticleTextStats {
  words: number;
  chars: number;
  images: number;
}

/** Computes plain-text word count, character count, and image count from article HTML. */
export function computeArticleTextStats(html: string | null | undefined): ArticleTextStats {
  const raw = html || "";
  const images = (raw.match(/<img\b/gi) || []).length;
  const text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return { words, chars: text.length, images };
}

export interface BatchPropertiesSummary {
  count: number;
  totalWords: number;
  totalChars: number;
  totalImages: number;
  totalScaledMinutes: number;
  totalBaseMinutes: number;
  wpm: number;
  unreadCount: number;
  archivedCount: number;
  starredCount: number;
  totalAnnotations: number;
  uniqueDomains: string[];
  uniqueTags: string[];
  earliestSaved: string | null;
  latestSaved: string | null;
}

/** Aggregates client-side statistics for a multi-article selection. */
export function computeBatchProperties(items: any[], wpmOverride?: number): BatchPropertiesSummary {
  const wpm = wpmOverride ?? getReadingWpm();
  let totalWords = 0;
  let totalChars = 0;
  let totalImages = 0;
  let totalScaledMinutes = 0;
  let totalBaseMinutes = 0;
  let unreadCount = 0;
  let archivedCount = 0;
  let starredCount = 0;
  let totalAnnotations = 0;
  const domainSet = new Set<string>();
  const tagSet = new Set<string>();
  let earliestMs = Infinity;
  let latestMs = -Infinity;
  let earliestSaved: string | null = null;
  let latestSaved: string | null = null;

  for (const item of items) {
    const stats = computeArticleTextStats(item.content);
    totalWords += stats.words;
    totalChars += stats.chars;
    totalImages += stats.images;

    const baseMin = Math.max(1, Number(item.reading_time) || 1);
    totalBaseMinutes += baseMin;
    totalScaledMinutes += scaleReadingMinutes(baseMin, wpm);

    if (item.is_archived) archivedCount++;
    else unreadCount++;
    if (item.is_starred) starredCount++;

    if (Array.isArray(item.annotations)) {
      totalAnnotations += item.annotations.length;
    }
    if (item.domain_name) domainSet.add(String(item.domain_name));
    if (Array.isArray(item.tags)) {
      for (const t of item.tags) {
        const label = typeof t === "string" ? t : t?.label || t?.slug;
        if (label) tagSet.add(String(label));
      }
    }
    if (item.created_at) {
      const ms = new Date(item.created_at).getTime();
      if (!isNaN(ms)) {
        if (ms < earliestMs) {
          earliestMs = ms;
          earliestSaved = item.created_at;
        }
        if (ms > latestMs) {
          latestMs = ms;
          latestSaved = item.created_at;
        }
      }
    }
  }

  return {
    count: items.length,
    totalWords,
    totalChars,
    totalImages,
    totalScaledMinutes,
    totalBaseMinutes,
    wpm,
    unreadCount,
    archivedCount,
    starredCount,
    totalAnnotations,
    uniqueDomains: Array.from(domainSet),
    uniqueTags: Array.from(tagSet),
    earliestSaved,
    latestSaved,
  };
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statBox(label: string, value: string): string {
  return (
    '<div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.55rem 0.65rem;">' +
      '<div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em;">' + escapeHtml(label) + '</div>' +
      '<div style="font-size: 0.98rem; font-weight: 700; color: var(--text-primary); margin-top: 0.15rem;">' + escapeHtml(value) + '</div>' +
    '</div>'
  );
}

function detailRow(label: string, valueHtml: string): string {
  return (
    '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.83rem;">' +
      '<span style="color: var(--text-muted); flex-shrink: 0;">' + escapeHtml(label) + '</span>' +
      '<span style="color: var(--text-primary); text-align: right; word-break: break-word;">' + valueHtml + '</span>' +
    '</div>'
  );
}

function renderSinglePropertiesHtml(item: any): string {
  const stats = computeArticleTextStats(item.content);
  const wpm = getReadingWpm();
  const baseMin = Math.max(1, Number(item.reading_time) || 1);
  const scaledMin = scaleReadingMinutes(baseMin, wpm);

  let savedRatio = 0;
  try {
    savedRatio = parseFloat(localStorage.getItem("wf_scroll_" + item.id) || "0") || 0;
  } catch {}
  const progressPct = Math.min(100, Math.max(0, Math.round(savedRatio * 100)));

  const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : "");
  const author = rawAuthor && rawAuthor !== "wallaflare" && rawAuthor !== "Unknown" ? rawAuthor : "";

  const tags = Array.isArray(item.tags)
    ? item.tags.map((t: any) => (typeof t === "string" ? t : t?.label || t?.slug)).filter(Boolean)
    : [];

  const annotationsCount = Array.isArray(item.annotations) ? item.annotations.length : 0;
  const readTimeLabel = wpm === 200
    ? `${scaledMin} min`
    : `${scaledMin} min (${baseMin}m @ 200)`;

  const urlHtml = item.url
    ? '<a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none;">' + escapeHtml(item.url) + '</a>' +
      ' <button type="button" class="btn btn-outline" onclick="copyPropertiesUrl(\'' + escapeHtml(String(item.url)).replace(/'/g, "\\'") + '\')" style="padding: 1px 6px; font-size: 0.7rem; margin-left: 4px;">Copy</button>'
    : "—";

  const statusParts = [item.is_archived ? "Archived" : "Unread"];
  if (item.is_starred) statusParts.push("Starred");

  return (
    '<div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); line-height: 1.35;">' +
      escapeHtml(item.title || "Untitled") +
    '</div>' +
    '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">' +
      statBox("Words", stats.words.toLocaleString()) +
      statBox("Characters", stats.chars.toLocaleString()) +
      statBox(`Read Time (${wpm} WPM)`, readTimeLabel) +
      statBox("Progress", progressPct > 0 ? `${progressPct}%` : "0%") +
    '</div>' +
    '<div style="display: flex; flex-direction: column;">' +
      detailRow("Source URL", urlHtml) +
      detailRow("Domain", escapeHtml(item.domain_name || "—")) +
      detailRow("Author", escapeHtml(author || "—")) +
      detailRow("Status", escapeHtml(statusParts.join(" • "))) +
      detailRow("Tags", tags.length > 0 ? escapeHtml(tags.map((t: string) => "#" + t).join(", ")) : "—") +
      detailRow("Highlights", String(annotationsCount)) +
      detailRow("Images", String(stats.images)) +
      detailRow("Language", escapeHtml((item.language || "en").toUpperCase())) +
      detailRow("Published", escapeHtml(formatDateTime(item.published_at))) +
      detailRow("Saved", escapeHtml(formatDateTime(item.created_at))) +
      detailRow("Updated", escapeHtml(formatDateTime(item.updated_at))) +
      detailRow("Entry ID / Rev", `#${item.id} (rev ${item.revision || 1})`) +
    '</div>'
  );
}

function renderBatchPropertiesHtml(items: any[]): string {
  const summary = computeBatchProperties(items);
  const readTimeLabel = summary.wpm === 200
    ? formatDuration(summary.totalScaledMinutes)
    : `${formatDuration(summary.totalScaledMinutes)} (${formatDuration(summary.totalBaseMinutes)} @ 200)`;

  const domainsPreview = summary.uniqueDomains.length > 0
    ? escapeHtml(summary.uniqueDomains.slice(0, 6).join(", ")) + (summary.uniqueDomains.length > 6 ? ` (+${summary.uniqueDomains.length - 6} more)` : "")
    : "—";

  const tagsPreview = summary.uniqueTags.length > 0
    ? escapeHtml(summary.uniqueTags.slice(0, 8).map((t) => "#" + t).join(", ")) + (summary.uniqueTags.length > 8 ? ` (+${summary.uniqueTags.length - 8} more)` : "")
    : "—";

  const dateRange = summary.earliestSaved && summary.latestSaved
    ? `${formatDateTime(summary.earliestSaved)} — ${formatDateTime(summary.latestSaved)}`
    : "—";

  return (
    '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">' +
      statBox("Selected Articles", String(summary.count)) +
      statBox(`Total Read Time (${summary.wpm} WPM)`, readTimeLabel) +
      statBox("Total Words", summary.totalWords.toLocaleString()) +
      statBox("Total Characters", summary.totalChars.toLocaleString()) +
    '</div>' +
    '<div style="display: flex; flex-direction: column;">' +
      detailRow("Unread / Archived", `${summary.unreadCount} unread • ${summary.archivedCount} archived`) +
      detailRow("Starred", String(summary.starredCount)) +
      detailRow("Total Highlights", String(summary.totalAnnotations)) +
      detailRow("Total Images", String(summary.totalImages)) +
      detailRow("Domains", domainsPreview) +
      detailRow("Tags", tagsPreview) +
      detailRow("Saved Range", escapeHtml(dateRange)) +
    '</div>'
  );
}

export async function copyPropertiesUrl(url: string): Promise<void> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      showToast("URL copied to clipboard");
      return;
    }
  } catch {}
  showToast("Could not copy URL");
}

export function openPropertiesModal(entryId?: number): void {
  const titleEl = document.getElementById("propertiesModalTitle");
  const bodyEl = document.getElementById("propertiesModalBody");
  if (!bodyEl) return;

  const w = typeof window !== "undefined" ? (window as any) : {};
  const entries: any[] = w.allEntries || state.allEntries || [];
  const selectedIds: Set<number> = w.selectedArticleIds || state.selectedArticleIds || new Set<number>();

  if (entryId !== undefined && entryId !== null) {
    const item = entries.find((e) => e.id === entryId);
    if (!item) return;
    if (titleEl) titleEl.textContent = "Article Properties";
    bodyEl.innerHTML = renderSinglePropertiesHtml(item);
  } else {
    const items = entries.filter((e) => selectedIds.has(e.id));
    if (items.length === 0) return;
    if (items.length === 1) {
      if (titleEl) titleEl.textContent = "Article Properties";
      bodyEl.innerHTML = renderSinglePropertiesHtml(items[0]);
    } else {
      if (titleEl) titleEl.textContent = `Selection Properties (${items.length})`;
      bodyEl.innerHTML = renderBatchPropertiesHtml(items);
    }
  }

  openModal("propertiesModal");
}
