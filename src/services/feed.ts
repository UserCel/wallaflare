import { EntryRow, TagItem } from '../types';

export interface RssFeedOptions {
  baseUrl: string;
  feedTitle: string;
  feedDescription?: string;
  feedPath: string;
  entries: EntryRow[];
  entryTagsMap?: Map<number, TagItem[]>;
  appName?: string;
  token?: string | null;
}

function xmlEscape(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripCdata(content: string | null | undefined): string {
  if (!content) return '';
  return content.replace(/\]\]>/g, ']]&gt;');
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates standards-compliant RSS 2.0 XML with full content:encoded and Atom self-link.
 */
export function generateRssFeedXml(options: RssFeedOptions): string {
  const {
    baseUrl,
    feedTitle,
    feedDescription = 'Articles syndicated from Wallaflare',
    feedPath,
    entries,
    entryTagsMap,
    appName = 'Wallaflare',
    token,
  } = options;

  const nowRfc = new Date().toUTCString();
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  const selfUrl = `${baseUrl}${feedPath}${tokenQuery}`;
  const siteUrl = baseUrl;

  const itemsXml = entries.map((entry) => {
    const pubDate = entry.created_at
      ? new Date(entry.created_at).toUTCString()
      : (entry.published_at ? new Date(entry.published_at).toUTCString() : nowRfc);

    const title = entry.title || 'Untitled';
    const link = entry.url || `${baseUrl}/read/${entry.id}`;
    const author = entry.author || entry.domain_name || appName;
    const guid = `wallaflare-entry-${entry.id}`;

    // Excerpt description
    const plainExcerpt = stripHtml(entry.content || '').substring(0, 300);
    const descriptionCdata = `<![CDATA[${stripCdata(plainExcerpt)}]]>`;

    // Full sanitized content
    const htmlContent = entry.content || `<p>${xmlEscape(plainExcerpt)}</p>`;
    const contentCdata = `<![CDATA[${stripCdata(htmlContent)}]]>`;

    // Tags
    const tags = entryTagsMap?.get(entry.id) || [];
    const categoriesXml = tags
      .map((t) => `      <category>${xmlEscape(t.label || t.slug)}</category>`)
      .join('\n');

    return `    <item>
      <title>${xmlEscape(title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="false">${xmlEscape(guid)}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${xmlEscape(author)}</dc:creator>
      <description>${descriptionCdata}</description>
      <content:encoded>${contentCdata}</content:encoded>
${categoriesXml ? categoriesXml + '\n' : ''}    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(appName)} - ${xmlEscape(feedTitle)}</title>
    <link>${xmlEscape(siteUrl)}</link>
    <description>${xmlEscape(feedDescription)}</description>
    <language>en</language>
    <lastBuildDate>${nowRfc}</lastBuildDate>
    <atom:link href="${xmlEscape(selfUrl)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
}
