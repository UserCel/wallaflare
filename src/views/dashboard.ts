import { clientEpubJs } from './epub-client-bundle';
export function renderDashboardHtml(appName: string = 'Wallaflare'): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="generator" content="wallabag">
  <meta name="wallabag:version" content="2.6.9">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📖</text></svg>">
  <title>${appName} - Read-it-Later &amp; E-ink Sync</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --bg-card: rgba(30, 41, 59, 0.75);
      --border-color: rgba(255, 255, 255, 0.1);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent: #f97316;
      --accent-hover: #ea580c;
      --accent-glow: rgba(249, 115, 22, 0.25);
      --star-color: #eab308;
      --success: #10b981;
      --danger: #ef4444;
      --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-reader-serif: 'Newsreader', Georgia, serif;
      --font-reader-sans: 'Inter', sans-serif;
      --font-reader-mono: 'JetBrains Mono', monospace;
      --radius: 12px;
      --radius-sm: 8px;
      --radius-lg: 18px;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }

    html.light {
      --bg-primary: #f8fafc;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f1f5f9;
      --bg-card: rgba(255, 255, 255, 0.9);
      --border-color: rgba(0, 0, 0, 0.08);
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
      --shadow-sm: 0 2px 4px rgba(0,0,0,0.04);
    }

    html.sepia {
      --bg-primary: #f4ecd8;
      --bg-secondary: #ebe2cd;
      --bg-tertiary: #dfd5be;
      --bg-card: rgba(235, 226, 205, 0.92);
      --border-color: rgba(92, 77, 60, 0.15);
      --text-primary: #433422;
      --text-secondary: #6e5c46;
      --text-muted: #9c8a73;
      --accent: #b45309;
      --accent-hover: #92400e;
      --shadow: 0 10px 25px -5px rgba(67, 52, 34, 0.08);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
      -webkit-tap-highlight-color: transparent !important;
      tap-highlight-color: transparent !important;
    }

    img, a, button {
      -webkit-user-drag: none;
      -webkit-touch-callout: none;
      -webkit-tap-highlight-color: transparent !important;
    }

    /* Allow standard text selection in input controls */
    input, textarea, [contenteditable="true"], [contenteditable=""], select {
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
      -webkit-touch-callout: default;
    }

    /* Allow rich text selection exclusively within the actual article content text */
    .reader-body,
    .reader-body * {
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
      -webkit-touch-callout: default;
    }

    /* Strictly disallow text selection on Reader titles, meta, covers, and card elements */
    .reader-title,
    .reader-meta,
    .reader-meta *,
    .reader-domain,
    .reader-cover,
    .reader-cover-img,
    .reader-lead-image-caption,
    .article-card,
    .article-card *,
    .card-image-wrap,
    .card-image,
    .card-title {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }

    html, body {
      overscroll-behavior-y: contain;
    }

    body {
      font-family: var(--font-ui);
      background-color: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.25s ease, color 0.25s ease;
    }

    /* Top Navbar */
    header {
      position: sticky;
      top: 0;
      z-index: 150;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      background-color: rgba(15, 23, 42, 0.82);
      border-bottom: 1px solid var(--border-color);
      padding: 0.75rem 1.25rem;
      padding-top: max(0.75rem, calc(0.75rem + env(safe-area-inset-top, 0px)));
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.85rem;
    }
    html.light header { background-color: rgba(248, 250, 252, 0.85); }
    html.sepia header { background-color: rgba(244, 236, 216, 0.9); }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 700;
      font-size: 1.2rem;
      letter-spacing: -0.02em;
      cursor: pointer;
      flex-shrink: 0;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 0 15px var(--accent-glow);
    }
    .brand-tag {
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      background: var(--bg-tertiary);
      color: var(--accent);
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .nav-search {
      flex: 1;
      max-width: 460px;
      position: relative;
      display: flex;
      align-items: center;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 9999px;
      padding: 0.15rem 0.35rem 0.15rem 0.65rem;
      transition: all 0.2s;
    }
    .nav-search:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    .nav-search .search-magnifier {
      color: var(--text-muted);
      width: 15px;
      height: 15px;
      flex-shrink: 0;
      pointer-events: none;
    }
    .nav-search input {
      width: 100%;
      background: transparent;
      border: none;
      padding: 0.35rem 0.4rem;
      color: var(--text-primary);
      font-size: 0.875rem;
      outline: none;
      min-width: 50px;
    }
    .search-ctrl-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      flex-shrink: 0;
      padding: 0;
      transition: all 0.15s;
    }
    .search-ctrl-btn:hover {
      color: var(--text-primary);
      background: var(--bg-tertiary);
    }
    .search-ctrl-btn.active {
      color: var(--accent);
    }
    .search-ctrl-divider {
      width: 1px;
      height: 18px;
      background: var(--border-color);
      margin: 0 0.2rem;
      flex-shrink: 0;
    }
    .search-dropdown-menu {
      position: absolute !important;
      top: calc(100% + 8px) !important;
      bottom: auto !important;
      right: 0 !important;
      left: auto !important;
      background: var(--bg-primary) !important;
      border: 1px solid var(--border-color) !important;
      border-radius: var(--radius-sm) !important;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55) !important;
      min-width: 185px !important;
      padding: 0.4rem 0 !important;
      z-index: 1000 !important;
      display: none;
      flex-direction: column;
      animation: menuFadeIn 0.15s ease-out;
    }
    .search-dropdown-menu.open {
      display: flex !important;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-shrink: 0;
    }

    button, .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 500;
      padding: 0.45rem 0.8rem;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.18s ease;
      text-decoration: none;
      white-space: nowrap;
    }
    .btn-primary {
      background: var(--accent);
      color: white;
    }
    .btn-primary:hover {
      background: var(--accent-hover);
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .btn-secondary {
      background: var(--bg-secondary);
      border-color: var(--border-color);
      color: var(--text-primary);
    }
    .btn-secondary:hover {
      background: var(--bg-tertiary);
    }
    .btn-icon {
      padding: 0.5rem;
      border-radius: var(--radius-sm);
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
    }
    .btn-icon:hover {
      color: var(--text-primary);
      background: var(--bg-tertiary);
    }

    /* Main Container */
    main {
      flex: 1;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 1.25rem 1rem 4rem 1rem;
    }

    /* Filter Bar */
    .filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .tab-group {
      display: flex;
      background: var(--bg-secondary);
      padding: 0.25rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      gap: 0.2rem;
      overflow-x: auto;
      max-width: 100%;
    }
    .tab-btn {
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .tab-btn.active {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      font-weight: 600;
    }
    .badge-count {
      font-size: 0.7rem;
      padding: 0.1rem 0.4rem;
      background: rgba(0,0,0,0.2);
      border-radius: 999px;
      color: var(--text-muted);
    }
    .tab-btn.active .badge-count {
      color: var(--accent);
      background: rgba(249, 115, 22, 0.15);
    }

    /* View Mode Switcher */
    .view-mode-toggle {
      display: flex;
      background: var(--bg-secondary);
      padding: 2px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      gap: 2px;
    }
    .view-btn {
      padding: 0.3rem 0.5rem;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .view-btn.active {
      background: var(--bg-tertiary);
      color: var(--accent);
    }
    .view-btn:hover {
      color: var(--text-primary);
    }

    /* -------------------------------------------------------------
       ARTICLE VIEW MODES (List, Grid, Compact)
       ------------------------------------------------------------- */
    .articles-grid {
      transition: opacity 0.15s ease;
    }

    /* 1. Default: List View (Horizontal Card with Right Thumbnail) */
    .articles-grid.view-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      max-width: 900px;
      margin: 0 auto;
    }
    .articles-grid.view-list .card-main-content {
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      align-items: flex-start;
    }
    .articles-grid.view-list .card-text-column {
      flex: 1;
      min-width: 0;
    }
    .articles-grid.view-list .card-image-wrap {
      width: 88px;
      height: 88px;
      aspect-ratio: 1 / 1;
      flex-shrink: 0;
      border-radius: var(--radius-sm);
      margin: 0 0 0 0.85rem;
      overflow: hidden;
      background: var(--bg-tertiary);
    }
    @media (max-width: 768px) {
      .articles-grid.view-list .card-image-wrap {
        width: 76px;
        height: 76px;
        margin: 0 0 0 0.65rem;
      }
    }
    .articles-grid.view-list .article-card[dir="rtl"] .card-image-wrap {
      margin: 0 0.75rem 0 0;
    }
    .articles-grid.view-list .card-excerpt {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    /* 2. Grid View (Magazine Hero Cards with Top Image) */
    .articles-grid.view-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 1.15rem;
    }
    .articles-grid.view-grid .card-main-content {
      display: flex;
      flex-direction: column;
    }
    .articles-grid.view-grid .card-image-wrap {
      order: -1;
      width: calc(100% + 2.3rem);
      margin: -1.15rem -1.15rem 0.85rem -1.15rem;
      height: 155px;
      overflow: hidden;
      background: var(--bg-tertiary);
    }
    .articles-grid.view-grid .card-excerpt {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 1.1rem;
    }

    /* 3. Compact View (Headlines / Dense Rows) */
    .articles-grid.view-compact {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      max-width: 100%;
    }
    .articles-grid.view-compact .article-card {
      padding: 0.6rem 0.85rem;
      min-height: auto;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .articles-grid.view-compact .card-main-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }
    .articles-grid.view-compact .card-text-column {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }
    .articles-grid.view-compact .card-meta {
      margin-bottom: 0;
      flex-shrink: 0;
    }
    .articles-grid.view-compact .card-title {
      font-size: 0.95rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      margin: 0;
    }
    .articles-grid.view-compact .card-excerpt,
    .articles-grid.view-compact .card-image-wrap,
    .articles-grid.view-compact .card-tags,
    .articles-grid.view-compact .card-progress-center {
      display: none !important;
    }
    .articles-grid.view-compact .card-footer {
      padding-top: 0;
      border: none;
      flex-shrink: 0;
      gap: 0.5rem;
    }
    .articles-grid.view-compact .card-select-wrap {
      position: static;
      margin-right: 0.35rem;
    }

    /* Intelligent 2-Row Responsive Layout for Mobile Portrait */
    @media (max-width: 768px) {
      .articles-grid.view-compact .article-card {
        flex-direction: column;
        align-items: stretch;
        padding: 0.65rem 0.85rem;
        gap: 0.4rem;
      }
      .articles-grid.view-compact .card-main-content {
        flex-direction: column;
        align-items: stretch;
        gap: 0.25rem;
      }
      .articles-grid.view-compact .card-text-column {
        flex-direction: column;
        align-items: stretch;
        gap: 0.25rem;
      }
      .articles-grid.view-compact .card-title {
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        font-size: 0.92rem;
        line-height: 1.35;
      }
      .articles-grid.view-compact .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 0.3rem;
        border-top: 1px solid var(--border-color);
        font-size: 0.72rem;
      }
      .articles-grid.view-compact .card-meta {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.72rem;
      }
    }

    .article-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: var(--shadow-sm);
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background-color 0.2s;
      position: relative;
      overflow: hidden;
      cursor: pointer;
    }
    .article-card.is-selected {
      border-color: var(--accent) !important;
      background: rgba(249, 115, 22, 0.08) !important;
      box-shadow: 0 0 0 1px var(--accent), var(--shadow);
    }
    .card-select-wrap {
      position: absolute;
      top: 0.65rem;
      right: 0.65rem;
      z-index: 25;
      padding: 4px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .article-card[dir="rtl"] .card-select-wrap {
      right: auto;
      left: 0.65rem;
    }
    .article-card:hover .card-select-wrap,
    body.selection-mode-active .card-select-wrap,
    .article-card.is-selected .card-select-wrap {
      opacity: 1;
    }
    .card-checkbox {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 2px solid rgba(255, 255, 255, 0.6);
      background: rgba(15, 23, 42, 0.65);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: transparent;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      transition: all 0.15s ease;
    }
    html.light .card-checkbox {
      border-color: rgba(0, 0, 0, 0.25);
      background: rgba(255, 255, 255, 0.85);
    }
    .card-checkbox.checked {
      background: var(--accent) !important;
      border-color: var(--accent) !important;
      color: white !important;
      transform: scale(1.05);
    }
    .article-card:hover {
      transform: translateY(-2px);
      border-color: rgba(249, 115, 22, 0.4);
      box-shadow: var(--shadow);
    }

    .card-image-wrap {
      width: calc(100% + 2.3rem);
      margin: -1.15rem -1.15rem 0.85rem -1.15rem;
      height: 155px;
      overflow: hidden;
      background: var(--bg-tertiary);
      cursor: pointer;
      position: relative;
    }
    .card-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
      display: block;
    }
    .article-card:hover .card-image {
      transform: scale(1.04);
    }

    
    /* Tag Badges & Filtering */
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.5rem;
      margin-bottom: 0.4rem;
    }
    .tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      background: var(--bg-tertiary);
      color: var(--accent);
      border: 1px solid rgba(249, 115, 22, 0.25);
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
      line-height: 1.3;
    }
    .tag-badge:hover {
      background: var(--accent);
      color: #ffffff;
      border-color: var(--accent);
    }
    .tag-badge.active-tag {
      background: var(--accent);
      color: #ffffff;
    }
    .tag-badge .tag-remove-btn {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      font-size: 1.1rem;
      font-weight: 700;
      line-height: 1;
      margin-left: 0.2rem;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    html.light .tag-badge .tag-remove-btn {
      background: rgba(0, 0, 0, 0.08);
    }
    .tag-badge .tag-remove-btn:hover {
      background: rgba(239, 68, 68, 0.9);
      color: #ffffff;
      transform: scale(1.1);
    }
    .tag-badge-partial {
      background: rgba(249, 115, 22, 0.1) !important;
      border: 1.5px dashed var(--accent) !important;
      cursor: pointer;
    }
    .tag-badge-partial:hover {
      background: rgba(249, 115, 22, 0.22) !important;
      border-style: solid !important;
    }

    /* Tag Modal (z-index 400 to show above reader-view) */
    .tag-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.68);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 400;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .tag-modal-overlay.open {
      display: flex;
    }
    .tag-modal {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      width: 100%;
      max-width: 440px;
      padding: 1.5rem;
      box-shadow: var(--shadow-lg);
    }

    .card-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }
    .card-domain {
      font-weight: 600;
      color: var(--accent);
      text-transform: lowercase;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-reading-time {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .card-title {
      text-align: start;
      font-size: 1.05rem;
      font-weight: 600;
      line-height: 1.35;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
      cursor: pointer;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-title:hover {
      color: var(--accent);
    }

    .card-excerpt {
      text-align: start;
      font-size: 0.825rem;
      color: var(--text-secondary);
      line-height: 1.45;
      margin-bottom: 1.1rem;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 0.65rem;
      position: relative;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .article-card.menu-open {
      z-index: 120 !important;
      position: relative;
      overflow: visible !important;
    }
    .card-menu-wrap {
      position: relative;
    }
    .article-card.menu-open .card-menu-wrap {
      z-index: 150 !important;
    }
    .card-dropdown-menu {
      position: absolute;
      bottom: calc(100% + 6px);
      right: 0;
      background: var(--bg-primary) !important;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45) !important;
      min-width: 195px;
      padding: 0.4rem 0;
      z-index: 102 !important;
      display: none;
      flex-direction: column;
      opacity: 1 !important;
      animation: menuFadeIn 0.15s ease-out;
    }
    .card-dropdown-menu.open {
      display: flex !important;
    }
    .card-dropdown-menu.open-down {
      bottom: auto !important;
      top: calc(100% + 6px) !important;
    }
    .action-btn.card-more-btn {
      opacity: 1 !important;
    }
    .article-card[dir="rtl"] .card-dropdown-menu {
      right: auto;
      left: 0;
    }
    .menu-item {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 0.75rem;
      width: 100%;
      padding: 0.6rem 0.95rem;
      border: none;
      background: transparent;
      color: var(--text-primary) !important;
      font-size: 0.85rem;
      font-weight: 450;
      cursor: pointer;
      text-align: left !important;
      text-decoration: none;
      opacity: 1 !important;
      transition: background-color 0.15s ease, color 0.15s ease;
      white-space: nowrap;
      box-sizing: border-box;
    }
    .menu-item svg {
      width: 16px;
      height: 16px;
      opacity: 0.85;
      color: var(--text-secondary);
      flex-shrink: 0;
      display: inline-block;
    }
    .menu-item span {
      text-align: left !important;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .menu-item:hover {
      background: var(--bg-secondary) !important;
      color: var(--text-primary) !important;
    }
    .menu-item:hover svg {
      opacity: 1;
      color: var(--accent);
    }
    .menu-item.active {
      color: var(--accent) !important;
      font-weight: 600;
      background: rgba(99, 102, 241, 0.08) !important;
    }
    .menu-item.active svg {
      color: var(--accent) !important;
      opacity: 1;
    }
    .menu-item-danger {
      color: #ef4444 !important;
    }
    .menu-item-danger svg {
      color: #ef4444 !important;
    }
    .menu-item-danger:hover {
      background: rgba(239, 68, 68, 0.12) !important;
      color: #f87171 !important;
    }
    .menu-item-danger:hover svg {
      color: #f87171 !important;
    }
    [dir="rtl"] .menu-item,
    .article-card[dir="rtl"] .menu-item {
      text-align: right !important;
      justify-content: flex-start !important;
    }
    [dir="rtl"] .menu-item span,
    .article-card[dir="rtl"] .menu-item span {
      text-align: right !important;
    }

    /* Expandable Submenus for Card Menus & Batch Menu */
    .chevron-icon {
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      margin-left: auto;
      opacity: 0.7;
    }
    [dir="rtl"] .chevron-icon {
      margin-left: 0;
      margin-right: auto;
    }
    .menu-item-expandable {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    .menu-item-expandable.expanded .chevron-icon {
      transform: rotate(180deg);
    }
    .menu-sub-items {
      display: none;
      flex-direction: column;
      background: var(--bg-secondary);
      border-radius: var(--radius-sm);
      margin: 0.2rem 0.4rem;
      padding: 0.2rem 0;
      border: 1px solid var(--border-color);
    }
    .menu-item-expandable.expanded .menu-sub-items {
      display: flex;
    }
    .menu-sub-item {
      padding-left: 1.5rem !important;
      font-size: 0.8rem !important;
      gap: 0.55rem !important;
    }
    [dir="rtl"] .menu-sub-item {
      padding-left: 0.85rem !important;
      padding-right: 1.5rem !important;
    }

    /* Reader sidebar expandable submenu */
    .reader-sub-menu {
      display: none;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.2rem 0 0.4rem 0;
      margin-top: -0.1rem;
      margin-bottom: 0.35rem;
      width: 100%;
      box-sizing: border-box;
    }
    .reader-sub-menu.open {
      display: flex;
    }
    .reader-sub-item {
      display: flex;
      align-items: center;
      justify-content: flex-start !important;
      gap: 0.65rem;
      padding: 0.45rem 0.65rem 0.45rem 1.85rem !important;
      border-radius: var(--radius-sm);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      text-align: left !important;
      transition: all 0.15s ease;
      width: 100%;
      box-sizing: border-box;
      white-space: nowrap;
    }
    .reader-sub-item span {
      text-align: left !important;
    }
    .reader-sub-item:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-color);
    }
    .reader-sub-item svg {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      opacity: 0.85;
    }
    .reader-sub-item:hover svg {
      opacity: 1;
      color: var(--text-primary);
    }
    [dir="rtl"] .reader-sub-item {
      padding-left: 0.65rem !important;
      padding-right: 1.85rem !important;
      text-align: right !important;
    }
    [dir="rtl"] .reader-sub-item span {
      text-align: right !important;
    }

    /* Print Stylesheet for PDF Export */
    @media print {
      body {
        background: #fff !important;
        color: #000 !important;
        overflow: visible !important;
      }
      #mainHeader,
      .filter-bar,
      .articles-grid,
      #emptyState,
      #bottomNav,
      #mobileNavDropdown,
      #mobileNavBackdrop,
      #readerSidebar,
      #readerBottomNav,
      #readerHeader,
      #readerNavHeader,
      #readerDrawerBackdrop,
      .reader-progress-wrap,
      .reader-fab-scroll,
      .card-dropdown-menu,
      .toast,
      .modal-backdrop,
      #authOverlay,
      #confirmBackdrop,
      #addTextTagPickerModal {
        display: none !important;
      }
      #readerView {
        display: block !important;
        position: static !important;
        inset: auto !important;
        background: #fff !important;
        color: #000 !important;
        padding: 0 !important;
        overflow: visible !important;
        z-index: auto !important;
      }
      .reader-container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .reader-title {
        font-size: 22pt !important;
        line-height: 1.25 !important;
        color: #000 !important;
        margin-bottom: 0.5rem !important;
      }
      .reader-meta {
        font-size: 10pt !important;
        color: #444 !important;
        border-bottom: 1px solid #ccc !important;
        padding-bottom: 0.5rem !important;
        margin-bottom: 1.5rem !important;
      }
      .reader-body {
        color: #000 !important;
        font-size: 12pt !important;
        line-height: 1.6 !important;
      }
      .reader-body a {
        color: #000 !important;
        text-decoration: underline !important;
      }
      .reader-body img {
        max-width: 100% !important;
        page-break-inside: avoid;
      }
      .reader-body pre,
      .reader-body blockquote {
        page-break-inside: avoid;
      }
    }

    .menu-divider {
      height: 1px;
      background: var(--border-color);
      margin: 0.25rem 0;
    }
    @keyframes menuFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .action-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      padding: 0.35rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .action-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
    .action-btn.active-star {
      color: #eab308 !important;
    }
    .action-btn.active-star svg {
      fill: #eab308 !important;
      stroke: #eab308 !important;
    }
    .card-star-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #eab308;
      margin-right: 0.25rem;
      vertical-align: middle;
      flex-shrink: 0;
    }
    [dir="rtl"] .card-star-pill {
      margin-right: 0;
      margin-left: 0.25rem;
    }
    .action-btn.active-archive {
      color: var(--success);
    }
    .action-btn.btn-delete:hover {
      color: var(--danger);
    }

    /* -------------------------------------------------------------
       READER VIEW: Full-Height Sidebar Layout (Maximizes Vertical Space)
       ------------------------------------------------------------- */
    .reader-view {
      position: fixed;
      inset: 0;
      z-index: 200;
      background: var(--bg-primary);
      display: none;
      flex-direction: row;
      overflow: hidden;
    }
    .reader-view.open {
      display: flex;
    }

    /* -------------------------------------------------------------
       READER VIEW: Full-Height Sidebar (Desktop Default)
       ------------------------------------------------------------- */
    .reader-mobile-bar {
      display: none !important;
    }
    .reader-sidebar-backdrop {
      display: none !important;
    }

    .reader-sidebar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 60px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      padding: 1rem 0.4rem;
      z-index: 60;
      gap: 0.35rem;
      transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
      overflow-x: hidden;
      overflow-y: auto;
    }
    .reader-sidebar:hover {
      width: 175px;
      box-shadow: none;
    }

    .reader-sidebar-group {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
      width: 100%;
    }
    .reader-sidebar-divider {
      width: 100%;
      height: 1px;
      background: var(--border-color);
      margin: 0.35rem 0;
    }

    .reader-tool-btn {
      width: 100%;
      height: 38px;
      min-height: 38px;
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      padding: 0 0.65rem;
      gap: 0.75rem;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;
      white-space: nowrap;
    }
    .reader-tool-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-color);
    }
    .reader-tool-btn svg, .reader-tool-btn .btn-icon-symbol {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .reader-tool-btn .btn-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-primary);
      opacity: 0;
      transform: translateX(-4px);
      transition: opacity 0.18s ease, transform 0.18s ease;
      pointer-events: none;
    }
    .reader-sidebar:hover .reader-tool-btn .btn-label {
      opacity: 1;
      transform: translateX(0);
    }
    .reader-tool-btn.btn-back-tool {
      background: transparent;
      color: var(--text-secondary);
      border-color: transparent;
    }
    .reader-tool-btn.btn-back-tool:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-color);
    }
    .reader-tool-btn.btn-delete-tool {
      color: #ef4444;
    }
    .reader-tool-btn.btn-delete-tool:hover {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.25);
    }



    /* Reader Main Scroll Area */
    .reader-main-scroll {
      flex: 1;
      width: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 2.5rem 1.5rem 6rem calc(60px + 1.5rem);
      -webkit-overflow-scrolling: touch;
      position: relative;
    }

    .reader-content-wrap {
      max-width: 720px;
      width: 100%;
      margin: 0 auto;
    }

    .reader-cover {
      margin-bottom: 2rem;
      border-radius: var(--radius);
      overflow: hidden;
      max-height: 420px;
      display: flex;
      justify-content: center;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
    }
    .reader-cover-img {
      max-width: 100%;
      max-height: 420px;
      object-fit: contain;
      border-radius: var(--radius);
    }



    /* Standard LTR Reader Body (Default) */
    .reader-body {
      direction: ltr;
      text-align: left;
      font-family: var(--font-reader-serif);
      font-size: 1.15rem;
      line-height: 1.75;
      color: var(--text-primary);
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    #readerTitle {
      text-align: left;
      direction: ltr;
    }
    #readerMeta {
      text-align: left;
      direction: ltr;
    }

    /* Universal Content Resets */
    .reader-body * {
      position: static;
      height: auto;
      max-height: none;
      overflow: visible;
      opacity: 1;
      visibility: visible;
      color: inherit;
    }
    .reader-body p,
    .reader-body span,
    .reader-body div,
    .reader-body h1,
    .reader-body h2,
    .reader-body h3,
    .reader-body h4,
    .reader-body li {
      color: var(--text-primary);
    }
    .reader-body img {
      max-width: 100% !important;
      height: auto !important;
      display: block !important;
      margin: 1.5rem auto !important;
      border-radius: var(--radius-sm);
    }
    .reader-body .mobileView,
    .reader-body span.mobileView,
    .reader-body div.mobileView,
    .reader-body .gallery-indication {
      display: none !important;
    }

    /* RTL / Hebrew / Arabic Typography & Alignment (Only when RTL) */
    .reader-body[dir="rtl"],
    .reader-content-wrap.is-rtl .reader-body {
      direction: rtl !important;
      text-align: right !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Alef", "Assistant", "Rubik", "David Libre", sans-serif;
    }
    .reader-body[dir="rtl"] p,
    .reader-body[dir="rtl"] div,
    .reader-body[dir="rtl"] span,
    .reader-body[dir="rtl"] h1,
    .reader-body[dir="rtl"] h2,
    .reader-body[dir="rtl"] h3,
    .reader-body[dir="rtl"] h4,
    .reader-body[dir="rtl"] li,
    .reader-body[dir="rtl"] section,
    .reader-body[dir="rtl"] article {
      direction: rtl !important;
      text-align: right !important;
    }
    .reader-content-wrap.is-rtl #readerTitle {
      text-align: right !important;
      direction: rtl !important;
    }
    .reader-content-wrap.is-rtl #readerMeta {
      text-align: right !important;
      direction: rtl !important;
    }
    .reader-body[dir="rtl"] blockquote {
      border-left: none !important;
      border-right: 3px solid var(--accent) !important;
      padding-left: 0 !important;
      padding-right: 1.25rem !important;
    }
    .reader-body[dir="rtl"] ul, .reader-body[dir="rtl"] ol {
      padding-left: 0 !important;
      padding-right: 1.5rem !important;
    }
    .reader-body p {
      margin-bottom: 1.35rem;
    }
    .reader-body img {
      max-width: 100%;
      height: auto;
      border-radius: var(--radius-sm);
      margin: 1.5rem auto;
      display: block;
    }
    .reader-body h1, .reader-body h2, .reader-body h3 {
      font-family: var(--font-ui);
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      line-height: 1.3;
    }
    .reader-body pre {
      background: var(--bg-secondary);
      padding: 1rem;
      border-radius: var(--radius-sm);
      overflow-x: auto;
      font-family: var(--font-reader-mono);
      font-size: 0.875rem;
      margin: 1.5rem 0;
    }
    
    .reader-body a {
      color: #38bdf8;
      text-decoration: underline;
      text-decoration-color: rgba(56, 189, 248, 0.45);
      text-underline-offset: 3px;
      transition: all 0.15s ease;
    }
    .reader-body a:hover {
      color: #7dd3fc;
      text-decoration-color: #38bdf8;
    }

    html.light .reader-body a {
      color: #0284c7;
      text-decoration-color: rgba(2, 132, 199, 0.45);
    }
    html.light .reader-body a:hover {
      color: #0369a1;
      text-decoration-color: #0284c7;
    }

    html.sepia .reader-body a {
      color: #b45309;
      text-decoration-color: rgba(180, 83, 9, 0.45);
    }
    html.sepia .reader-body a:hover {
      color: #78350f;
      text-decoration-color: #b45309;
    }

    .reader-body blockquote {
      border-left: 3px solid var(--accent);
      padding-left: 1.25rem;
      margin: 1.5rem 0;
      font-style: italic;
      color: var(--text-secondary);
    }

    /* Reading Progress Bar */
    .reading-progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--accent);
      z-index: 250;
      width: 0%;
      transition: width 0.1s ease-out;
    }

    /* Modals (Higher than reader-view and mobile drawers) */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.68);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 400;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-backdrop.open {
      display: flex;
    }
    .modal {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 540px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--shadow);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
      animation: modalFadeIn 0.2s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1.25rem;
      padding: 0.25rem;
    }
    .close-btn:hover { color: var(--text-primary); }

    .form-grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
    }
    @media (max-width: 768px) {
      .form-grid-2col {
        grid-template-columns: 1fr !important;
        gap: 0.95rem;
      }
    }
    .form-group input[type="date"] {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .form-group input, .form-group textarea {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 0.6rem 0.8rem;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.875rem;
      outline: none;
    }
    .form-group textarea {
      min-height: 160px;
      resize: vertical;
      font-family: var(--font-reader-serif);
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .form-group input:focus, .form-group textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }

    /* Auth Lock Overlay */
    
    .auth-error-banner {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #f87171;
      border-radius: var(--radius-sm);
      padding: 0.65rem 0.85rem;
      font-size: 0.825rem;
      line-height: 1.4;
      text-align: left;
      display: none;
    }
    .auth-error-banner.show {
      display: block;
    }
    .auth-error-banner.lockout {
      background: rgba(220, 38, 38, 0.22);
      border-color: #ef4444;
      color: #fca5a5;
      font-weight: 500;
    }

    .auth-overlay {
      position: fixed;
      inset: 0;
      background: var(--bg-primary);
      z-index: 300;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .auth-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 400px;
      padding: 2rem;
      box-shadow: var(--shadow);
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 4rem 1rem;
      color: var(--text-muted);
    }
    .empty-state svg {
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
      color: var(--accent);
      opacity: 0.7;
    }
    .empty-state h3 {
      font-size: 1.2rem;
      color: var(--text-primary);
      margin-bottom: 0.4rem;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow);
      padding: 0.75rem 1.25rem;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      z-index: 999;
      font-size: 0.875rem;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }
    .code-box {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 0.75rem;
      font-family: var(--font-reader-mono);
      font-size: 0.8rem;
      color: var(--accent);
      user-select: all;
      word-break: break-all;
    }

    
    /* Mobile Header Drawer & Items */
    .mobile-menu-btn {
      display: none;
    }
    .mobile-nav-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      z-index: 340;
    }
    .mobile-nav-backdrop.open {
      display: block;
    }
    .mobile-nav-dropdown {
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 270px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      box-shadow: none;
      visibility: hidden;
      pointer-events: none;
      padding: max(1.25rem, calc(1.25rem + env(safe-area-inset-top, 0px))) 0.75rem 1.25rem 0.75rem;
      z-index: 350;
      flex-direction: column;
      gap: 0.35rem;
      transform: translateX(-100%);
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.25s ease, box-shadow 0.25s ease;
    }
    .mobile-nav-dropdown.open {
      transform: translateX(0);
      visibility: visible;
      pointer-events: auto;
      box-shadow: 4px 0 25px rgba(0, 0, 0, 0.5);
    }
    .mobile-nav-item {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.75rem;
      padding: 0.7rem 0.85rem;
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      background: transparent;
      border: 1px solid transparent;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      width: 100%;
      box-sizing: border-box;
      transition: all 0.15s ease;
    }
    .mobile-nav-item svg {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
    }
    .mobile-nav-item span {
      text-align: left;
      flex: 1;
      white-space: nowrap;
    }
    .mobile-nav-item:hover {
      background: var(--bg-tertiary);
      border-color: var(--border-color);
    }
    .mobile-nav-divider {
      height: 1px;
      background: var(--border-color);
      margin: 0.4rem 0;
    }

    @media (max-width: 768px) {
      .desktop-nav-btn {
        display: none !important;
      }
      .mobile-menu-btn {
        display: flex !important;
      }
      header .brand {
        display: none !important;
      }
      .nav-search {
        max-width: none !important;
        flex: 1 !important;
        margin: 0 0.5rem !important;
      }
    }

    /* -------------------------------------------------------------
       MOBILE & TABLET RESPONSIVENESS
       ------------------------------------------------------------- */
    @media (max-width: 768px) {
      header {
        padding: 0.6rem 0.85rem;
        padding-top: max(0.6rem, calc(0.6rem + env(safe-area-inset-top, 0px)));
      }
      .brand span:nth-child(2) {
        font-size: 1.05rem;
      }
      .brand-tag {
        display: none;
      }
      .nav-search {
        max-width: 140px;
      }
      .nav-actions button span {
        display: none;
      }
      .nav-actions button {
        padding: 0.45rem;
      }
      main {
        padding: 1rem 0.75rem 4rem 0.75rem;
      }
      .articles-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      .card-image-wrap {
        height: 140px;
        width: calc(100% + 2rem);
        margin: -1rem -1rem 0.75rem -1rem;
      }
      .article-card {
        padding: 1rem;
      }
      /* Clean mobile cards: Hide busy button row in favor of full card tap & long-press selection */
      .article-card .card-actions {
        display: none !important;
      }
      .card-select-wrap {
        display: none;
      }
      body.selection-mode-active .card-select-wrap {
        display: flex;
        opacity: 1;
      }

      /* Mobile Reader Layout: Top Navigation Bar & Left Slide-out Drawer */
      .reader-view {
        flex-direction: column !important;
      }
      .reader-notch-shield {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: env(safe-area-inset-top, 0px);
        background: var(--bg-primary) !important;
        z-index: 260;
        pointer-events: none;
        display: block;
        transition: background-color 0.25s ease;
      }
      .reader-mobile-bar {
        display: flex !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        box-sizing: border-box !important;
        padding: 0.6rem 0.85rem !important;
        padding-top: max(0.6rem, calc(0.6rem + env(safe-area-inset-top, 0px))) !important;
        min-height: calc(56px + env(safe-area-inset-top, 0px)) !important;
        background: var(--bg-secondary) !important;
        border-bottom: 1px solid var(--border-color) !important;
        align-items: center !important;
        justify-content: space-between !important;
        z-index: 150 !important;
        transition: transform 0.52s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease;
      }
      .reader-mobile-bar.bar-hidden {
        transform: translateY(-100%) !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      .reader-main-scroll {
        padding-top: calc(env(safe-area-inset-top, 0px) + 8px);
      }
      .reader-mobile-bar-group {
        display: flex !important;
        align-items: center !important;
        gap: 0.5rem !important;
      }
      .reader-mobile-bar-group.right-actions {
        margin-left: auto !important;
      }
      .reader-sidebar-backdrop {
        position: fixed !important;
        inset: 0 !important;
        background: rgba(0, 0, 0, 0.6) !important;
        backdrop-filter: blur(3px) !important;
        -webkit-backdrop-filter: blur(3px) !important;
        z-index: 240 !important;
        display: none !important;
      }
      .reader-sidebar-backdrop.open {
        display: block !important;
      }
      .reader-sidebar {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        bottom: 0 !important;
        width: 250px !important;
        height: 100vh !important;
        transform: translateX(-100%);
        box-shadow: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.25s ease;
        z-index: 250 !important;
        padding: max(1.25rem, calc(1.25rem + env(safe-area-inset-top, 0px))) 0.75rem 1.25rem 0.75rem !important;
        background: var(--bg-secondary) !important;
        border-right: 1px solid var(--border-color) !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        justify-content: flex-start !important;
      }
      .reader-sidebar.drawer-open {
        transform: translateX(0) !important;
        box-shadow: 4px 0 25px rgba(0, 0, 0, 0.5) !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }
      .reader-sidebar .reader-tool-btn {
        width: 100% !important;
        height: 44px !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: flex-start !important;
        padding: 0 0.85rem !important;
        gap: 0.85rem !important;
      }
      .reader-sidebar .reader-tool-btn .btn-label {
        opacity: 1 !important;
        transform: translateX(0) !important;
        font-size: 0.9rem !important;
        color: var(--text-primary) !important;
        pointer-events: auto !important;
        display: inline-block !important;
        white-space: nowrap !important;
      }
      .reader-sidebar .reader-sub-item {
        height: 38px !important;
        padding-left: 2.25rem !important;
        font-size: 0.85rem !important;
        color: var(--text-secondary) !important;
        justify-content: flex-start !important;
        text-align: left !important;
      }
      [dir="rtl"] .reader-sidebar .reader-sub-item {
        padding-left: 0.85rem !important;
        padding-right: 2.25rem !important;
        text-align: right !important;
      }
      .reader-sidebar .btn-back-tool {
        display: none !important;
      }
      .reader-main-scroll {
        padding: calc(4rem + env(safe-area-inset-top, 0px)) 1rem 3rem 1rem !important;
      }
      #readerTitle {
        font-size: 1.6rem !important;
      }
    }
    .ptr-spinning {
      animation: ptrSpin 0.75s linear infinite !important;
    }
    @keyframes ptrSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>

  <!-- WallabagWebService Matcher Elements (Satisfies isRegularPage() directly) -->
  <div style="display:none;" aria-hidden="true">
    <img src="/img/logo-wallabag.svg" alt="wallabag logo" />
    <a href="/logout">Logout</a>
  </div>

  <!-- Reading Progress Bar -->
  <div class="reading-progress-bar" id="readingProgress"></div>

  <!-- Auth Required Screen -->
  <div class="auth-overlay" id="authOverlay">
    <div class="auth-card">
      <div style="display: flex; justify-content: center;">
        <div class="brand-icon" style="width: 44px; height: 44px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
      </div>
      <div>
        <h2 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 0.3rem;">Protected Library</h2>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">Enter your Wallaflare Access Token or Password</p>
      </div>

      <div class="auth-error-banner" id="authErrorMsg"></div>

      <form id="authForm" action="/login_check" method="post" name="loginform" onsubmit="handleLogin(event)" style="display: flex; flex-direction: column; gap: 0.85rem;">
        <input type="hidden" name="_csrf_token" value="wallaflare_csrf_token_8a92b" />
        <input type="hidden" id="username" name="_username" value="wallaflare" autocomplete="username" />
        <div class="form-group" style="text-align: left;">
          <input type="password" id="authKeyInput" name="_password" placeholder="Enter AUTH_TOKEN / Password" autocomplete="current-password" required autofocus>
        </div>
        <button type="submit" id="authSubmitBtn" class="btn btn-primary" style="width: 100%; padding: 0.65rem;">Unlock</button>
      </form>
    </div>
  </div>

  <!-- Pull to Refresh Spinner -->
  <div id="pullToRefreshWrap" style="position: fixed; top: calc(56px + env(safe-area-inset-top, 0px)); left: 50%; transform: translate(-50%, -20px); z-index: 300; opacity: 0; visibility: hidden; pointer-events: none; transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;">
    <div id="pullToRefreshCard" style="background: var(--bg-card); border: 1.5px solid var(--border-color); box-shadow: 0 8px 25px rgba(0,0,0,0.55); width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);">
      <svg id="pullToRefreshSvg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="transition: transform 0.15s ease;">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
    </div>
  </div>

  <!-- Top Header -->
  <header>
    <!-- Standard Nav Header Elements -->
    <div id="standardNavHeader" style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 0.85rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <!-- Mobile Left Menu Trigger Button (3 lines / hamburger) -->
        <button class="btn-icon mobile-menu-btn" id="mobileNavMenuBtn" onclick="toggleMobileNavMenu(event)" title="Open Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>

        <div class="brand" onclick="navigateTo('/')">
          <div class="brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <span>${appName}</span>
          <span class="brand-tag">Edge E-ink</span>
        </div>
      </div>

      <div class="nav-search">
        <svg class="search-magnifier" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="searchInput" placeholder="Search articles or /..." oninput="handleSearchInput()">
        <button type="button" class="search-ctrl-btn" id="searchClearBtn" onclick="clearSearchInput()" title="Clear Search" style="display: none;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="search-ctrl-divider"></div>
        <button type="button" class="search-ctrl-btn" id="cycleLayoutBtn" onclick="cycleViewMode()" title="Toggle View Layout (List / Grid / Compact)">
          <span id="cycleLayoutIcon" style="display: flex; align-items: center; justify-content: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </span>
        </button>
        <div class="card-menu-wrap" style="position: relative;">
          <button type="button" class="search-ctrl-btn" id="sortBtn" onclick="event.stopPropagation(); toggleSortMenu()" title="Sort Articles">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="4" x2="12" y2="20"></line><polyline points="18 14 12 20 6 14"></polyline><polyline points="6 10 12 4 18 10"></polyline></svg>
          </button>
          <div class="search-dropdown-menu card-dropdown-menu" id="sortDropdownMenu" onclick="event.stopPropagation()">
            <button class="menu-item" id="sortOptNewest" onclick="setSortOrder('newest')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span>Newest First</span></button>
            <button class="menu-item" id="sortOptOldest" onclick="setSortOrder('oldest')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg><span>Oldest First</span></button>
            <button class="menu-item" id="sortOptShortest" onclick="setSortOrder('shortest')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="12" x2="12" y2="12"></line><line x1="4" y1="6" x2="8" y2="6"></line><line x1="4" y1="18" x2="16" y2="18"></line></svg><span>Shortest Read</span></button>
            <button class="menu-item" id="sortOptLongest" onclick="setSortOrder('longest')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="16" y2="12"></line><line x1="4" y1="18" x2="12" y2="18"></line></svg><span>Longest Read</span></button>
            <button class="menu-item" id="sortOptTitle" onclick="setSortOrder('title')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"></path><line x1="12" y1="4" x2="12" y2="20"></line></svg><span>Title (A-Z)</span></button>
          </div>
        </div>
      </div>

      <div class="nav-actions">
        <button class="btn btn-primary" onclick="openModal('addUrlModal')" title="Add URL">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add URL</span>
        </button>

        <button class="btn btn-secondary desktop-nav-btn" onclick="openModal('addTextModal')" title="Add Text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          <span>Add Text</span>
        </button>

        <button class="btn btn-secondary desktop-nav-btn" onclick="openGlobalTagManager()" title="Manage & Clean Tags">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          <span>Tags</span>
        </button>

        <button class="btn btn-secondary desktop-nav-btn" onclick="openModal('syncModal')" title="KOReader &amp; API Setup">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
          <span>KOReader</span>
        </button>

        <button class="btn-icon desktop-nav-btn" onclick="toggleTheme()" title="Toggle Light/Dark/Sepia">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        </button>

        <button class="btn-icon desktop-nav-btn" onclick="handleLogout()" title="Log Out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </div>

    <!-- Batch Selection Contextual Action Header -->
    <div id="batchActionHeader" style="display: none; align-items: center; justify-content: space-between; width: 100%; gap: 0.5rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <button class="btn-icon" onclick="clearArticleSelection()" title="Cancel Selection" style="flex-shrink: 0;">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <span id="batchSelectedCount" style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary); white-space: nowrap;">0 selected</span>
      </div>

      <div style="display: flex; align-items: center; gap: 0.35rem;">
        <button class="btn-icon" onclick="batchToggleStar()" title="Toggle Star for Selected" id="batchStarBtn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </button>
        <button class="btn-icon" onclick="batchToggleArchive()" title="Toggle Archive for Selected" id="batchArchiveBtn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
        </button>
        <button class="btn-icon" onclick="batchManageTags()" title="Add / Manage Tags">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
        </button>

        <div class="card-menu-wrap">
          <button class="btn-icon" title="More Options" onclick="event.stopPropagation(); toggleBatchMenu()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
          </button>
          <div class="card-dropdown-menu" id="batchDropdownMenu" onclick="event.stopPropagation()" style="position: absolute; top: calc(100% + 8px); bottom: auto !important; right: 0; left: auto; min-width: 195px;">
            <button class="menu-item" id="batchEditTitleBtn" onclick="closeBatchMenu(); batchEditTitle();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg><span>Edit Title</span></button>
                        <div class="menu-item-expandable" id="batchExportWrap">
              <button class="menu-item menu-item-parent" onclick="event.stopPropagation(); toggleBatchExportSubmenu()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Export</span>
                <svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="menu-sub-items" id="batchExportSub">
                <button class="menu-item menu-sub-item" onclick="closeBatchMenu(); batchDownloadEpub();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>EPUB (.epub)</span></button>
                <button class="menu-item menu-sub-item" onclick="closeBatchMenu(); batchExportMarkdown();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span>Markdown (.md)</span></button>
                <button class="menu-item menu-sub-item" onclick="closeBatchMenu(); batchExportPdf();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h3a1.5 1.5 0 0 0 0-3H8v6"></path><path d="M14 10v6"></path></svg><span>PDF (.pdf)</span></button>
              </div>
            </div>
            <button class="menu-item" onclick="closeBatchMenu(); batchRefetchContent();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg><span>Re-fetch Content</span></button>
            <button class="menu-item" onclick="closeBatchMenu(); toggleSelectAllArticles();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><polyline points="9 11 12 14 22 4"></polyline></svg><span id="batchMenuSelectAllLabel">Select All</span></button>
            <div class="menu-divider"></div>
            <button class="menu-item menu-item-danger" onclick="closeBatchMenu(); batchDeleteArticles();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg><span>Delete Article(s)</span></button>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Mobile Nav Backdrop & Slide-out Drawer -->
  <div class="mobile-nav-backdrop" id="mobileNavBackdrop" onclick="closeMobileNavMenu()"></div>
  <div class="mobile-nav-dropdown" id="mobileNavDropdown">
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.25rem 1rem 0.25rem; border-bottom: 1px solid var(--border-color); margin-bottom: 0.75rem;">
      <div class="brand" style="cursor: pointer;" onclick="navigateTo('/'); closeMobileNavMenu();">
        <div class="brand-icon" style="width: 32px; height: 32px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <span style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${appName}</span>
        <span class="brand-tag" style="display: inline-block;">Edge E-ink</span>
      </div>
      <button class="action-btn" onclick="closeMobileNavMenu()" style="font-size: 1.25rem;">&times;</button>
    </div>
    <button class="mobile-nav-item" id="serverSettingsBtn" onclick="openServerConnectModal(); closeMobileNavMenu();" style="color: var(--accent); display: none;">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      <span>Server Settings</span>
    </button>
    <button class="mobile-nav-item" onclick="openGlobalTagManager(); closeMobileNavMenu();">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
      <span>Manage Tags</span>
    </button>
    <button class="mobile-nav-item" onclick="openModal('addTextModal'); closeMobileNavMenu();">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      <span>Add Custom Text</span>
    </button>
    <button class="mobile-nav-item" onclick="openModal('syncModal'); closeMobileNavMenu();">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
      <span>KOReader Sync</span>
    </button>
    <div class="mobile-nav-divider"></div>
    <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); padding: 0.4rem 0.75rem 0.2rem 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">View Layout</div>
    <div style="display: flex; gap: 0.4rem; padding: 0.2rem 0.75rem 0.6rem 0.75rem;">
      <button class="btn btn-outline" style="flex: 1; font-size: 0.75rem; padding: 0.35rem;" onclick="setViewMode('list'); closeMobileNavMenu();">List</button>
      <button class="btn btn-outline" style="flex: 1; font-size: 0.75rem; padding: 0.35rem;" onclick="setViewMode('grid'); closeMobileNavMenu();">Grid</button>
      <button class="btn btn-outline" style="flex: 1; font-size: 0.75rem; padding: 0.35rem;" onclick="setViewMode('compact'); closeMobileNavMenu();">Compact</button>
    </div>
    <div class="mobile-nav-divider"></div>
    <button class="mobile-nav-item" onclick="toggleTheme();">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
      <span>Toggle Theme</span>
    </button>
    <button class="mobile-nav-item" onclick="handleLogout(); closeMobileNavMenu();">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      <span>Log Out</span>
    </button>
  </div>

  <!-- Main Content -->
  <main>
    <div class="filter-bar">
      <div class="tab-group">
        <button class="tab-btn active" id="tabUnread" onclick="setFilter('unread')">
          <span>Unread</span>
          <span class="badge-count" id="countUnread">0</span>
        </button>
        <button class="tab-btn" id="tabStarred" onclick="setFilter('starred')">
          <span>Starred</span>
          <span class="badge-count" id="countStarred">0</span>
        </button>
        <button class="tab-btn" id="tabArchive" onclick="setFilter('archive')">
          <span>Archive</span>
          <span class="badge-count" id="countArchive">0</span>
        </button>
        <button class="tab-btn" id="tabAll" onclick="setFilter('all')">
          <span>All</span>
          <span class="badge-count" id="countAll">0</span>
        </button>
      </div>

      <div style="font-size: 0.75rem; color: var(--text-muted); margin-left: auto; white-space: nowrap;" id="statusIndicator"></div>
    </div>

    <!-- Article Grid -->
    
    <!-- Active Tag Filter Banner -->
    <div id="activeTagFilterBanner" style="display: none; align-items: center; justify-content: space-between; background: var(--bg-secondary); border: 1px solid var(--accent); border-radius: var(--radius-sm); padding: 0.5rem 0.85rem; margin-bottom: 1.25rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 0.85rem; color: var(--text-secondary);">Filtered by tag:</span>
        <span class="tag-badge" id="activeTagName" style="font-size: 0.85rem;"></span>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;" onclick="filterByTag(null)">Clear Filter</button>
        <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;" onclick="openGlobalTagManager()">Manage Tags</button>
      </div>
    </div>

    <div class="articles-grid" id="articlesGrid"></div>

    <!-- Empty State -->
    <div class="empty-state" id="emptyState" style="display: none;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
      <h3>No articles found</h3>
      <p>Add a URL or text using the buttons in the top navbar.</p>
    </div>
  </main>



  <!-- Modal: Confirmation Dialog -->
  <div class="modal-backdrop" id="confirmModal" style="z-index: 9999 !important;">
    <div class="modal" style="max-width: 440px; text-align: left;">
      <div class="modal-header">
        <h3 class="modal-title" id="confirmModalTitle">Confirm Action</h3>
        <button class="close-btn" onclick="handleConfirmModalCancel()">&times;</button>
      </div>
      <div id="confirmModalMsg" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin: 1rem 0 1.25rem 0; white-space: pre-line;"></div>
      <div style="display: flex; justify-content: flex-end; gap: 0.6rem;">
        <button type="button" class="btn btn-secondary" onclick="handleConfirmModalCancel()">Cancel</button>
        <button type="button" class="btn btn-primary" id="confirmModalBtn" onclick="handleConfirmModalOk()">Confirm</button>
      </div>
    </div>
  </div>

  <!-- Server Connection Modal (for Android Capacitor App) -->
  <div class="modal-backdrop" id="serverConnectModal">
    <div class="modal" style="max-width: 480px;">
      <div class="modal-header">
        <h3 class="modal-title">Connect to Wallaflare Server</h3>
        <button class="close-btn" onclick="closeModal('serverConnectModal')">&times;</button>
      </div>
      <form onsubmit="handleSaveServerConnection(event)" style="display: flex; flex-direction: column; gap: 0.95rem;">
        <div class="form-group">
          <label for="serverUrlInput">Wallaflare Server URL *</label>
          <input type="url" id="serverUrlInput" placeholder="https://wallaflare.example.com" required>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Enter your Cloudflare Worker URL or custom domain</div>
        </div>

        <div class="form-group">
          <label for="serverTokenInput">API Auth Token / Password (Optional)</label>
          <input type="password" id="serverTokenInput" placeholder="Your AUTH_TOKEN if configured">
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('serverConnectModal')">Cancel</button>
          <button type="submit" class="btn btn-primary" id="saveServerBtn">Connect &amp; Sync</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Add URL -->
  <div class="modal-backdrop" id="addUrlModal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Save Article from Web</h3>
        <button class="close-btn" onclick="closeModal('addUrlModal')">&times;</button>
      </div>
      <form onsubmit="handleIngestUrl(event)" style="display: flex; flex-direction: column; gap: 0.95rem;">
        <div class="form-group">
          <label for="urlInput">Article URL</label>
          <input type="url" id="urlInput" placeholder="https://example.com/article" required autofocus>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('addUrlModal')">Cancel</button>
          <button type="submit" class="btn btn-primary" id="ingestUrlBtn">Fetch &amp; Save</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Add Text -->
  <div class="modal-backdrop" id="addTextModal">
    <div class="modal" style="max-width: 560px;">
      <div class="modal-header">
        <h3 class="modal-title">Add Custom Text / Markdown</h3>
        <button class="close-btn" onclick="closeModal('addTextModal')">&times;</button>
      </div>
      <form onsubmit="handleIngestText(event)" style="display: flex; flex-direction: column; gap: 0.95rem;">
        <div class="form-group">
          <label for="textTitle">Title *</label>
          <input type="text" id="textTitle" placeholder="Article or Chapter Title" required autofocus>
        </div>

        <div class="form-grid-2col">
          <div class="form-group">
            <label for="textAuthor">Author / Published By (Optional)</label>
            <input type="text" id="textAuthor" placeholder="e.g. Brandon Sanderson">
          </div>
          <div class="form-group">
            <label for="textPublishedAt">Publication Date (Optional)</label>
            <input type="date" id="textPublishedAt">
          </div>
        </div>

        <div class="form-group">
          <label for="textTags">Tags (Optional, comma-separated)</label>
          <input type="text" id="textTags" placeholder="e.g. fantasy, novel" oninput="syncAddTextTagChips()">
          <div id="addTextTagsContainer" style="display: none; margin-top: 0.45rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.3rem;">Quick select from existing library tags:</div>
            <div class="card-tags" id="addTextAvailableTags" style="display: flex; flex-wrap: wrap; gap: 0.35rem;"></div>
          </div>
        </div>

        <div class="form-group">
          <label for="textUrl">Source URL (Optional)</label>
          <input type="url" id="textUrl" placeholder="https://original-source.com/article">
        </div>

        <div class="form-group">
          <label for="textPreviewPicture">Preview / Cover Image URL (Optional)</label>
          <input type="url" id="textPreviewPicture" placeholder="https://example.com/cover.jpg">
        </div>

        <div class="form-group">
          <label for="textContent">Content (HTML or Markdown) *</label>
          <textarea id="textContent" placeholder="Paste your text, chapter, or markdown here..." rows="7" required></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('addTextModal')">Cancel</button>
          <button type="submit" class="btn btn-primary" id="ingestTextBtn">Save Entry</button>
        </div>
      </form>
    </div>
  </div>

  
  <!-- Modal: Edit Title -->
  <div class="modal-backdrop" id="editTitleModal">
    <div class="modal" style="max-width: 480px;">
      <div class="modal-header">
        <h3 class="modal-title">Edit Article Title</h3>
        <button class="close-btn" onclick="closeModal('editTitleModal')">&times;</button>
      </div>
      <form onsubmit="handleSaveTitle(event)" style="display: flex; flex-direction: column; gap: 0.95rem;">
        <input type="hidden" id="editTitleEntryId" />
        <div class="form-group">
          <label for="editTitleInput">Title *</label>
          <input type="text" id="editTitleInput" required autofocus />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('editTitleModal')">Cancel</button>
          <button type="submit" class="btn btn-primary" id="saveTitleBtn">Save Title</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: KOReader / Wallabag Sync -->
  <div class="modal-backdrop" id="syncModal">
    <div class="modal" style="max-width: 500px;">
      <div class="modal-header">
        <h3 class="modal-title">KOReader &amp; Client Setup</h3>
        <button class="close-btn" onclick="closeModal('syncModal')">&times;</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.875rem;">
        <p style="color: var(--text-secondary);">Enter these 5 parameters into the <strong>KOReader Wallabag Plugin</strong> (or third-party clients):</p>
        
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase;">1. Server URL</label>
            <button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" onclick="copySyncValue('syncServerUrl', this)">Copy</button>
          </div>
          <div class="code-box" id="syncServerUrl" style="word-break: break-all;"></div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase;">2. Client ID</label>
              <button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" onclick="copyDirectText('wallaflare', this)">Copy</button>
            </div>
            <div class="code-box">wallaflare</div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase;">4. Username</label>
              <button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" onclick="copyDirectText('wallaflare', this)">Copy</button>
            </div>
            <div class="code-box">wallaflare</div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase;">3. Client Secret</label>
            <button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" onclick="copyDirectText('wallaflare', this)">Copy</button>
          </div>
          <div class="code-box" id="syncClientSecretDisplay">wallaflare</div>
        </div>

        <div>
          <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; margin-bottom: 0.25rem; display: block;">5. Password</label>
          <div class="code-box" style="color: var(--text-muted);">Your private AUTH_TOKEN password</div>
        </div>

        <div style="background: var(--bg-primary); border-radius: var(--radius-sm); padding: 0.75rem; border: 1px solid var(--border-color);">
          <strong style="color: var(--accent);">KOReader Steps:</strong>
          <ol style="margin-left: 1.25rem; margin-top: 0.4rem; line-height: 1.6; color: var(--text-secondary);">
            <li>On your e-reader, open <strong>Search / Tools &gt; Wallabag</strong>.</li>
            <li>Enter the 5 values above.</li>
            <li>Tap <strong>Sync now</strong> to sync and download your articles as EPUBs!</li>
          </ol>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
        <button class="btn btn-primary" onclick="closeModal('syncModal')">Done</button>
      </div>
    </div>
  </div>

  <!-- -------------------------------------------------------------
       READER VIEW: Top Bar for Mobile & Full-Height Sidebar for Desktop
       ------------------------------------------------------------- -->
  <div class="reader-view" id="readerView">
    <!-- Black status bar / camera punch hole shield -->
    <div class="reader-notch-shield"></div>

    <!-- Mobile Top Action Bar -->
    <div class="reader-mobile-bar">
      <div class="reader-mobile-bar-group">
        <button class="btn-icon" id="readerMobileDrawerBtn" onclick="toggleMobileReaderDrawer(event)" title="More options">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <button class="btn-icon" onclick="handleReaderBack()" title="Back to Library (Esc)">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
      </div>

      <div class="reader-mobile-bar-group right-actions">
        <button class="btn-icon" id="readerMobileArchiveBtn" onclick="toggleActiveArchive()" title="Toggle Archive / Finished">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
        <button class="btn-icon" id="readerMobileStarBtn" onclick="toggleActiveStar()" title="Toggle Star">
          <svg width="19" height="19" id="readerMobileStarIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </button>
      </div>
    </div>

    <!-- Mobile Drawer Backdrop -->
    <div class="reader-sidebar-backdrop" id="readerDrawerBackdrop" onclick="closeMobileReaderDrawer()"></div>

    <!-- Expandable Reader Action Sidebar (Slide-out drawer on Mobile) -->
    <aside class="reader-sidebar" id="readerSidebar">
      <div class="reader-sidebar-group">
        <button class="reader-tool-btn btn-back-tool" onclick="handleReaderBack()" title="Back to Library (Esc)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          <span class="btn-label">Back</span>
        </button>

        <button class="reader-tool-btn" id="readerStarBtn" onclick="toggleActiveStar()" title="Toggle Star">
          <svg width="17" height="17" id="readerStarIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span class="btn-label" id="readerStarLabel">Star</span>
        </button>

        <button class="reader-tool-btn" id="readerArchiveBtn" onclick="toggleActiveArchive()" title="Toggle Archive">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
          <span class="btn-label" id="readerArchiveLabel">Archive</span>
        </button>

        <button class="reader-tool-btn" onclick="openTagModal(activeArticleId); closeMobileReaderDrawer();" title="Edit Tags">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          <span class="btn-label">Tags</span>
        </button>

                <button class="reader-tool-btn" id="readerExportBtn" onclick="toggleReaderExportMenu(event)" title="Export Article (EPUB, Markdown, PDF)">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span class="btn-label">Export</span>
          <svg class="chevron-icon" id="readerExportChevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>

        <div class="reader-sub-menu" id="readerExportSubMenu">
          <button class="reader-sub-item" onclick="downloadActiveEpub(); closeMobileReaderDrawer();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>EPUB (.epub)</span></button>
          <button class="reader-sub-item" onclick="exportActiveMarkdown(); closeMobileReaderDrawer();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span>Markdown (.md)</span></button>
          <button class="reader-sub-item" onclick="exportActivePdf(); closeMobileReaderDrawer();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg><span>PDF (.pdf)</span></button>
        </div>

        <button class="reader-tool-btn" id="readerRefetchBtn" onclick="refetchActiveArticleContent(); closeMobileReaderDrawer();" title="Re-fetch Content from Source URL">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          <span class="btn-label">Re-fetch</span>
        </button>

        <div class="reader-sidebar-divider"></div>

        <button class="reader-tool-btn" onclick="toggleReaderFont()" title="Toggle Serif / Sans">
          <span class="btn-icon-symbol" style="font-family: serif; font-weight: bold; font-size: 1.05rem;">Aa</span>
          <span class="btn-label">Font Type</span>
        </button>

        <button class="reader-tool-btn" onclick="adjustFontSize(-1)" title="Smaller Text">
          <span class="btn-icon-symbol" style="font-weight: 700; font-size: 0.9rem;">A-</span>
          <span class="btn-label">Smaller</span>
        </button>

        <button class="reader-tool-btn" onclick="adjustFontSize(1)" title="Larger Text">
          <span class="btn-icon-symbol" style="font-weight: 700; font-size: 0.9rem;">A+</span>
          <span class="btn-label">Larger</span>
        </button>

        <button class="reader-tool-btn" onclick="toggleTheme()" title="Toggle Theme">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          <span class="btn-label">Theme</span>
        </button>

        <div class="reader-sidebar-divider"></div>

        <button class="reader-tool-btn btn-delete-tool" onclick="deleteActiveArticle()" title="Delete Article">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span class="btn-label" style="color: #ef4444;">Delete</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Reader Scroll Area -->
    <section class="reader-main-scroll" id="readerScrollContainer" onscroll="handleReaderScroll()">
      <div class="reader-content-wrap">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.75rem;">
          <h1 id="readerTitle" style="font-size: 2.1rem; font-weight: 700; line-height: 1.28; margin: 0; flex: 1;"></h1>
          <button class="action-btn" id="readerEditTitleBtn" onclick="openEditTitleModal(activeArticleId)" title="Edit Article Title" style="margin-top: 0.3rem; padding: 0.4rem; opacity: 0.75;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.8rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--border-color);" id="readerMeta"></div>
        <div id="readerCoverWrap"></div>
        <article class="reader-body" id="readerBody"></article>
      </div>
    </section>
  </div>

  
  
  <!-- Card Menu Click-Away Backdrop -->
  <div id="cardMenuBackdrop" style="position: fixed; inset: 0; z-index: 95; display: none;" onclick="closeAllCardMenus()"></div>

  <!-- Article Tag Management Modal (Unified Single & Multi-Select) -->
  <div class="tag-modal-overlay" id="tagModal" onclick="if(event.target === this) closeTagModal()">
    <div class="tag-modal">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h3 style="font-size: 1.15rem; font-weight: 600; margin: 0;" id="tagModalHeaderTitle">Manage Tags</h3>
        <button class="action-btn" onclick="closeTagModal()">&times;</button>
      </div>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="tagModalArticleTitle"></p>
      
      <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;" id="tagModalCurrentTagsLabel">Applied Tags:</div>
      <div class="card-tags" id="tagModalCurrentTags" style="margin-bottom: 1.25rem;"></div>
      
      <form onsubmit="event.preventDefault(); submitAddTag();" style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
        <input type="text" id="newTagInput" class="input" placeholder="Type new tag(s) separated by commas..." style="flex: 1;" />
        <button type="submit" class="btn btn-primary">Add</button>
      </form>

      <div id="quickTagsSection" style="display: none;">
        <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">Quick Add Library Tags:</div>
        <div class="card-tags" id="tagModalAvailableTags"></div>
      </div>
    </div>
  </div>
    </div>
  </div>

  <!-- Global Tag Management Modal -->
  <div class="tag-modal-overlay" id="globalTagModal" onclick="if(event.target === this) closeGlobalTagModal()">
    <div class="tag-modal" style="max-width: 520px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div>
          <h3 style="font-size: 1.2rem; font-weight: 600; margin: 0;">Manage All Tags</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; margin-bottom: 0;">Overview of all tags in your library</p>
        </div>
        <button class="action-btn" onclick="closeGlobalTagModal()">&times;</button>
      </div>

      <form onsubmit="event.preventDefault(); submitCreateGlobalTag();" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
        <input type="text" id="newGlobalTagInput" class="input" placeholder="Create new tag (e.g. tech, research)..." style="flex: 1;" />
        <button type="submit" class="btn btn-primary" style="padding: 0.4rem 0.9rem; font-size: 0.85rem; white-space: nowrap;">Create Tag</button>
      </form>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <span id="globalTagCountLabel" style="font-size: 0.85rem; color: var(--text-secondary);"></span>
        <button class="btn btn-outline" style="font-size: 0.8rem; padding: 0.3rem 0.65rem;" onclick="cleanupUnusedTags()">Delete Unused Tags</button>
      </div>

      <div id="globalTagListContainer" style="max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem; padding-right: 0.25rem;">
      </div>
    </div>
  </div>


  <!-- Toast -->
  <div class="toast" id="toast">
    <span id="toastMsg">Action completed</span>
  </div>

  <script>
    ${clientEpubJs}
    function isRtlText(text) {
      return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text || '');
    }

    let allEntries = [];
    let currentFilter = 'unread';
    let currentReaderFontSize = 18;
    let readerFontFamily = 'serif';
    let activeArticleId = null;

    
    async function loadClientInfo() {
      const secretDisplay = document.getElementById('syncClientSecretDisplay');
      const serverUrlDisplay = document.getElementById('syncServerUrl');
      if (serverUrlDisplay) serverUrlDisplay.textContent = window.location.origin;

      try {
        const res = await authFetch('/api/client-info');
        if (res.ok) {
          const data = await res.json();
          if (secretDisplay && data.client_secret) {
            secretDisplay.textContent = data.client_secret;
          }
        }
      } catch (err) {
        if (secretDisplay) secretDisplay.textContent = 'wallaflare_client_secret';
      }
    }

    function copyDirectText(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          btn.style.borderColor = 'var(--success)';
          btn.style.color = 'var(--success)';
          setTimeout(() => {
            btn.textContent = orig;
            btn.style.borderColor = '';
            btn.style.color = '';
          }, 1500);
        }
        showToast('Copied to clipboard');
      }).catch(() => {
        showToast('Failed to copy');
      });
    }

    function copySyncValue(elementId, btn) {
      const el = document.getElementById(elementId);
      const text = el ? el.textContent.trim() : '';
      if (text && text !== 'Loading...') {
        copyDirectText(text, btn);
      }
    }

    document.getElementById('syncServerUrl').textContent = window.location.origin;

    function getAuthToken() {
      return localStorage.getItem('wf_auth_token') || '';
    }

    function setAuthToken(token) {
      if (token) {
        localStorage.setItem('wf_auth_token', token.trim());
      } else {
        localStorage.removeItem('wf_auth_token');
      }
    }

    function isCapacitorApp() {
      return window.IS_CAPACITOR_APP === true ||
             window.location.hostname === 'localhost' ||
             window.location.hostname === '127.0.0.1' ||
             window.location.protocol === 'capacitor:' || 
             (typeof window.Capacitor !== 'undefined');
    }

    function getApiBaseUrl() {
      if (isCapacitorApp()) {
        const customUrl = localStorage.getItem('wf_server_url') || '';
        return customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
      }
      return '';
    }

    function authFetch(url, options = {}) {
      const baseUrl = getApiBaseUrl();
      const fullUrl = url.startsWith('http') ? url : (baseUrl + url);
      const headers = Object.assign({}, options.headers || {});
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
      }
      return fetch(fullUrl, Object.assign({}, options, { headers }));
    }

    
    function clearActiveTextSelection() {
      try {
        if (window.getSelection) {
          const sel = window.getSelection();
          if (sel && sel.removeAllRanges) {
            sel.removeAllRanges();
          }
        }
      } catch (e) {}
    }

    function toggleMobileNavMenu(e) {
      if (e) e.stopPropagation();
      clearActiveTextSelection();
      const dropdown = document.getElementById('mobileNavDropdown');
      const backdrop = document.getElementById('mobileNavBackdrop');
      if (dropdown && backdrop) {
        dropdown.classList.toggle('open');
        backdrop.classList.toggle('open');
      }
    }

    function closeMobileNavMenu() {
      const dropdown = document.getElementById('mobileNavDropdown');
      const backdrop = document.getElementById('mobileNavBackdrop');
      if (dropdown && backdrop) {
        dropdown.classList.remove('open');
        backdrop.classList.remove('open');
      }
    }

    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('mobileNavDropdown');
      if (dropdown && dropdown.classList.contains('open')) {
        if (!e.target.closest('#mobileNavDropdown') && !e.target.closest('#mobileNavMenuBtn')) {
          closeMobileNavMenu();
        }
      }
    });

    async function handleLogout() {
      const ok = await showConfirmDialog('Log Out', 'Are you sure you want to log out of Wallaflare?', 'Log Out', true);
      if (!ok) return;

      try {
        await fetch('/logout', { method: 'GET', credentials: 'include' });
      } catch {}
      try {
        document.cookie = 'PHPSESSID=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;';
      } catch {}
      if (isCapacitorApp()) {
        setAuthToken('');
        localStorage.removeItem('wf_server_url');
        allEntries = [];
        updateCounts();
        filterArticles();
        openServerConnectModal();
        showToast('Logged out of server');
        return;
      }
      setAuthToken('');
        const overlay = document.getElementById('authOverlay');
        const input = document.getElementById('authKeyInput');
        const submitBtn = document.getElementById('authSubmitBtn');
        const errorBanner = document.getElementById('authErrorMsg');
        if (input) {
          input.value = '';
          input.disabled = false;
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Unlock';
        }
        if (errorBanner) {
          errorBanner.style.display = 'none';
          errorBanner.className = 'auth-error-banner';
        }
        if (overlay) {
          overlay.style.display = 'flex';
        }
        showToast('Logged out');
    }

    let lockoutTimer = null;
    function startLockoutCountdown(remainingSeconds) {
      if (lockoutTimer) clearInterval(lockoutTimer);
      const errorBanner = document.getElementById('authErrorMsg');
      const input = document.getElementById('authKeyInput');
      const submitBtn = document.getElementById('authSubmitBtn');

      if (input) input.disabled = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Locked Out';
      }

      let sec = Math.max(1, Number(remainingSeconds) || 900);

      function update() {
        if (sec <= 0) {
          clearInterval(lockoutTimer);
          lockoutTimer = null;
          if (errorBanner) {
            errorBanner.className = 'auth-error-banner';
            errorBanner.style.display = 'none';
          }
          if (input) {
            input.disabled = false;
            input.value = '';
            input.focus();
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Unlock';
          }
          return;
        }

        const m = Math.floor(sec / 60);
        const s = sec % 60;
        const timeStr = m > 0 ? (m + 'm\u00A0' + (s < 10 ? '0' : '') + s + 's') : (s + 's');

        if (errorBanner) {
          errorBanner.innerHTML = '<div>🚫 <strong>Too many failed attempts!</strong></div><div style="margin-top: 0.3rem; line-height: 1.4;">Your IP is locked out.<br>Please try again in <strong style="white-space: nowrap; font-variant-numeric: tabular-nums; display: inline-block; color: #fecaca;">' + timeStr + '</strong>.</div>';
          errorBanner.className = 'auth-error-banner lockout show';
          errorBanner.style.display = 'block';
        }
        sec--;
      }

      update();
      lockoutTimer = setInterval(update, 1000);
    }

    async function handleLogin(e) {
      if (e) e.preventDefault();
      const input = document.getElementById('authKeyInput');
      const submitBtn = document.getElementById('authSubmitBtn');
      const errorBanner = document.getElementById('authErrorMsg');
      const key = input ? input.value.trim() : '';

      if (!key) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
      }
      if (errorBanner) {
        errorBanner.className = 'auth-error-banner';
        errorBanner.style.display = 'none';
      }

      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
          },
          body: JSON.stringify({ token: key })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          if (lockoutTimer) {
            clearInterval(lockoutTimer);
            lockoutTimer = null;
          }
          setAuthToken(key);

          try {
            const formData = new URLSearchParams();
            formData.append('_username', 'wallaflare');
            formData.append('_password', key);
            await fetch('/login_check', {
              method: 'POST',
              body: formData,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              credentials: 'include'
            });
          } catch {}

          if (window.location.pathname === '/login') {
            history.replaceState(null, '', '/');
          }

          const overlay = document.getElementById('authOverlay');
          if (overlay) overlay.style.display = 'none';
          showToast('Unlocked successfully');
          loadArticles();
          return;
        }

        if (res.status === 429 || data.locked) {
          const secs = data.remaining_seconds || (data.remaining_minutes ? data.remaining_minutes * 60 : 900);
          startLockoutCountdown(secs);
          return;
        }

        const left = typeof data.attempts_left === 'number' ? data.attempts_left : 4;
        if (errorBanner) {
          errorBanner.innerHTML = '⚠️ <strong>Incorrect password!</strong><br>' + left + ' attempt' + (left === 1 ? '' : 's') + ' remaining before a 15-minute lockout.';
          errorBanner.className = 'auth-error-banner show';
          errorBanner.style.display = 'block';
        }
        if (input) {
          input.select();
          input.focus();
        }
      } catch (err) {
        if (errorBanner) {
          errorBanner.textContent = 'Connection error. Please try again.';
          errorBanner.className = 'auth-error-banner show';
          errorBanner.style.display = 'block';
        }
      } finally {
        if (input && !input.disabled && submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Unlock';
        }
      }
    }

    // Keyboard shortcut '/' to search & Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
      }
      if (e.key === 'Escape') {
        // 1. Highest priority: Confirmation Dialog (Log out, Delete, Re-fetch, etc.)
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal && confirmModal.classList.contains('open')) {
          e.preventDefault();
          handleConfirmModalCancel();
          return;
        }

        // 2. Open Menus and Drawers
        const openCardMenu = document.querySelector('.card-dropdown-menu.open');
        if (openCardMenu) {
          e.preventDefault();
          closeAllCardMenus();
          return;
        }
        const mobileNav = document.getElementById('mobileNavDropdown');
        if (mobileNav && mobileNav.classList.contains('open')) {
          e.preventDefault();
          closeMobileNavMenu();
          return;
        }
        const readerSidebar = document.getElementById('readerSidebar');
        if (readerSidebar && readerSidebar.classList.contains('drawer-open')) {
          e.preventDefault();
          closeMobileReaderDrawer();
          return;
        }

        // 3. Open Dialogs & Modals (Close modal while keeping selection / reader intact)
        const tagModal = document.getElementById('tagModal');
        if (tagModal && tagModal.classList.contains('open')) {
          e.preventDefault();
          closeTagModal();
          return;
        }
        const globalTagModal = document.getElementById('globalTagModal');
        if (globalTagModal && globalTagModal.classList.contains('open')) {
          e.preventDefault();
          closeGlobalTagModal();
          return;
        }
        const editTitleModal = document.getElementById('editTitleModal');
        if (editTitleModal && editTitleModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('editTitleModal');
          return;
        }
        const addUrlModal = document.getElementById('addUrlModal');
        if (addUrlModal && addUrlModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('addUrlModal');
          return;
        }
        const addTextModal = document.getElementById('addTextModal');
        if (addTextModal && addTextModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('addTextModal');
          return;
        }
        const syncModal = document.getElementById('syncModal');
        if (syncModal && syncModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('syncModal');
          return;
        }
        const serverConnectModal = document.getElementById('serverConnectModal');
        if (serverConnectModal && serverConnectModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('serverConnectModal');
          return;
        }

        // 4. Reader View (Back to Dashboard)
        if (activeArticleId) {
          e.preventDefault();
          handleReaderBack();
          return;
        }

        // 5. Selection Mode (Clear Selection)
        if (isSelectionMode()) {
          e.preventDefault();
          clearArticleSelection();
          return;
        }
      }

      // Desktop Delete / Backspace key shortcut to delete selected article(s)
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA' &&
          !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open, .confirm-modal-backdrop.open');
        if (modalOpen) return;

        if (isSelectionMode() && selectedArticleIds.size > 0) {
          e.preventDefault();
          batchDeleteArticles();
        } else if (activeArticleId) {
          e.preventDefault();
          deleteEntryAction(activeArticleId);
        }
      }
    });

    // Browser History Popstate (Back/Forward navigation)
    window.addEventListener('popstate', (e) => {
      handleRouteState();
    });

    function handleRouteState() {
      const path = window.location.pathname;
      let readId = null;
      if (path.startsWith('/read/')) {
        readId = parseInt(path.slice(6), 10);
      } else if (path.startsWith('/view/')) {
        readId = parseInt(path.slice(6), 10);
      }
      if (readId && !isNaN(readId)) {
        openReader(readId, false);
        return;
      }

      if (path === '/starred') {
        setFilter('starred', false);
      } else if (path === '/archive') {
        setFilter('archive', false);
      } else if (path === '/all') {
        setFilter('all', false);
      } else {
        setFilter('unread', false);
      }

      closeReader(false);
    }

    function navigateTo(path) {
      history.pushState({}, '', path);
      handleRouteState();
    }

    function renderFromInstantLocalCache() {
      try {
        const fast = localStorage.getItem('wf_cached_articles');
        if (fast) {
          const parsed = JSON.parse(fast);
          if (Array.isArray(parsed) && parsed.length > 0 && allEntries.length === 0) {
            allEntries = parsed;
            updateCounts();
            filterArticles();
            const status = document.getElementById('statusIndicator');
            if (status && (selectedTagFilter || (document.getElementById('searchInput') && document.getElementById('searchInput').value.trim()))) status.textContent = allEntries.length + ' articles'; else if (status) status.textContent = '';
          }
        }
      } catch (err) {
        console.warn('Local cache read error', err);
      }
    }

    async function loadArticles(silent = false) {
      if (isCapacitorApp()) {
        const settingsBtn = document.getElementById('serverSettingsBtn');
        if (settingsBtn) settingsBtn.style.display = 'flex';

        if (!localStorage.getItem('wf_server_url')) {
          openServerConnectModal();
          return;
        }
      }

      // 1. Instant 0ms cache rendering
      renderFromInstantLocalCache();
      if (allEntries.length === 0) {
        const cached = await getArticlesFromOfflineDb();
        if (cached && cached.length > 0 && allEntries.length === 0) {
          allEntries = cached;
          updateCounts();
          filterArticles();
          const status = document.getElementById('statusIndicator');
          if (status && (selectedTagFilter || (document.getElementById('searchInput') && document.getElementById('searchInput').value.trim()))) status.textContent = allEntries.length + ' articles'; else if (status) status.textContent = '';
        }
      }

      if (!silent && allEntries.length === 0) {
        const status = document.getElementById('statusIndicator');
        if (status) status.textContent = 'Syncing...';
      }

      // 2. Background Revalidation from Server
      try {
        const res = await authFetch('/api/entries.json?perPage=100');
        if (res.status === 401) {
          document.getElementById('authOverlay').style.display = 'flex';
          document.getElementById('statusIndicator').textContent = 'Authentication required';
          return;
        }
        document.getElementById('authOverlay').style.display = 'none';
        isOfflineMode = false;
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        allEntries = data._embedded ? data._embedded.items : [];
        
        // Save to both instant synchronous cache and IndexedDB
        try { localStorage.setItem('wf_cached_articles', JSON.stringify(allEntries)); } catch {}
        saveArticlesToOfflineDb(allEntries);
        
        updateCounts();
        filterArticles();
        const status = document.getElementById('statusIndicator');
        if (status && (selectedTagFilter || (document.getElementById('searchInput') && document.getElementById('searchInput').value.trim()))) status.textContent = allEntries.length + ' articles'; else if (status) status.textContent = '';
        handleRouteState();
      } catch (err) {
        console.warn('Server sync error', err);
        if (allEntries.length === 0) {
          const cached = await getArticlesFromOfflineDb();
          if (cached && cached.length > 0) {
            allEntries = cached;
            updateCounts();
            filterArticles();
          }
        }
        handleConnectionFailure(silent);
      } finally {
        hidePullToRefreshSpinner();
      }
    }

        // -------------------------------------------------------------
    // Multi-Selection State & Batch Actions
    // -------------------------------------------------------------
    const selectedArticleIds = new Set();
    let justTriggeredLongPress = false;

    function isSelectionMode() {
      return selectedArticleIds.size > 0;
    }

    function updateSelectionModeUI() {
      const isSel = selectedArticleIds.size > 0;
      document.body.classList.toggle('selection-mode-active', isSel);

      const navHeader = document.getElementById('standardNavHeader');
      const batchHeader = document.getElementById('batchActionHeader');
      const countEl = document.getElementById('batchSelectedCount');
      const selectAllBtn = document.getElementById('batchSelectAllBtn');

      if (isSel) {
        if (navHeader) navHeader.style.display = 'none';
        if (batchHeader) batchHeader.style.display = 'flex';
        if (countEl) countEl.textContent = selectedArticleIds.size + ' selected';

        // Update select all button text
        const currentArticles = getCurrentlyFilteredEntries();
        if (selectAllBtn) {
          const allSelected = currentArticles.length > 0 && currentArticles.every(e => selectedArticleIds.has(e.id));
          selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
        }
      } else {
        if (navHeader) navHeader.style.display = 'flex';
        if (batchHeader) batchHeader.style.display = 'none';
      }

      // Update card visual checkmarks and borders
      document.querySelectorAll('.article-card').forEach(card => {
        const id = parseInt(card.dataset.id, 10);
        const isChecked = selectedArticleIds.has(id);
        card.classList.toggle('is-selected', isChecked);
        const checkEl = card.querySelector('.card-checkbox');
        if (checkEl) checkEl.classList.toggle('checked', isChecked);
      });
    }

    function toggleArticleSelection(id, forceSelect = false) {
      if (forceSelect) {
        selectedArticleIds.add(id);
      } else if (selectedArticleIds.has(id)) {
        selectedArticleIds.delete(id);
      } else {
        selectedArticleIds.add(id);
      }
      updateSelectionModeUI();
    }

    
    function toggleBatchMenu() {
      const menu = document.getElementById('batchDropdownMenu');
      if (menu) {
        const isOpen = menu.classList.contains('open');
        closeAllCardMenus();
        if (!isOpen) {
          menu.classList.add('open');
          const editBtn = document.getElementById('batchEditTitleBtn');
          if (editBtn) {
            editBtn.style.display = selectedArticleIds.size === 1 ? 'flex' : 'none';
          }
          const downloadBtn = document.getElementById('batchDownloadEpubBtn');
          if (downloadBtn) {
            downloadBtn.style.display = selectedArticleIds.size === 1 ? 'flex' : 'none';
          }
          const selectAllLabel = document.getElementById('batchMenuSelectAllLabel');
          const current = getCurrentlyFilteredEntries();
          const allSelected = current.length > 0 && current.every(e => selectedArticleIds.has(e.id));
          if (selectAllLabel) {
            selectAllLabel.textContent = allSelected ? 'Deselect All' : 'Select All';
          }
        }
      }
    }

    function closeBatchMenu() {
      const menu = document.getElementById('batchDropdownMenu');
      if (menu) menu.classList.remove('open');
    }

    function batchEditTitle() {
      if (selectedArticleIds.size !== 1) return;
      const id = Array.from(selectedArticleIds)[0];
      openEditTitleModal(id);
      clearArticleSelection();
    }

    function batchDownloadEpub() {
      if (selectedArticleIds.size !== 1) return;
      const id = Array.from(selectedArticleIds)[0];
      downloadEpub(id);
      clearArticleSelection();
    }

    async function batchRefetchContent() {
      if (selectedArticleIds.size === 0) return;
      const ids = Array.from(selectedArticleIds);
      const urlItems = ids.map(id => allEntries.find(e => e.id === id)).filter(it => it && it.url && it.domain_name !== 'direct-input');
      if (urlItems.length === 0) {
        showToast('Selected articles are custom text or have no original URL');
        return;
      }

      const ok = await showConfirmDialog(
        'Re-fetch Selected Articles',
        'Re-fetch ' + urlItems.length + ' selected article(s) from their original source URLs?\\n\\nThis will download the latest content and preview images from the live sites.',
        'Re-fetch (' + urlItems.length + ')',
        false
      );
      if (!ok) return;

      showToast('Re-fetching ' + urlItems.length + ' article(s)...');
      for (const item of urlItems) {
        await refetchArticleContent(item.id, true);
      }
      clearArticleSelection();
    }

    function clearArticleSelection() {
      selectedArticleIds.clear();
      updateSelectionModeUI();
    }

    function getCurrentlyFilteredEntries() {
      const search = (document.getElementById('searchInput') ? document.getElementById('searchInput').value : '').trim().toLowerCase();
      let filtered = allEntries;

      if (currentFilter === 'unread') {
        filtered = filtered.filter(e => !e.is_archived);
      } else if (currentFilter === 'starred') {
        filtered = filtered.filter(e => e.is_starred);
      } else if (currentFilter === 'archive') {
        filtered = filtered.filter(e => e.is_archived);
      }

      if (selectedTagFilter) {
        const filterLower = selectedTagFilter.toLowerCase().trim();
        filtered = filtered.filter(e => {
          const tags = Array.isArray(e.tags) ? e.tags : [];
          return tags.some(t => 
            (t.slug && t.slug.toLowerCase() === filterLower) || 
            (t.label && t.label.toLowerCase() === filterLower)
          );
        });
      }

      if (search) {
        filtered = filtered.filter(e =>
          (e.title && e.title.toLowerCase().includes(search)) ||
          (e.domain_name && e.domain_name.toLowerCase().includes(search)) ||
          (e.text && e.text.toLowerCase().includes(search))
        );
      }
      return filtered;
    }

    function toggleSelectAllArticles() {
      const current = getCurrentlyFilteredEntries();
      const allSelected = current.length > 0 && current.every(e => selectedArticleIds.has(e.id));
      if (allSelected) {
        clearArticleSelection();
      } else {
        current.forEach(e => selectedArticleIds.add(e.id));
        updateSelectionModeUI();
      }
    }

    async function batchToggleStar() {
      if (selectedArticleIds.size === 0) return;
      const ids = Array.from(selectedArticleIds);
      const allStarred = ids.every(id => {
        const item = allEntries.find(e => e.id === id);
        return item && item.is_starred;
      });
      const newStarState = !allStarred;

      showToast((newStarState ? 'Starring ' : 'Unstarring ') + ids.length + ' articles...');
      ids.forEach(id => {
        const item = allEntries.find(e => e.id === id);
        if (item) item.is_starred = newStarState ? 1 : 0;
      });
      syncLocalEntriesCache(allEntries);
      updateCounts();
      filterArticles();
      clearArticleSelection();

      // Single Atomic Batch HTTP Request
      authFetch('/api/entries/list.json', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, starred: newStarState ? 1 : 0 })
      }).then(() => {
        showToast((newStarState ? 'Starred ' : 'Unstarred ') + ids.length + ' articles');
      }).catch(err => {
        console.error('Batch star error', err);
        showToast('Failed to update articles on server');
      });
    }

    async function batchToggleArchive() {
      if (selectedArticleIds.size === 0) return;
      const ids = Array.from(selectedArticleIds);
      const allArchived = ids.every(id => {
        const item = allEntries.find(e => e.id === id);
        return item && item.is_archived;
      });
      const newArchiveState = !allArchived;

      showToast((newArchiveState ? 'Archiving ' : 'Restoring ') + ids.length + ' articles...');
      ids.forEach(id => {
        const item = allEntries.find(e => e.id === id);
        if (item) item.is_archived = newArchiveState ? 1 : 0;
      });
      syncLocalEntriesCache(allEntries);
      updateCounts();
      filterArticles();
      clearArticleSelection();

      // Single Atomic Batch HTTP Request
      authFetch('/api/entries/list.json', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, archive: newArchiveState ? 1 : 0 })
      }).then(() => {
        showToast((newArchiveState ? 'Archived ' : 'Restored ') + ids.length + ' articles');
      }).catch(err => {
        console.error('Batch archive error', err);
        showToast('Failed to update articles on server');
      });
    }

    async function batchDeleteArticles() {
      if (selectedArticleIds.size === 0) return;
      const ids = Array.from(selectedArticleIds);
      const ok = await showConfirmDialog('Delete Articles', 'Are you sure you want to permanently delete ' + ids.length + ' selected article(s)?', 'Delete (' + ids.length + ')', true);
      if (!ok) return;

      showToast('Deleting ' + ids.length + ' articles...');
      allEntries = allEntries.filter(e => !ids.includes(e.id));
      syncLocalEntriesCache(allEntries);
      updateCounts();
      filterArticles();
      clearArticleSelection();

      // Single Atomic Batch Delete Request
      authFetch('/api/entries/list.json', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      }).then(() => {
        showToast('Deleted ' + ids.length + ' articles');
      }).catch(err => {
        console.error('Batch delete error', err);
        showToast('Failed to delete articles on server');
      });
    }

    function batchManageTags() {
      if (selectedArticleIds.size === 0) return;
      openTagModal(selectedArticleIds);
    }

    function handleCardClick(e, id) {
      if (justTriggeredLongPress) return;
      // If clicked on interactive sub-elements (links, dropdown menu, buttons)
      if (e.target.closest('button, a, .card-dropdown-menu, .card-select-wrap')) return;

      // Ctrl+Click / Cmd+Click / Shift+Click on desktop immediately enters/toggles selection mode
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        e.preventDefault();
        toggleArticleSelection(id);
        return;
      }

      if (isSelectionMode()) {
        toggleArticleSelection(id);
      } else {
        openReader(id);
      }
    }

    function updateCounts() {
      const unread = allEntries.filter(e => !e.is_archived).length;
      const starred = allEntries.filter(e => e.is_starred).length;
      const archive = allEntries.filter(e => e.is_archived).length;
      const total = allEntries.length;

      document.getElementById('countUnread').textContent = unread;
      document.getElementById('countStarred').textContent = starred;
      document.getElementById('countArchive').textContent = archive;
      document.getElementById('countAll').textContent = total;
    }

    function setFilter(filter, updateHistory = true) {
      currentFilter = filter;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById('tab' + filter.charAt(0).toUpperCase() + filter.slice(1));
      if (activeBtn) activeBtn.classList.add('active');
      filterArticles();

      if (updateHistory) {
        const newPath = filter === 'unread' ? '/' : ('/' + filter);
        if (window.location.pathname !== newPath) {
          history.pushState({ filter }, '', newPath);
        }
      }
    }

    
    
    let cachedGlobalTags = [];
    try {
      const savedTags = localStorage.getItem('wf_cached_tags');
      if (savedTags) cachedGlobalTags = JSON.parse(savedTags);
    } catch (e) {}

    let selectedTagFilter = null;
    let activeTagModalIds = [];

    function getEffectiveGlobalTags() {
      const map = new Map();
      (cachedGlobalTags || []).forEach(t => {
        const key = (t.label || t.slug || '').toLowerCase().trim();
        if (key) map.set(key, t);
      });
      // Merge with tags from currently loaded articles
      (allEntries || []).forEach(entry => {
        (entry.tags || []).forEach(t => {
          const key = (t.label || t.slug || '').toLowerCase().trim();
          if (key && !map.has(key)) {
            map.set(key, { id: t.id || Date.now(), label: t.label, slug: t.slug || key, entry_count: 1 });
          }
        });
      });
      return Array.from(map.values());
    }

    async function loadGlobalTags() {
      try {
        const res = await authFetch('/api/tags.json?_t=' + Date.now(), { cache: 'no-cache' });
        if (res.ok) {
          cachedGlobalTags = await res.json();
          try {
            localStorage.setItem('wf_cached_tags', JSON.stringify(cachedGlobalTags));
          } catch (e) {}
        }
      } catch (e) {
        console.error('Failed to load tags', e);
      }
      return cachedGlobalTags;
    }

    function filterByTag(slug) {
      if (selectedTagFilter === slug) {
        selectedTagFilter = null;
      } else {
        selectedTagFilter = slug;
      }
      filterArticles();
    }

    function openTagModal(target) {
      if (typeof target === 'number') {
        activeTagModalIds = [target];
      } else if (Array.isArray(target)) {
        activeTagModalIds = [...target];
      } else if (target instanceof Set) {
        activeTagModalIds = Array.from(target);
      } else if (selectedArticleIds.size > 0) {
        activeTagModalIds = Array.from(selectedArticleIds);
      } else if (activeArticleId) {
        activeTagModalIds = [activeArticleId];
      } else {
        return;
      }

      if (activeTagModalIds.length === 0) return;

      const headerTitle = document.getElementById('tagModalHeaderTitle');
      const articleTitle = document.getElementById('tagModalArticleTitle');

      if (activeTagModalIds.length === 1) {
        const item = allEntries.find(e => e.id === activeTagModalIds[0]);
        if (headerTitle) headerTitle.textContent = 'Manage Tags';
        if (articleTitle) articleTitle.textContent = item ? (item.title || 'Selected Article') : 'Selected Article';
      } else {
        if (headerTitle) headerTitle.textContent = 'Manage Tags (' + activeTagModalIds.length + ' articles)';
        if (articleTitle) articleTitle.textContent = activeTagModalIds.length + ' articles selected for batch tagging';
      }

      // Render instantly from local cache (0ms delay)
      renderTagModalUI();
      document.getElementById('tagModal').classList.add('open');
      setTimeout(() => document.getElementById('newTagInput').focus(), 50);

      // Silently refresh global tags in the background without blocking
      loadGlobalTags().then(() => renderTagModalUI()).catch(() => {});
    }

    function closeTagModal() {
      activeTagModalIds = [];
      document.getElementById('tagModal').classList.remove('open');
      document.getElementById('newTagInput').value = '';
    }

    function renderTagModalUI() {
      if (!activeTagModalIds || activeTagModalIds.length === 0) return;
      const currentContainer = document.getElementById('tagModalCurrentTags');
      const availableSection = document.getElementById('quickTagsSection');
      const availableContainer = document.getElementById('tagModalAvailableTags');

      const items = activeTagModalIds.map(id => allEntries.find(e => e.id === id)).filter(Boolean);
      if (items.length === 0) return;

      // Count tag occurrences across all selected items
      const tagStats = new Map(); // key: label.toLowerCase() -> { label, slug, count, tagIds: Map<entryId, tagId> }

      items.forEach(item => {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        tags.forEach(t => {
          const key = (t.label || t.slug || '').toLowerCase().trim();
          if (!key) return;
          if (!tagStats.has(key)) {
            tagStats.set(key, { label: t.label, slug: t.slug, count: 0, tagIdsByEntry: new Map() });
          }
          const stat = tagStats.get(key);
          stat.count++;
          stat.tagIdsByEntry.set(item.id, t.id);
        });
      });

      const totalItems = items.length;
      let tagsHtml = '';

      if (tagStats.size === 0) {
        tagsHtml = '<span style="font-size: 0.82rem; color: var(--text-muted);">' + 
          (totalItems === 1 ? 'No tags applied to this article.' : 'No tags applied to the selected articles.') + 
          '</span>';
      } else {
        const sortedTags = Array.from(tagStats.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

        tagsHtml = sortedTags.map(stat => {
          if (stat.count === totalItems) {
            // Applied to ALL selected articles
            return '<span class="tag-badge">' +
              '<span>#' + escapeHtml(stat.label) + '</span>' + 
              '<span class="tag-remove-btn" title="Remove tag" data-label="' + escapeHtml(stat.label) + '" onclick="event.stopPropagation(); removeTagFromSelected(this.dataset.label)">&times;</span>' +
            '</span>';
          } else {
            // Applied to SOME selected articles (partial) - Clicking anywhere applies to ALL
            return '<span class="tag-badge tag-badge-partial" title="Click to apply #' + escapeHtml(stat.label) + ' to all selected articles" data-label="' + escapeHtml(stat.label) + '" onclick="addTagToSelected(this.dataset.label)">' +
              '<span>#' + escapeHtml(stat.label) + ' <span style="font-size: 0.72rem; opacity: 0.8; font-weight: 600;">(' + stat.count + '/' + totalItems + ')</span></span>' +
              '<span class="tag-remove-btn" title="Remove from selected" data-label="' + escapeHtml(stat.label) + '" onclick="event.stopPropagation(); removeTagFromSelected(this.dataset.label)">&times;</span>' +
            '</span>';
          }
        }).join('');
      }

      currentContainer.innerHTML = tagsHtml;

      // Available library tags that are not already on ALL selected items
      const commonTagKeys = new Set();
      tagStats.forEach((stat, key) => {
        if (stat.count === totalItems) commonTagKeys.add(key);
      });

      const available = getEffectiveGlobalTags().filter(t => {
        const key = (t.label || t.slug || '').toLowerCase().trim();
        return key && !commonTagKeys.has(key);
      });

      if (available.length > 0) {
        availableSection.style.display = 'block';
        availableContainer.innerHTML = available.slice(0, 30).map(t => 
          '<span class="tag-badge" style="opacity: 0.85; border-style: dashed; cursor: pointer;" data-label="' + escapeHtml(t.label) + '" onclick="addTagToSelected(this.dataset.label)">+ #' + escapeHtml(t.label) + '</span>'
        ).join('');
      } else {
        availableSection.style.display = 'none';
      }
    }

    async function submitAddTag() {
      const input = document.getElementById('newTagInput');
      const val = input ? input.value.trim() : '';
      if (!val) return;
      await addTagToSelected(val);
      if (input) input.value = '';
    }

    async function addTagToSelected(tagString) {
      if (!activeTagModalIds || activeTagModalIds.length === 0) return;
      const rawTags = tagString.split(',').map(s => s.trim()).filter(Boolean);
      if (rawTags.length === 0) return;

      const items = activeTagModalIds.map(id => allEntries.find(e => e.id === id)).filter(Boolean);
      if (items.length === 0) return;

      // Instant local in-memory update (0ms UI latency)
      rawTags.forEach(tagName => {
        const cleanTag = tagName.replace(/^#/, '').trim();
        if (!cleanTag) return;
        items.forEach(item => {
          item.tags = item.tags || [];
          if (!item.tags.some(t => t.label.toLowerCase() === cleanTag.toLowerCase())) {
            item.tags.push({ id: Date.now() + Math.floor(Math.random() * 1000), label: cleanTag, slug: cleanTag.toLowerCase() });
          }
        });
      });

      syncLocalEntriesCache(allEntries);
      renderTagModalUI();
      renderArticles(getCurrentlyFilteredEntries());
      showToast('Tag(s) updated');

      // Atomic batch server sync
      authFetch('/api/entries/tags/lists.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: items.map(i => i.id), tags: rawTags.join(',') })
      }).catch(err => console.error('Batch tag sync error', err));
    }

    async function removeTagFromSelected(tagLabel) {
      if (!activeTagModalIds || activeTagModalIds.length === 0) return;
      const cleanLabel = tagLabel.toLowerCase().trim();
      const items = activeTagModalIds.map(id => allEntries.find(e => e.id === id)).filter(Boolean);
      if (items.length === 0) return;

      // Instant local in-memory update
      const deleteRequests = [];
      items.forEach(item => {
        if (!Array.isArray(item.tags)) return;
        const matchingTag = item.tags.find(t => (t.label || t.slug || '').toLowerCase().trim() === cleanLabel);
        if (matchingTag) {
          const tagId = matchingTag.id;
          item.tags = item.tags.filter(t => t !== matchingTag);
          deleteRequests.push({ entryId: item.id, tagId });
        }
      });

      syncLocalEntriesCache(allEntries);
      renderTagModalUI();
      renderArticles(getCurrentlyFilteredEntries());
      showToast('Tag #' + tagLabel + ' removed');

      // Parallel background server delete
      deleteRequests.forEach(({ entryId, tagId }) => {
        authFetch('/api/entries/' + entryId + '/tags/' + tagId + '.json', {
          method: 'DELETE'
        }).catch(err => console.error('Tag remove error', err));
      });
    }

    // -------------------------------------------------------------
    // Global Tag Management
    // -------------------------------------------------------------
    function filterByTagFromModal(slug) {
      closeGlobalTagModal();
      filterByTag(slug);
    }

    async function submitCreateGlobalTag() {
      const input = document.getElementById('newGlobalTagInput');
      const val = input ? input.value.trim() : '';
      if (!val) return;

      try {
        const res = await authFetch('/api/tags.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: val })
        });
        if (res.ok) {
          input.value = '';
          await loadGlobalTags();
          renderGlobalTagList();
          showToast('Tag #' + val + ' created');
        } else {
          showToast('Failed to create tag');
        }
      } catch (err) {
        showToast('Error creating tag: ' + err.message);
      }
    }

    function openGlobalTagManager() {
      clearActiveTextSelection();
      renderGlobalTagList();
      document.getElementById('globalTagModal').classList.add('open');
      setTimeout(() => document.getElementById('newGlobalTagInput')?.focus(), 50);
      loadGlobalTags().then(() => renderGlobalTagList()).catch(() => {});
    }

    function closeGlobalTagModal() {
      document.getElementById('globalTagModal').classList.remove('open');
    }

    function renderGlobalTagList() {
      const container = document.getElementById('globalTagListContainer');
      const countLabel = document.getElementById('globalTagCountLabel');
      const tags = getEffectiveGlobalTags();
      
      countLabel.textContent = tags.length + ' tags total';

      if (tags.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem 0;">No tags created yet.</div>';
        return;
      }

      container.innerHTML = tags.map(t => {
        const count = t.entry_count || 0;
        const countText = count === 1 ? '1 article' : count + ' articles';
        return '<div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: var(--bg-secondary); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">' +
          '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
            '<span class="tag-badge" style="cursor: pointer;" data-slug="' + escapeHtml(t.slug) + '" onclick="filterByTagFromModal(this.dataset.slug)" title="Filter articles by #' + escapeHtml(t.label) + '">#' + escapeHtml(t.label) + '</span>' +
            '<span style="font-size: 0.8rem; color: var(--text-muted);">' + countText + '</span>' +
          '</div>' +
          '<button class="action-btn btn-delete" title="Delete tag globally" data-id="' + t.id + '" data-label="' + escapeHtml(t.label) + '" data-count="' + count + '" onclick="deleteGlobalTagAction(Number(this.dataset.id), this.dataset.label, Number(this.dataset.count))">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
          '</button>' +
        '</div>';
      }).join('');
    }

    async function deleteGlobalTagAction(tagId, label, count) {
      const msg = count > 0 ? ('Are you sure you want to delete tag "#' + label + '"?\\n\\nIt is currently used on ' + count + ' article' + (count === 1 ? '' : 's') + '. Deleting it will untag them.') : ('Delete unused tag "#' + label + '"?');

      const ok = await showConfirmDialog('Delete Tag', msg, 'Delete Tag', true);
      if (!ok) return;

      const res = await authFetch('/api/tags/' + tagId + '.json', { method: 'DELETE' });
      if (res.ok) {
        // Remove tag from local entries
        for (const entry of allEntries) {
          if (entry.tags) {
            entry.tags = entry.tags.filter(t => t.id !== tagId);
          }
        }
        syncLocalEntriesCache(allEntries);
        await loadGlobalTags();
        renderGlobalTagList();
        renderArticles(allEntries);
        showToast('Tag #' + label + ' deleted');
      } else {
        showToast('Failed to delete tag');
      }
    }

    async function cleanupUnusedTags() {
      const unused = cachedGlobalTags.filter(t => !t.entry_count || t.entry_count === 0);
      if (unused.length === 0) {
        showToast('No unused tags found');
        return;
      }

      const ok = await showConfirmDialog('Clean Up Tags', 'Delete ' + unused.length + ' unused tag(s)?', 'Delete Tags', true);
      if (!ok) return;

      for (const t of unused) {
        await authFetch('/api/tags/' + t.id + '.json', { method: 'DELETE' });
      }

      await loadGlobalTags();
      renderGlobalTagList();
      showToast('Cleaned up unused tags');
    }


    
    let currentViewMode = localStorage.getItem('wf_view_mode') || 'list';
    let currentSortOrder = localStorage.getItem('wf_sort_order') || 'newest';
    setTimeout(() => { updateCycleLayoutIcon(); updateSortMenuUI(); }, 0);

    function cycleViewMode() {
      if (currentViewMode === 'list') {
        setViewMode('grid');
      } else if (currentViewMode === 'grid') {
        setViewMode('compact');
      } else {
        setViewMode('list');
      }
      const names = { 'list': 'List View', 'grid': 'Magazine Grid', 'compact': 'Compact Headlines' };
      showToast('View: ' + (names[currentViewMode] || currentViewMode));
    }

    function setViewMode(mode) {
      currentViewMode = mode;
      try { localStorage.setItem('wf_view_mode', mode); } catch (e) {}
      applyViewModeUI();
    updateSortMenuUI();
    }

    function applyViewModeUI() {
      const grid = document.getElementById('articlesGrid');
      if (grid) {
        grid.classList.remove('view-list', 'view-grid', 'view-compact');
        grid.classList.add('view-' + currentViewMode);
      }
      updateCycleLayoutIcon();
    }

    function updateCycleLayoutIcon() {
      const el = document.getElementById('cycleLayoutIcon');
      const btn = document.getElementById('cycleLayoutBtn');
      if (!el) return;
      if (currentViewMode === 'list') {
        el.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>';
        if (btn) btn.title = 'View: List (Click to cycle)';
      } else if (currentViewMode === 'grid') {
        el.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>';
        if (btn) btn.title = 'View: Magazine Grid (Click to cycle)';
      } else {
        el.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
        if (btn) btn.title = 'View: Compact Headlines (Click to cycle)';
      }
    }

    function toggleSortMenu() {
      const menu = document.getElementById('sortDropdownMenu');
      if (!menu) return;
      const isOpen = menu.classList.contains('open');
      closeAllCardMenus();
      if (!isOpen) {
        menu.classList.add('open');
        updateSortMenuUI();
      }
    }

    function closeSortMenu() {
      const menu = document.getElementById('sortDropdownMenu');
      if (menu) menu.classList.remove('open');
    }

    function updateSortMenuUI() {
      const map = {
        'newest': 'sortOptNewest',
        'oldest': 'sortOptOldest',
        'shortest': 'sortOptShortest',
        'longest': 'sortOptLongest',
        'title': 'sortOptTitle'
      };
      Object.keys(map).forEach(key => {
        const el = document.getElementById(map[key]);
        if (el) {
          el.classList.toggle('active', currentSortOrder === key);
        }
      });
      const sortBtn = document.getElementById('sortBtn');
      if (sortBtn) {
        sortBtn.classList.toggle('active', currentSortOrder !== 'newest');
      }
    }

    function setSortOrder(order) {
      currentSortOrder = order;
      try { localStorage.setItem('wf_sort_order', order); } catch (e) {}
      closeSortMenu();
      updateSortMenuUI();
      filterArticles();
      const names = {
        'newest': 'Newest First',
        'oldest': 'Oldest First',
        'shortest': 'Shortest Read',
        'longest': 'Longest Read',
        'title': 'Title (A-Z)'
      };
      showToast('Sorted: ' + (names[order] || order));
    }

    function sortEntries(entries) {
      if (!Array.isArray(entries)) return [];
      return entries.slice().sort((a, b) => {
        if (currentSortOrder === 'oldest') {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        } else if (currentSortOrder === 'shortest') {
          return (a.reading_time || 1) - (b.reading_time || 1);
        } else if (currentSortOrder === 'longest') {
          return (b.reading_time || 1) - (a.reading_time || 1);
        } else if (currentSortOrder === 'title') {
          return (a.title || '').localeCompare(b.title || '');
        } else {
          // newest
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
      });
    }

    function handleSearchInput() {
      const input = document.getElementById('searchInput');
      const clearBtn = document.getElementById('searchClearBtn');
      if (clearBtn) {
        clearBtn.style.display = (input && input.value.trim().length > 0) ? 'inline-flex' : 'none';
      }
      filterArticles();
    }

    function clearSearchInput() {
      const input = document.getElementById('searchInput');
      if (input) {
        input.value = '';
        input.focus();
      }
      const clearBtn = document.getElementById('searchClearBtn');
      if (clearBtn) clearBtn.style.display = 'none';
      filterArticles();
    }

    function filterArticles() {
      const banner = document.getElementById('activeTagFilterBanner');
      const activeTagName = document.getElementById('activeTagName');
      if (banner) {
        if (selectedTagFilter) {
          banner.style.display = 'flex';
          activeTagName.textContent = '#' + selectedTagFilter;
        } else {
          banner.style.display = 'none';
        }
      }
      const search = (document.getElementById('searchInput').value || '').toLowerCase();
      let filtered = allEntries;

      if (currentFilter === 'unread') {
        filtered = filtered.filter(e => !e.is_archived);
      } else if (currentFilter === 'starred') {
        filtered = filtered.filter(e => e.is_starred);
      } else if (currentFilter === 'archive') {
        filtered = filtered.filter(e => e.is_archived);
      }

      if (selectedTagFilter) {
        const filterLower = selectedTagFilter.toLowerCase().trim();
        filtered = filtered.filter(e => {
          const tags = Array.isArray(e.tags) ? e.tags : [];
          return tags.some(t => 
            (t.slug && t.slug.toLowerCase() === filterLower) || 
            (t.label && t.label.toLowerCase() === filterLower)
          );
        });
      }

      const status = document.getElementById('statusIndicator');
      if (search) {
        filtered = filtered.filter(e =>
          (e.title && e.title.toLowerCase().includes(search)) ||
          (e.domain_name && e.domain_name.toLowerCase().includes(search)) ||
          (e.text && e.text.toLowerCase().includes(search))
        );
        if (status) {
          status.textContent = filtered.length === 1 ? '1 match' : (filtered.length + ' matches');
        }
      } else if (selectedTagFilter) {
        if (status) {
          status.textContent = filtered.length === 1 ? '1 article' : (filtered.length + ' articles');
        }
      } else {
        if (status) {
          if (isOfflineMode || navigator.onLine === false) {
            status.textContent = allEntries.length > 0 ? (allEntries.length + ' saved (offline)') : 'Offline';
          } else if (status.textContent !== 'Syncing...') {
            status.textContent = '';
          }
        }
      }

      filtered = sortEntries(filtered);
      renderArticles(filtered);
    }

    function renderArticles(entries) {
      const grid = document.getElementById('articlesGrid');
      const empty = document.getElementById('emptyState');

      if (!entries || entries.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
      }

      empty.style.display = 'none';
      applyViewModeUI();
      grid.innerHTML = entries.map(item => {
        const domain = item.domain_name || 'direct-input';
        const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : '');
        const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : '';
        const date = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
        const rawContentText = item.text || item.excerpt || (item.content ? item.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "");
        const excerpt = rawContentText ? (rawContentText.length > 160 ? rawContentText.slice(0, 160) + "..." : rawContentText) : "No preview available";
        const previewPicture = item.preview_picture;

        const isChecked = selectedArticleIds.has(item.id);

        const selectCheckboxHtml = '<div class="card-select-wrap" onclick="event.stopPropagation(); toggleArticleSelection(' + item.id + ');">' +
          '<div class="card-checkbox ' + (isChecked ? 'checked' : '') + '">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
          '</div>' +
        '</div>';

        const imgHtml = previewPicture
          ? '<div class="card-image-wrap"><img src="' + escapeHtml(previewPicture) + '" alt="' + escapeHtml(item.title) + '" loading="lazy" class="card-image" onerror="this.parentElement.remove()" /></div>'
          : '';

        const starSvg = item.is_starred
          ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
          : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

        const authorMetaHtml = author ? ' &bull; <span class="card-author" style="color: var(--text-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">by ' + escapeHtml(author) + '</span>' : '';

        const tags = item.tags || [];
        const tagsHtml = tags.length > 0
          ? '<div class="card-tags">' + tags.map(t => '<span class="tag-badge" data-slug="' + escapeHtml(t.slug) + '" onclick="event.stopPropagation(); filterByTag(this.dataset.slug)">#' + escapeHtml(t.label) + '</span>').join('') + '</div>'
          : '';

        const isItemRtl = (item.language && ['he', 'iw', 'ar', 'fa', 'ur', 'yi'].includes(item.language.toLowerCase().split('-')[0])) || isRtlText(item.title + ' ' + (item.text || ''));
        const titleDir = isRtlText(item.title) ? 'rtl' : 'ltr';
        const excerptDir = isRtlText(excerpt) ? 'rtl' : 'ltr';
        
        // Smart reading time & progress calculation (Instapaper "xx of yy min left" style)
        const totalMin = item.reading_time || 1;
        const savedRatio = parseFloat(localStorage.getItem('wf_scroll_' + item.id) || '0');
        const progressPct = Math.round(savedRatio * 100);
        
        let readingProgressText = totalMin + ' min read';
        if (progressPct >= 95) {
          readingProgressText = 'Finished (' + totalMin + 'm)';
        } else if (progressPct > 0) {
          const minLeft = Math.max(1, Math.round(totalMin * (1 - savedRatio)));
          readingProgressText = minLeft + ' of ' + totalMin + ' min left (' + progressPct + '%)';
        }

        const progressBadgeHtml = '<span class="card-progress-center" title="Reading time & progress" style="font-size: 0.75rem; color: ' + (progressPct > 0 ? 'var(--accent)' : 'var(--text-muted)') + '; font-weight: 500; text-align: center; flex: 1; margin: 0 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + readingProgressText + '</span>';
        
        const progressLineHtml = progressPct > 0
          ? '<div style="position: absolute; top: 0; left: 0; right: 0; height: 2.5px; background: var(--border-color); overflow: hidden;"><div style="width: ' + progressPct + '%; height: 100%; background: var(--accent);"></div></div>'
          : '<div style="position: absolute; top: 0; left: 0; right: 0; height: 1px; background: var(--border-color);"></div>';

        return '<div class="article-card ' + (isChecked ? 'is-selected' : '') + '" id="entry-card-' + item.id + '" data-id="' + item.id + '"' + (isItemRtl ? ' dir="rtl"' : '') + ' onclick="handleCardClick(event, ' + item.id + ')">' +
          selectCheckboxHtml +
          '<div class="card-main-content">' +
            '<div class="card-text-column">' +
              '<div class="card-meta">' +
                (item.is_starred ? '<span class="card-star-pill" title="Starred Article"><svg width="12" height="12" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>' : '') +
                '<span class="card-domain">' + escapeHtml(domain) + '</span>' +
                authorMetaHtml +
              '</div>' +
              '<h2 class="card-title" dir="' + titleDir + '">' + escapeHtml(item.title) + '</h2>' +
              '<p class="card-excerpt" dir="' + excerptDir + '">' + escapeHtml(excerpt) + '</p>' +
              tagsHtml +
            '</div>' +
            imgHtml +
          '</div>' +
          '<div class="card-footer" style="margin-top: 0.75rem;">' +
            progressLineHtml +
            '<span class="card-date">' + date + '</span>' +
            progressBadgeHtml +
            '<div class="card-actions">' +
              '<button class="action-btn ' + (item.is_starred ? 'active-star' : '') + '" title="Star / Favorite" onclick="event.stopPropagation(); toggleStar(' + item.id + ', ' + item.is_starred + ')">' + starSvg + '</button>' +
              '<button class="action-btn ' + (item.is_archived ? 'active-archive' : '') + '" title="Toggle Archive" onclick="event.stopPropagation(); toggleArchive(' + item.id + ', ' + item.is_archived + ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></button>' +
              '<div class="card-menu-wrap">' +
                '<button class="action-btn card-more-btn" title="More Actions" onclick="event.stopPropagation(); toggleCardMenu(' + item.id + ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg></button>' +
                '<div class="card-dropdown-menu" id="card-menu-' + item.id + '" onclick="event.stopPropagation()">' +
                  '<button class="menu-item" onclick="closeAllCardMenus(); openEditTitleModal(' + item.id + ')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg><span>Edit Title</span></button>' +
                  '<button class="menu-item" onclick="closeAllCardMenus(); openTagModal(' + item.id + ')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg><span>Manage Tags</span></button>' +
                  '<div class="menu-item-expandable" id="card-export-wrap-' + item.id + '">' +
                    '<button class="menu-item menu-item-parent" onclick="event.stopPropagation(); toggleCardExportSubmenu(' + item.id + ')">' +
                      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' +
                      '<span>Export</span>' +
                      '<svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
                    '</button>' +
                    '<div class="menu-sub-items" id="card-export-sub-' + item.id + '">' +
                      '<button class="menu-item menu-sub-item" onclick="closeAllCardMenus(); downloadEpub(' + item.id + ')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>EPUB (.epub)</span></button>' +
                      '<button class="menu-item menu-sub-item" onclick="closeAllCardMenus(); exportMarkdown(' + item.id + ')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span>Markdown (.md)</span></button>' +
                      '<button class="menu-item menu-sub-item" onclick="closeAllCardMenus(); exportPdf(' + item.id + ')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg><span>PDF (.pdf)</span></button>' +
                    '</div>' +
                  '</div>' +
                  (item.url && item.domain_name !== 'direct-input' ? '<button class="menu-item" onclick="closeAllCardMenus(); refetchArticleContent(' + item.id + ')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg><span>Re-fetch Content</span></button>' : '') +
                  (item.url ? '<a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener" class="menu-item" onclick="closeAllCardMenus()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg><span>Open Original Link</span></a>' : '') +
                  '<div class="menu-divider"></div>' +
                  '<button class="menu-item menu-item-danger" onclick="closeAllCardMenus(); deleteEntryAction(' + item.id + ')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg><span>Delete Article</span></button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }


    // -------------------------------------------------------------
    // Export Handlers (EPUB, Markdown, PDF)
    // -------------------------------------------------------------
    function toggleReaderExportMenu(e) {
      if (e) e.stopPropagation();
      const sub = document.getElementById('readerExportSubMenu');
      const chevron = document.getElementById('readerExportChevron');
      if (sub) {
        sub.classList.toggle('open');
        if (chevron) {
          chevron.style.transform = sub.classList.contains('open') ? 'rotate(180deg)' : '';
        }
      }
    }

    function closeReaderExportMenu() {
      const sub = document.getElementById('readerExportSubMenu');
      const chevron = document.getElementById('readerExportChevron');
      if (sub) sub.classList.remove('open');
      if (chevron) chevron.style.transform = '';
    }

    function toggleCardExportSubmenu(id) {
      const wrap = document.getElementById('card-export-wrap-' + id);
      if (wrap) {
        wrap.classList.toggle('expanded');
      }
    }

    function toggleBatchExportSubmenu() {
      const wrap = document.getElementById('batchExportWrap');
      if (wrap) {
        wrap.classList.toggle('expanded');
      }
    }

    function exportActiveMarkdown() {
      if (activeArticleId) {
        exportMarkdown(activeArticleId);
      }
    }

    function exportActivePdf() {
      if (activeArticleId) {
        exportPdf(activeArticleId);
      }
    }

    function batchExportMarkdown() {
      if (selectedArticleIds.size === 0) return;
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 1) {
        exportMarkdown(ids[0]);
      } else {
        ids.forEach(id => exportMarkdown(id));
      }
    }

    function batchExportPdf() {
      if (selectedArticleIds.size === 0) return;
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 1) {
        exportPdf(ids[0]);
      } else {
        ids.forEach(id => exportPdf(id));
      }
    }

    function htmlToMarkdown(html) {
      if (!html) return '';
      const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
      const root = doc.body.firstElementChild || doc.body;
      const nl = String.fromCharCode(10);
      const nl2 = nl + nl;
      const tick = String.fromCharCode(96);
      const fence = tick + tick + tick;

      function nodeToMd(node) {
        if (!node) return '';
        if (node.nodeType === 3) {
          return node.nodeValue.replace(/\s+/g, ' ');
        }
        if (node.nodeType !== 1) return '';

        const tag = node.tagName.toLowerCase();
        let inner = Array.from(node.childNodes).map(nodeToMd).join('');

        switch (tag) {
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
            return nl2 + Array.from(node.children).map(li => '- ' + nodeToMd(li).trim()).join(nl) + nl2;
          case 'ol':
            return nl2 + Array.from(node.children).map((li, idx) => (idx + 1) + '. ' + nodeToMd(li).trim()).join(nl) + nl2;
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

    async function exportMarkdown(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) {
        showToast('Article not found');
        return;
      }
      showToast('Exporting Markdown...');
      try {
        const title = item.title || 'Untitled Article';
        const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : '');
        const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : (item.domain_name || '');
        const date = item.published_at || item.created_at || new Date().toISOString().split('T')[0];
        const tags = Array.isArray(item.tags) ? item.tags.map(t => typeof t === 'string' ? t : (t.label || t.slug)).filter(Boolean) : [];
        const nl = String.fromCharCode(10);
        const nl2 = nl + nl;

        let frontmatter = '---' + nl;
        frontmatter += 'title: ' + JSON.stringify(title) + nl;
        if (author) frontmatter += 'author: ' + JSON.stringify(author) + nl;
        if (item.url) frontmatter += 'source: ' + JSON.stringify(item.url) + nl;
        if (date) frontmatter += 'date: ' + JSON.stringify(date) + nl;
        if (tags.length > 0) frontmatter += 'tags: [' + tags.map(t => JSON.stringify(t)).join(', ') + ']' + nl;
        frontmatter += '---' + nl2;

        const bodyMd = htmlToMarkdown(item.content || item.text || '');
        const fullMd = frontmatter + '# ' + title + nl2 + bodyMd + nl;
        const filename = title.replace(/[/\:*?"<>|]/g, '').trim() + '.md';

        // Android native share sheet (JavascriptInterface bridge)
        if (typeof window.AndroidNative !== 'undefined' && typeof window.AndroidNative.shareBase64File === 'function') {
          const base64Data = window.btoa(unescape(encodeURIComponent(fullMd)));
          window.AndroidNative.shareBase64File(filename, base64Data, 'text/markdown');
          showToast('Opening Markdown export...');
          return;
        }

        // Web Share API
        if (navigator.canShare) {
          try {
            const file = new File([fullMd], filename, { type: 'text/markdown' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: filename });
              showToast('✓ Markdown exported');
              return;
            }
          } catch (e) {
            if (e.name === 'AbortError') return;
          }
        }

        // Browser Anchor Download
        const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove(); }, 3000);
        showToast('✓ Markdown exported');
      } catch (err) {
        console.error('Markdown export error', err);
        showToast('Failed to export Markdown');
      }
    }

    async function exportPdf(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) {
        showToast('Article not found');
        return;
      }
      showToast('Generating PDF...');
      try {
        let pdfBytes = null;
        if (typeof window.WallaflarePdf !== 'undefined' && typeof window.WallaflarePdf.generatePdf === 'function') {
          pdfBytes = await window.WallaflarePdf.generatePdf(item);
        }

        if (!pdfBytes) {
          throw new Error('PDF engine not loaded');
        }

        const title = item.title || 'article';
        const filename = (title.replace(/[/\\:*?"<>|]/g, '').trim() || 'article') + '.pdf';
        const u8Array = new Uint8Array(pdfBytes);

        // Android Native Share Sheet (open in Adobe / Drive / Share)
        if (typeof window.AndroidNative !== 'undefined' && typeof window.AndroidNative.shareBase64File === 'function') {
          let binary = '';
          const len = u8Array.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(u8Array[i]);
          }
          const base64Data = window.btoa(binary);
          window.AndroidNative.shareBase64File(filename, base64Data, 'application/pdf');
          showToast('Opening PDF export...');
          return;
        }

        // Web Share API
        if (navigator.canShare) {
          try {
            const file = new File([u8Array], filename, { type: 'application/pdf' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: filename });
              showToast('✓ PDF exported');
              return;
            }
          } catch (e) {
            if (e.name === 'AbortError') return;
          }
        }

        // Desktop direct file download without print dialog
        const blob = new Blob([u8Array], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove(); }, 3000);
        showToast('✓ PDF exported');
      } catch (err) {
        console.error('PDF export failed', err);
        showToast('Failed to generate PDF');
      }
    }

    function downloadActiveEpub() {
      if (activeArticleId) {
        downloadEpub(activeArticleId);
      }
    }

    async function downloadEpub(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) {
        showToast('Article not found');
        return;
      }
      showToast('Exporting EPUB...');
      try {
        let blob = null;
        let filename = item && item.title ? (item.title.replace(/[/\\:*?"<>|]/g, '').trim() + '.epub') : 'article.epub';

        // 1. Instant on-device client generation (100% offline capable)
        if (typeof window.WallaflareEpub !== 'undefined' && typeof window.WallaflareEpub.generateEpub === 'function') {
          try {
            const u8 = await window.WallaflareEpub.generateEpub(item, window.location.origin, {
              downloadImages: navigator.onLine !== false
            });
            blob = new Blob([u8], { type: 'application/epub+zip' });
          } catch (clientErr) {
            console.warn('Client EPUB build failed, trying server fallback:', clientErr);
          }
        }

        // 2. Server fallback if needed
        if (!blob) {
          const res = await authFetch('/api/entries/' + id + '/export.epub');
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const disposition = res.headers.get('Content-Disposition');
          if (disposition && disposition.includes("filename*=")) {
            const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
            if (match) filename = decodeURIComponent(match[1]);
          } else if (disposition && disposition.includes("filename=")) {
            const match = disposition.match(/filename="?([^";]+)"?/i);
            if (match) filename = match[1];
          }
          blob = await res.blob();
        }

        // Android native share sheet (JavascriptInterface bridge)
        if (typeof window.AndroidNative !== 'undefined' && typeof window.AndroidNative.shareBase64File === 'function') {
          const reader = new FileReader();
          reader.onload = function() {
            try {
              const dataUrl = reader.result;
              const base64 = dataUrl.split(',')[1];
              window.AndroidNative.shareBase64File(filename, base64, 'application/epub+zip');
              showToast('Opening EPUB export...');
            } catch(e) {
              showToast('Share failed: ' + e.message);
            }
          };
          reader.onerror = function() { showToast('Failed to export EPUB file'); };
          reader.readAsDataURL(blob);
          return;
        }

        // Web Share API with file (PWA / desktop)
        if (navigator.canShare) {
          try {
            const file = new File([blob], filename, { type: 'application/epub+zip' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: filename });
              showToast('✓ EPUB exported');
              return;
            }
          } catch (e) {
            if (e.name === 'AbortError') return;
          }
        }

        // Fallback: browser anchor download
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove(); }, 3000);
        showToast('✓ EPUB exported');
      } catch (err) {
        showToast('Failed to export EPUB');
      }
    }

    async function toggleStar(id, current) {
      const next = current ? 0 : 1;
      const res = await authFetch('/api/entries/' + id + '.json', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: next })
      });
      if (res.ok) {
        const item = allEntries.find(e => e.id === id);
        if (item) item.is_starred = next;
        syncLocalEntriesCache(allEntries);
        updateCounts();
        filterArticles();
        showToast(next ? 'Starred article' : 'Unstarred article');
      }
    }

    async function toggleArchive(id, current) {
      const next = current ? 0 : 1;
      const res = await authFetch('/api/entries/' + id + '.json', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: next })
      });
      if (res.ok) {
        const item = allEntries.find(e => e.id === id);
        if (item) item.is_archived = next;
        syncLocalEntriesCache(allEntries);
        updateCounts();
        filterArticles();
        showToast(next ? 'Archived article' : 'Moved to unread');
      }
    }

    async function deleteEntryAction(id) {
      const ok = await showConfirmDialog('Delete Article', 'Are you sure you want to delete this article?\\n\\nThis action cannot be undone.', 'Delete Article', true);
      if (!ok) return;
      const res = await authFetch('/api/entries/' + id + '.json', { method: 'DELETE' });
      if (res.ok) {
        allEntries = allEntries.filter(e => e.id !== id);
        syncLocalEntriesCache(allEntries);
        updateCounts();
        filterArticles();
        showToast('Article deleted');
        if (activeArticleId === id) {
          handleReaderBack();
        }
      }
    }

    
    async function openReader(id, pushHistory = true) {
      let item = allEntries.find(e => e.id === id);

      if (!item || !item.content) {
        try {
          const res = await authFetch('/api/entries/' + id + '.json');
          if (res.ok) {
            const fetched = await res.json();
            const idx = allEntries.findIndex(e => e.id === id);
            if (idx >= 0) allEntries[idx] = fetched;
            else allEntries.unshift(fetched);
            item = fetched;
          }
        } catch (e) {
          console.error('Failed to load entry content', e);
        }
      }

      if (!item) return;

      activeArticleId = id;
      document.getElementById('readerTitle').textContent = item.title;
      const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : '');
      const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : '';
      let metaHtml = '<span>' + escapeHtml(item.domain_name || '') + '</span>';
      if (author) {
        metaHtml += ' &bull; <span style="font-weight: 500;">by ' + escapeHtml(author) + '</span>';
      }
      metaHtml += ' &bull; <span>' + (item.reading_time || 1) + ' min read</span>' +
        ' &bull; <span>' + (item.created_at ? new Date(item.created_at).toLocaleDateString() : '') + '</span>';
      if (item.url) {
        metaHtml += ' &bull; <a href="' + escapeHtml(item.url) + '" target="_blank" style="color: var(--accent);">Original Link</a>';
      }
      document.getElementById('readerMeta').innerHTML = metaHtml;
      const refetchBtn = document.getElementById('readerRefetchBtn');
      if (refetchBtn) {
        refetchBtn.style.display = (item.url && item.domain_name !== 'direct-input') ? 'flex' : 'none';
      }
      
      const coverWrap = document.getElementById('readerCoverWrap');
      if (item.preview_picture) {
        coverWrap.innerHTML = '<div class="reader-cover"><img src="' + escapeHtml(item.preview_picture) + '" alt="Cover" class="reader-cover-img" onerror="this.parentElement.remove()" /></div>';
      } else {
        coverWrap.innerHTML = '';
      }

      // Populate content cleanly with defense-in-depth sanitization
      const readerBodyEl = document.getElementById('readerBody');
      const rawContent = item.content || '<p>No content available.</p>';
      const cleanContent = (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) 
        ? DOMPurify.sanitize(rawContent, { ADD_ATTR: ['target', 'rel'] }) 
        : rawContent;
      readerBodyEl.innerHTML = cleanContent;

      // Update active reader star and archive buttons (Desktop & Mobile)
      const starBtn = document.getElementById('readerStarBtn');
      const starLabel = document.getElementById('readerStarLabel');
      const starIcon = document.getElementById('readerStarIcon');
      const mobileStarBtn = document.getElementById('readerMobileStarBtn');
      const mobileStarIcon = document.getElementById('readerMobileStarIcon');

      if (item.is_starred) {
        if (starBtn) starBtn.classList.add('active-star');
        if (starLabel) starLabel.textContent = 'Starred';
        if (starIcon) starIcon.setAttribute('fill', 'currentColor');
        if (mobileStarBtn) mobileStarBtn.classList.add('active-star');
        if (mobileStarIcon) mobileStarIcon.setAttribute('fill', 'currentColor');
      } else {
        if (starBtn) starBtn.classList.remove('active-star');
        if (starLabel) starLabel.textContent = 'Star';
        if (starIcon) starIcon.setAttribute('fill', 'none');
        if (mobileStarBtn) mobileStarBtn.classList.remove('active-star');
        if (mobileStarIcon) mobileStarIcon.setAttribute('fill', 'none');
      }

      const archiveBtn = document.getElementById('readerArchiveBtn');
      const archiveLabel = document.getElementById('readerArchiveLabel');
      const mobileArchiveBtn = document.getElementById('readerMobileArchiveBtn');

      if (item.is_archived) {
        if (archiveBtn) archiveBtn.classList.add('active-archive');
        if (archiveLabel) archiveLabel.textContent = 'Archived';
        if (mobileArchiveBtn) mobileArchiveBtn.classList.add('active-archive');
      } else {
        if (archiveBtn) archiveBtn.classList.remove('active-archive');
        if (archiveLabel) archiveLabel.textContent = 'Archive';
        if (mobileArchiveBtn) mobileArchiveBtn.classList.remove('active-archive');
      }

      // Force RTL / LTR layout and typography
      const isRtl = (item.language && ['he', 'iw', 'ar', 'fa', 'ur', 'yi'].includes(item.language.toLowerCase().split('-')[0])) || isRtlText(item.title + ' ' + (item.text || ''));
      const contentWrap = document.querySelector('.reader-content-wrap');
      const readerTitleEl = document.getElementById('readerTitle');
      const readerMetaEl = document.getElementById('readerMeta');

      if (isRtl) {
        if (contentWrap) contentWrap.classList.add('is-rtl');
        readerBodyEl.setAttribute('dir', 'rtl');
        readerTitleEl.setAttribute('dir', 'rtl');
        readerMetaEl.setAttribute('dir', 'rtl');
      } else {
        if (contentWrap) contentWrap.classList.remove('is-rtl');
        readerBodyEl.setAttribute('dir', 'ltr');
        readerTitleEl.setAttribute('dir', 'ltr');
        readerMetaEl.setAttribute('dir', 'ltr');
      }
      document.getElementById('readerView').classList.add('open');
      document.body.style.overflow = 'hidden';

      const scrollEl = document.getElementById('readerScrollContainer');
      lastReaderScrollTop = 0;
      clearTimeout(autoHideInitialTimer);
      closeReaderExportMenu();
      setReaderMobileBarVisibility(true);

      if (scrollEl) {
        const savedRatio = parseFloat(localStorage.getItem('wf_scroll_' + id) || '0');
        if (savedRatio > 0.005) {
          setTimeout(() => {
            const total = scrollEl.scrollHeight - scrollEl.clientHeight;
            if (total > 0) {
              scrollEl.scrollTop = savedRatio * total;
              lastReaderScrollTop = scrollEl.scrollTop;
            }
            updateReadingProgress();
          }, 70);
        } else {
          scrollEl.scrollTop = 0;
        }
      }
      updateReadingProgress();

      // Smoothly slide up the top bar and status bar after user sees the article open
      autoHideInitialTimer = setTimeout(() => {
        const readerView = document.getElementById('readerView');
        const drawer = document.getElementById('readerSidebar');
        if (readerView && readerView.classList.contains('open') && (!drawer || !drawer.classList.contains('drawer-open'))) {
          setReaderMobileBarVisibility(false);
        }
      }, 500);

      if (pushHistory) {
        history.pushState({ readerId: id }, '', '/read/' + id);
      }
    }

    
    function toggleMobileReaderDrawer(e) {
      if (e) e.stopPropagation();
      clearActiveTextSelection();
      const sidebar = document.getElementById('readerSidebar');
      const backdrop = document.getElementById('readerDrawerBackdrop');
      if (sidebar && backdrop) {
        sidebar.classList.toggle('drawer-open');
        backdrop.classList.toggle('open');
      }
    }

    // Close mobile drawer when tapping anywhere outside
    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('readerSidebar');
      if (sidebar && sidebar.classList.contains('drawer-open')) {
        const trigger = e.target.closest('#readerMobileDrawerBtn');
        const insideSidebar = e.target.closest('#readerSidebar');
        if (!trigger && !insideSidebar) {
          closeMobileReaderDrawer();
        }
      }
    });

    function closeMobileReaderDrawer() {
      const sidebar = document.getElementById('readerSidebar');
      const backdrop = document.getElementById('readerDrawerBackdrop');
      if (sidebar && backdrop) {
        sidebar.classList.remove('drawer-open');
        backdrop.classList.remove('open');
      }
    }

    async function deleteActiveArticle() {
      if (!activeArticleId) return;
      closeMobileReaderDrawer();
      await deleteEntryAction(activeArticleId);
    }

    async function toggleActiveStar() {
      if (!activeArticleId) return;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item) {
        await toggleStar(activeArticleId, item.is_starred);
        openReader(activeArticleId, false);
      }
    }

    async function toggleActiveArchive() {
      if (!activeArticleId) return;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item) {
        await toggleArchive(activeArticleId, item.is_archived);
        openReader(activeArticleId, false);
      }
    }


    function closeReader(updateHistory = true) {
      clearTimeout(autoHideInitialTimer);
      setReaderMobileBarVisibility(true);
      setStatusBarVisibility(true);
      closeMobileReaderDrawer();
      activeArticleId = null;
      document.getElementById('readerView').classList.remove('open');
      document.body.style.overflow = 'auto';
      document.getElementById('readingProgress').style.width = '0%';

      // Instantly update card progress indicators on the main list
      filterArticles();

      if (updateHistory) {
        const newPath = currentFilter === 'unread' ? '/' : ('/' + currentFilter);
        if (window.location.pathname !== newPath) {
          history.pushState({}, '', newPath);
        }
      }
    }

    
    let lastReaderScrollTop = 0;
    let autoHideInitialTimer = null;
    let scrollUpDistance = 0;

    function setStatusBarVisibility(visible) {
      try {
        if (window.Capacitor && window.Capacitor.isPluginAvailable('StatusBar')) {
          const StatusBar = window.Capacitor.Plugins.StatusBar;
          if (visible) {
            StatusBar.show({ animation: 'SLIDE' });
          } else {
            StatusBar.hide({ animation: 'SLIDE' });
          }
        }
      } catch (e) {}
    }

    function setReaderMobileBarVisibility(visible) {
      const bar = document.querySelector('.reader-mobile-bar');
      if (bar) {
        if (visible) {
          bar.classList.remove('bar-hidden');
        } else {
          bar.classList.add('bar-hidden');
        }
      }
      setStatusBarVisibility(visible);
    }

    function handleReaderScroll() {
      updateReadingProgress();
      const container = document.getElementById('readerScrollContainer');
      if (!container) return;
      const currentScrollTop = container.scrollTop;
      
      const drawer = document.getElementById('readerSidebar');
      if (drawer && drawer.classList.contains('drawer-open')) return;

      const delta = lastReaderScrollTop - currentScrollTop;

      if (currentScrollTop <= 35) {
        scrollUpDistance = 0;
        setReaderMobileBarVisibility(true);
      } else if (delta > 0) {
        // Scrolling UP - accumulate distance so even slow ~3 lines scroll triggers return
        scrollUpDistance += delta;
        if (scrollUpDistance >= 28) {
          clearTimeout(autoHideInitialTimer);
          setReaderMobileBarVisibility(true);
        }
      } else if (delta < 0) {
        // Scrolling DOWN
        scrollUpDistance = 0;
        if (currentScrollTop > 60 && Math.abs(delta) > 4) {
          clearTimeout(autoHideInitialTimer);
          setReaderMobileBarVisibility(false);
        }
      }
      lastReaderScrollTop = currentScrollTop;
    }

    function handleReaderBack() {
      if (window.history.length > 1) {
        history.back();
      } else {
        closeReader(true);
      }
    }

    function toggleReaderFont() {
      readerFontFamily = readerFontFamily === 'serif' ? 'sans' : 'serif';
      document.getElementById('readerBody').style.fontFamily = readerFontFamily === 'serif' ? 'var(--font-reader-serif)' : 'var(--font-reader-sans)';
    }

    function adjustFontSize(delta) {
      currentReaderFontSize = Math.max(14, Math.min(28, currentReaderFontSize + delta * 2));
      document.getElementById('readerBody').style.fontSize = currentReaderFontSize + 'px';
    }

    let scrollSaveTimer = null;
    function updateReadingProgress() {
      const container = document.getElementById('readerScrollContainer');
      if (!container) return;
      const total = container.scrollHeight - container.clientHeight;
      const progress = total > 0 ? Math.min(100, Math.max(0, (container.scrollTop / total) * 100)) : 0;
      document.getElementById('readingProgress').style.width = progress + '%';

      if (activeArticleId && total > 0) {
        clearTimeout(scrollSaveTimer);
        scrollSaveTimer = setTimeout(() => {
          const ratio = Math.min(1, Math.max(0, container.scrollTop / total));
          localStorage.setItem('wf_scroll_' + activeArticleId, ratio.toFixed(4));
        }, 120);
      }
    }

    async function handleIngestUrl(e) {
      e.preventDefault();
      const input = document.getElementById('urlInput');
      const btn = document.getElementById('ingestUrlBtn');
      const url = input.value.trim();
      if (!url) return;

      btn.disabled = true;
      btn.textContent = 'Extracting article...';

      try {
        const res = await authFetch('/api/entries.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const item = await res.json();
        closeModal('addUrlModal');
        input.value = '';

        if (item.already_exists) {
          const dateStr = item.added_date_str || (item.created_at ? new Date(item.created_at).toLocaleDateString() : '');
          showToast('Article already in library! Added on ' + dateStr, 4500);
          const card = document.getElementById('entry-card-' + item.id);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.boxShadow = '0 0 0 2px var(--accent)';
            setTimeout(() => card.style.boxShadow = '', 3500);
          }
        } else {
          allEntries.unshift(item);
          syncLocalEntriesCache(allEntries);
          updateCounts();
          filterArticles();
          showToast('✓ Article saved successfully!');
        }
      } catch (err) {
        showToast('Failed to ingest URL: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Fetch & Save';
      }
    }

    function renderAddTextTagChips() {
      const container = document.getElementById('addTextTagsContainer');
      const chipsContainer = document.getElementById('addTextAvailableTags');
      if (!container || !chipsContainer) return;

      if (!cachedGlobalTags || cachedGlobalTags.length === 0) {
        container.style.display = 'none';
        return;
      }

      const tagsInput = document.getElementById('textTags');
      const currentTags = (tagsInput ? tagsInput.value : '')
        .split(',')
        .map(s => s.trim().toLowerCase().replace(/^#/, ''))
        .filter(Boolean);

      container.style.display = 'block';
      chipsContainer.innerHTML = cachedGlobalTags.map(t => {
        const isSelected = currentTags.includes(t.label.toLowerCase()) || currentTags.includes(t.slug.toLowerCase());
        const activeStyle = isSelected 
          ? 'background: var(--accent); color: #fff; border-color: var(--accent); font-weight: 600;' 
          : 'cursor: pointer; opacity: 0.85;';
        return '<span class="tag-badge" style="cursor: pointer; ' + activeStyle + '" data-tag="' + escapeHtml(t.label) + '" onclick="toggleAddTextTag(this.dataset.tag)">' +
          (isSelected ? '✓ #' : '+ #') + escapeHtml(t.label) + '</span>';
      }).join('');
    }

    function toggleAddTextTag(tagLabel) {
      const input = document.getElementById('textTags');
      if (!input) return;

      let tags = input.value.split(',').map(s => s.trim()).filter(Boolean);
      const lower = tagLabel.toLowerCase();
      const existingIdx = tags.findIndex(t => t.toLowerCase().replace(/^#/, '') === lower);

      if (existingIdx >= 0) {
        tags.splice(existingIdx, 1);
      } else {
        tags.push(tagLabel);
      }

      input.value = tags.join(', ');
      renderAddTextTagChips();
    }

    function syncAddTextTagChips() {
      renderAddTextTagChips();
    }

    
    
    // Clicking on empty background outside of article cards, batch toolbar, modals, or navigation exits selection mode
    document.addEventListener("click", (e) => {
      if (!isSelectionMode()) return;
      if (justTriggeredLongPress) return;

      if (e.target.closest(".article-card, .batch-action-bar, .modal-backdrop, .tag-modal-overlay, .confirm-modal-backdrop, .navbar, .sidebar, .card-dropdown-menu, button, a, input, textarea")) {
        return;
      }

      clearArticleSelection();
    });

    document.addEventListener('click', () => closeAllCardMenus());

    function closeAllCardMenus() {
      closeBatchMenu();
      const backdrop = document.getElementById('cardMenuBackdrop');
      if (backdrop) backdrop.style.display = 'none';
      document.querySelectorAll('.article-card.menu-open').forEach(el => el.classList.remove('menu-open'));
      document.querySelectorAll('.menu-item-expandable.expanded').forEach(el => el.classList.remove('expanded'));
      document.querySelectorAll('.card-dropdown-menu.open').forEach(el => {
        el.classList.remove('open');
        el.classList.remove('open-down');
      });
    }

    function toggleCardMenu(id) {
      const menu = document.getElementById('card-menu-' + id);
      const card = document.getElementById('entry-card-' + id);
      if (!menu) return;
      const isOpen = menu.classList.contains('open');
      closeAllCardMenus();
      if (!isOpen) {
        menu.classList.remove('open-down');
        menu.classList.add('open');

        // Smart collision detection: check available space above vs below
        const btn = menu.previousElementSibling || menu.parentElement;
        if (btn) {
          const btnRect = btn.getBoundingClientRect();
          const menuHeight = menu.offsetHeight || 220;
          // If not enough headroom above (near top navbar), open downwards
          if (btnRect.top - menuHeight < 68) {
            menu.classList.add('open-down');
          }
        }

        if (card) card.classList.add('menu-open');
        const backdrop = document.getElementById('cardMenuBackdrop');
        if (backdrop) backdrop.style.display = 'block';
      }
    }

    
    function refetchActiveArticleContent() {
      if (activeArticleId) {
        refetchArticleContent(activeArticleId);
      }
    }

    async function refetchArticleContent(id, skipConfirm = false) {
      const item = allEntries.find(e => e.id === id);
      if (!item || !item.url || item.domain_name === 'direct-input') return;

      if (!skipConfirm) {
        const ok = await showConfirmDialog(
          'Re-fetch Article',
          'Re-fetch article from original source URL (' + (item.domain_name || item.url) + ')?\\n\\nThis will download the latest content and preview image from the live site.',
          'Re-fetch',
          false
        );
        if (!ok) return;
      }

      showToast('Re-fetching article from source...');
      try {
        const res = await authFetch('/api/entries/' + id + '/reload.json', {
          method: 'PATCH',
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || ('HTTP ' + res.status));
        }
        const updated = await res.json();
        
        const idx = allEntries.findIndex(e => e.id === id);
        if (idx >= 0) {
          allEntries[idx] = updated;
        }

        if (activeArticleId === id) {
          openReader(id, false);
        }

        filterArticles();
        showToast('✓ Article content re-fetched successfully!');
      } catch (err) {
        showToast('Failed to re-fetch: ' + err.message + ' (Original text preserved)');
      }
    }


    // -------------------------------------------------------------
    // Offline Cache (IndexedDB)
    // -------------------------------------------------------------
    const OFFLINE_DB_NAME = 'WallaflareOfflineDB';
    const OFFLINE_DB_VERSION = 1;
    const OFFLINE_STORE_NAME = 'articles';

    function openOfflineDb() {
      return new Promise((resolve) => {
        if (!window.indexedDB) return resolve(null);
        try {
          const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
              db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'id' });
            }
          };
          req.onsuccess = (e) => resolve(e.target.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    function syncLocalEntriesCache(entries) {
      try {
        localStorage.setItem('wf_cached_articles', JSON.stringify(entries || []));
      } catch (err) {
        console.warn('LocalStorage cache save error', err);
      }
      saveArticlesToOfflineDb(entries || []);
    }

    async function saveArticlesToOfflineDb(entries) {
      try {
        const db = await openOfflineDb();
        if (!db) return;
        const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(OFFLINE_STORE_NAME);
        store.clear();
        if (Array.isArray(entries)) {
          entries.forEach(entry => store.put(entry));
        }
      } catch (err) {
        console.warn('Offline cache save error', err);
      }
    }

    async function getArticlesFromOfflineDb() {
      try {
        const db = await openOfflineDb();
        if (!db) return [];
        return new Promise((resolve) => {
          const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
          const store = tx.objectStore(OFFLINE_STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch {
        return [];
      }
    }

    // -------------------------------------------------------------
    // Android Share Target Handler
    // -------------------------------------------------------------

    // -------------------------------------------------------------
    // Android Back Button Navigation & Drawer Handling
    // -------------------------------------------------------------
    window.handleAndroidBackButton = function() {
      // 1. If Reader Mobile Drawer is open, close it
      const readerSidebar = document.getElementById('readerSidebar');
      if (readerSidebar && readerSidebar.classList.contains('drawer-open')) {
        closeMobileReaderDrawer();
        return true;
      }

      // 2. If Reader View is open, close reader
      const readerView = document.getElementById('readerView');
      if (readerView && readerView.classList.contains('open')) {
        closeReader(true);
        return true;
      }

      // 3. If any modal is open, close it
      const openModal = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
      if (openModal) {
        openModal.classList.remove('open');
        return true;
      }

      // 4. If mobile nav drawer is open, close it
      const mobileNav = document.getElementById('mobileNavDropdown');
      if (mobileNav && mobileNav.classList.contains('open')) {
        closeMobileNavMenu();
        return true;
      }

      // 5. If card dropdown menu is open, close it
      const openCardMenu = document.querySelector('.card-dropdown-menu.open');
      if (openCardMenu) {
        closeAllCardMenus();
        return true;
      }

      return false;
    };

    window.handleAndroidSharedText = function(text) {
      if (!text) return;
      const urlMatch = text.match(new RegExp('https?://[^\\s]+'));
      const targetUrl = urlMatch ? urlMatch[0] : text.trim();
      
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        const input = document.getElementById('urlInput');
        if (input) input.value = targetUrl;
        openModal('addUrlModal');
        showToast('Shared URL received!');
      } else {
        const contentInput = document.getElementById('textContent');
        if (contentInput) contentInput.value = text;
        openModal('addTextModal');
        showToast('Shared text received!');
      }
    };

    function openServerConnectModal() {
      const urlInput = document.getElementById('serverUrlInput');
      const tokenInput = document.getElementById('serverTokenInput');
      if (urlInput) urlInput.value = localStorage.getItem('wf_server_url') || '';
      if (tokenInput) tokenInput.value = getAuthToken();
      openModal('serverConnectModal');
    }

    async function handleSaveServerConnection(e) {
      e.preventDefault();
      const urlInput = document.getElementById('serverUrlInput');
      const tokenInput = document.getElementById('serverTokenInput');
      const btn = document.getElementById('saveServerBtn');
      
      let serverUrl = urlInput.value.trim();
      if (serverUrl.endsWith('/')) {
        serverUrl = serverUrl.slice(0, -1);
      }
      const token = tokenInput ? tokenInput.value.trim() : '';
      if (!serverUrl) return;

      btn.disabled = true;
      btn.textContent = 'Connecting...';

      try {
        localStorage.setItem('wf_server_url', serverUrl);
        setAuthToken(token);
        if (window.AndroidNative && window.AndroidNative.saveServerConfig) {
          window.AndroidNative.saveServerConfig(serverUrl, token);
        }

        const res = await authFetch('/api/entries.json?perPage=1');
        if (!res.ok && res.status !== 401) {
          throw new Error('HTTP ' + res.status);
        }

        closeModal('serverConnectModal');
        showToast('✓ Connected to ' + serverUrl);
        loadArticles();
      } catch (err) {
        showToast('Connection failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Connect & Sync';
      }
    }

    function openEditTitleModal(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      document.getElementById('editTitleEntryId').value = String(id);
      const input = document.getElementById('editTitleInput');
      input.value = item.title;
      openModal('editTitleModal');
      setTimeout(() => {
        input.focus();
        input.select();
      }, 80);
    }

    async function handleSaveTitle(e) {
      e.preventDefault();
      const idStr = document.getElementById('editTitleEntryId').value;
      const input = document.getElementById('editTitleInput');
      const btn = document.getElementById('saveTitleBtn');
      const id = Number(idStr);
      const newTitle = input.value.trim();

      if (!id || !newTitle) return;

      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const res = await authFetch('/api/entries/' + id + '.json', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const updated = await res.json();
        
        // Update local article data
        const idx = allEntries.findIndex(e => e.id === id);
        if (idx >= 0) {
          allEntries[idx].title = updated.title || newTitle;
        }

        // Update reader header if currently open
        if (activeArticleId === id) {
          document.getElementById('readerTitle').textContent = updated.title || newTitle;
          document.title = (updated.title || newTitle) + ' - Wallaflare';
        }

        filterArticles();
        closeModal('editTitleModal');
        showToast('✓ Title updated successfully!');
      } catch (err) {
        showToast('Failed to update title: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Title';
      }
    }

    async function handleIngestText(e) {
      e.preventDefault();
      const titleInput = document.getElementById('textTitle');
      const authorInput = document.getElementById('textAuthor');
      const publishedAtInput = document.getElementById('textPublishedAt');
      const tagsInput = document.getElementById('textTags');
      const urlInput = document.getElementById('textUrl');
      const previewPictureInput = document.getElementById('textPreviewPicture');
      const contentInput = document.getElementById('textContent');
      const btn = document.getElementById('ingestTextBtn');

      const title = titleInput.value.trim();
      const content = contentInput.value.trim();
      const author = authorInput ? authorInput.value.trim() : '';
      const publishedAt = publishedAtInput && publishedAtInput.value ? publishedAtInput.value : '';
      const tags = tagsInput ? tagsInput.value.trim() : '';
      const url = urlInput ? urlInput.value.trim() : '';
      const previewPicture = previewPictureInput ? previewPictureInput.value.trim() : '';
      if (!title || !content) return;

      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const res = await authFetch('/api/entries.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            url: url || undefined,
            preview_picture: previewPicture || undefined,
            author: author || undefined,
            published_at: publishedAt ? new Date(publishedAt).toISOString() : undefined,
            tags: tags || undefined
          })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const item = await res.json();
        allEntries.unshift(item);
        syncLocalEntriesCache(allEntries);
        updateCounts();
        filterArticles();
        closeModal('addTextModal');
        titleInput.value = '';
        contentInput.value = '';
        if (authorInput) authorInput.value = '';
        if (publishedAtInput) publishedAtInput.value = '';
        if (tagsInput) tagsInput.value = '';
        if (urlInput) urlInput.value = '';
        if (previewPictureInput) previewPictureInput.value = '';
        showToast('✓ Custom entry saved successfully!');
      } catch (err) {
        showToast('Failed to save text entry: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Entry';
      }
    }

    function openModal(id) {
      
      clearActiveTextSelection();
      const modalEl = document.getElementById(id);
      if (modalEl) {
        modalEl.classList.add('open');
        if (id === 'addUrlModal') {
          setTimeout(() => {
            const input = document.getElementById('urlInput');
            if (input) {
              input.focus();
              input.select();
            }
          }, 60);
        } else if (id === 'addTextModal') {
          loadGlobalTags().then(() => renderAddTextTagChips());
          setTimeout(() => {
            document.getElementById('textTitle')?.focus();
          }, 60);
        }
      }
    }
    function closeModal(id) {
      document.getElementById(id).classList.remove('open');
    }

    let toastTimeout = null;
    function showToast(msg, duration = 3000) {
      const toast = document.getElementById('toast');
      const msgEl = document.getElementById('toastMsg');
      if (!toast || !msgEl) return;
      msgEl.textContent = msg;
      toast.classList.add('show');
      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }
      toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        toastTimeout = null;
      }, duration);
    }

    function toggleTheme() {
      const html = document.documentElement;
      if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        html.classList.add('light');
        localStorage.setItem('wf_theme', 'light');
      } else if (html.classList.contains('light')) {
        html.classList.remove('light');
        html.classList.add('sepia');
        localStorage.setItem('wf_theme', 'sepia');
      } else {
        html.classList.remove('sepia');
        html.classList.add('dark');
        localStorage.setItem('wf_theme', 'dark');
      }
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('wf_theme') || 'dark';
    document.documentElement.className = savedTheme;


    // -------------------------------------------------------------
    // Custom In-App Confirmation Dialog
    // -------------------------------------------------------------
    let confirmResolve = null;

    function showConfirmDialog(title, message, confirmBtnText = 'Confirm', isDanger = false) {
      return new Promise((resolve) => {
        confirmResolve = resolve;
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMsg').textContent = message;
        const btn = document.getElementById('confirmModalBtn');
        btn.textContent = confirmBtnText;
        btn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
        openModal('confirmModal');
      });
    }

    function handleConfirmModalOk() {
      closeModal('confirmModal');
      if (confirmResolve) {
        confirmResolve(true);
        confirmResolve = null;
      }
    }

    function handleConfirmModalCancel() {
      closeModal('confirmModal');
      if (confirmResolve) {
        confirmResolve(false);
        confirmResolve = null;
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }


    // -------------------------------------------------------------
    // Pull to Refresh Implementation (Smooth 1:1 Physics)
    // -------------------------------------------------------------
    let pullStartY = 0;
    let isPulling = false;
    let isRefreshing = false;
    const PULL_TRIGGER_PX = 50;

    function setupPullToRefresh() {
      window.addEventListener('touchstart', (e) => {
        const readerOpen = document.getElementById('readerView') && document.getElementById('readerView').classList.contains('open');
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (window.scrollY <= 1 && !readerOpen && !modalOpen && !isRefreshing) {
          pullStartY = e.touches[0].clientY;
          isPulling = true;
          const wrap = document.getElementById('pullToRefreshWrap');
          if (wrap) {
            wrap.style.transition = 'none';
          }
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (!isPulling || isRefreshing) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - pullStartY;
        if (diff > 0 && window.scrollY <= 1) {
          const pullDistance = Math.min(68, diff * 0.4);
          const wrap = document.getElementById('pullToRefreshWrap');
          const svg = document.getElementById('pullToRefreshSvg');
          if (wrap) {
            wrap.style.visibility = 'visible';
            wrap.style.transition = 'none';
            wrap.style.opacity = String(Math.min(1, pullDistance / 16));
            wrap.style.transform = 'translate(-50%, ' + pullDistance + 'px)';
          }
          if (svg) {
            svg.style.transform = 'rotate(' + (diff * 2.5) + 'deg)';
          }
        } else if (diff < 0) {
          isPulling = false;
          hidePullToRefreshSpinner();
        }
      }, { passive: true });

      const handleTouchEnd = async (e) => {
        if (!isPulling || isRefreshing) return;
        isPulling = false;
        const currentY = e.changedTouches ? e.changedTouches[0].clientY : 0;
        const diff = currentY - pullStartY;
        const effectivePull = diff * 0.4;

        const wrap = document.getElementById('pullToRefreshWrap');
        if (wrap) wrap.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';

        if (effectivePull >= PULL_TRIGGER_PX && window.scrollY <= 1) {
          isRefreshing = true;
          const svg = document.getElementById('pullToRefreshSvg');
          if (wrap) {
            wrap.style.visibility = 'visible';
            wrap.style.opacity = '1';
            wrap.style.transform = 'translate(-50%, 54px)';
          }
          if (svg) svg.classList.add('ptr-spinning');
          
          const minDelay = new Promise(r => setTimeout(r, 450));
          await Promise.all([loadArticles(false), minDelay]);
          hidePullToRefreshSpinner();
        } else {
          hidePullToRefreshSpinner();
        }
      };

      window.addEventListener('touchend', handleTouchEnd, { passive: true });
      window.addEventListener('touchcancel', () => hidePullToRefreshSpinner(), { passive: true });
    }

    function hidePullToRefreshSpinner() {
      isRefreshing = false;
      isPulling = false;
      const wrap = document.getElementById('pullToRefreshWrap');
      const svg = document.getElementById('pullToRefreshSvg');
      if (wrap) {
        wrap.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';
        wrap.style.opacity = '0';
        wrap.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => {
          if (!isRefreshing && !isPulling) {
            wrap.style.visibility = 'hidden';
          }
        }, 260);
      }
      if (svg) {
        svg.classList.remove('ptr-spinning');
        svg.style.transform = '';
      }
    }

    // -------------------------------------------------------------
    // Interactive 1:1 Finger Tracking Swipe-to-Close for Drawers
    // -------------------------------------------------------------
    function setupInteractiveDrawerTracking(drawerId, backdropId, closeFn, openClass) {
      const drawer = document.getElementById(drawerId);
      const backdrop = document.getElementById(backdropId);
      if (!drawer || !backdrop) return;

      let startX = 0;
      let startY = 0;
      let isDragging = false;
      let currentDiffX = 0;
      let startTime = 0;

      function onTouchStart(e) {
        if (!drawer.classList.contains(openClass)) return;
        clearActiveTextSelection();
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = false;
        currentDiffX = 0;
        startTime = Date.now();
      }

      function onTouchMove(e) {
        if (!drawer.classList.contains(openClass)) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX;
        const diffY = currentY - startY;

        // Detect horizontal dragging towards the left
        if (!isDragging) {
          if (diffX < -5 && Math.abs(diffX) > Math.abs(diffY)) {
            isDragging = true;
          }
        }

        if (isDragging) {
          currentDiffX = Math.min(0, diffX);
          drawer.style.setProperty('transition', 'none', 'important');
          backdrop.style.setProperty('transition', 'none', 'important');
          drawer.style.setProperty('transform', 'translateX(' + currentDiffX + 'px)', 'important');

          const width = drawer.offsetWidth || 260;
          const progress = Math.max(0, Math.min(1, 1 + currentDiffX / width));
          backdrop.style.setProperty('opacity', String(progress), 'important');
        }
      }

      function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;

        const width = drawer.offsetWidth || 260;
        const elapsed = Date.now() - startTime;
        const velocity = Math.abs(currentDiffX) / Math.max(1, elapsed);

        const shouldClose = currentDiffX < -(width * 0.25) || (currentDiffX < -20 && velocity > 0.3);

        drawer.style.setProperty('transition', 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)', 'important');
        backdrop.style.setProperty('transition', 'opacity 0.22s ease', 'important');

        if (shouldClose) {
          drawer.style.setProperty('transform', 'translateX(-100%)', 'important');
          backdrop.style.setProperty('opacity', '0', 'important');
          setTimeout(() => {
            closeFn();
            drawer.style.removeProperty('transform');
            drawer.style.removeProperty('transition');
            backdrop.style.removeProperty('opacity');
            backdrop.style.removeProperty('transition');
          }, 230);
        } else {
          drawer.style.setProperty('transform', 'translateX(0)', 'important');
          backdrop.style.setProperty('opacity', '1', 'important');
          setTimeout(() => {
            drawer.style.removeProperty('transform');
            drawer.style.removeProperty('transition');
            backdrop.style.removeProperty('opacity');
            backdrop.style.removeProperty('transition');
          }, 230);
        }
      }

      drawer.addEventListener('touchstart', onTouchStart, { passive: true });
      drawer.addEventListener('touchmove', onTouchMove, { passive: true });
      drawer.addEventListener('touchend', onTouchEnd, { passive: true });
      drawer.addEventListener('touchcancel', onTouchEnd, { passive: true });

      backdrop.addEventListener('touchstart', onTouchStart, { passive: true });
      backdrop.addEventListener('touchmove', onTouchMove, { passive: true });
      backdrop.addEventListener('touchend', onTouchEnd, { passive: true });
      backdrop.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }

    function setupDrawerSwipeHandlers() {
      // 1. Main Navigation Drawer
      setupInteractiveDrawerTracking('mobileNavDropdown', 'mobileNavBackdrop', closeMobileNavMenu, 'open');
      // 2. Reader Action Sidebar Drawer
      setupInteractiveDrawerTracking('readerSidebar', 'readerDrawerBackdrop', closeMobileReaderDrawer, 'drawer-open');
    }

    // Global connection state & offline management
    let isOfflineMode = false;
    let lastOfflineToastTime = 0;

    function handleConnectionFailure(isSilent = false) {
      isOfflineMode = true;
      const now = Date.now();
      const status = document.getElementById('statusIndicator');
      if (status) {
        if (!selectedTagFilter && (!document.getElementById('searchInput') || !document.getElementById('searchInput').value.trim())) {
          status.textContent = allEntries.length > 0 ? (allEntries.length + ' saved (offline)') : 'Offline';
        }
      }

      // If manual pull-to-refresh (!isSilent), always show toast; if background resume, debounce to 30s
      if (!isSilent || (now - lastOfflineToastTime > 30000)) {
        lastOfflineToastTime = now;
        if (allEntries.length > 0) {
          showToast('Offline mode — viewing saved articles', 3500);
        } else {
          showToast('Could not connect to server', 3500);
        }
      }
    }

    // Global silent refresh helper for native app resume & tab focus
    window.refreshArticlesSilently = function() {
      const reader = document.getElementById('readerView');
      if (reader && reader.classList.contains('open')) return;
      if (navigator.onLine === false) {
        handleConnectionFailure(true);
        return;
      }
      loadArticles(true);
    };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        window.refreshArticlesSilently();
      }
    });

    window.addEventListener('focus', () => {
      window.refreshArticlesSilently();
    });

    window.addEventListener('offline', () => {
      handleConnectionFailure(false);
    });

    window.addEventListener('online', () => {
      showToast('Back online — syncing library...', 2500);
      loadArticles(true).then(() => {
        const status = document.getElementById('statusIndicator');
        if (status && (status.textContent.includes('offline') || status.textContent === 'Offline')) {
          status.textContent = '';
        }
      });
    });

    // Initialize
    renderFromInstantLocalCache();
    setupPullToRefresh();
    setupDrawerSwipeHandlers();
    setupCardLongPress();
    // Long-press gesture for mobile cards
    function setupCardLongPress() {
      const grid = document.getElementById('articlesGrid');
      if (!grid) return;

      let longPressTimer = null;
      let longPressMoved = false;
      let startX = 0;
      let startY = 0;

      grid.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.article-card');
        if (!card) return;
        if (e.target.closest('button, a, .card-dropdown-menu, .card-select-wrap')) return;

        const id = parseInt(card.dataset.id, 10);
        if (!id) return;

        longPressMoved = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;

        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          if (!longPressMoved) {
            justTriggeredLongPress = true;
            if (navigator.vibrate) {
              try { navigator.vibrate(25); } catch {}
            }
            toggleArticleSelection(id, true);
          }
        }, 450);
      }, { passive: true });

      grid.addEventListener('touchmove', (e) => {
        if (longPressTimer) {
          const diffX = Math.abs(e.touches[0].clientX - startX);
          const diffY = Math.abs(e.touches[0].clientY - startY);
          if (diffX > 10 || diffY > 10) {
            longPressMoved = true;
            clearTimeout(longPressTimer);
          }
        }
      }, { passive: true });

      grid.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
        if (justTriggeredLongPress) {
          setTimeout(() => { justTriggeredLongPress = false; }, 120);
        }
      }, { passive: true });

      grid.addEventListener('touchcancel', () => {
        clearTimeout(longPressTimer);
      }, { passive: true });
    }

    // Android back button support for selection mode
    const originalBackHandler = window.handleAndroidBackButton;
    window.handleAndroidBackButton = function() {
      if (isSelectionMode()) {
        clearArticleSelection();
        return true;
      }
      if (originalBackHandler) {
        return originalBackHandler();
      }
      return false;
    };

    loadArticles();
    if (isCapacitorApp()) {
      const settingsBtn = document.getElementById('serverSettingsBtn');
      if (settingsBtn) settingsBtn.style.display = 'flex';
      if (window.AndroidNative && window.AndroidNative.saveServerConfig) {
        window.AndroidNative.saveServerConfig(
          localStorage.getItem('wf_server_url') || '',
          getAuthToken()
        );
      }
      if (!localStorage.getItem('wf_server_url')) {
        setTimeout(() => openServerConnectModal(), 120);
      }
    }
  </script>
</body>
</html>`;
}
