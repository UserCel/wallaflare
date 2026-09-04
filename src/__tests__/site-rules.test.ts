import { describe, it, expect } from 'vitest';
import { extractArticleFromHtml } from '../services/extractor';

describe('Site-Specific Cleaning Rules & CSS Hidden Element Stripping', () => {
  it('strips Royal Road CSS-hidden anti-theft watermark paragraphs using dynamic class selectors', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chapter 100 - Royal Road</title>
        <style>
          .cna88f219b4412 { display: none; }
          .normal-class { font-size: 16px; }
        </style>
      </head>
      <body>
        <article>
          <h1>Chapter 100: The Battle Begins</h1>
          <p>The dawn rose over the ancient fortress walls as the army marched forward.</p>
          <p class="cna88f219b4412">This story originates from Royal Road. Ensure the author gets the support they deserve by reading it there.</p>
          <p>Swords clashed and spells illuminated the dark sky in fiery bursts.</p>
        </article>
      </body>
      </html>
    `;

    const res = extractArticleFromHtml(html, 'https://www.royalroad.com/fiction/12345/my-story/chapter/67890/chapter-100');
    expect(res.content).toContain('The dawn rose over the ancient fortress walls');
    expect(res.content).toContain('Swords clashed and spells illuminated');
    expect(res.content).not.toContain('This story originates from Royal Road');
    expect(res.content).not.toContain('Ensure the author gets the support');
    expect(res.textContent).not.toContain('This story originates from Royal Road');
  });

  it('strips Royal Road anti-theft watermark text even without matching CSS classes (text-based fallback)', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Chapter 101 - Royal Road</title></head>
      <body>
        <article>
          <h1>Chapter 101: The Citadel</h1>
          <p>Inside the citadel, the stone halls were silent and cold.</p>
          <p>Unauthorized reproduction: this story has been taken from Royal Road. Please report any instances of piracy.</p>
          <p>They reached the inner sanctum and unlocked the golden door.</p>
          <p>If you encounter this story on Amazon, note that it's taken without permission from the author.</p>
        </article>
      </body>
      </html>
    `;

    const res = extractArticleFromHtml(html, 'https://www.royalroad.com/fiction/12345/my-story/chapter/67891/chapter-101');
    expect(res.content).toContain('Inside the citadel, the stone halls were silent');
    expect(res.content).toContain('They reached the inner sanctum and unlocked the golden door');
    expect(res.content).not.toContain('Unauthorized reproduction: this story has been taken from Royal Road');
    expect(res.content).not.toContain('If you encounter this story on Amazon');
    expect(res.textContent).not.toContain('taken from Royal Road');
  });

  it('strips generic CSS hidden elements across any website (display:none, visibility:hidden, hidden attribute)', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Generic Article</title>
        <style>
          .anti-bot-honey-pot { visibility: hidden; }
          #hidden-watermark { display: none; }
        </style>
      </head>
      <body>
        <article>
          <h1>Article Heading</h1>
          <p>Legitimate first paragraph of the article.</p>
          <p class="anti-bot-honey-pot">Scraped from scraper-target.com bot trap.</p>
          <div id="hidden-watermark">Invisible watermark text.</div>
          <p style="display: none;">Inline hidden text.</p>
          <p hidden>HTML5 hidden text.</p>
          <p>Legitimate second paragraph of the article.</p>
        </article>
      </body>
      </html>
    `;

    const res = extractArticleFromHtml(html, 'https://example.com/article');
    expect(res.content).toContain('Legitimate first paragraph');
    expect(res.content).toContain('Legitimate second paragraph');
    expect(res.content).not.toContain('Scraped from scraper-target.com');
    expect(res.content).not.toContain('Invisible watermark text');
    expect(res.content).not.toContain('Inline hidden text');
    expect(res.content).not.toContain('HTML5 hidden text');
  });

  it('strips ScribbleHub anti-theft strings', () => {
    const html = `
      <article>
        <h1>ScribbleHub Story Chapter 5</h1>
        <p>The hero drew his magical sword.</p>
        <p>This story is taken from Scribble Hub without permission.</p>
        <p>The dragon unleashed a roaring wave of flames.</p>
      </article>
    `;

    const res = extractArticleFromHtml(html, 'https://www.scribblehub.com/read/1234/chapter-5/');
    expect(res.content).toContain('The hero drew his magical sword');
    expect(res.content).toContain('The dragon unleashed a roaring wave of flames');
    expect(res.content).not.toContain('This story is taken from Scribble Hub');
  });
});
