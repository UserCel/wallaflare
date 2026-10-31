import { showToast } from "../components/toast";
import { isCapacitorApp, authFetch } from "../sync/api";
import { getSortedAnnotations } from "../modals/highlights";

export function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString("<!DOCTYPE html><html><body>" + html + "</body></html>", "text/html");
  const root = doc.body || doc;
  const nl = String.fromCharCode(10);
  const nl2 = nl + nl;
  const tick = String.fromCharCode(96);
  const fence = tick + tick + tick;
  const wsRegex = new RegExp("[" + String.fromCharCode(32, 9, 10, 13) + "]+", "g");

  function nodeToMd(node: any): string {
    if (!node) return "";
    if (node.nodeType === 3) {
      return node.nodeValue.replace(wsRegex, " ");
    }
    if (node.nodeType !== 1) return "";

    const tag = node.tagName.toLowerCase();
    let inner = Array.from(node.childNodes).map(nodeToMd).join("");

    switch (tag) {
      case "body": return inner.trim();
      case "h1": return nl2 + "# " + inner.trim() + nl2;
      case "h2": return nl2 + "## " + inner.trim() + nl2;
      case "h3": return nl2 + "### " + inner.trim() + nl2;
      case "h4": return nl2 + "#### " + inner.trim() + nl2;
      case "h5": return nl2 + "##### " + inner.trim() + nl2;
      case "h6": return nl2 + "###### " + inner.trim() + nl2;
      case "p": return nl2 + inner.trim() + nl2;
      case "strong":
      case "b": return "**" + inner.trim() + "**";
      case "em":
      case "i": return "*" + inner.trim() + "*";
      case "code":
        if (node.parentElement && node.parentElement.tagName.toLowerCase() === "pre") return inner;
        return tick + inner + tick;
      case "pre":
        return nl2 + fence + nl + inner.trim() + nl + fence + nl2;
      case "blockquote":
        return nl2 + "> " + inner.trim().split(nl).join(nl + "> ") + nl2;
      case "ul":
        return nl2 + Array.from(node.children).map((li: any) => "- " + nodeToMd(li).trim()).join(nl) + nl2;
      case "ol":
        return nl2 + Array.from(node.children).map((li: any, idx: number) => (idx + 1) + ". " + nodeToMd(li).trim()).join(nl) + nl2;
      case "li":
        return inner.trim();
      case "a": {
        const href = node.getAttribute("href");
        return href ? "[" + (inner.trim() || href) + "](" + href + ")" : inner;
      }
      case "img": {
        const src = node.getAttribute("src");
        const alt = node.getAttribute("alt") || "image";
        return src ? "![" + alt + "](" + src + ")" : "";
      }
      case "hr": return nl2 + "---" + nl2;
      case "br": return nl;
      default: return inner;
    }
  }

  const md = nodeToMd(root);
  return md.replace(new RegExp(nl + "{3,}", "g"), nl2).trim();
}

