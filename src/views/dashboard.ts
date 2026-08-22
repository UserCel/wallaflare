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
      z-index: 40;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      background-color: rgba(15, 23, 42, 0.82);
      border-bottom: 1px solid var(--border-color);
      padding: 0.75rem 1.25rem;
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
      max-width: 420px;
      position: relative;
    }
    .nav-search input {
      width: 100%;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 9999px;
      padding: 0.5rem 1rem 0.5rem 2.25rem;
      color: var(--text-primary);
      font-size: 0.875rem;
      outline: none;
      transition: all 0.2s;
    }
    .nav-search input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    .nav-search svg {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      width: 16px;
      height: 16px;
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

    /* Grid of Cards */
    .articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.15rem;
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
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      position: relative;
      overflow: hidden;
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
      gap: 0.25rem;
      font-size: 0.72rem;
      font-weight: 500;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      background: var(--bg-tertiary);
      color: var(--accent);
      border: 1px solid rgba(249, 115, 22, 0.25);
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
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
      opacity: 0.7;
      margin-left: 0.15rem;
    }
    .tag-badge .tag-remove-btn:hover {
      opacity: 1;
    }

    /* Tag Modal */
    .tag-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 50;
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
      border-top: 1px solid var(--border-color);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
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
      color: var(--star-color);
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

    /* Reader Sidebar Dock */
    .reader-sidebar {
      width: 76px;
      flex-shrink: 0;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 0.5rem;
      z-index: 20;
      gap: 1rem;
    }

    .reader-sidebar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
    }

    .reader-tool-btn {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 0.65rem;
      padding: 0;
    }
    .reader-tool-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-color);
    }
    .reader-tool-btn.btn-back-tool {
      background: var(--accent);
      color: white;
    }
    .reader-tool-btn.btn-back-tool:hover {
      background: var(--accent-hover);
    }

    /* Reader Main Scroll Area */
    .reader-main-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 2.5rem 1.5rem 6rem 1.5rem;
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

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.68);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 100;
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

    /* -------------------------------------------------------------
       MOBILE & TABLET RESPONSIVENESS
       ------------------------------------------------------------- */
    @media (max-width: 768px) {
      header {
        padding: 0.6rem 0.85rem;
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

      /* Mobile Reader Layout: Top Navigation Bar & Left Slide-out Drawer */
      .reader-view {
        flex-direction: column;
      }
      .reader-mobile-bar {
        display: flex;
      }
      .reader-sidebar-backdrop.open {
        display: block;
      }
      .reader-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 250px !important;
        transform: translateX(-100%);
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 250;
        box-shadow: 4px 0 25px rgba(0, 0, 0, 0.4);
        padding: 1.25rem 0.75rem;
        background: var(--bg-secondary);
        border-right: 1px solid var(--border-color);
      }
      .reader-sidebar.drawer-open {
        transform: translateX(0);
      }
      .reader-sidebar .btn-label {
        opacity: 1 !important;
        transform: translateX(0) !important;
      }
      .reader-main-scroll {
        padding: 4rem 1rem 3rem 1rem !important;
      }
      #readerTitle {
        font-size: 1.6rem !important;
      }
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
      <form onsubmit="handleLogin(event)" style="display: flex; flex-direction: column; gap: 0.85rem;">
        <div class="form-group" style="text-align: left;">
          <input type="password" id="authKeyInput" placeholder="Enter AUTH_TOKEN / Password" required autofocus>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.65rem;">Unlock</button>
      </form>
    </div>
  </div>

  <!-- Top Header -->
  <header>
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

    <div class="nav-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="text" id="searchInput" placeholder="Search articles or /..." oninput="filterArticles()">
    </div>

    <div class="nav-actions">
      <button class="btn btn-primary" onclick="openModal('addUrlModal')" title="Add URL">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add URL</span>
      </button>

      <button class="btn btn-secondary" onclick="openModal('addTextModal')" title="Add Text">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        <span>Add Text</span>
      </button>

      
      <button class="btn btn-secondary" onclick="openGlobalTagManager()" title="Manage & Clean Tags">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
        <span>Tags</span>
      </button>
      <button class="btn btn-secondary" onclick="openModal('syncModal')" title="KOReader &amp; API Setup">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
        <span>KOReader</span>
      </button>

      <button class="btn-icon" onclick="toggleTheme()" title="Toggle Light/Dark/Sepia">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
      </button>

      <button class="btn-icon" onclick="promptAuthKey()" title="Configure Access Token">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      </button>
    </div>
  </header>

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

      <div style="font-size: 0.8rem; color: var(--text-muted);" id="statusIndicator">
        Syncing...
      </div>
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

  <!-- Modal: Add URL -->
  <div class="modal-backdrop" id="addUrlModal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Save Article from Web</h3>
        <button class="close-btn" onclick="closeModal('addUrlModal')">&times;</button>
      </div>
      <form onsubmit="handleIngestUrl(event)">
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
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Add Custom Text / Markdown</h3>
        <button class="close-btn" onclick="closeModal('addTextModal')">&times;</button>
      </div>
      <form onsubmit="handleIngestText(event)">
        <div class="form-group">
          <label for="textTitle">Title</label>
          <input type="text" id="textTitle" placeholder="Article Title" required>
        </div>
        <div class="form-group">
          <label for="textUrl">Source URL (Optional)</label>
          <input type="url" id="textUrl" placeholder="https://...">
        </div>
        <div class="form-group">
          <label for="textContent">Content (HTML or Markdown)</label>
          <textarea id="textContent" placeholder="Paste your text or markdown here..." required></textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('addTextModal')">Cancel</button>
          <button type="submit" class="btn btn-primary" id="ingestTextBtn">Save Entry</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: KOReader / Wallabag Sync -->
  <div class="modal-backdrop" id="syncModal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Sync with KOReader &amp; Wallabag Apps</h3>
        <button class="close-btn" onclick="closeModal('syncModal')">&times;</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.875rem;">
        <p>Wallaflare is a 100% compatible drop-in replacement for the <strong>Wallabag v2 API</strong>. Connect your e-reader or mobile app using these parameters:</p>
        
        <div>
          <label style="font-weight: 600; color: var(--text-secondary);">Server URL</label>
          <div class="code-box" id="syncServerUrl"></div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <label style="font-weight: 600; color: var(--text-secondary);">Client ID / Username</label>
            <div class="code-box">wallaflare</div>
          </div>
          <div>
            <label style="font-weight: 600; color: var(--text-secondary);">Client Secret / Password</label>
            <div class="code-box" id="syncClientSecretDisplay">Your AUTH_TOKEN / Password</div>
          </div>
        </div>

        <div style="background: var(--bg-primary); border-radius: var(--radius-sm); padding: 0.75rem; border: 1px solid var(--border-color);">
          <strong style="color: var(--accent);">KOReader Setup:</strong>
          <ol style="margin-left: 1.25rem; margin-top: 0.4rem; line-height: 1.6; color: var(--text-secondary);">
            <li>Open KOReader on your Kindle/Kobo/Android device.</li>
            <li>Go to <strong>Search / Tools &gt; Wallabag</strong> plugin.</li>
            <li>Enter the Server URL and credentials above.</li>
            <li>KOReader will automatically sync and download high-quality EPUBs!</li>
          </ol>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
        <button class="btn btn-primary" onclick="closeModal('syncModal')">Got it</button>
      </div>
    </div>
  </div>

  <!-- -------------------------------------------------------------
       READER VIEW: Top Bar for Mobile & Full-Height Sidebar for Desktop
       ------------------------------------------------------------- -->
  <div class="reader-view" id="readerView">
    <!-- Mobile Top Action Bar -->
    <div class="reader-mobile-bar">
      <div class="reader-mobile-bar-group">
        <button class="btn-icon" onclick="toggleMobileReaderDrawer()" title="More options">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="5" r="1.25"></circle><circle cx="12" cy="12" r="1.25"></circle><circle cx="12" cy="19" r="1.25"></circle></svg>
        </button>
        <button class="btn-icon" onclick="handleReaderBack()" title="Back to Library (Esc)">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
      </div>

      <div class="reader-mobile-bar-group">
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

        <button class="reader-tool-btn" onclick="downloadActiveEpub(); closeMobileReaderDrawer();" title="Download EPUB">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span class="btn-label">EPUB</span>
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
    <section class="reader-main-scroll" id="readerScrollContainer" onscroll="updateReadingProgress()">
      <div class="reader-content-wrap">
        <h1 id="readerTitle" style="font-size: 2.1rem; font-weight: 700; line-height: 1.28; margin-bottom: 0.75rem;"></h1>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.8rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--border-color);" id="readerMeta"></div>
        <div id="readerCoverWrap"></div>
        <article class="reader-body" id="readerBody"></article>
      </div>
    </section>
  </div>

  
  
  <!-- Article Tag Management Modal -->
  <div class="tag-modal-overlay" id="tagModal" onclick="if(event.target === this) closeTagModal()">
    <div class="tag-modal">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h3 style="font-size: 1.15rem; font-weight: 600; margin: 0;">Article Tags</h3>
        <button class="action-btn" onclick="closeTagModal()">&times;</button>
      </div>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="tagModalArticleTitle"></p>
      
      <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">Current Tags:</div>
      <div class="card-tags" id="tagModalCurrentTags" style="margin-bottom: 1.25rem;"></div>
      
      <form onsubmit="event.preventDefault(); submitAddTag();" style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
        <input type="text" id="newTagInput" class="input" placeholder="Type new tag(s) separated by commas..." style="flex: 1;" />
        <button type="submit" class="btn btn-primary">Add</button>
      </form>

      <div id="quickTagsSection" style="display: none;">
        <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">Quick Add Existing Tags:</div>
        <div class="card-tags" id="tagModalAvailableTags"></div>
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
    function isRtlText(text) {
      return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text || '');
    }

    let allEntries = [];
    let currentFilter = 'unread';
    let currentReaderFontSize = 18;
    let readerFontFamily = 'serif';
    let activeArticleId = null;

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

    function authFetch(url, options = {}) {
      const headers = Object.assign({}, options.headers || {});
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
      }
      return fetch(url, Object.assign({}, options, { headers }));
    }

    function promptAuthKey() {
      const current = getAuthToken();
      const next = prompt('Enter your Access Token / Password (or leave empty to clear):', current);
      if (next !== null) {
        setAuthToken(next);
        loadArticles();
      }
    }

    function handleLogin(e) {
      e.preventDefault();
      const key = document.getElementById('authKeyInput').value.trim();
      setAuthToken(key);
      document.getElementById('authOverlay').style.display = 'none';
      loadArticles();
    }

    // Keyboard shortcut '/' to search & Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
      }
      if (e.key === 'Escape') {
        closeModal('addUrlModal');
        closeModal('addTextModal');
        closeModal('syncModal');
        if (activeArticleId) {
          handleReaderBack();
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

    async function loadArticles() {
      document.getElementById('statusIndicator').textContent = 'Syncing...';
      try {
        const res = await authFetch('/api/entries.json?perPage=100');
        if (res.status === 401) {
          document.getElementById('authOverlay').style.display = 'flex';
          document.getElementById('statusIndicator').textContent = 'Authentication required';
          return;
        }
        document.getElementById('authOverlay').style.display = 'none';
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        allEntries = data._embedded ? data._embedded.items : [];
        updateCounts();
        filterArticles();
        document.getElementById('statusIndicator').textContent = allEntries.length + ' articles';
        
        // Initial URL route check
        handleRouteState();
      } catch (err) {
        document.getElementById('statusIndicator').textContent = 'Error loading library';
        showToast('Failed to load articles: ' + err.message);
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

    
    
    let selectedTagFilter = null;
    let tagModalEntryId = null;
    let cachedGlobalTags = [];

    async function loadGlobalTags() {
      try {
        const res = await authFetch('/api/tags.json');
        if (res.ok) {
          cachedGlobalTags = await res.json();
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

    async function openTagModal(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      tagModalEntryId = id;
      document.getElementById('tagModalArticleTitle').textContent = item.title;
      await loadGlobalTags();
      renderModalTags(item.tags || []);
      document.getElementById('tagModal').classList.add('open');
      setTimeout(() => document.getElementById('newTagInput').focus(), 100);
    }

    function closeTagModal() {
      tagModalEntryId = null;
      document.getElementById('tagModal').classList.remove('open');
      document.getElementById('newTagInput').value = '';
    }

    function renderModalTags(tags) {
      const currentContainer = document.getElementById('tagModalCurrentTags');
      if (!tags || tags.length === 0) {
        currentContainer.innerHTML = '<span style="font-size: 0.82rem; color: var(--text-muted);">No tags attached to this article.</span>';
      } else {
        currentContainer.innerHTML = tags.map(t => 
          '<span class="tag-badge">#' + escapeHtml(t.label) + 
          '<span class="tag-remove-btn" title="Remove tag" onclick="removeTagAction(' + t.id + ')">&times;</span></span>'
        ).join('');
      }

      // Quick add available tags
      const currentTagIds = new Set((tags || []).map(t => t.id));
      const currentTagSlugs = new Set((tags || []).map(t => t.slug.toLowerCase()));
      const available = cachedGlobalTags.filter(t => !currentTagIds.has(t.id) && !currentTagSlugs.has(t.slug.toLowerCase()));

      const availableSection = document.getElementById('quickTagsSection');
      const availableContainer = document.getElementById('tagModalAvailableTags');

      if (available.length > 0) {
        availableSection.style.display = 'block';
                availableContainer.innerHTML = available.map(t => 
          '<span class="tag-badge" style="opacity: 0.85; border-style: dashed;" data-label="' + escapeHtml(t.label) + '" onclick="quickAddTag(this.dataset.label)">+ #' + escapeHtml(t.label) + '</span>'
        ).join('');
      } else {
        availableSection.style.display = 'none';
      }
    }

    async function quickAddTag(label) {
      if (!tagModalEntryId) return;
      await addTagsToCurrentArticle(label);
    }

    async function submitAddTag() {
      if (!tagModalEntryId) return;
      const input = document.getElementById('newTagInput');
      const val = input.value.trim();
      if (!val) return;
      await addTagsToCurrentArticle(val);
      input.value = '';
    }

    async function addTagsToCurrentArticle(tagString) {
      const res = await authFetch('/api/entries/' + tagModalEntryId + '/tags.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: tagString })
      });

      if (res.ok) {
        const updated = await res.json();
        const entry = allEntries.find(e => e.id === tagModalEntryId);
        if (entry) {
          entry.tags = updated.tags || [];
        }
        await loadGlobalTags();
        renderModalTags(entry ? entry.tags : []);
        renderArticles(allEntries);
        showToast('Tag updated');
      } else {
        showToast('Failed to add tag');
      }
    }

    async function removeTagAction(tagId) {
      if (!tagModalEntryId) return;
      const res = await authFetch('/api/entries/' + tagModalEntryId + '/tags/' + tagId + '.json', {
        method: 'DELETE'
      });

      if (res.ok) {
        const updated = await res.json();
        const entry = allEntries.find(e => e.id === tagModalEntryId);
        if (entry) {
          entry.tags = updated.tags || [];
        }
        await loadGlobalTags();
        renderModalTags(entry ? entry.tags : []);
        renderArticles(allEntries);
        showToast('Tag removed');
      } else {
        showToast('Failed to remove tag');
      }
    }

    // -------------------------------------------------------------
    // Global Tag Management
    // -------------------------------------------------------------
    function filterByTagFromModal(slug) {
      closeGlobalTagModal();
      filterByTag(slug);
    }

    async function openGlobalTagManager() {
      await loadGlobalTags();
      renderGlobalTagList();
      document.getElementById('globalTagModal').classList.add('open');
    }

    function closeGlobalTagModal() {
      document.getElementById('globalTagModal').classList.remove('open');
    }

    function renderGlobalTagList() {
      const container = document.getElementById('globalTagListContainer');
      const countLabel = document.getElementById('globalTagCountLabel');
      
      countLabel.textContent = cachedGlobalTags.length + ' tags total';

      if (cachedGlobalTags.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem 0;">No tags created yet.</div>';
        return;
      }

      container.innerHTML = cachedGlobalTags.map(t => {
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

      if (!confirm(msg)) return;

      const res = await authFetch('/api/tags/' + tagId + '.json', { method: 'DELETE' });
      if (res.ok) {
        // Remove tag from local entries
        for (const entry of allEntries) {
          if (entry.tags) {
            entry.tags = entry.tags.filter(t => t.id !== tagId);
          }
        }
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

      if (!confirm('Delete ' + unused.length + ' unused tag(s)?')) return;

      for (const t of unused) {
        await authFetch('/api/tags/' + t.id + '.json', { method: 'DELETE' });
      }

      await loadGlobalTags();
      renderGlobalTagList();
      showToast('Cleaned up unused tags');
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

      if (search) {
        filtered = filtered.filter(e =>
          (e.title && e.title.toLowerCase().includes(search)) ||
          (e.domain_name && e.domain_name.toLowerCase().includes(search)) ||
          (e.text && e.text.toLowerCase().includes(search))
        );
      }

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
      grid.innerHTML = entries.map(item => {
        const domain = item.domain_name || 'direct-input';
        const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : '');
        const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : '';
        const date = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
        const excerpt = item.text ? item.text.slice(0, 160) + '...' : 'No preview available';
        const previewPicture = item.preview_picture;

        const imgHtml = previewPicture
          ? '<div class="card-image-wrap" onclick="openReader(' + item.id + ')"><img src="' + escapeHtml(previewPicture) + '" alt="' + escapeHtml(item.title) + '" loading="lazy" class="card-image" onerror="this.parentElement.remove()" /></div>'
          : '';

        const starSvg = item.is_starred
          ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
          : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

        const originalLinkHtml = item.url
          ? '<a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener" class="action-btn" title="Open original link"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>'
          : '';

        const authorMetaHtml = author ? ' &bull; <span class="card-author" style="color: var(--text-secondary); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">by ' + escapeHtml(author) + '</span>' : '';

        const tags = item.tags || [];
        const tagsHtml = tags.length > 0
          ? '<div class="card-tags">' + tags.map(t => '<span class="tag-badge" data-slug="' + escapeHtml(t.slug) + '" onclick="event.stopPropagation(); filterByTag(this.dataset.slug)">#' + escapeHtml(t.label) + '</span>').join('') + '</div>'
          : '';

        const isItemRtl = (item.language && ['he', 'iw', 'ar', 'fa', 'ur', 'yi'].includes(item.language.toLowerCase().split('-')[0])) || isRtlText(item.title + ' ' + (item.text || ''));
        const titleDir = isRtlText(item.title) ? 'rtl' : 'ltr';
        const excerptDir = isRtlText(excerpt) ? 'rtl' : 'ltr';
        return '<div class="article-card" id="entry-card-' + item.id + '"' + (isItemRtl ? ' dir="rtl"' : '') + '>' +
          '<div>' +
            imgHtml +
            '<div class="card-meta">' +
              '<span class="card-domain">' + escapeHtml(domain) + '</span>' +
              authorMetaHtml +
              '<span class="card-reading-time">' + (item.reading_time || 1) + ' min read</span>' +
            '</div>' +
            '<h2 class="card-title" dir="' + titleDir + '" onclick="openReader(' + item.id + ')">' + escapeHtml(item.title) + '</h2>' +
            '<p class="card-excerpt" dir="' + excerptDir + '">' + escapeHtml(excerpt) + '</p>' +
            tagsHtml +
          '</div>' +
          '<div class="card-footer">' +
            '<span>' + date + '</span>' +
            '<div class="card-actions">' +
              '<button class="action-btn ' + (item.is_starred ? 'active-star' : '') + '" title="Star / Favorite" onclick="toggleStar(' + item.id + ', ' + item.is_starred + ')">' + starSvg + '</button>' +
              '<button class="action-btn ' + (item.is_archived ? 'active-archive' : '') + '" title="Toggle Archive" onclick="toggleArchive(' + item.id + ', ' + item.is_archived + ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></button>' +
              '<button class="action-btn" title="Manage Tags" onclick="openTagModal(' + item.id + ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></button>' +
              '<button type="button" class="action-btn" title="Download EPUB for KOReader" onclick="downloadEpub(' + item.id + ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>' +
              originalLinkHtml +
              '<button class="action-btn btn-delete" title="Delete" onclick="deleteEntryAction(' + item.id + ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function downloadActiveEpub() {
      if (activeArticleId) {
        downloadEpub(activeArticleId);
      }
    }

    async function downloadEpub(id) {
      const item = allEntries.find(e => e.id === id);
      showToast('Preparing EPUB download...');
      try {
        const res = await authFetch('/api/entries/' + id + '/export.epub');
        if (!res.ok) throw new Error('HTTP ' + res.status);

        let filename = item && item.title ? (item.title.replace(/[/\\:*?"<>|]/g, '').trim() + '.epub') : 'article.epub';
        const disposition = res.headers.get('Content-Disposition');
        if (disposition && disposition.includes("filename*=")) {
          const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
          if (match) filename = decodeURIComponent(match[1]);
        } else if (disposition && disposition.includes("filename=")) {
          const match = disposition.match(/filename="?([^";]+)"?/i);
          if (match) filename = match[1];
        }

        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
          a.remove();
        }, 2000);
      } catch (err) {
        showToast('Failed to download EPUB: ' + err.message);
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
        updateCounts();
        filterArticles();
        showToast(next ? 'Archived article' : 'Moved to unread');
      }
    }

    async function deleteEntryAction(id) {
      if (!confirm('Are you sure you want to delete this article?')) return;
      const res = await authFetch('/api/entries/' + id + '.json', { method: 'DELETE' });
      if (res.ok) {
        allEntries = allEntries.filter(e => e.id !== id);
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
      
      const coverWrap = document.getElementById('readerCoverWrap');
      if (item.preview_picture) {
        coverWrap.innerHTML = '<div class="reader-cover"><img src="' + escapeHtml(item.preview_picture) + '" alt="Cover" class="reader-cover-img" onerror="this.parentElement.remove()" /></div>';
      } else {
        coverWrap.innerHTML = '';
      }

      // Populate content cleanly
      const readerBodyEl = document.getElementById('readerBody');
      readerBodyEl.innerHTML = item.content || '<p>No content available.</p>';

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
      if (scrollEl) scrollEl.scrollTop = 0;
      updateReadingProgress();

      if (pushHistory) {
        history.pushState({ readerId: id }, '', '/read/' + id);
      }
    }

    
    function toggleMobileReaderDrawer() {
      const sidebar = document.getElementById('readerSidebar');
      const backdrop = document.getElementById('readerDrawerBackdrop');
      if (sidebar && backdrop) {
        sidebar.classList.toggle('drawer-open');
        backdrop.classList.toggle('open');
      }
    }

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
      closeMobileReaderDrawer();
      activeArticleId = null;
      document.getElementById('readerView').classList.remove('open');
      document.body.style.overflow = 'auto';
      document.getElementById('readingProgress').style.width = '0%';

      if (updateHistory) {
        const newPath = currentFilter === 'unread' ? '/' : ('/' + currentFilter);
        if (window.location.pathname !== newPath) {
          history.pushState({}, '', newPath);
        }
      }
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

    function updateReadingProgress() {
      const container = document.getElementById('readerScrollContainer');
      if (!container) return;
      const total = container.scrollHeight - container.clientHeight;
      const progress = total > 0 ? Math.min(100, Math.max(0, (container.scrollTop / total) * 100)) : 0;
      document.getElementById('readingProgress').style.width = progress + '%';
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
          showToast('ℹ️ Article already in library! Added on ' + dateStr, 4500);
          const card = document.getElementById('entry-card-' + item.id);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.boxShadow = '0 0 0 2px var(--accent)';
            setTimeout(() => card.style.boxShadow = '', 3500);
          }
        } else {
          allEntries.unshift(item);
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

    async function handleIngestText(e) {
      e.preventDefault();
      const titleInput = document.getElementById('textTitle');
      const urlInput = document.getElementById('textUrl');
      const contentInput = document.getElementById('textContent');
      const btn = document.getElementById('ingestTextBtn');

      const title = titleInput.value.trim();
      const content = contentInput.value.trim();
      const url = urlInput.value.trim();
      if (!title || !content) return;

      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const res = await authFetch('/api/entries.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, url: url || undefined })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const item = await res.json();
        allEntries.unshift(item);
        updateCounts();
        filterArticles();
        closeModal('addTextModal');
        titleInput.value = '';
        contentInput.value = '';
        urlInput.value = '';
        showToast('Custom text saved successfully!');
      } catch (err) {
        showToast('Failed to save entry: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Entry';
      }
    }

    function openModal(id) {
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
          setTimeout(() => {
            document.getElementById('textTitle')?.focus();
          }, 60);
        }
      }
    }
    function closeModal(id) {
      document.getElementById(id).classList.remove('open');
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
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

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Initialize
    loadArticles();
  </script>
</body>
</html>`;
}
