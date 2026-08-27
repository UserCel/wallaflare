import { Article, Annotation } from "../types";
import { state } from "../state";
import { showToast } from "../components/toast";
import { isCapacitorApp, getEffectiveServerUrl } from "../sync/api";
import { getSortedAnnotations } from "./annotations";

declare const WallaflareEpub: any;
declare const WallaflarePdf: any;

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
      if (!html) return '';
      const doc = new DOMParser().parseFromString('<!DOCTYPE html><html><body>' + html + '</body></html>', 'text/html');
      const root = doc.body || doc;
      const nl = String.fromCharCode(10);
      const nl2 = nl + nl;
      const tick = String.fromCharCode(96);
      const fence = tick + tick + tick;
      const wsRegex = new RegExp('[' + String.fromCharCode(32, 9, 10, 13) + ']+', 'g');

      function nodeToMd(node: any): string {
        if (!node) return '';
        if (node.nodeType === 3) {
          return node.nodeValue.replace(wsRegex, ' ');
        }
        if (node.nodeType !== 1) return '';

        const tag = node.tagName.toLowerCase();
        let inner = Array.from(node.childNodes).map(nodeToMd).join('');

        switch (tag) {
          case 'body': return inner.trim();
          case 'h1': return nl2 + '# ' + inner.trim() + nl2;
          case 'h2': return nl2 + '## ' + inner.trim() + nl2;
          case 'h3': return nl2 + '### ' + inner.trim() + nl2;
          case 'h4': return nl2 + '#### ' + inner.trim() + nl2;
          case 'h5': return nl2 + '##### ' + inner.trim() + nl2;
          case 'h6': return nl2 + '###### ' + inner.trim() + nl2;
          case 'p': return nl2 + inner.trim() + nl2;
          case 'strong':
          case 'b': return '**' + inner.trim() + '**';
          case 'em':
          case 'i': return '*' + inner.trim() + '*';
          case 'code':
            if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') return inner;
            return tick + inner + tick;
          case 'pre':
            return nl2 + fence + nl + inner.trim() + nl + fence + nl2;
          case 'blockquote':
            return nl2 + '> ' + inner.trim().split(nl).join(nl + '> ') + nl2;
          case 'ul':
            return nl2 + Array.from(node.children).map((li: any) => '- ' + nodeToMd(li).trim()).join(nl) + nl2;
          case 'ol':
            return nl2 + Array.from(node.children).map((li: any, idx: number) => (idx + 1) + '. ' + nodeToMd(li).trim()).join(nl) + nl2;
          case 'li':
            return inner.trim();
          case 'a':
            const href = node.getAttribute('href');
            return href ? '[' + (inner.trim() || href) + '](' + href + ')' : inner;
          case 'img':
            const src = node.getAttribute('src');
            const alt = node.getAttribute('alt') || 'image';
            return src ? '![' + alt + '](' + src + ')' : '';
          case 'hr': return nl2 + '---' + nl2;
          case 'br': return nl;
          default: return inner;
        }
      }

      const md = nodeToMd(root);
      return md.replace(new RegExp(nl + '{3,}', 'g'), nl2).trim();
    }

