export function renderDashboardHtml(appName: string = 'Wallaflare'): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      --bg-card: rgba(30, 41, 59, 0.7);
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
      --radius-sm: 6px;
      --radius-lg: 16px;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }

    html.light {
      --bg-primary: #f8fafc;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f1f5f9;
      --bg-card: rgba(255, 255, 255, 0.85);
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
      --bg-card: rgba(235, 226, 205, 0.9);
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
      background-color: rgba(15, 23, 42, 0.8);
      border-bottom: 1px solid var(--border-color);
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
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
      font-size: 1.25rem;
      letter-spacing: -0.02em;
      cursor: pointer;
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
      gap: 0.5rem;
    }

    button, .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.18s ease;
      text-decoration: none;
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
      padding: 1.5rem 1rem 4rem 1rem;
    }

    /* Filter Bar */
    .filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .tab-group {
      display: flex;
      background: var(--bg-secondary);
      padding: 0.25rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      gap: 0.2rem;
    }
    .tab-btn {
      padding: 0.35rem 0.85rem;
      font-size: 0.825rem;
      font-weight: 500;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s;
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
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    .article-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      backdrop-filter: blur(8px);
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
      width: calc(100% + 2.5rem);
      margin: -1.25rem -1.25rem 0.85rem -1.25rem;
      height: 160px;
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

    .card-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.6rem;
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
      font-size: 1.05rem;
      font-weight: 600;
      line-height: 1.35;
      color: var(--text-primary);
      margin-bottom: 0.6rem;
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
      font-size: 0.825rem;
      color: var(--text-secondary);
      line-height: 1.45;
      margin-bottom: 1.2rem;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-color);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 0.3rem;
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

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
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
      max-width: 580px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--shadow);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
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
      font-size: 1.2rem;
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

    /* Reader Drawer */
    .reader-view {
      position: fixed;
      inset: 0;
      z-index: 200;
      background: var(--bg-primary);
      display: none;
      flex-direction: column;
      overflow-y: auto;
    }
    .reader-view.open {
      display: flex;
    }
    .reader-nav {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .reader-content-wrap {
      max-width: 720px;
      width: 100%;
      margin: 0 auto;
      padding: 3rem 1.5rem 6rem 1.5rem;
    }
    .reader-cover {
      margin-bottom: 2rem;
      border-radius: var(--radius);
      overflow: hidden;
      max-height: 400px;
      display: flex;
      justify-content: center;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
    }
    .reader-cover-img {
      max-width: 100%;
      max-height: 400px;
      object-fit: contain;
      border-radius: var(--radius);
    }
    .reader-body {
      font-family: var(--font-reader-serif);
      font-size: 1.15rem;
      line-height: 1.75;
      color: var(--text-primary);
    }
    .reader-body p {
      margin-bottom: 1.4rem;
    }
    .reader-body img {
      max-width: 100%;
      height: auto;
      border-radius: var(--radius-sm);
      margin: 1.5rem 0;
    }
    .reader-body h1, .reader-body h2, .reader-body h3 {
      font-family: var(--font-ui);
      margin-top: 2rem;
      margin-bottom: 0.8rem;
    }
    .reader-body pre {
      background: var(--bg-secondary);
      padding: 1rem;
      border-radius: var(--radius-sm);
      overflow-x: auto;
      font-family: var(--font-reader-mono);
      font-size: 0.9rem;
      margin: 1.5rem 0;
    }
    .reader-body blockquote {
      border-left: 3px solid var(--accent);
      padding-left: 1.25rem;
      margin: 1.5rem 0;
      font-style: italic;
      color: var(--text-secondary);
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
  </style>
</head>
<body>

  <!-- WallabagWebService Matcher Elements (Satisfies isRegularPage() directly) -->
  <div style="display:none;" aria-hidden="true">
    <img src="/img/logo-wallabag.svg" alt="wallabag logo" />
    <a href="/logout">Logout</a>
  </div>

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
      <input type="text" id="searchInput" placeholder="Search articles or press /..." oninput="filterArticles()">
    </div>

    <div class="nav-actions">
      <button class="btn btn-primary" onclick="openModal('addUrlModal')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add URL</span>
      </button>

      <button class="btn btn-secondary" onclick="openModal('addTextModal')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        <span>Add Text</span>
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

  <!-- Reader View -->
  <div class="reader-view" id="readerView">
    <div class="reader-nav">
      <button class="btn btn-secondary" onclick="handleReaderBack()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        <span>Back</span>
      </button>

      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <button class="btn-icon" title="Serif / Sans typography" onclick="toggleReaderFont()">
          <span style="font-family: serif; font-weight: bold; font-size: 1rem;">Aa</span>
        </button>
        <button class="btn-icon" title="Decrease font size" onclick="adjustFontSize(-1)">A-</button>
        <button class="btn-icon" title="Increase font size" onclick="adjustFontSize(1)">A+</button>
        <a id="readerEpubBtn" href="#" class="btn btn-secondary" download>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>EPUB</span>
        </a>
      </div>
    </div>
    <div class="reader-content-wrap">
      <h1 id="readerTitle" style="font-size: 2.2rem; font-weight: 700; line-height: 1.25; margin-bottom: 0.75rem;"></h1>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);" id="readerMeta"></div>
      <div id="readerCoverWrap"></div>
      <div class="reader-body" id="readerBody"></div>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast">
    <span id="toastMsg">Action completed</span>
  </div>

  <script>
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
      const readMatch = path.match(/\/(?:read|view)\/(\d+)/);
      if (readMatch) {
        const id = parseInt(readMatch[1], 10);
        openReader(id, false);
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

    function filterArticles() {
      const search = (document.getElementById('searchInput').value || '').toLowerCase();
      let filtered = allEntries;

      if (currentFilter === 'unread') {
        filtered = filtered.filter(e => !e.is_archived);
      } else if (currentFilter === 'starred') {
        filtered = filtered.filter(e => e.is_starred);
      } else if (currentFilter === 'archive') {
        filtered = filtered.filter(e => e.is_archived);
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

      const tokenParam = getAuthToken() ? ('?access_token=' + encodeURIComponent(getAuthToken())) : '';

      empty.style.display = 'none';
      grid.innerHTML = entries.map(item => {
        const domain = item.domain_name || 'direct-input';
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

        return '<div class="article-card" id="entry-card-' + item.id + '">' +
          '<div>' +
            imgHtml +
            '<div class="card-meta">' +
              '<span class="card-domain">' + escapeHtml(domain) + '</span>' +
              '<span class="card-reading-time">' + (item.reading_time || 1) + ' min read</span>' +
            '</div>' +
            '<h2 class="card-title" onclick="openReader(' + item.id + ')">' + escapeHtml(item.title) + '</h2>' +
            '<p class="card-excerpt">' + escapeHtml(excerpt) + '</p>' +
          '</div>' +
          '<div class="card-footer">' +
            '<span>' + date + '</span>' +
            '<div class="card-actions">' +
              '<button class="action-btn ' + (item.is_starred ? 'active-star' : '') + '" title="Star / Favorite" onclick="toggleStar(' + item.id + ', ' + item.is_starred + ')">' + starSvg + '</button>' +
              '<button class="action-btn ' + (item.is_archived ? 'active-archive' : '') + '" title="Toggle Archive" onclick="toggleArchive(' + item.id + ', ' + item.is_archived + ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></button>' +
              '<a href="/api/entries/' + item.id + '/export.epub' + tokenParam + '" class="action-btn" title="Download EPUB for KOReader" download><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></a>' +
              originalLinkHtml +
              '<button class="action-btn btn-delete" title="Delete" onclick="deleteEntryAction(' + item.id + ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
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

    function openReader(id, pushHistory = true) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;

      activeArticleId = id;
      const tokenParam = getAuthToken() ? ('?access_token=' + encodeURIComponent(getAuthToken())) : '';

      document.getElementById('readerTitle').textContent = item.title;
      let metaHtml = '<span>' + escapeHtml(item.domain_name || '') + '</span> &bull; ' +
        '<span>' + (item.reading_time || 1) + ' min read</span> &bull; ' +
        '<span>' + (item.created_at ? new Date(item.created_at).toLocaleDateString() : '') + '</span>';
      if (item.url) {
        metaHtml += ' &bull; <a href="' + escapeHtml(item.url)}" target="_blank" style="color: var(--accent);">Original Link</a>';
      }
      document.getElementById('readerMeta').innerHTML = metaHtml;
      
      const coverWrap = document.getElementById('readerCoverWrap');
      if (item.preview_picture) {
        coverWrap.innerHTML = '<div class="reader-cover"><img src="' + escapeHtml(item.preview_picture) + '" alt="Cover" class="reader-cover-img" onerror="this.parentElement.remove()" /></div>';
      } else {
        coverWrap.innerHTML = '';
      }

      document.getElementById('readerBody').innerHTML = item.content;
      document.getElementById('readerEpubBtn').href = '/api/entries/' + item.id + '/export.epub' + tokenParam;
      document.getElementById('readerView').classList.add('open');
      document.body.style.overflow = 'hidden';

      if (pushHistory) {
        history.pushState({ readerId: id }, '', '/read/' + id);
      }
    }

    function closeReader(updateHistory = true) {
      activeArticleId = null;
      document.getElementById('readerView').classList.remove('open');
      document.body.style.overflow = 'auto';

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
        allEntries.unshift(item);
        updateCounts();
        filterArticles();
        closeModal('addUrlModal');
        input.value = '';
        showToast('Article saved successfully!');
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
      document.getElementById(id).classList.add('open');
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
