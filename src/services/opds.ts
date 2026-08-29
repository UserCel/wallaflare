import { EntryRow, WallabagEntry } from '../types';
import { TagItem } from '../db/queries';

export function xmlEscape(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface OpdsCatalogOptions {
  baseUrl: string;
  appName?: string;
  token?: string | null;
  counts?: {
    unread: number;
    starred: number;
    archive: number;
    total: number;
  };
}

export interface OpdsAcquisitionOptions {
  baseUrl: string;
  feedId: string;
  feedTitle: string;
  feedPath: string;
  entries: EntryRow[];
  entryTagsMap?: Map<number, TagItem[]>;
  total: number;
  page: number;
  limit: number;
  token?: string | null;
  appName?: string;
}

export function formatTokenQuery(token?: string | null, prefixWithAmp: boolean = false): string {
  if (!token) return '';
  return prefixWithAmp ? `&amp;token=${encodeURIComponent(token)}` : `?token=${encodeURIComponent(token)}`;
}

/**
 * Generates the Root Navigation Feed for OPDS 1.2.
 */
export function generateRootCatalogXml(options: OpdsCatalogOptions): string {
  const { baseUrl, appName = 'Wallaflare', token, counts } = options;
  const now = new Date().toISOString();
  const tokenQuery = formatTokenQuery(token, false);
  const tokenAppend = formatTokenQuery(token, true);

  const unreadLabel = counts ? ` (${counts.unread})` : '';
  const starredLabel = counts ? ` (${counts.starred})` : '';
  const allLabel = counts ? ` (${counts.total})` : '';
  const archiveLabel = counts ? ` (${counts.archive})` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opds="http://opds-spec.org/2010/catalog"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <id>urn:wallaflare:opds:root</id>
  <title>${xmlEscape(appName)} OPDS Catalog</title>
  <updated>${now}</updated>
  <author>
    <name>${xmlEscape(appName)}</name>
    <uri>${xmlEscape(baseUrl)}</uri>
  </author>
  <link rel="self" href="${xmlEscape(baseUrl)}/opds${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=navigation" />
  <link rel="start" href="${xmlEscape(baseUrl)}/opds${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=navigation" />
  <link rel="search" href="${xmlEscape(baseUrl)}/opds/opensearch.xml${tokenQuery}" type="application/opensearchdescription+xml" title="Search ${xmlEscape(appName)}" />

  <!-- Unread Section -->
  <entry>
    <title>Unread Articles${unreadLabel}</title>
    <id>urn:wallaflare:opds:unread</id>
    <updated>${now}</updated>
    <content type="text">Articles in your reading queue</content>
    <link rel="subsection" href="${xmlEscape(baseUrl)}/opds/unread${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=acquisition" />
  </entry>

  <!-- Starred Section -->
  <entry>
    <title>Starred / Favorites${starredLabel}</title>
    <id>urn:wallaflare:opds:starred</id>
    <updated>${now}</updated>
    <content type="text">Your saved favorites and bookmarked articles</content>
    <link rel="subsection" href="${xmlEscape(baseUrl)}/opds/starred${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=acquisition" />
  </entry>

  <!-- All Articles Section -->
  <entry>
    <title>All Articles${allLabel}</title>
    <id>urn:wallaflare:opds:all</id>
    <updated>${now}</updated>
    <content type="text">Complete reading library collection</content>
    <link rel="subsection" href="${xmlEscape(baseUrl)}/opds/all${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=acquisition" />
  </entry>

  <!-- Archive Section -->
  <entry>
    <title>Archive${archiveLabel}</title>
    <id>urn:wallaflare:opds:archive</id>
    <updated>${now}</updated>
    <content type="text">Completed and archived articles</content>
    <link rel="subsection" href="${xmlEscape(baseUrl)}/opds/archive${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=acquisition" />
  </entry>

  <!-- Tags Section -->
  <entry>
    <title>Tags</title>
    <id>urn:wallaflare:opds:tags</id>
    <updated>${now}</updated>
    <content type="text">Browse library categorized by tag labels</content>
    <link rel="subsection" href="${xmlEscape(baseUrl)}/opds/tags${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=navigation" />
  </entry>
</feed>`;
}

/**
 * Generates the Tags Navigation Feed for OPDS 1.2.
 */
export function generateTagsCatalogXml(options: {
  baseUrl: string;
  appName?: string;
  token?: string | null;
  tags: TagItem[];
}): string {
  const { baseUrl, appName = 'Wallaflare', token, tags } = options;
  const now = new Date().toISOString();
  const tokenQuery = formatTokenQuery(token, false);

  const tagEntries = tags.map((t) => {
    return `  <entry>
    <title>${xmlEscape(t.label || t.slug)}</title>
    <id>urn:wallaflare:opds:tag:${xmlEscape(t.slug)}</id>
    <updated>${now}</updated>
    <content type="text">Articles tagged with #${xmlEscape(t.label)}</content>
    <link rel="subsection" href="${xmlEscape(baseUrl)}/opds/tags/${encodeURIComponent(t.slug)}${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=acquisition" />
  </entry>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opds="http://opds-spec.org/2010/catalog"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <id>urn:wallaflare:opds:tags</id>
  <title>Tags - ${xmlEscape(appName)}</title>
  <updated>${now}</updated>
  <author>
    <name>${xmlEscape(appName)}</name>
  </author>
  <link rel="self" href="${xmlEscape(baseUrl)}/opds/tags${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=navigation" />
  <link rel="start" href="${xmlEscape(baseUrl)}/opds${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=navigation" />
  <link rel="up" href="${xmlEscape(baseUrl)}/opds${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=navigation" />
  <link rel="search" href="${xmlEscape(baseUrl)}/opds/opensearch.xml${tokenQuery}" type="application/opensearchdescription+xml" />

${tagEntries}
</feed>`;
}

/**
 * Generates an Acquisition Feed for articles (Unread, Starred, Archive, All, Tag, Search).
 */
export function generateAcquisitionFeedXml(options: OpdsAcquisitionOptions): string {
  const {
    baseUrl,
    feedId,
    feedTitle,
    feedPath,
    entries,
    entryTagsMap,
    total,
    page,
    limit,
    token,
    appName = 'Wallaflare',
  } = options;

  const now = new Date().toISOString();
  const tokenQuery = formatTokenQuery(token, false);
  const tokenAppend = formatTokenQuery(token, true);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (page - 1) * limit + 1;

  // Build pagination links
  const paginationLinks: string[] = [];

  const selfUrl = `${baseUrl}${feedPath}${feedPath.includes('?') ? '&amp;' : '?'}page=${page}${tokenAppend}`;
  paginationLinks.push(`  <link rel="self" href="${xmlEscape(selfUrl)}" type="application/atom+xml;profile=opds-catalog;kind=acquisition" />`);
  paginationLinks.push(`  <link rel="start" href="${xmlEscape(baseUrl)}/opds${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=navigation" />`);
  paginationLinks.push(`  <link rel="up" href="${xmlEscape(baseUrl)}/opds${tokenQuery}" type="application/atom+xml;profile=opds-catalog;kind=navigation" />`);
  paginationLinks.push(`  <link rel="search" href="${xmlEscape(baseUrl)}/opds/opensearch.xml${tokenQuery}" type="application/opensearchdescription+xml" />`);

  if (page > 1) {
    const firstUrl = `${baseUrl}${feedPath}${feedPath.includes('?') ? '&amp;' : '?'}page=1${tokenAppend}`;
    const prevUrl = `${baseUrl}${feedPath}${feedPath.includes('?') ? '&amp;' : '?'}page=${page - 1}${tokenAppend}`;
    paginationLinks.push(`  <link rel="first" href="${xmlEscape(firstUrl)}" type="application/atom+xml;profile=opds-catalog;kind=acquisition" />`);
    paginationLinks.push(`  <link rel="previous" href="${xmlEscape(prevUrl)}" type="application/atom+xml;profile=opds-catalog;kind=acquisition" />`);
  }

  if (page < totalPages) {
    const nextUrl = `${baseUrl}${feedPath}${feedPath.includes('?') ? '&amp;' : '?'}page=${page + 1}${tokenAppend}`;
    const lastUrl = `${baseUrl}${feedPath}${feedPath.includes('?') ? '&amp;' : '?'}page=${totalPages}${tokenAppend}`;
    paginationLinks.push(`  <link rel="next" href="${xmlEscape(nextUrl)}" type="application/atom+xml;profile=opds-catalog;kind=acquisition" />`);
    paginationLinks.push(`  <link rel="last" href="${xmlEscape(lastUrl)}" type="application/atom+xml;profile=opds-catalog;kind=acquisition" />`);
  }

  const entriesXml = entries.map((entry) => {
    const updated = entry.updated_at ? new Date(entry.updated_at).toISOString() : now;
    const published = entry.published_at ? new Date(entry.published_at).toISOString() : (entry.created_at ? new Date(entry.created_at).toISOString() : now);
    const author = entry.author || entry.domain_name || appName;
    const readingTime = entry.reading_time ? `${entry.reading_time} min read` : '';
    const domain = entry.domain_name ? `From: ${entry.domain_name}` : '';
    
    // Create concise summary text
    const metaParts = [domain, readingTime].filter(Boolean).join(' • ');
    const plainTextExcerpt = stripHtml(entry.content).substring(0, 300);
    const summary = metaParts ? `${metaParts} — ${plainTextExcerpt}` : plainTextExcerpt;

    // Tags
    const tags = entryTagsMap?.get(entry.id) || [];
    const categoriesXml = tags
      .map((t) => `    <category term="${xmlEscape(t.slug)}" label="${xmlEscape(t.label)}" />`)
      .join('\n');

    // EPUB Acquisition link (direct download with propagated token)
    const downloadUrl = `${baseUrl}/opds/download/${entry.id}.epub${tokenQuery}`;
    const epubLink = `    <link rel="http://opds-spec.org/acquisition" href="${xmlEscape(downloadUrl)}" type="application/epub+zip" title="Download EPUB" />`;

    // Thumbnail / Cover link if available
    let coverLink = '';
    if (entry.preview_picture) {
      coverLink = `\n    <link rel="http://opds-spec.org/image/thumbnail" href="${xmlEscape(entry.preview_picture)}" type="image/jpeg" />`;
    }

    return `  <entry>
    <title>${xmlEscape(entry.title || 'Untitled')}</title>
    <id>urn:wallaflare:entry:${entry.id}</id>
    <updated>${updated}</updated>
    <published>${published}</published>
    <author>
      <name>${xmlEscape(author)}</name>
    </author>
    <summary type="text">${xmlEscape(summary)}</summary>
${categoriesXml ? categoriesXml + '\n' : ''}${epubLink}${coverLink}
  </entry>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opds="http://opds-spec.org/2010/catalog"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <id>urn:wallaflare:opds:${xmlEscape(feedId)}</id>
  <title>${xmlEscape(feedTitle)}</title>
  <updated>${now}</updated>
  <author>
    <name>${xmlEscape(appName)}</name>
  </author>
  <opensearch:totalResults>${total}</opensearch:totalResults>
  <opensearch:startIndex>${startIndex}</opensearch:startIndex>
  <opensearch:itemsPerPage>${limit}</opensearch:itemsPerPage>
${paginationLinks.join('\n')}

${entriesXml}
</feed>`;
}

/**
 * Generates the OpenSearch Description XML document.
 */
export function generateOpenSearchXml(options: {
  baseUrl: string;
  appName?: string;
  token?: string | null;
}): string {
  const { baseUrl, appName = 'Wallaflare', token } = options;
  const tokenAppend = formatTokenQuery(token, true);

  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${xmlEscape(appName)}</ShortName>
  <Description>Search ${xmlEscape(appName)} Reading List</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <OutputEncoding>UTF-8</OutputEncoding>
  <Url type="application/atom+xml;profile=opds-catalog;kind=acquisition" template="${xmlEscape(baseUrl)}/opds/search?q={searchTerms}${tokenAppend}" />
</OpenSearchDescription>`;
}
