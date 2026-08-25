import { jsPDF } from 'jspdf';
import { parseHTML } from 'linkedom';

export interface PdfArticleInput {
  id?: number | string;
  title: string;
  content: string;
  text?: string | null;
  url?: string | null;
  domain_name?: string | null;
  preview_picture?: string | null;
  reading_time?: number | null;
  author?: string | null;
  published_by?: string[] | null;
  created_at?: string;
  published_at?: string | null;
  tags?: any[] | null;
}

function normalizePdfText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B]/g, ' ')
    .replace(/[\t\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generatePdf(article: PdfArticleInput): Promise<Uint8Array> {
  const doc = new jsPDF({ format: 'a4', unit: 'pt' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - (margin * 2);
  const bottomMargin = 50;
  const topMargin = 55;

  let currentPage = 1;

  // 1. Cover Page (if cover image exists)
  let hasCoverPage = false;
  if (article.preview_picture) {
    try {
      const imgRes = await fetch(article.preview_picture, { signal: AbortSignal.timeout(4000) });
      if (imgRes.ok) {
        const imgBuffer = await imgRes.arrayBuffer();
        let base64 = '';
        const bytes = new Uint8Array(imgBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          base64 += String.fromCharCode(bytes[i]);
        }
        base64 = (typeof btoa !== 'undefined') ? btoa(base64) : Buffer.from(imgBuffer).toString('base64');
        const mime = imgRes.headers.get('content-type') || 'image/jpeg';
        const format = mime.includes('png') ? 'PNG' : 'JPEG';

        const maxImgWidth = contentWidth;
        const maxImgHeight = pageHeight - (margin * 2) - 60;

        // Render Cover Image
        doc.addImage(`data:${mime};base64,${base64}`, format, margin, margin + 20, maxImgWidth, maxImgHeight, undefined, 'FAST');
        
        // Cover bottom title label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(110);
        doc.text(normalizePdfText(article.domain_name || 'Wallaflare'), margin, pageHeight - 32);

        hasCoverPage = true;
        doc.addPage();
        currentPage++;
      }
    } catch (e) {
      console.warn('PDF Cover fetch failed:', e);
    }
  }

  // Helper for running header & footer
  function addHeaderFooter(pageNum: number, totalPages: number) {
    if (hasCoverPage && pageNum === 1) return; // Skip cover

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(140);

    // Running Header
    const rawTitle = normalizePdfText(article.title || 'Untitled Article');
    const headerTitle = rawTitle.length > 55 ? (rawTitle.slice(0, 52) + '...') : rawTitle;
    doc.text(headerTitle, margin, 32);
    const domainText = normalizePdfText(article.domain_name || 'Wallaflare');
    doc.text(domainText, pageWidth - margin - doc.getTextWidth(domainText), 32);
    doc.setDrawColor(225);
    doc.setLineWidth(0.5);
    doc.line(margin, 38, pageWidth - margin, 38);

    // Running Footer
    doc.line(margin, pageHeight - 38, pageWidth - margin, pageHeight - 38);
    const footerText = `Page ${pageNum} of ${totalPages}`;
    doc.text(footerText, (pageWidth - doc.getTextWidth(footerText)) / 2, pageHeight - 24);
  }

  // 2. Summary / Info Page
  let y = topMargin;
  
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(20);
  const cleanTitle = normalizePdfText(article.title || 'Untitled Article');
  const titleLines = doc.splitTextToSize(cleanTitle, contentWidth);
  doc.text(titleLines, margin, y);
  y += (titleLines.length * 24) + 14;

  // Metadata Box
  const rawAuthor = article.author || (Array.isArray(article.published_by) && article.published_by.length > 0 ? article.published_by[0] : '');
  const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : (article.domain_name || 'Direct Input');
  const pubDate = article.published_at || article.created_at || new Date().toISOString().split('T')[0];
  const readingTime = article.reading_time || Math.max(1, Math.round((article.content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).length / 200));

  const metaBoxY = y;
  const metaBoxPadding = 12;
  let metaInnerY = metaBoxY + metaBoxPadding + 9;

  // Info items
  const metaItems = [
    { label: 'Author', val: normalizePdfText(author) },
    { label: 'Published', val: normalizePdfText(pubDate) },
    { label: 'Reading Time', val: `${readingTime} min read` },
    { label: 'Source', val: normalizePdfText(article.url || 'Direct Input') }
  ];

  if (Array.isArray(article.tags) && article.tags.length > 0) {
    const tagNames = article.tags.map(t => typeof t === 'string' ? t : (t.label || t.slug)).filter(Boolean);
    if (tagNames.length > 0) {
      metaItems.push({ label: 'Tags', val: tagNames.map(t => '#' + normalizePdfText(t)).join(' ') });
    }
  }

  // Measure meta box height using target font metrics
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let estimatedMetaHeight = metaBoxPadding * 2 + 10;
  metaItems.forEach(item => {
    const lines = doc.splitTextToSize(`${item.label}: ${item.val}`, contentWidth - (metaBoxPadding * 2));
    estimatedMetaHeight += (lines.length * 15) + 4;
  });

  // Draw Meta Box Background
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(220, 226, 235);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, metaBoxY, contentWidth, estimatedMetaHeight, 4, 4, 'FD');

  // Draw Meta Items Text
  metaItems.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(70, 80, 95);
    doc.text(`${item.label}:`, margin + metaBoxPadding, metaInnerY);

    const labelWidth = doc.getTextWidth(`${item.label}: `);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 40, 55);

    const valLines = doc.splitTextToSize(item.val, contentWidth - (metaBoxPadding * 2) - labelWidth);
    doc.text(valLines, margin + metaBoxPadding + labelWidth, metaInnerY);

    metaInnerY += (valLines.length * 15) + 4;
  });

  // Add Page break before article content
  doc.addPage();
  currentPage++;
  y = topMargin;

  // Helper function to split and print lines with target font size applied FIRST
  function renderBlockText(text: string, fontName: string, fontStyle: string, fontSize: number, lineHeight: number, textColor: [number, number, number], maxW = contentWidth, xOffset = 0) {
    const normalized = normalizePdfText(text);
    if (!normalized) return;

    // Critical: Apply font name, style, and size BEFORE measuring/splitting text
    doc.setFont(fontName, fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const lines = doc.splitTextToSize(normalized, maxW);

    for (let i = 0; i < lines.length; i++) {
      if (y + lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        currentPage++;
        y = topMargin;
        doc.setFont(fontName, fontStyle);
        doc.setFontSize(fontSize);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      }
      doc.text(lines[i], margin + xOffset, y);
      y += lineHeight;
    }
  }

  // 3. Article Content Parsing
  const rawHtml = article.content || `<p>${article.text || ''}</p>`;
  const docParser = typeof DOMParser !== 'undefined'
    ? new DOMParser().parseFromString(`<div>${rawHtml}</div>`, 'text/html')
    : parseHTML(`<!DOCTYPE html><html><body><div>${rawHtml}</div></body></html>`).document;

  const rootDiv = (docParser.body ? docParser.body.firstElementChild : docParser.querySelector('div')) || docParser;
  const elements = rootDiv.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, pre, ul, ol');

  if (elements.length === 0) {
    renderBlockText(article.text || '', 'helvetica', 'normal', 10.5, 15.5, [33, 37, 41]);
  } else {
    for (const el of Array.from(elements)) {
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || '';

      if (!text) continue;

      if (tag === 'h1' || tag === 'h2') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        const hLines = doc.splitTextToSize(normalizePdfText(text), contentWidth);
        if (y + (hLines.length * 20) + 30 > pageHeight - bottomMargin) {
          doc.addPage();
          currentPage++;
          y = topMargin;
        }
        y += 8;
        renderBlockText(text, 'helvetica', 'bold', 15, 20, [15, 23, 42]);
        y += 6;
      } else if (tag === 'h3' || tag === 'h4') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12.5);
        const hLines = doc.splitTextToSize(normalizePdfText(text), contentWidth);
        if (y + (hLines.length * 17) + 25 > pageHeight - bottomMargin) {
          doc.addPage();
          currentPage++;
          y = topMargin;
        }
        y += 6;
        renderBlockText(text, 'helvetica', 'bold', 12.5, 17, [30, 41, 59]);
        y += 5;
      } else if (tag === 'blockquote') {
        const startY = y;
        y += 4;
        renderBlockText(text, 'helvetica', 'italic', 10, 15, [71, 85, 105], contentWidth - 24, 16);
        const endY = y;
        // Draw left accent bar
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(2.5);
        doc.line(margin + 4, startY + 2, margin + 4, endY - 4);
        y += 8;
      } else if (tag === 'pre') {
        y += 4;
        renderBlockText(text, 'courier', 'normal', 9, 13.5, [30, 41, 59], contentWidth - 18, 8);
        y += 8;
      } else if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(el.querySelectorAll('li'));
        for (let idx = 0; idx < items.length; idx++) {
          const prefix = tag === 'ol' ? `${idx + 1}. ` : '- ';
          const liText = items[idx].textContent?.trim() || '';
          renderBlockText(prefix + liText, 'helvetica', 'normal', 10.5, 15, [33, 37, 41], contentWidth - 10, 8);
        }
        y += 6;
      } else if (tag === 'p') {
        renderBlockText(text, 'helvetica', 'normal', 10.5, 15.5, [33, 37, 41]);
        y += 8; // Paragraph bottom spacing
      }
    }
  }

  // Apply running headers & footers across all pages with total count
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addHeaderFooter(p, totalPages);
  }

  return new Uint8Array(doc.output('arraybuffer'));
}