export async function shareOrDownloadBlob(blob: Blob, filename: string, mimeType: string = "application/octet-stream"): Promise<void> {
  if (isCapacitorApp() && typeof (window as any).Capacitor !== "undefined" && (window as any).Capacitor.Plugins?.WallaflareNativePlugin) {
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];
        await (window as any).Capacitor.Plugins.WallaflareNativePlugin.shareFile({
          fileName: filename,
          base64Data: base64
        });
      };
      reader.readAsDataURL(blob);
      return;
    } catch (e) {
      console.warn("Native share failed, falling back to download:", e);
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export async function exportMarkdown(idOrItem: any): Promise<void> {
      let item = typeof idOrItem === 'number' ? state.allEntries.find(e => e.id === idOrItem) : idOrItem;
      if (!item) item = state.allEntries.find(e => e.id === state.activeArticleId);
      if (!item) return;

      showToast('Exporting Markdown...');
      try {
        const title = item.title || 'Untitled Article';
        const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : '');
        const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : (item.domain_name || '');
        const date = item.published_at || item.created_at || new Date().toISOString().split('T')[0];
        const tags = Array.isArray(item.tags) ? item.tags.map((t: any) => typeof t === 'string' ? t : (t.label || t.slug)).filter(Boolean) : [];
        const nl = String.fromCharCode(10);
        const nl2 = nl + nl;

        let frontmatter = '---' + nl;
        frontmatter += 'title: ' + JSON.stringify(title) + nl;
        if (author) frontmatter += 'author: ' + JSON.stringify(author) + nl;
        if (item.url) frontmatter += 'source: ' + JSON.stringify(item.url) + nl;
        if (date) frontmatter += 'date: ' + JSON.stringify(date) + nl;
        if (tags.length > 0) frontmatter += 'tags: [' + tags.map((t: any) => JSON.stringify(t)).join(', ') + ']' + nl;
        frontmatter += '---' + nl2;

        let annotations = getSortedAnnotations(item, 'position');
        let bodyMd = htmlToMarkdown(item.content || item.text || '');

        const footnotes: string[] = [];
        let noteCounter = 1;
        if (annotations.length > 0) {
          for (const ann of annotations) {
            const quote = (ann.quote || '').trim();
            if (!quote) continue;
            const fnRef = (ann.text && ann.text.trim()) ? ('[^note-' + noteCounter + ']') : '';
            if (fnRef) {
              footnotes.push('[^note-' + noteCounter + ']: 💬 **Note**: ' + (ann.text ? ann.text.trim() : ''));
              noteCounter++;
            }
            const replacement = '==' + quote + '==' + fnRef;
            if (bodyMd.includes(quote)) bodyMd = bodyMd.replace(quote, replacement);
          }
        }

        let summaryMd = '';
        if (annotations.length > 0) {
          summaryMd = nl2 + '---' + nl2 + '## 🖍️ Highlights & Notes' + nl2;
          for (const ann of annotations) {
            const colorEmoji = ann.color === 'green' ? '🟢' : (ann.color === 'blue' ? '🔵' : (ann.color === 'purple' ? '🟣' : '🟡'));
            summaryMd += '- ' + colorEmoji + ' **"' + (ann.quote || '').trim() + '"**' + nl;
            if (ann.text && ann.text.trim()) summaryMd += '  > 💬 **Note**: ' + ann.text.trim() + nl;
          }
        }

        let footnotesMd = footnotes.length > 0 ? (nl2 + footnotes.join(nl) + nl) : '';
        const fullMd = frontmatter + '# ' + title + nl2 + bodyMd + summaryMd + footnotesMd + nl;
        const filename = title.replace(/[/:*?"<>|]/g, '').trim() + '.md';

        const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8' });
        await shareOrDownloadBlob(blob, filename, 'text/markdown');
        showToast('✓ Markdown exported');
      } catch (err) {
        showToast('Failed to export Markdown');
      }
    }

export async function exportActiveMarkdown(): Promise<void> {
  if (state.activeArticleId) await exportMarkdown(state.activeArticleId);
}

export async function exportPdf(idOrItem: any): Promise<void> {
  let item = typeof idOrItem === "number" ? state.allEntries.find(e => e.id === idOrItem) : idOrItem;
  if (!item) item = state.allEntries.find(e => e.id === state.activeArticleId);
  if (!item) return;

  if (typeof WallaflarePdf !== "undefined" && WallaflarePdf.generatePdfBlob) {
    const blob = await WallaflarePdf.generatePdfBlob(item);
    await shareOrDownloadBlob(blob, (item.title || "article") + ".pdf", "application/pdf");
  } else {
    window.print();
  }
}

export async function exportActivePdf(): Promise<void> {
  if (state.activeArticleId) await exportPdf(state.activeArticleId);
}

export async function downloadEpub(idOrItem: any): Promise<void> {
  let item = typeof idOrItem === "number" ? state.allEntries.find(e => e.id === idOrItem) : idOrItem;
  if (!item) item = state.allEntries.find(e => e.id === state.activeArticleId);
  if (!item) return;

  if (typeof WallaflareEpub !== "undefined" && WallaflareEpub.generateEpubBlob) {
    const blob = await WallaflareEpub.generateEpubBlob(item);
    await shareOrDownloadBlob(blob, (item.title || "article") + ".epub", "application/epub+zip");
  } else {
    showToast("EPUB generator not available", true);
  }
}

export async function downloadActiveEpub(): Promise<void> {
  if (state.activeArticleId) await downloadEpub(state.activeArticleId);
}
