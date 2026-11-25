import { escapeHtml } from "../utils/dom";

export function isEmptyOrStubContent(rawContent: string | null | undefined, url?: string | null): boolean {
  const trimmed = (rawContent || "").trim();
  if (!trimmed || trimmed === "<p>No content available.</p>") return true;
  const plain = trimmed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length === 0) return true;
  if (url && plain === url.trim()) return true;
  return false;
}

export function renderEmptyArticleFallback(item: any): string {
  const safeUrl = item?.url ? escapeHtml(String(item.url)) : "";
  const safeDomain = item?.domain_name ? escapeHtml(String(item.domain_name)) : "source site";
  return (
    '<div class="reader-empty-fallback" style="border:1px solid var(--border-color);border-radius:12px;padding:1.25rem;margin:1rem 0;background:var(--bg-secondary);">' +
      '<h3 style="margin:0 0 0.45rem 0;font-size:1.05rem;">Article text could not be extracted</h3>' +
      '<p style="margin:0 0 1rem 0;color:var(--text-secondary);font-size:0.92rem;line-height:1.5;">' +
        'The page from <strong>' + safeDomain + '</strong> may be behind a paywall, bot check, or client-side renderer.' +
      '</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">' +
        '<button type="button" class="btn btn-primary" onclick="refetchActiveArticleContent()">Re-fetch Content</button>' +
        '<button type="button" class="btn btn-outline" onclick="openSettingsModal(\'cookies\')">Configure Site Cookies</button>' +
        (safeUrl ? '<a class="btn btn-outline" href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">Open Original Link</a>' : '') +
        '<button type="button" class="btn btn-outline" onclick="handleAddTextBtnClick()">Paste Text Manually</button>' +
      '</div>' +
    '</div>'
  );
}