export async function shareOrDownloadBlob(blob: Blob, filename: string, mimeType?: string): Promise<void> {
  const type = mimeType || blob.type || "application/octet-stream";

  // 1. In Capacitor Native App: prioritize WallaflareNativePlugin or Capacitor Share
  if (isCapacitorApp()) {
    try {
      const w = typeof window !== "undefined" ? (window as any) : {};
      const nativePlugin = w.Capacitor?.Plugins?.WallaflareNative || w.WallaflareNative;
      const sharePlugin = w.Capacitor?.Plugins?.Share;
      const filesystemPlugin = w.Capacitor?.Plugins?.Filesystem;

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result;
          const base64data = typeof res === "string" ? res.split(",")[1] : "";
          resolve(base64data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;

      if (base64Data) {
        if (nativePlugin) {
          if (typeof nativePlugin.shareFile === "function") {
            await nativePlugin.shareFile({ filename, mimeType: type, base64Data });
            return;
          } else if (typeof nativePlugin.shareEpub === "function") {
            await nativePlugin.shareEpub({ filename, base64Data });
            return;
          }
        }

        if (filesystemPlugin && sharePlugin) {
          const writeResult = await filesystemPlugin.writeFile({
            path: filename,
            data: base64Data,
            directory: "CACHE"
          });

          if (writeResult && writeResult.uri) {
            await sharePlugin.share({
              title: filename,
              url: writeResult.uri,
              dialogTitle: "Share " + filename
            });
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Native Capacitor share failed, falling back to Web Share / Download", e);
    }
  }

  // 2. Web Share API (native share sheet on mobile browsers & Android WebView)
  try {
    if (typeof File !== "undefined" && typeof navigator.canShare === "function") {
      const file = new File([blob], filename, { type: type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename
        });
        return;
      }
    }
  } catch (shareErr: any) {
    if (shareErr && shareErr.name === "AbortError") return;
  }

  // 3. Fallback to standard browser blob URL download
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
    a.remove();
  }, 3500);
}

export async function exportMarkdown(id: number | any): Promise<void> {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries: any[] = w.allEntries || [];
  const item = typeof id === "number" ? allEntries.find((e: any) => e.id === id) : id;
  if (!item) return;

  showToast("Exporting Markdown...");
  try {
    const title = item.title || "Untitled Article";
    const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : "");
    const author = (rawAuthor && rawAuthor !== "wallaflare" && rawAuthor !== "Unknown") ? rawAuthor : (item.domain_name || "");
    const date = item.published_at || item.created_at || new Date().toISOString().split("T")[0];
    const tags = Array.isArray(item.tags) ? item.tags.map((t: any) => typeof t === "string" ? t : (t.label || t.slug)).filter(Boolean) : [];
    const nl = String.fromCharCode(10);
    const nl2 = nl + nl;

    let frontmatter = "---" + nl;
    frontmatter += "title: " + JSON.stringify(title) + nl;
    if (author) frontmatter += "author: " + JSON.stringify(author) + nl;
    if (item.url) frontmatter += "source: " + JSON.stringify(item.url) + nl;
    if (date) frontmatter += "date: " + JSON.stringify(date) + nl;
    if (tags.length > 0) frontmatter += "tags: [" + tags.map((t: any) => JSON.stringify(t)).join(", ") + "]" + nl;
    frontmatter += "---" + nl2;

    const annotations = getSortedAnnotations(item, "position");
    let bodyMd = htmlToMarkdown(item.content || item.text || "");

    const footnotes: string[] = [];
    let noteCounter = 1;
    if (annotations.length > 0) {
      for (const ann of annotations) {
        const quote = (ann.quote || "").trim();
        if (!quote) continue;
        const fnRef = (ann.text && ann.text.trim()) ? ("[^note-" + noteCounter + "]") : "";
        if (fnRef) {
          footnotes.push("[^note-" + noteCounter + "]: 💬 **Note**: " + (ann.text ? ann.text.trim() : ""));
          noteCounter++;
        }
        const replacement = "==" + quote + "==" + fnRef;
        if (bodyMd.includes(quote)) bodyMd = bodyMd.replace(quote, replacement);
      }
    }

    let summaryMd = "";
    if (annotations.length > 0) {
      summaryMd = nl2 + "---" + nl2 + "## 🖍️ Highlights & Notes" + nl2;
      for (const ann of annotations) {
        const colorEmoji = ann.color === "green" ? "🟢" : (ann.color === "blue" ? "🔵" : (ann.color === "purple" ? "🟣" : "🟡"));
        summaryMd += "- " + colorEmoji + ' **"' + (ann.quote || "").trim() + '"**' + nl;
        if (ann.text && ann.text.trim()) summaryMd += "  > 💬 **Note**: " + ann.text.trim() + nl;
      }
    }

    const footnotesMd = footnotes.length > 0 ? (nl2 + footnotes.join(nl) + nl) : "";
    const fullMd = frontmatter + "# " + title + nl2 + bodyMd + summaryMd + footnotesMd + nl;
    const filename = title.replace(/[/\\:*?"<>|]/g, "").trim() + ".md";

    const blob = new Blob([fullMd], { type: "text/markdown;charset=utf-8" });
    await shareOrDownloadBlob(blob, filename, "text/markdown");
    showToast("✓ Markdown exported");
  } catch (err) {
    showToast("Failed to export Markdown");
  }
}

export function exportActiveMarkdown(): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  if (w.activeArticleId) exportMarkdown(w.activeArticleId);
}

export async function exportPdf(id: number): Promise<void> {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries: any[] = w.allEntries || [];
  const item = allEntries.find((e: any) => e.id === id);
  if (!item) return;

  showToast("Generating PDF...");
  try {
    if (typeof w.WallaflarePdf !== "undefined" && typeof w.WallaflarePdf.generatePdf === "function") {
      const pdfBytes = await w.WallaflarePdf.generatePdf(item);
      const filename = (item.title || "article").replace(/[/\\:*?"<>|]/g, "").trim() + ".pdf";
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      await shareOrDownloadBlob(blob, filename, "application/pdf");
      showToast("✓ PDF exported");
    } else {
      window.print();
    }
  } catch (e) {
    showToast("Failed to generate PDF");
  }
}

export function exportActivePdf(): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  if (w.activeArticleId) exportPdf(w.activeArticleId);
}

export async function downloadEpub(id: number): Promise<void> {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries: any[] = w.allEntries || [];
  const item = allEntries.find((e: any) => e.id === id);
  if (!item) return;

  showToast("Exporting EPUB...");
  try {
    let blob: Blob | null = null;
    try {
      const res = await authFetch("/api/entries/" + id + "/export.epub");
      if (res.ok) {
        blob = await res.blob();
      }
    } catch (netErr) {}

    if (!blob && typeof w.WallaflareEpub !== "undefined" && typeof w.WallaflareEpub.generateEpub === "function") {
      const u8 = await w.WallaflareEpub.generateEpub(item, window.location.origin);
      blob = new Blob([u8], { type: "application/epub+zip" });
    }

    if (!blob) throw new Error("Could not generate EPUB");
    const filename = (item.title || "article").replace(/[/\\:*?"<>|]/g, "").trim() + ".epub";
    await shareOrDownloadBlob(blob, filename, "application/epub+zip");
    showToast("✓ EPUB exported");
  } catch (e) {
    showToast("Failed to export EPUB");
  }
}

export function downloadActiveEpub(): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  if (w.activeArticleId) downloadEpub(w.activeArticleId);
}

export async function handleExportBatchAnthologyEpub(): Promise<void> {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const selectedArticleIds = w.selectedArticleIds;
  const ids: number[] = Array.isArray(selectedArticleIds)
    ? selectedArticleIds
    : selectedArticleIds instanceof Set
    ? Array.from(selectedArticleIds)
    : [];

  if (ids.length === 0) return;
  if (typeof w.closeAllCardMenus === "function") w.closeAllCardMenus();

  if (ids.length === 1) {
    downloadEpub(ids[0]);
    if (typeof w.clearArticleSelection === "function") w.clearArticleSelection();
    return;
  }

  showToast("Compiling Anthology EPUB (" + ids.length + " articles)...");
  try {
    const allEntries: any[] = w.allEntries || [];
    const items: any[] = [];
    for (const id of ids) {
      let item = allEntries.find((e: any) => e.id === id);
      if (item) {
        if (!item.content) {
          try {
            const res = await authFetch("/api/entries/" + id + ".json");
            if (res.ok) {
              const fullItem = await res.json();
              item = { ...item, ...fullItem };
            }
          } catch (err) {}
        }
        items.push(item);
      }
    }

    if (items.length === 0) {
      showToast("No articles selected");
      return;
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const title = "Wallaflare Anthology — " + dateStr;
    let blob: Blob | null = null;

    try {
      const res = await authFetch("/api/entries/digest.epub?ids=" + ids.join(","));
      if (res.ok) {
        blob = await res.blob();
      }
    } catch (netErr) {}

    if (!blob && typeof w.WallaflareEpub !== "undefined" && typeof w.WallaflareEpub.generateDigestEpub === "function") {
      const u8 = await w.WallaflareEpub.generateDigestEpub(items, { title });
      blob = new Blob([u8], { type: "application/epub+zip" });
    }

    if (blob) {
      const filename = "wallaflare_anthology_" + dateStr + ".epub";
      await shareOrDownloadBlob(blob, filename, "application/epub+zip");
      showToast("✓ Anthology EPUB exported (" + items.length + " articles)");
      if (typeof w.clearArticleSelection === "function") w.clearArticleSelection();
    } else {
      showToast("Failed to export Anthology EPUB");
    }
  } catch (e) {
    console.error("Anthology EPUB error:", e);
    showToast("Failed to export Anthology EPUB");
  }
}

export async function handleBatchExportEpub(): Promise<void> {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const selectedArticleIds = w.selectedArticleIds;
  const ids: number[] = Array.isArray(selectedArticleIds)
    ? selectedArticleIds
    : selectedArticleIds instanceof Set
    ? Array.from(selectedArticleIds)
    : [];

  if (ids.length === 0) return;
  if (typeof w.closeAllCardMenus === "function") w.closeAllCardMenus();

  if (ids.length === 1) {
    downloadEpub(ids[0]);
    if (typeof w.clearArticleSelection === "function") w.clearArticleSelection();
    return;
  }

  showToast("Generating " + ids.length + " EPUB files...");
  try {
    const allEntries: any[] = w.allEntries || [];
    const zipFiles: Record<string, Uint8Array> = {};
    for (const id of ids) {
      const item = allEntries.find((e: any) => e.id === id);
      if (!item) continue;
      let u8: Uint8Array | null = null;
      try {
        const res = await authFetch("/api/entries/" + id + "/export.epub");
        if (res.ok) {
          const buf = await res.arrayBuffer();
          u8 = new Uint8Array(buf);
        }
      } catch (netErr) {}

      if (!u8 && typeof w.WallaflareEpub !== "undefined" && typeof w.WallaflareEpub.generateEpub === "function") {
        u8 = await w.WallaflareEpub.generateEpub(item, window.location.origin);
      }

      if (u8) {
        const safeName = (item.title || ("article-" + id)).replace(/[/\\:*?"<>|]/g, "").trim() + ".epub";
        zipFiles[safeName] = u8;
      }
    }
    const zipper = w.WallaflareEpub?.zipSync || w.fflate?.zipSync;
    if (zipper && Object.keys(zipFiles).length > 0) {
      const zippedData = zipper(zipFiles);
      const blob = new Blob([zippedData], { type: "application/zip" });
      const filename = "wallaflare-epubs-" + Date.now() + ".zip";
      await shareOrDownloadBlob(blob, filename, "application/zip");
      showToast("✓ " + Object.keys(zipFiles).length + " EPUBs exported to ZIP");
      if (typeof w.clearArticleSelection === "function") w.clearArticleSelection();
    } else {
      showToast("EPUB generator ready");
    }
  } catch (e) {
    showToast("Failed to batch export EPUBs");
  }
}

export async function handleBatchExportMarkdown(): Promise<void> {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const selectedArticleIds = w.selectedArticleIds;
  const ids: number[] = Array.isArray(selectedArticleIds)
    ? selectedArticleIds
    : selectedArticleIds instanceof Set
    ? Array.from(selectedArticleIds)
    : [];

  if (ids.length === 0) return;
  if (typeof w.closeAllCardMenus === "function") w.closeAllCardMenus();

  if (ids.length === 1) {
    exportMarkdown(ids[0]);
    if (typeof w.clearArticleSelection === "function") w.clearArticleSelection();
    return;
  }

  showToast("Creating Markdown ZIP archive...");
  try {
    const allEntries: any[] = w.allEntries || [];
    const zipFiles: Record<string, Uint8Array> = {};
    const strToU8 = w.WallaflareEpub?.strToU8 || w.fflate?.strToU8 || ((s: string) => new TextEncoder().encode(s));
    const zipper = w.WallaflareEpub?.zipSync || w.fflate?.zipSync;

    for (const id of ids) {
      const item = allEntries.find((e: any) => e.id === id);
      if (!item) continue;
      const bodyMd = htmlToMarkdown(item.content || item.text || "");
      const mdContent = "# " + (item.title || "Untitled") + "\n\n" +
        "- **Source:** " + (item.url || "N/A") + "\n" +
        "- **Author:** " + (item.author || "N/A") + "\n" +
        "- **Date:** " + (item.created_at || new Date().toISOString()) + "\n\n" +
        "---\n\n" +
        bodyMd;
      const safeName = (item.title || ("article-" + id)).replace(/[/\\:*?"<>|]/g, "").trim() + ".md";
      zipFiles[safeName] = strToU8(mdContent);
    }

    if (zipper && Object.keys(zipFiles).length > 0) {
      const zippedData = zipper(zipFiles);
      const blob = new Blob([zippedData], { type: "application/zip" });
      const filename = "wallaflare-markdown-" + Date.now() + ".zip";
      await shareOrDownloadBlob(blob, filename, "application/zip");
      showToast("✓ " + Object.keys(zipFiles).length + " Markdown files exported to ZIP");
      if (typeof w.clearArticleSelection === "function") w.clearArticleSelection();
    }
  } catch (e) {
    showToast("Failed to export Markdown ZIP");
  }
}

export function handleBatchExportPdf(): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const selectedArticleIds = w.selectedArticleIds;
  const ids: number[] = Array.isArray(selectedArticleIds)
    ? selectedArticleIds
    : selectedArticleIds instanceof Set
    ? Array.from(selectedArticleIds)
    : [];

  if (typeof w.closeAllCardMenus === "function") w.closeAllCardMenus();
  if (ids.length === 1) {
    exportPdf(ids[0]);
    if (typeof w.clearArticleSelection === "function") w.clearArticleSelection();
  }
}

export async function handleBatchExportJson(): Promise<void> {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const selectedArticleIds = w.selectedArticleIds;
  const ids: number[] = Array.isArray(selectedArticleIds)
    ? selectedArticleIds
    : selectedArticleIds instanceof Set
    ? Array.from(selectedArticleIds)
    : [];

  if (ids.length === 0) return;
  if (typeof w.closeAllCardMenus === "function") w.closeAllCardMenus();
  const allEntries: any[] = w.allEntries || [];
  const items = ids.map((id: number) => allEntries.find((e: any) => e.id === id)).filter(Boolean);
  const jsonStr = JSON.stringify(items, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const filename = (items.length === 1 ? (((items[0].title || "article") as string).replace(/[/\\:*?"<>|]/g, "").trim() + ".json") : ("wallaflare-export-" + Date.now() + ".json"));
  await shareOrDownloadBlob(blob, filename, "application/json");
  showToast("✓ Exported " + items.length + " article(s) as JSON");
  if (typeof w.clearArticleSelection === "function") w.clearArticleSelection();
}

// Attach to window for global access & HTML inline event handlers
if (typeof window !== "undefined") {
  const w = window as any;
  w.escapeHtml = escapeHtml;
  w.htmlToMarkdown = htmlToMarkdown;
  w.shareOrDownloadBlob = shareOrDownloadBlob;
  w.exportMarkdown = exportMarkdown;
  w.exportActiveMarkdown = exportActiveMarkdown;
  w.exportPdf = exportPdf;
  w.exportActivePdf = exportActivePdf;
  w.downloadEpub = downloadEpub;
  w.downloadActiveEpub = downloadActiveEpub;
  w.handleExportBatchAnthologyEpub = handleExportBatchAnthologyEpub;
  w.handleBatchExportAnthologyEpub = handleExportBatchAnthologyEpub;
  w.handleBatchExportEpub = handleBatchExportEpub;
  w.handleBatchExportMarkdown = handleBatchExportMarkdown;
  w.handleBatchExportPdf = handleBatchExportPdf;
  w.handleBatchExportJson = handleBatchExportJson;
}
