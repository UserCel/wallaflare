import { authFetch } from "../sync/api";
import { showToast } from "../components/toast";

export interface NormalizedImportItem {
  url?: string;
  title?: string;
  content?: string;
  tags?: string[];
  is_archived?: number;
  is_starred?: number;
  created_at?: string;
  author?: string;
  preview_picture?: string;
  annotations?: any[];
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\r" && next === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function parseImportFile(text: string, filename = ""): NormalizedImportItem[] {
  const trimmed = (text || "").trim();
  if (!trimmed) return [];
  const lowerName = filename.toLowerCase();

  // 1. JSON (Wallabag / Wallaflare export)
  if (lowerName.endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed?.entries) ? parsed.entries : (Array.isArray(parsed?._embedded?.items) ? parsed._embedded.items : []));
      return list
        .filter((x: any) => x && (x.url || x.title || x.content))
        .map((x: any) => ({
          url: x.url ? String(x.url) : undefined,
          title: x.title ? String(x.title) : undefined,
          content: x.content ? String(x.content) : undefined,
          tags: Array.isArray(x.tags)
            ? x.tags.map((t: any) => (typeof t === "string" ? t : (t?.label || t?.slug || ""))).filter(Boolean)
            : undefined,
          is_archived: x.is_archived ? 1 : 0,
          is_starred: x.is_starred ? 1 : 0,
          created_at: x.created_at ? String(x.created_at) : undefined,
          author: x.author ? String(x.author) : undefined,
          preview_picture: x.preview_picture ? String(x.preview_picture) : undefined,
          annotations: Array.isArray(x.annotations) ? x.annotations : undefined,
        }));
    } catch {}
  }

  // 2. Netscape Bookmarks HTML
  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm") || /<!DOCTYPE\s+NETSCAPE-Bookmark-file-1/i.test(trimmed) || /<a\s+[^>]*href=/i.test(trimmed)) {
    const items: NormalizedImportItem[] = [];
    const anchorRe = /<a\s+([^>]*?)>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = anchorRe.exec(trimmed)) !== null) {
      const attrs = m[1];
      const title = m[2].replace(/<[^>]+>/g, "").trim();
      const hrefMatch = attrs.match(/href\s*=\s*["']([^"']+)["']/i);
      if (!hrefMatch?.[1]) continue;
      const url = hrefMatch[1].trim();
      if (!/^https?:\/\//i.test(url)) continue;
      const tagsMatch = attrs.match(/tags\s*=\s*["']([^"']*)["']/i);
      const tags = tagsMatch?.[1] ? tagsMatch[1].split(",").map(s => s.trim()).filter(Boolean) : undefined;
      items.push({ url, title: title || url, tags });
    }
    return items;
  }

  // 3. Pocket / Instapaper CSV
  const rows = parseCsvRows(trimmed);
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const urlIdx = headers.findIndex(h => h === "url" || h === "given_url");
  if (urlIdx === -1) return [];
  const titleIdx = headers.findIndex(h => h === "title");
  const tagsIdx = headers.findIndex(h => h === "tags" || h === "folder");
  const statusIdx = headers.findIndex(h => h === "status");
  const timeIdx = headers.findIndex(h => h === "time_added" || h === "timestamp");

  const items: NormalizedImportItem[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const url = (r[urlIdx] || "").trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const title = titleIdx !== -1 ? (r[titleIdx] || "").trim() : "";
    const rawTags = tagsIdx !== -1 ? (r[tagsIdx] || "").trim() : "";
    const tags = rawTags ? rawTags.split(/[|,]/).map(s => s.trim()).filter(Boolean) : undefined;
    const status = statusIdx !== -1 ? (r[statusIdx] || "").trim().toLowerCase() : "";
    const isArchived = status === "archive" || status === "archived" || status === "read" ? 1 : 0;
    const rawTime = timeIdx !== -1 ? Number(r[timeIdx]) : NaN;
    const createdAt = !isNaN(rawTime) && rawTime > 0
      ? new Date(rawTime < 1e10 ? rawTime * 1000 : rawTime).toISOString()
      : undefined;

    items.push({ url, title: title || url, tags, is_archived: isArchived, created_at: createdAt });
  }
  return items;
}

export async function handleImportLibraryFile(file: File): Promise<void> {
  if (!file) return;
  showToast("Parsing import file...");
  try {
    const text = await file.text();
    const items = parseImportFile(text, file.name);
    if (items.length === 0) {
      showToast("No valid articles found in file");
      return;
    }

    let totalImported = 0;
    let totalSkipped = 0;
    const chunkSize = 25;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      showToast(`Importing ${Math.min(i + chunk.length, items.length)} / ${items.length}...`);
      const res = await authFetch("/api/import/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: chunk }),
      });
      if (!res.ok) {
        throw new Error(`Import failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      totalImported += Number(data.imported || 0);
      totalSkipped += Number(data.skipped || 0);
    }

    showToast(`✓ Imported ${totalImported} article(s) (${totalSkipped} skipped)`);
    const w = typeof window !== "undefined" ? (window as any) : {};
    if (typeof w.loadArticles === "function") {
      await w.loadArticles(true);
    }
  } catch (err: any) {
    showToast("Import error: " + (err?.message || "Unknown error"));
  }
}

export function triggerLibraryImport(): void {
  const input = document.getElementById("libraryImportFileInput") as HTMLInputElement | null;
  if (input) {
    input.value = "";
    input.click();
  }
}

export async function handleLibraryImportInput(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (file) {
    await handleImportLibraryFile(file);
  }
}

if (typeof window !== "undefined") {
  const w = window as any;
  w.triggerLibraryImport = triggerLibraryImport;
  w.handleLibraryImportInput = handleLibraryImportInput;
}
