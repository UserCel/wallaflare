import { OTA_VERSION } from './ota-bundle';
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
  <title>${appName} - Modern 3-Pane Reader &amp; E-ink Sync</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('https://cdn.jsdelivr.net/npm/opendyslexic@1.0.3/OpenDyslexic-Regular.woff2') format('woff2'),
           url('https://cdn.jsdelivr.net/npm/opendyslexic@1.0.3/OpenDyslexic-Regular.woff') format('woff');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }

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
      --font-reader-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-reader-mono: 'JetBrains Mono', monospace;
      --font-reader-dyslexic: 'OpenDyslexic', sans-serif;

      --reader-font-family: var(--font-reader-serif);
      --reader-font-size: 18px;
      --reader-line-height: 1.68;
      --reader-content-max-width: 740px;
      --app-safe-top: env(safe-area-inset-top, 0px);

      --radius: 12px;
      --radius-sm: 8px;
      --radius-lg: 18px;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
      --shadow-lg: 0 20px 30px -10px rgba(0, 0, 0, 0.6);
    }

    html.is-capacitor-app {
      --app-safe-top: max(28px, env(safe-area-inset-top, 0px));
    }

    html.light {
      --bg-primary: #f8fafc;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f1f5f9;
      --bg-card: rgba(255, 255, 255, 0.92);
      --border-color: rgba(0, 0, 0, 0.08);
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
      --shadow-sm: 0 2px 4px rgba(0,0,0,0.04);
      --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.08);
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

    html.oled {
      --bg-primary: #000000;
      --bg-secondary: #0a0a0a;
      --bg-tertiary: #171717;
      --bg-card: #050505;
      --border-color: rgba(255, 255, 255, 0.12);
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.8);
      --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.6);
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
    }

    input, textarea, [contenteditable="true"], select {
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
      -webkit-touch-callout: default;
    }

    .reader-body, .reader-body * {
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
      -webkit-touch-callout: default;
    }

    .reader-title, .reader-meta, .reader-domain, .reader-cover, .article-card, .article-card * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }

    html, body {
      height: 100%;
      height: 100dvh;
      overflow: hidden;
      overscroll-behavior-y: contain;
    }

    body {
      font-family: var(--font-ui);
      background-color: var(--bg-primary);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.25s ease, color 0.25s ease;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .is-refreshing-spin {
      animation: spin 0.75s linear infinite !important;
      transform-origin: center center !important;
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
      transition: all 0.15s ease;
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
    .btn-outline {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
    }
    .btn-outline:hover {
      color: var(--text-primary);
      border-color: var(--accent);
      background: var(--bg-tertiary);
    }
    .btn-icon, .action-btn {
      padding: 0.45rem;
      border-radius: var(--radius-sm);
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .btn-icon:hover, .action-btn:hover {
      color: var(--text-primary);
      background: var(--bg-tertiary);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .action-btn.active-star, .btn-icon.active-star {
      color: var(--star-color) !important;
    }
    .action-btn.active-star svg, .btn-icon.active-star svg {
      fill: var(--star-color) !important;
      stroke: var(--star-color) !important;
    }
    .action-btn.active-archive, .btn-icon.active-archive {
      color: var(--success) !important;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 700;
      font-size: 1.15rem;
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
      flex-shrink: 0;
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

    .badge-count {
      font-size: 0.7rem;
      padding: 0.1rem 0.45rem;
      background: var(--bg-tertiary);
      border-radius: 999px;
      color: var(--text-muted);
      font-weight: 600;
    }

    /* -------------------------------------------------------------
       3-PANE WORKSPACE LAYOUT (.app-workspace)
       ------------------------------------------------------------- */
    .app-workspace {
      display: flex;
      flex-direction: row;
      width: 100vw;
      height: 100%;
      height: 100dvh;
      overflow: hidden;
      position: relative;
    }

    /* Pane 1: Left Navigation Sidebar (250px fixed) */
    .pane-sidebar {
      width: 250px;
      min-width: 250px;
      max-width: 250px;
      height: 100%;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 1.15rem 0.85rem;
      box-sizing: border-box;
      overflow-y: auto;
      overflow-x: hidden;
      z-index: 50;
      flex-shrink: 0;
      gap: 0.85rem;
    }
    .sidebar-brand-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-color);
    }
    .sidebar-nav-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .sidebar-nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.55rem 0.75rem;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      background: transparent;
      border: 1px solid transparent;
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      width: 100%;
      box-sizing: border-box;
    }
    .sidebar-nav-item:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
    .sidebar-nav-item.active {
      background: var(--bg-tertiary);
      color: var(--accent);
      font-weight: 600;
      border-color: rgba(249, 115, 22, 0.2);
    }
    .sidebar-nav-item.active .badge-count {
      background: rgba(249, 115, 22, 0.2);
      color: var(--accent);
    }

    .sidebar-section {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      border-top: 1px solid var(--border-color);
      padding-top: 0.75rem;
    }
    .sidebar-section-header {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      padding: 0.2rem 0.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }
    .sidebar-section-header:hover {
      color: var(--text-primary);
    }
    .sidebar-tag-list {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      max-height: 190px;
      overflow-y: auto;
      padding: 0.1rem 0;
    }
    .sidebar-tag-list.collapsed {
      display: none !important;
    }
    .sidebar-tag-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.4rem 0.65rem;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 0.82rem;
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      width: 100%;
      text-align: left;
      transition: all 0.15s;
    }
    .sidebar-tag-item:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
    .sidebar-tag-item.active {
      background: rgba(249, 115, 22, 0.15);
      color: var(--accent);
      border-color: rgba(249, 115, 22, 0.3);
      font-weight: 600;
    }
    .sidebar-sub-action-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
      color: var(--text-muted);
      background: transparent;
      border: none;
      padding: 0.35rem 0.5rem;
      cursor: pointer;
      border-radius: var(--radius-sm);
    }
    .sidebar-sub-action-btn:hover {
      color: var(--text-primary);
      background: var(--bg-tertiary);
    }
    .sidebar-footer-actions {
      margin-top: auto;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .sidebar-theme-picker {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.35rem;
      padding: 0.35rem 0.2rem;
      margin-bottom: 0.35rem;
      background: var(--bg-primary);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
    }
    .theme-swatch-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      padding: 0.35rem 0.15rem;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .theme-swatch-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
    .theme-swatch-btn.active {
      background: var(--bg-tertiary);
      border-color: var(--accent);
      color: var(--accent);
      font-weight: 600;
    }
    .theme-swatch-circle {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: inline-block;
      transition: transform 0.15s ease;
    }
    .theme-swatch-btn.active .theme-swatch-circle {
      transform: scale(1.15);
      box-shadow: 0 0 0 2px var(--accent);
    }
    .theme-swatch-label {
      font-size: 0.68rem;
      line-height: 1;
    }

    /* Pane 2: Middle Articles Column (380px fixed / flex) */
    .pane-articles {
      width: 380px;
      min-width: 330px;
      max-width: 480px;
      height: 100%;
      background: var(--bg-primary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      overflow: hidden;
      position: relative;
      flex-shrink: 0;
    }
    .pane-articles-toolbar {
      box-sizing: border-box;
      height: calc(54px + var(--app-safe-top));
      min-height: calc(54px + var(--app-safe-top));
      max-height: calc(54px + var(--app-safe-top));
      padding: 0 0.85rem;
      padding-top: var(--app-safe-top);
      padding-left: max(0.85rem, env(safe-area-inset-left, 0px));
      padding-right: max(0.85rem, env(safe-area-inset-right, 0px));
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
      z-index: 120;
      position: relative;
    }
    .nav-search {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 9999px;
      padding: 0.15rem 0.35rem 0.15rem 0.65rem;
      transition: all 0.2s;
      z-index: 125;
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
      font-size: 0.85rem;
      outline: none;
      min-width: 40px;
    }
    .search-ctrl-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      flex-shrink: 0;
      padding: 0;
      transition: all 0.15s;
      pointer-events: auto;
    }
    .search-ctrl-btn:hover {
      color: var(--text-primary);
      background: var(--bg-tertiary);
    }
    .search-ctrl-divider {
      width: 1px;
      height: 16px;
      background: var(--border-color);
      margin: 0 0.15rem;
      flex-shrink: 0;
    }
    .articles-scroll-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.85rem;
      -webkit-overflow-scrolling: touch;
      position: relative;
    }

    /* Pane 3: Right Active Reader Pane (flex: 1) */
    .pane-reader {
      flex: 1;
      min-width: 0;
      height: 100%;
      background: var(--bg-primary);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }
    .reader-empty-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: var(--text-muted);
      user-select: none;
    }
    .reader-empty-pane svg {
      width: 54px;
      height: 54px;
      margin-bottom: 1rem;
      color: var(--accent);
      opacity: 0.55;
    }
    .reader-empty-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.35rem;
    }
    .reader-empty-desc {
      font-size: 0.88rem;
      max-width: 360px;
      line-height: 1.5;
      margin-bottom: 1.5rem;
      color: var(--text-secondary);
    }
    .reader-shortcuts-box {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      max-width: 350px;
      width: 100%;
      text-align: left;
      box-shadow: var(--shadow-sm);
    }
    .reader-shortcuts-box-title {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent);
      margin-bottom: 0.6rem;
    }
    .shortcut-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.82rem;
      color: var(--text-secondary);
      padding: 0.25rem 0;
    }
    .shortcut-kbd {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 2px 6px;
      font-family: var(--font-reader-mono);
      font-size: 0.75rem;
      color: var(--text-primary);
    }

    /* Reader Top Bar & Filled Status Bar Clearance */
    .reader-safe-top-fill {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: var(--app-safe-top);
      min-height: var(--app-safe-top);
      background: var(--bg-primary);
      z-index: 115;
      pointer-events: none;
    }
    .reader-top-bar {
      box-sizing: border-box;
      height: calc(54px + var(--app-safe-top));
      min-height: calc(54px + var(--app-safe-top));
      max-height: calc(54px + var(--app-safe-top));
      padding: 0 0.85rem;
      padding-top: var(--app-safe-top);
      padding-left: max(0.85rem, env(safe-area-inset-left, 0px));
      padding-right: max(0.85rem, env(safe-area-inset-right, 0px));
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      flex-shrink: 0;
      z-index: 120;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
      transform: translateY(0);
      opacity: 1;
    }
    .reader-top-hover-trigger {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 35px;
      z-index: 119;
      pointer-events: auto;
    }
    .reader-top-bar.is-hidden {
      transform: translateY(-100%) !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    .reader-top-bar-group {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      height: 100%;
    }

    /* Live Floating Typography Popover */
    .reader-appearance-popover {
      position: absolute;
      top: calc(54px + var(--app-safe-top) + 8px);
      right: 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      padding: 1.15rem;
      width: 320px;
      max-width: calc(100vw - 32px);
      z-index: 250;
      display: flex;
      flex-direction: column;
      gap: 0.95rem;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      animation: menuFadeIn 0.15s ease-out;
    }

    /* Focus Mode (Zen Mode) */
    .focus-mode .pane-sidebar,
    .focus-mode .pane-articles {
      display: none !important;
    }
    .focus-mode .pane-reader {
      width: 100vw !important;
      max-width: 100vw !important;
    }

    /* Mobile Viewport (< 1024px) */
    .mobile-menu-btn { display: none; }
    .mobile-quick-add-btn { display: none; }

    @media (max-width: 1023px) {
      .pane-sidebar {
        display: none !important;
      }
      .mobile-menu-btn {
        display: inline-flex !important;
      }
      .mobile-quick-add-btn {
        display: inline-flex !important;
      }
      .pane-articles {
        width: 100vw !important;
        max-width: 100vw !important;
        border-right: none;
      }
      .pane-reader {
        display: none !important;
        width: 100vw !important;
      }
      body.is-reading-mobile .pane-articles {
        display: none !important;
      }
      body.is-reading-mobile .pane-reader {
        display: flex !important;
      }
      .desktop-focus-btn {
        display: none !important;
      }
    }

    .articles-grid {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      width: 100%;
    }
    .card-main-content {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.85rem;
      width: 100%;
    }
    .card-text-column {
      flex: 1;
      min-width: 0;
    }
    .card-image-wrap {
      width: 88px;
      height: 88px;
      min-width: 88px;
      max-width: 88px;
      border-radius: calc(var(--radius) - 4px);
      overflow: hidden;
      margin: 0;
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
    }
    .card-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.25s ease;
    }
    .article-card:hover .card-image {
      transform: scale(1.04);
    }

    /* Grid View: Cards are vertical, image is at top full width */
    .articles-grid.view-grid {
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
      gap: 0.85rem !important;
    }
    .articles-grid.view-grid .article-card {
      margin-bottom: 0 !important;
    }
    .articles-grid.view-grid .card-main-content {
      flex-direction: column !important;
      gap: 0.55rem !important;
    }
    .articles-grid.view-grid .card-image-wrap {
      order: -1 !important;
      width: 100% !important;
      max-width: 100% !important;
      height: 140px !important;
      margin-bottom: 0.35rem !important;
    }

    /* Compact View: dense rows, no images or excerpts */
    .articles-grid.view-compact {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.35rem !important;
    }
    .articles-grid.view-compact .article-card {
      padding: 0.55rem 0.75rem !important;
      margin-bottom: 0 !important;
      border-radius: var(--radius-sm) !important;
    }
    .articles-grid.view-compact .card-image-wrap,
    .articles-grid.view-compact .card-excerpt,
    .articles-grid.view-compact .card-tags {
      display: none !important;
    }
    .articles-grid.view-compact .card-title {
      font-size: 0.88rem !important;
      white-space: nowrap !important;
      text-overflow: ellipsis !important;
      display: block !important;
      margin-bottom: 0.2rem !important;
    }
    .articles-grid.view-compact .card-footer {
      padding-top: 0.2rem !important;
    }

    .search-dropdown-menu {
      position: absolute !important;
      top: calc(100% + 8px) !important;
      bottom: auto !important;
      right: 0 !important;
      left: auto !important;
      z-index: 300 !important;
      box-shadow: 0 14px 35px rgba(0, 0, 0, 0.6) !important;
    }

    @media (max-width: 1023px) {
      .desktop-refresh-btn {
        display: none !important;
      }
    }

    /* -------------------------------------------------------------
       ARTICLE CARDS & HIGHLIGHTS
       ------------------------------------------------------------- */
    .article-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 1.1rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: var(--shadow-sm);
      transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s, background-color 0.18s;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      margin-bottom: 0.85rem;
    }
    .article-card:hover {
      transform: translateY(-2px);
      border-color: rgba(249, 115, 22, 0.4);
      box-shadow: var(--shadow);
    }
    .article-card.is-reading {
      border-color: var(--accent) !important;
      background: var(--bg-card) !important;
      box-shadow: 0 0 0 1.5px var(--accent), var(--shadow-sm);
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
      transition: opacity 0.15s ease;
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
    }
    .card-checkbox.checked {
      background: var(--accent) !important;
      border-color: var(--accent) !important;
      color: white !important;
      transform: scale(1.05);
    }
    .card-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.45rem;
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
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.35;
      color: var(--text-primary);
      margin-bottom: 0.4rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-excerpt {
      font-size: 0.825rem;
      color: var(--text-secondary);
      line-height: 1.45;
      margin-bottom: 0.85rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 0.55rem;
      position: relative;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.4rem;
      margin-bottom: 0.35rem;
    }
    .tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      font-weight: 500;
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
      background: var(--bg-tertiary);
      color: var(--accent);
      border: 1px solid rgba(249, 115, 22, 0.25);
      cursor: pointer;
      text-decoration: none;
    }
    .tag-badge:hover {
      background: var(--accent);
      color: #ffffff;
    }
    .tag-badge.active-tag {
      background: var(--accent);
      color: #ffffff;
    }

    /* -------------------------------------------------------------
       READER CONTENT & TYPOGRAPHY
       ------------------------------------------------------------- */
    .reader-main-scroll {
      flex: 1;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1.5rem 1.5rem 6rem 1.5rem;
      padding-top: calc(58px + var(--app-safe-top));
      padding-left: max(1.5rem, env(safe-area-inset-left, 0px));
      padding-right: max(1.5rem, env(safe-area-inset-right, 0px));
      -webkit-overflow-scrolling: touch;
      position: relative;
      background: var(--bg-primary);
    }
    .reader-content-wrap {
      max-width: var(--reader-content-max-width, 740px);
      width: 100%;
      margin: 0 auto;
      transition: max-width 0.2s ease;
    }
    .reader-title {
      font-size: 1.85rem;
      font-weight: 700;
      line-height: 1.3;
      color: var(--text-primary);
      margin-bottom: 0.85rem;
    }
    .reader-meta {
      font-size: 0.84rem;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
      line-height: 1.6;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
    }
    .reader-meta a, .reader-original-link {
      color: var(--accent) !important;
      text-decoration: none !important;
      font-weight: 500 !important;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: var(--accent-subtle, rgba(59, 130, 246, 0.12));
      border: 1px solid rgba(59, 130, 246, 0.22);
      transition: all 0.2s ease;
      vertical-align: middle;
    }
    .reader-meta a:hover, .reader-original-link:hover {
      background: var(--accent);
      color: #ffffff !important;
      border-color: var(--accent);
      text-decoration: none !important;
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
    .reader-body {
      direction: ltr;
      text-align: left;
      font-family: var(--reader-font-family, var(--font-reader-serif));
      font-size: var(--reader-font-size, 18px);
      line-height: var(--reader-line-height, 1.68);
      color: var(--text-primary);
      word-wrap: break-word;
      overflow-wrap: break-word;
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
    .reader-body pre {
      background: var(--bg-secondary);
      padding: 1rem;
      border-radius: var(--radius-sm);
      overflow-x: auto;
      font-family: var(--font-reader-mono);
      font-size: 0.875rem;
      margin: 1.5rem 0;
    }
    .reader-body a, .reader-meta a {
      color: #38bdf8 !important;
      text-decoration: underline !important;
      text-decoration-color: rgba(56, 189, 248, 0.55) !important;
      text-underline-offset: 3px;
      font-weight: 500;
    }
    .reader-meta a:hover, .reader-body a:hover {
      color: #7dd3fc !important;
    }
    .reader-body blockquote {
      border-left: 3px solid var(--accent);
      padding-left: 1.25rem;
      margin: 1.5rem 0;
      font-style: italic;
      color: var(--text-secondary);
    }
    .reader-body[dir="rtl"], .reader-content-wrap.is-rtl .reader-body {
      direction: rtl !important;
      text-align: right !important;
    }

    /* Highlights & Notes */
    mark.reader-hl {
      border-radius: 3px;
      padding: 0.12em 0.18em;
      cursor: pointer;
      transition: all 0.15s ease;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    mark.reader-hl:hover { filter: brightness(1.15); }
    mark.reader-hl-yellow { background-color: rgba(234, 179, 8, 0.35); border-bottom: 2px solid #eab308; color: inherit; }
    mark.reader-hl-green { background-color: rgba(34, 197, 94, 0.32); border-bottom: 2px solid #22c55e; color: inherit; }
    mark.reader-hl-blue { background-color: rgba(59, 130, 246, 0.32); border-bottom: 2px solid #3b82f6; color: inherit; }
    mark.reader-hl-purple { background-color: rgba(168, 85, 247, 0.32); border-bottom: 2px solid #a855f7; color: inherit; }
    mark.reader-hl.has-note::after { content: " 💬"; font-size: 0.75em; opacity: 0.85; vertical-align: super; }

    .highlight-toolbar {
      position: fixed;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-lg);
      border-radius: 2rem;
      padding: 0.3rem 0.5rem;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .highlight-popover {
      position: fixed;
      z-index: 10001;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-lg);
      padding: 0.75rem;
      width: 280px;
      max-width: 90vw;
      font-size: 0.85rem;
      backdrop-filter: blur(12px);
    }

    .hl-color-btn {
      width: 22px !important;
      height: 22px !important;
      border-radius: 50% !important;
      border: 2px solid transparent;
      cursor: pointer;
      padding: 0;
      margin: 0;
      box-sizing: border-box;
    }
    .hl-color-btn.active-color { border-color: var(--text-primary) !important; transform: scale(1.1); }
    .hl-color-btn.hl-yellow { background: #eab308; }
    .hl-color-btn.hl-green { background: #22c55e; }
    .hl-color-btn.hl-blue { background: #3b82f6; }
    .hl-color-btn.hl-purple { background: #a855f7; }
    .hl-divider { width: 1px; height: 18px; background: var(--border-color); margin: 0 0.2rem; }
    .hl-btn { display: inline-flex; align-items: center; gap: 0.25rem; background: none; border: none; color: var(--text-primary); font-size: 0.78rem; padding: 0.25rem 0.45rem; border-radius: var(--radius-sm); cursor: pointer; }
    .hl-btn:hover { background: var(--bg-tertiary); }
    .hl-filter-pill { padding: 4px 10px; font-size: 0.75rem; border-radius: 20px; background: var(--bg-primary); color: var(--text-secondary); border: 1px solid var(--border-color); cursor: pointer; }
    .hl-filter-pill.active { background: var(--accent) !important; color: #ffffff !important; border-color: var(--accent) !important; font-weight: 600; }
    .hl-sort-btn { padding: 3px 9px; font-size: 0.72rem; border-radius: var(--radius-sm); background: var(--bg-primary); color: var(--text-secondary); border: 1px solid var(--border-color); cursor: pointer; }
    .hl-sort-btn.active { background: var(--accent) !important; color: #ffffff !important; border-color: var(--accent) !important; font-weight: 600; }
    .modal-hl-item { padding: 0.75rem 0.9rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 0.35rem; cursor: pointer; }
    .modal-hl-item:hover { border-color: var(--accent) !important; transform: translateY(-1px); }

    /* Modals & Dropdowns */
    .modal-backdrop, .tag-modal-overlay {
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
    .modal-backdrop.open, .tag-modal-overlay.open { display: flex; }
    .modal, .tag-modal {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--shadow-lg);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
      animation: modalFadeIn 0.2s ease-out;
    }
    @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .modal-header { display: flex; align-items: center; justify-content: space-between; }
    .modal-title { font-size: 1.15rem; font-weight: 700; }
    .close-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.25rem; padding: 0.25rem; }
    .close-btn:hover { color: var(--text-primary); }

    .card-dropdown-menu {
      position: absolute;
      bottom: calc(100% + 6px);
      right: 0;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      box-shadow: 0 14px 35px rgba(0, 0, 0, 0.55);
      min-width: 205px;
      padding: 0.4rem 0;
      z-index: 150;
      display: none;
      flex-direction: column;
      animation: menuFadeIn 0.15s ease-out;
    }
    .card-dropdown-menu.open { display: flex !important; }
    #cardContextMenu {
      position: fixed !important;
      bottom: auto !important;
      right: auto !important;
      width: 225px !important;
      min-width: 220px !important;
      max-width: 260px !important;
      z-index: 10050 !important;
      border-radius: var(--radius-sm);
      background: var(--bg-secondary) !important;
      border: 1px solid var(--border-color);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
      padding: 0.35rem 0;
      display: none;
      flex-direction: column;
      animation: menuFadeIn 0.15s ease-out;
    }
    #cardContextMenu.open { display: flex !important; }
    #cardContextMenu .menu-item {
      padding: 0.52rem 0.8rem;
      font-size: 0.84rem;
      border-radius: 4px;
      margin: 0 0.25rem;
      width: calc(100% - 0.5rem);
    }
    #cardContextMenu .menu-sub-items {
      margin: 0.2rem 0.25rem;
    }
    .card-dropdown-menu.open-down { bottom: auto !important; top: calc(100% + 6px) !important; }
    .menu-item {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.75rem;
      width: 100%;
      padding: 0.6rem 0.95rem;
      border: none;
      background: transparent;
      color: var(--text-primary);
      font-size: 0.85rem;
      cursor: pointer;
      text-align: left;
      box-sizing: border-box;
    }
    .menu-item.is-hidden {
      display: none !important;
    }
    .menu-item:hover { background: var(--bg-tertiary); }
    .menu-item-danger { color: #ef4444; }
    .menu-item-danger:hover { background: rgba(239, 68, 68, 0.15); }
    .menu-divider { height: 1px; background: var(--border-color); margin: 0.25rem 0; }
    .chevron-icon { transition: transform 0.2s ease; margin-left: auto; }
    .menu-item-expandable.expanded .chevron-icon { transform: rotate(180deg); }
    .menu-sub-items { display: none; flex-direction: column; background: var(--bg-primary); border-radius: var(--radius-sm); margin: 0.2rem 0.4rem; padding: 0.2rem 0; border: 1px solid var(--border-color); }
    .menu-item-expandable.expanded .menu-sub-items { display: flex; }
    .menu-sub-item { padding-left: 1.5rem !important; font-size: 0.8rem !important; }

    /* Mobile Drawer */
    .mobile-nav-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px); z-index: 340; display: none; opacity: 1; transition: opacity 0.25s ease; }
    .mobile-nav-backdrop.open { display: block; }
    .mobile-nav-dropdown {
      position: fixed; top: 0; left: 0; bottom: 0; width: 285px; max-width: 85vw;
      background: var(--bg-secondary); border-right: 1px solid var(--border-color);
      z-index: 350; display: flex; flex-direction: column; padding: 1.15rem 0.85rem;
      padding-top: max(1.5rem, calc(1.15rem + env(safe-area-inset-top, 0px)));
      padding-bottom: max(1.15rem, calc(0.85rem + env(safe-area-inset-bottom, 0px)));
      transform: translateX(-100%); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-y: auto; gap: 0.75rem;
      touch-action: pan-y;
      -webkit-overflow-scrolling: touch;
    }
    .mobile-nav-dropdown.open { transform: translateX(0); box-shadow: 4px 0 25px rgba(0,0,0,0.5); }
    .mobile-nav-divider { height: 1px; background: var(--border-color); margin: 0.35rem 0; }

    /* Reading Progress Bar & Toasts */
    .reading-progress-bar { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: var(--accent); z-index: 250; width: 0%; }
    .toast { position: fixed; bottom: 2rem; right: 2rem; background: var(--bg-secondary); border: 1px solid var(--border-color); box-shadow: var(--shadow); padding: 0.75rem 1.25rem; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 0.5rem; z-index: 999; transform: translateY(100px); opacity: 0; transition: all 0.25s; }
    .toast.show { transform: translateY(0); opacity: 1; }
    .code-box { background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem; font-family: var(--font-reader-mono); font-size: 0.8rem; color: var(--accent); user-select: all; }
    .auth-overlay { position: fixed; inset: 0; background: var(--bg-primary); z-index: 300; display: none; align-items: center; justify-content: center; padding: 1.5rem; }
    .auth-card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); width: 100%; max-width: 400px; padding: 2rem; box-shadow: var(--shadow); text-align: center; display: flex; flex-direction: column; gap: 1.25rem; }
    .auth-error-banner { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; border-radius: var(--radius-sm); padding: 0.65rem 0.85rem; font-size: 0.825rem; display: none; }
    .auth-error-banner.show { display: block; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
    .form-group input, .form-group textarea { background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.6rem 0.8rem; color: var(--text-primary); font-family: inherit; font-size: 0.875rem; outline: none; }
    .form-group input:focus, .form-group textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }
    .form-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
    @keyframes menuFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body>

  <!-- WallabagWebService Matcher Elements -->
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
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
      <svg id="pullToRefreshSvg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
    </div>
  </div>

  <!-- -------------------------------------------------------------
       MAIN 3-PANE WORKSPACE (.app-workspace)
       ------------------------------------------------------------- -->
  <div class="app-workspace" id="appWorkspace">
    <!-- Pane 1: Left Navigation Sidebar (.pane-sidebar, 250px fixed, desktop only) -->
    <aside class="pane-sidebar" id="paneSidebar">
      <div class="sidebar-brand-wrap">
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

      <button class="btn btn-primary" id="sidebarAddArticleBtn" onclick="handleAddArticleBtnClick()" title="Add URL" style="width: 100%; justify-content: center; padding: 0.55rem 0.85rem; font-weight: 600;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add URL</span>
      </button>

      <div class="sidebar-nav-group">
        <button class="sidebar-nav-item active" id="tabUnread" onclick="setFilter('unread')">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            <span>Unread</span>
          </div>
          <span class="badge-count" id="countUnread">0</span>
        </button>
        <button class="sidebar-nav-item" id="tabStarred" onclick="setFilter('starred')">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <span>Starred</span>
          </div>
          <span class="badge-count" id="countStarred">0</span>
        </button>
        <button class="sidebar-nav-item" id="tabArchive" onclick="setFilter('archive')">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
            <span>Archive</span>
          </div>
          <span class="badge-count" id="countArchive">0</span>
        </button>
        <button class="sidebar-nav-item" id="tabAll" onclick="setFilter('all')">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            <span>All Articles</span>
          </div>
          <span class="badge-count" id="countAll">0</span>
        </button>
      </div>

      <!-- Collapsible Tag List -->
      <div class="sidebar-section">
        <div class="sidebar-section-header" onclick="toggleSidebarTagsCollapse()">
          <span>Tags</span>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span class="badge-count" id="sidebarTagCount">0</span>
            <svg class="chevron-icon" id="sidebarTagChevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
        <div class="sidebar-tag-list" id="sidebarTagList"></div>
        <button class="sidebar-sub-action-btn" onclick="openGlobalTagManager()" title="Manage &amp; Clean Tags">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          <span>Manage Tags</span>
        </button>
      </div>

      <!-- Bottom Utility Actions -->
      <div class="sidebar-footer-actions">
        <div class="sidebar-theme-picker" id="sidebarThemePicker" title="Theme Selector">
          <button type="button" class="theme-swatch-btn" data-theme="dark" onclick="setTheme('dark')" title="Dark Theme">
            <span class="theme-swatch-circle" style="background: #0f172a; border: 1.5px solid #475569;"></span>
            <span class="theme-swatch-label">Dark</span>
          </button>
          <button type="button" class="theme-swatch-btn" data-theme="light" onclick="setTheme('light')" title="Light Theme">
            <span class="theme-swatch-circle" style="background: #ffffff; border: 1.5px solid #cbd5e1;"></span>
            <span class="theme-swatch-label">Light</span>
          </button>
          <button type="button" class="theme-swatch-btn" data-theme="sepia" onclick="setTheme('sepia')" title="Sepia Theme">
            <span class="theme-swatch-circle" style="background: #f4ecd8; border: 1.5px solid #d97706;"></span>
            <span class="theme-swatch-label">Sepia</span>
          </button>
          <button type="button" class="theme-swatch-btn" data-theme="oled" onclick="setTheme('oled')" title="OLED Black Theme">
            <span class="theme-swatch-circle" style="background: #000000; border: 1.5px solid #334155;"></span>
            <span class="theme-swatch-label">OLED</span>
          </button>
        </div>

        <button class="sidebar-nav-item" id="sidebarSettingsBtn" onclick="openModal('settingsModal')" title="Settings">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span>Settings</span>
          </div>
        </button>

        <div style="font-size: 0.7rem; color: var(--text-muted); padding: 0.35rem 0.5rem 0 0.5rem; text-align: center;">
          <span id="sidebarVersionLabel">Wallaflare v1.0.0</span>
        </div>
      </div>
    </aside>

    <!-- Pane 2: Middle Articles Column (.pane-articles, 380px fixed / flex) -->
    <section class="pane-articles" id="paneArticles">
      <div class="pane-articles-toolbar" id="standardNavHeader">
        <button class="btn-icon mobile-menu-btn" id="mobileNavMenuBtn" onclick="toggleMobileNavMenu(event)" title="Open Menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>

        <div class="nav-search">
          <svg class="search-magnifier" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="searchInput" placeholder="Search articles or /..." oninput="handleSearchInput()">
          <button type="button" class="search-ctrl-btn" id="searchClearBtn" onclick="clearSearchInput()" title="Clear Search" style="display: none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <div class="search-ctrl-divider"></div>
          <button type="button" class="search-ctrl-btn" id="cycleLayoutBtn" onclick="cycleViewMode()" title="Toggle View Layout (List / Grid / Compact)">
            <span id="cycleLayoutIcon" style="display: flex; align-items: center; justify-content: center; pointer-events: none;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </span>
          </button>
          <button type="button" class="search-ctrl-btn desktop-refresh-btn" id="desktopRefreshBtn" onclick="handleManualRefresh(this)" title="Refresh Library">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>
          <div class="card-menu-wrap" style="position: relative;">
            <button type="button" class="search-ctrl-btn" id="sortBtn" onclick="event.stopPropagation(); toggleSortMenu()" title="Sort Articles">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;"><line x1="12" y1="4" x2="12" y2="20"></line><polyline points="18 14 12 20 6 14"></polyline><polyline points="6 10 12 4 18 10"></polyline></svg>
            </button>
            <div class="search-dropdown-menu card-dropdown-menu" id="sortDropdownMenu" onclick="event.stopPropagation()">
              <button class="menu-item" id="sortOptNewest" onclick="setSortOrder('newest')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span>Newest First</span></button>
              <button class="menu-item" id="sortOptOldest" onclick="setSortOrder('oldest')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg><span>Oldest First</span></button>
              <button class="menu-item" id="sortOptShortest" onclick="setSortOrder('shortest')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="12" x2="12" y2="12"></line><line x1="4" y1="6" x2="8" y2="6"></line><line x1="4" y1="18" x2="16" y2="18"></line></svg><span>Shortest Read</span></button>
              <button class="menu-item" id="sortOptLongest" onclick="setSortOrder('longest')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="16" y2="12"></line><line x1="4" y1="18" x2="12" y2="18"></line></svg><span>Longest Read</span></button>
              <button class="menu-item" id="sortOptTitle" onclick="setSortOrder('title')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"></path><line x1="12" y1="4" x2="12" y2="20"></line></svg><span>Title (A-Z)</span></button>
            </div>
          </div>
        </div>

        <button class="btn-icon mobile-quick-add-btn" id="addArticleBtn" onclick="handleAddArticleBtnClick()" title="Add URL">
          <svg id="addArticleBtnIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span id="addArticleBtnLabel" style="display: none;">Add URL</span>
        </button>
      </div>

      <!-- Batch Selection Contextual Action Header -->
      <div id="batchActionHeader" class="pane-articles-toolbar" style="display: none;">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <button class="btn-icon" onclick="clearArticleSelection()" title="Cancel Selection" style="flex-shrink: 0;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <span id="batchSelectedCount" style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary); white-space: nowrap;">0 selected</span>
        </div>

        <div style="display: flex; align-items: center; gap: 0.35rem; margin-left: auto;">
          <button class="btn-icon" onclick="batchToggleStar()" title="Toggle Star" id="batchStarBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </button>
          <button class="btn-icon" onclick="batchToggleArchive()" title="Toggle Archive" id="batchArchiveBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
          </button>
          <button class="btn-icon" onclick="batchManageTags()" title="Add / Manage Tags">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          </button>
          <div class="card-menu-wrap" style="position: relative;">
            <button class="btn-icon" title="More Options" onclick="event.stopPropagation(); toggleBatchMenu()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
            </button>
            <div class="card-dropdown-menu" id="batchDropdownMenu" onclick="event.stopPropagation()" style="position: absolute; top: calc(100% + 8px); bottom: auto !important; right: 0; left: auto; min-width: 215px;">
              <button class="menu-item" id="batchTagMenuItem" onclick="closeBatchMenu(); batchManageTags();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg><span>Edit Tags</span></button>
              <button class="menu-item" id="batchHighlightsBtn" onclick="closeBatchMenu(); batchOpenHighlights();" style="display: none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg><span id="batchHighlightsLabel">Highlights &amp; Notes</span></button>
              <button class="menu-item" id="batchOpenOriginalBtn" onclick="closeBatchMenu(); batchOpenOriginal();" style="display: none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg><span>Open Original Link</span></button>
              <button class="menu-item" id="batchEditTitleBtn" onclick="closeBatchMenu(); batchEditTitle();" style="display: none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg><span>Edit Title</span></button>
              <div class="menu-item-expandable" id="batchExportWrap">
                <button class="menu-item menu-item-parent" onclick="event.stopPropagation(); toggleBatchExportSubmenu()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>Export</span>
                  <svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="menu-sub-items" id="batchExportSub">
                  <button class="menu-item menu-sub-item" id="batchExportEpubBtn" onclick="closeBatchMenu(); handleBatchExportEpub();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span id="batchExportEpubLabel">EPUB (.epub)</span></button>
                  <button class="menu-item menu-sub-item" id="batchExportMdBtn" onclick="closeBatchMenu(); handleBatchExportMarkdown();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span id="batchExportMdLabel">Markdown (.md)</span></button>
                  <button class="menu-item menu-sub-item" id="batchExportPdfBtn" onclick="closeBatchMenu(); handleBatchExportPdf();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h3a1.5 1.5 0 0 0 0-3H8v6"></path><path d="M14 10v6"></path></svg><span id="batchExportPdfLabel">PDF (.pdf)</span></button>
                  <button class="menu-item menu-sub-item" id="batchExportJsonBtn" onclick="closeBatchMenu(); handleBatchExportJson();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><span id="batchExportJsonLabel">JSON (.json)</span></button>
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

      <!-- Active Tag Filter Banner -->
      <div id="activeTagFilterBanner" style="display: none; align-items: center; justify-content: space-between; background: var(--bg-secondary); border-bottom: 1px solid var(--accent); padding: 0.45rem 0.85rem;">
        <div style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden;">
          <span style="font-size: 0.8rem; color: var(--text-secondary);">Tag:</span>
          <span class="tag-badge" id="activeTagName" style="font-size: 0.8rem;"></span>
        </div>
        <button class="btn btn-outline" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;" onclick="filterByTag(null)">Clear</button>
      </div>

      <!-- Status Indicator -->
      <div id="statusIndicator" style="font-size: 0.75rem; color: var(--text-muted); padding: 0.2rem 0.85rem; display: none;"></div>

      <!-- Articles Scroll Container -->
      <div class="articles-scroll-container" id="articlesScrollContainer">
        <div class="articles-grid" id="articlesGrid"></div>
        <div class="empty-state" id="emptyState" style="display: none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          <h3>No articles found</h3>
          <p>Add a URL or custom text to start reading.</p>
        </div>
      </div>
    </section>

    <!-- Pane 3: Right Active Reader Pane (.pane-reader, flex 1) -->
    <main class="pane-reader" id="paneReader">
      <!-- Empty state when no article is active -->
      <div class="reader-empty-pane" id="readerEmptyPane">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
        <div class="reader-empty-title">Select an article to read</div>
        <div class="reader-empty-desc">Choose any story from your library on the left, or use quick keyboard navigation.</div>
        
        <div class="reader-shortcuts-box">
          <div class="reader-shortcuts-box-title">Keyboard Shortcuts</div>
          <div class="shortcut-row"><span>Next article</span><span><kbd class="shortcut-kbd">j</kbd> or <kbd class="shortcut-kbd">↓</kbd></span></div>
          <div class="shortcut-row"><span>Previous article</span><span><kbd class="shortcut-kbd">k</kbd> or <kbd class="shortcut-kbd">↑</kbd></span></div>
          <div class="shortcut-row"><span>Focus / Zen Mode</span><kbd class="shortcut-kbd">f</kbd></div>
          <div class="shortcut-row"><span>Archive / Unarchive</span><kbd class="shortcut-kbd">e</kbd></div>
          <div class="shortcut-row"><span>Star / Unstar</span><kbd class="shortcut-kbd">s</kbd></div>
          <div class="shortcut-row"><span>Search library</span><kbd class="shortcut-kbd">/</kbd></div>
          <div class="shortcut-row"><span>Close / Deselect</span><kbd class="shortcut-kbd">Esc</kbd></div>
        </div>
      </div>

      <!-- Active Reader Content View (#readerView) -->
      <div class="reader-view" id="readerView" style="display: none; width: 100%; height: 100%; flex-direction: column; overflow: hidden; position: relative;">
        <!-- Filled Status Bar Clearance for Punch-Hole and Notch -->
        <div class="reader-safe-top-fill" id="readerSafeTopFill"></div>
        <div class="reader-top-hover-trigger" onmouseenter="showReaderTopBar(true)"></div>

        <!-- Unified Top Action Bar -->
        <div class="reader-top-bar" id="readerTopBar">
          <!-- 1. Standard Default Header -->
          <div id="readerTopBarDefault" style="display: flex; align-items: center; justify-content: space-between; width: 100%; height: 100%;">
            <div class="reader-top-bar-group">
              <button class="btn-icon" onclick="handleReaderBack()" title="Back to library / Deselect (Esc)">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              </button>
              <button class="btn-icon desktop-focus-btn" id="focusModeToggleBtn" onclick="toggleReaderFocusMode()" title="Toggle Focus Mode (f)">
                <svg id="focusModeIcon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
              </button>
            </div>

            <div class="reader-top-bar-group" style="margin-left: auto;">
              <button class="btn-icon" id="readerAppearanceBtn" onclick="toggleReaderAppearancePopover(event)" title="Typography &amp; Theme (Aa)">
                <span style="font-family: serif; font-weight: bold; font-size: 1.05rem;">Aa</span>
              </button>
              <button class="btn-icon" id="readerMobileHighlightsBtn" onclick="toggleReaderHighlightsModal()" title="Highlights &amp; Notes" style="position: relative;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <span id="readerHighlightsBadgeMobile" style="position: absolute; top: -2px; right: -2px; background: var(--accent); color: #fff; font-size: 0.65rem; font-weight: 700; border-radius: 10px; min-width: 16px; height: 16px; display: none; align-items: center; justify-content: center; padding: 0 3px;">0</span>
              </button>
              <button class="btn-icon" id="readerStarBtn" onclick="toggleActiveStar()" title="Toggle Star (s)">
                <svg width="17" height="17" id="readerStarIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </button>
              <button class="btn-icon" id="readerArchiveBtn" onclick="toggleActiveArchive()" title="Toggle Archive (e)">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
              </button>
              <button class="btn-icon" onclick="openTagModal(activeArticleId)" title="Edit Tags">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
              </button>
              
              <div class="card-menu-wrap" style="position: relative;">
                <button class="btn-icon" id="readerMoreMenuBtn" onclick="toggleReaderMoreMenu(event)" title="More Actions">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
                </button>
                <div class="card-dropdown-menu" id="readerMoreMenuDropdown" onclick="event.stopPropagation()" style="position: absolute; top: calc(100% + 6px); bottom: auto !important; right: 0; left: auto; min-width: 205px;">
                  <div class="menu-item-expandable" id="readerExportWrap">
                    <button class="menu-item menu-item-parent" onclick="event.stopPropagation(); toggleReaderExportSubmenu()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      <span>Export</span>
                      <svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="menu-sub-items" id="readerExportSub">
                      <button class="menu-item menu-sub-item" onclick="closeReaderMoreMenu(); downloadActiveEpub();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>EPUB (.epub)</span></button>
                      <button class="menu-item menu-sub-item" onclick="closeReaderMoreMenu(); exportActiveMarkdown();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span>Markdown (.md)</span></button>
                      <button class="menu-item menu-sub-item" onclick="closeReaderMoreMenu(); exportActivePdf();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h3a1.5 1.5 0 0 0 0-3H8v6"></path><path d="M14 10v6"></path></svg><span>PDF (.pdf)</span></button>
                    </div>
                  </div>
                  <button class="menu-item" id="readerRefetchMenuItem" onclick="closeReaderMoreMenu(); refetchActiveArticleContent();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg><span>Re-fetch Content</span></button>
                  <button class="menu-item" id="readerOpenOriginalMenuItem" onclick="closeReaderMoreMenu(); openActiveOriginalLink();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg><span>Open Original Link</span></button>
                  <button class="menu-item" onclick="closeReaderMoreMenu(); openEditTitleModal(activeArticleId);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg><span>Edit Title</span></button>
                  <div class="menu-divider"></div>
                  <button class="menu-item menu-item-danger" onclick="closeReaderMoreMenu(); deleteActiveArticle();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg><span>Delete Article</span></button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Mobile Contextual Text Selection & Annotation Header -->
          <div id="readerTopBarAnnotation" style="display: none; align-items: center; justify-content: space-between; width: 100%; height: 100%; gap: 0.35rem;">
            <div class="reader-top-bar-group" style="gap: 0.3rem; flex-shrink: 0;">
              <button class="btn-icon" onclick="clearActiveTextSelection()" title="Cancel Selection" style="color: var(--text-secondary);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 68px;" id="readerTopBarSelCount">Highlight</div>
            </div>

            <div class="reader-top-bar-group" style="margin-left: auto; gap: 0.35rem;">
              <div class="reader-topbar-hl-colors" style="display: flex; align-items: center; gap: 0.35rem;">
                <button class="hl-color-btn hl-yellow" onmousedown="event.preventDefault()" onclick="handleCreateHighlight('yellow')" title="Yellow Highlight"></button>
                <button class="hl-color-btn hl-green" onmousedown="event.preventDefault()" onclick="handleCreateHighlight('green')" title="Green Highlight"></button>
                <button class="hl-color-btn hl-blue" onmousedown="event.preventDefault()" onclick="handleCreateHighlight('blue')" title="Blue Highlight"></button>
                <button class="hl-color-btn hl-purple" onmousedown="event.preventDefault()" onclick="handleCreateHighlight('purple')" title="Purple Highlight"></button>
              </div>
              <div class="hl-divider" style="height: 18px; width: 1px; background: var(--border-color); margin: 0 0.1rem;"></div>
              <button class="btn-icon" onmousedown="event.preventDefault()" onclick="handleCreateHighlightWithNote()" title="Add Note" style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; padding: 0 0.45rem; width: auto; height: 32px; border-radius: 6px; background: var(--bg-tertiary);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <span style="font-weight: 500;">Note</span>
              </button>
              <button class="btn-icon" onmousedown="event.preventDefault()" onclick="handleCopySelection()" title="Copy text" style="width: 32px; height: 32px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Live Floating Typography Popover -->
        <div class="reader-appearance-popover" id="readerAppearancePopover" style="display: none;" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="font-weight: 700; font-size: 0.92rem;">Typography &amp; Theme</span>
            <button class="close-btn" onclick="toggleReaderAppearancePopover()">&times;</button>
          </div>

          <div>
            <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.35rem;">Font Family</label>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.35rem;" id="popoverFontFamilyBtns">
              <button class="btn btn-outline opt-font-btn" data-font="sans" onclick="setReaderFontFamily('sans')">Sans</button>
              <button class="btn btn-outline opt-font-btn" data-font="serif" onclick="setReaderFontFamily('serif')">Serif</button>
              <button class="btn btn-outline opt-font-btn" data-font="mono" onclick="setReaderFontFamily('mono')">Mono</button>
              <button class="btn btn-outline opt-font-btn" data-font="dyslexic" onclick="setReaderFontFamily('dyslexic')">Dyslexic</button>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Font Size</label>
              <span id="fontSizeDisplay" style="font-size: 0.8rem; font-weight: 700; color: var(--accent);">18px</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <button class="btn btn-secondary" style="padding: 0.25rem 0.55rem; font-weight: bold;" onclick="adjustReaderFontSize(-1)">A-</button>
              <input type="range" id="fontSizeRange" min="12" max="32" step="1" style="flex: 1; accent-color: var(--accent); cursor: pointer;" oninput="setReaderFontSize(parseInt(this.value, 10))">
              <button class="btn btn-secondary" style="padding: 0.25rem 0.55rem; font-weight: bold;" onclick="adjustReaderFontSize(1)">A+</button>
            </div>
          </div>

          <div>
            <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.35rem;">Line Spacing</label>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem;" id="popoverLineHeightBtns">
              <button class="btn btn-outline opt-lh-btn" data-lh="1.4" onclick="setReaderLineHeight('1.4')">Compact</button>
              <button class="btn btn-outline opt-lh-btn" data-lh="1.68" onclick="setReaderLineHeight('1.68')">Normal</button>
              <button class="btn btn-outline opt-lh-btn" data-lh="1.9" onclick="setReaderLineHeight('1.9')">Relaxed</button>
            </div>
          </div>

          <div>
            <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.35rem;">Content Width</label>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.35rem;" id="popoverContentWidthBtns">
              <button class="btn btn-outline opt-width-btn" data-width="620px" onclick="setReaderContentWidth('620px')">Narrow</button>
              <button class="btn btn-outline opt-width-btn" data-width="740px" onclick="setReaderContentWidth('740px')">Medium</button>
              <button class="btn btn-outline opt-width-btn" data-width="880px" onclick="setReaderContentWidth('880px')">Wide</button>
              <button class="btn btn-outline opt-width-btn" data-width="100%" onclick="setReaderContentWidth('100%')">Full</button>
            </div>
          </div>

          <div>
            <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.35rem;">Theme</label>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.45rem;" id="popoverThemeBtns">
              <button class="btn btn-outline opt-theme-btn" data-theme="light" onclick="setTheme('light')" style="justify-content: flex-start; gap: 0.45rem; padding: 0.45rem 0.6rem;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#ffffff;border:1px solid #94a3b8;flex-shrink:0;"></span><span>Light</span></button>
              <button class="btn btn-outline opt-theme-btn" data-theme="sepia" onclick="setTheme('sepia')" style="justify-content: flex-start; gap: 0.45rem; padding: 0.45rem 0.6rem;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#f4ecd8;border:1px solid #b45309;flex-shrink:0;"></span><span>Sepia</span></button>
              <button class="btn btn-outline opt-theme-btn" data-theme="dark" onclick="setTheme('dark')" style="justify-content: flex-start; gap: 0.45rem; padding: 0.45rem 0.6rem;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#0f172a;border:1px solid #475569;flex-shrink:0;"></span><span>Dark</span></button>
              <button class="btn btn-outline opt-theme-btn" data-theme="oled" onclick="setTheme('oled')" style="justify-content: flex-start; gap: 0.45rem; padding: 0.45rem 0.6rem;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#000000;border:1px solid #334155;flex-shrink:0;"></span><span>OLED</span></button>
            </div>
          </div>
        </div>

        <!-- Reader Scroll Area -->
        <section class="reader-main-scroll" id="readerScrollContainer" onscroll="handleReaderScroll()" onclick="handleReaderBodyClick(event)">
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
    </main>
  </div>

  <!-- Mobile Slide-out Drawer (Mirrors Desktop Sidebar) -->
  <div class="mobile-nav-backdrop" id="mobileNavBackdrop" onclick="closeMobileNavMenu()"></div>
  <div class="mobile-nav-dropdown" id="mobileNavDropdown">
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.25rem 0.75rem 0.25rem; border-bottom: 1px solid var(--border-color);">
      <div class="brand" style="cursor: pointer;" onclick="navigateTo('/'); closeMobileNavMenu();">
        <div class="brand-icon" style="width: 32px; height: 32px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <span style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${appName}</span>
        <span class="brand-tag">Edge E-ink</span>
      </div>
      <button class="close-btn" onclick="closeMobileNavMenu()">&times;</button>
    </div>

    <button class="btn btn-primary" onclick="handleAddArticleBtnClick(); closeMobileNavMenu();" title="Add URL" style="width: 100%; justify-content: center; padding: 0.55rem 0.85rem; font-weight: 600;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      <span>Add URL</span>
    </button>

    <div class="sidebar-nav-group">
      <button class="sidebar-nav-item active" id="tabUnreadMobile" onclick="setFilter('unread'); closeMobileNavMenu();">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          <span>Unread</span>
        </div>
        <span class="badge-count" id="countUnreadMobile">0</span>
      </button>
      <button class="sidebar-nav-item" id="tabStarredMobile" onclick="setFilter('starred'); closeMobileNavMenu();">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span>Starred</span>
        </div>
        <span class="badge-count" id="countStarredMobile">0</span>
      </button>
      <button class="sidebar-nav-item" id="tabArchiveMobile" onclick="setFilter('archive'); closeMobileNavMenu();">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
          <span>Archive</span>
        </div>
        <span class="badge-count" id="countArchiveMobile">0</span>
      </button>
      <button class="sidebar-nav-item" id="tabAllMobile" onclick="setFilter('all'); closeMobileNavMenu();">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          <span>All Articles</span>
        </div>
        <span class="badge-count" id="countAllMobile">0</span>
      </button>
    </div>

    <!-- Mobile Collapsible Tag List -->
    <div class="sidebar-section">
      <div class="sidebar-section-header" onclick="toggleSidebarTagsCollapse()">
        <span>Tags</span>
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <span class="badge-count" id="sidebarTagCountMobile">0</span>
          <svg class="chevron-icon" id="sidebarTagChevronMobile" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      </div>
      <div class="sidebar-tag-list" id="sidebarTagListMobile"></div>
      <button class="sidebar-sub-action-btn" onclick="openGlobalTagManager(); closeMobileNavMenu();" title="Manage Tags">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
        <span>Manage Tags</span>
      </button>
    </div>
    
    <div class="sidebar-theme-picker" id="mobileThemePicker" title="Theme Selector" style="margin-top: auto; padding: 0.5rem 0.25rem;">
      <button type="button" class="theme-swatch-btn" data-theme="dark" onclick="setTheme('dark')" title="Dark Theme">
        <span class="theme-swatch-circle" style="background: #0f172a; border: 1.5px solid #475569;"></span>
        <span class="theme-swatch-label">Dark</span>
      </button>
      <button type="button" class="theme-swatch-btn" data-theme="light" onclick="setTheme('light')" title="Light Theme">
        <span class="theme-swatch-circle" style="background: #ffffff; border: 1.5px solid #cbd5e1;"></span>
        <span class="theme-swatch-label">Light</span>
      </button>
      <button type="button" class="theme-swatch-btn" data-theme="sepia" onclick="setTheme('sepia')" title="Sepia Theme">
        <span class="theme-swatch-circle" style="background: #f4ecd8; border: 1.5px solid #d97706;"></span>
        <span class="theme-swatch-label">Sepia</span>
      </button>
      <button type="button" class="theme-swatch-btn" data-theme="oled" onclick="setTheme('oled')" title="OLED Black Theme">
        <span class="theme-swatch-circle" style="background: #000000; border: 1.5px solid #334155;"></span>
        <span class="theme-swatch-label">OLED</span>
      </button>
    </div>

    <button class="sidebar-nav-item" onclick="closeMobileNavMenu(); openModal('settingsModal');" title="Settings">
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        <span>Settings</span>
      </div>
    </button>

    <div style="padding: 0.75rem 0.5rem 0.5rem 0.5rem; font-size: 0.72rem; color: var(--text-muted); text-align: center; border-top: 1px solid var(--border-color);">
      <span id="mobileVersionLabel">Wallaflare v1.0.0</span>
    </div>
  </div>

  <!-- Floating Highlight Toolbar (Desktop) -->
  <div id="readerHighlightToolbar" class="highlight-toolbar" style="display: none;" onmousedown="event.preventDefault()">
    <button class="hl-color-btn hl-yellow" onmousedown="event.preventDefault()" onclick="handleCreateHighlight('yellow')" title="Yellow Highlight"></button>
    <button class="hl-color-btn hl-green" onmousedown="event.preventDefault()" onclick="handleCreateHighlight('green')" title="Green Highlight"></button>
    <button class="hl-color-btn hl-blue" onmousedown="event.preventDefault()" onclick="handleCreateHighlight('blue')" title="Blue Highlight"></button>
    <button class="hl-color-btn hl-purple" onmousedown="event.preventDefault()" onclick="handleCreateHighlight('purple')" title="Purple Highlight"></button>
    <div class="hl-divider"></div>
    <button class="hl-btn" onmousedown="event.preventDefault()" onclick="handleCreateHighlightWithNote()" title="Highlight with Note">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
      <span>Note</span>
    </button>
    <button class="hl-btn" onmousedown="event.preventDefault()" onclick="handleCopySelection()" title="Copy Selection">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      <span>Copy</span>
    </button>
  </div>

  <!-- Highlight Popover -->
  <div id="highlightPopover" class="highlight-popover" style="display: none;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
      <div style="display: flex; gap: 0.35rem; align-items: center;" id="popoverColors">
        <button class="hl-color-btn hl-yellow" onclick="changePopoverHighlightColor('yellow')" title="Yellow"></button>
        <button class="hl-color-btn hl-green" onclick="changePopoverHighlightColor('green')" title="Green"></button>
        <button class="hl-color-btn hl-blue" onclick="changePopoverHighlightColor('blue')" title="Blue"></button>
        <button class="hl-color-btn hl-purple" onclick="changePopoverHighlightColor('purple')" title="Purple"></button>
      </div>
      <div style="display: flex; gap: 0.25rem; align-items: center;">
        <button class="btn-icon" onclick="copyPopoverQuote()" title="Copy Quote" style="padding: 3px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="btn-icon" onclick="deletePopoverHighlight()" title="Delete Highlight" style="color: var(--danger); padding: 3px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
    <div id="popoverNoteText" style="color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 0.8rem; font-style: italic; line-height: 1.35; max-height: 80px; overflow-y: auto; word-break: break-word;"></div>
    <div style="display: flex; justify-content: flex-end; gap: 0.4rem;">
      <button class="btn btn-outline" style="font-size: 0.75rem; padding: 2px 8px;" onclick="openAnnotationNoteModal(activePopoverAnnotation)">Edit Note</button>
      <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 2px 8px;" onclick="closeHighlightPopover()">Close</button>
    </div>
  </div>

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

  <!-- Modal: Server Connection Modal -->
  <div class="modal-backdrop" id="serverConnectModal">
    <div class="modal" style="max-width: 480px;">
      <div class="modal-header">
        <h3 class="modal-title">Connect to Wallaflare Server</h3>
        <button class="close-btn" onclick="closeModal('serverConnectModal')">&times;</button>
      </div>
      <form onsubmit="handleSaveServerConnection(event)" style="display: flex; flex-direction: column; gap: 0.95rem;">
        <div class="form-group">
          <label for="serverUrlInput">Wallaflare Server URL *</label>
          <input type="url" id="serverUrlInput" placeholder="https://wallaflare.idodos.org" required>
        </div>
        <div class="form-group">
          <label for="serverTokenInput">API Auth Token / Password (Optional)</label>
          <input type="password" id="serverTokenInput" placeholder="Your AUTH_TOKEN if configured">
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
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
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
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
            <label for="textAuthor">Author (Optional)</label>
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
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
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

  <!-- Modal: Article Highlights & Notes Navigator -->
  <div class="modal-backdrop" id="readerHighlightsModal" style="z-index: 10001 !important;">
    <div class="modal" style="max-width: 560px; text-align: left; max-height: 85vh; display: flex; flex-direction: column; padding: 0;">
      <div class="modal-header" style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.25rem;">🖍️</span>
          <h3 class="modal-title" id="modalHighlightsTitle">Highlights &amp; Notes</h3>
          <span class="badge" id="modalHighlightsCountBadge" style="background: var(--accent); color: #fff; font-size: 0.72rem; padding: 2px 7px; border-radius: 12px;">0</span>
        </div>
        <button class="close-btn" onclick="closeModal('readerHighlightsModal')">&times;</button>
      </div>

      <div style="padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.65rem; background: var(--bg-secondary);">
        <div style="display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 2px;" id="highlightsFilterPills">
          <button class="hl-filter-pill active" onclick="filterHighlightsModalList('all', this)">All</button>
          <button class="hl-filter-pill" onclick="filterHighlightsModalList('yellow', this)">🟡 Yellow</button>
          <button class="hl-filter-pill" onclick="filterHighlightsModalList('green', this)">🟢 Green</button>
          <button class="hl-filter-pill" onclick="filterHighlightsModalList('blue', this)">🔵 Blue</button>
          <button class="hl-filter-pill" onclick="filterHighlightsModalList('purple', this)">🟣 Purple</button>
          <button class="hl-filter-pill" onclick="filterHighlightsModalList('notes', this)">💬 With Notes</button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem;">
          <span style="color: var(--text-muted); font-size: 0.75rem;">Sort Highlights:</span>
          <div style="display: flex; gap: 0.35rem;" id="highlightsSortWrap">
            <button class="hl-sort-btn active" id="btnSortPosition" onclick="setHighlightsSort('position', this)" title="Article Reading Order">📖 Article Order</button>
            <button class="hl-sort-btn" id="btnSortTime" onclick="setHighlightsSort('time', this)" title="Newest Highlights First">⏱️ Newest First</button>
          </div>
        </div>
      </div>

      <div id="modalHighlightsList" style="flex: 1; overflow-y: auto; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;"></div>

      <div style="padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; background: var(--bg-primary);">
        <span style="font-size: 0.78rem; color: var(--text-muted);">💡 Tap any highlight to jump directly to it</span>
        <button class="btn btn-secondary" onclick="closeModal('readerHighlightsModal')">Close</button>
      </div>
    </div>
  </div>

  <!-- Modal: Annotation Note Editor -->
  <div class="modal-backdrop" id="annotationNoteModal" style="z-index: 10002 !important;">
    <div class="modal" style="max-width: 480px; text-align: left;">
      <div class="modal-header">
        <h3 class="modal-title">Highlight Note</h3>
        <button class="close-btn" onclick="closeAnnotationNoteModal()">&times;</button>
      </div>
      <form onsubmit="handleSaveAnnotationNoteForm(event)">
        <div style="margin-bottom: 0.85rem; padding: 0.65rem 0.85rem; background: var(--bg-primary); border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4; max-height: 100px; overflow-y: auto;">
          <span style="font-weight: 600; color: var(--accent); margin-right: 0.25rem;">Quote:</span>
          <span id="annotationNoteQuotePreview"></span>
        </div>
        <div style="margin-bottom: 0.85rem;">
          <label style="font-weight: 500; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">Highlight Color</label>
          <div style="display: flex; gap: 0.5rem; align-items: center;" id="modalNoteColors">
            <button type="button" class="hl-color-btn hl-yellow active-color" data-color="yellow" onclick="selectModalNoteColor('yellow', this)" title="Yellow"></button>
            <button type="button" class="hl-color-btn hl-green" data-color="green" onclick="selectModalNoteColor('green', this)" title="Green"></button>
            <button type="button" class="hl-color-btn hl-blue" data-color="blue" onclick="selectModalNoteColor('blue', this)" title="Blue"></button>
            <button type="button" class="hl-color-btn hl-purple" data-color="purple" onclick="selectModalNoteColor('purple', this)" title="Purple"></button>
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 1rem;">
          <label for="annotationNoteInput" style="font-weight: 500; font-size: 0.85rem; margin-bottom: 0.35rem; display: block;">Personal Note / Comment</label>
          <textarea id="annotationNoteInput" class="form-input" rows="4" placeholder="Add your thoughts or notes on this highlight..." style="width: 100%; box-sizing: border-box; resize: vertical;"></textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
          <button type="button" class="btn btn-secondary" onclick="closeAnnotationNoteModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="saveAnnotationNoteBtn">Save Note</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Unified App Settings -->
  <div class="modal-backdrop" id="settingsModal" onclick="if(event.target === this) closeModal('settingsModal')">
    <div class="modal" style="max-width: 520px;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <h3 class="modal-title">Settings</h3>
        </div>
        <button class="close-btn" onclick="closeModal('settingsModal')">&times;</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.15rem; font-size: 0.88rem; max-height: 72vh; overflow-y: auto; padding-right: 0.25rem;">
        <!-- Appearance & Theme Section -->
        <div>
          <div style="font-weight: 700; font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.55rem;">Theme &amp; Appearance</div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.45rem; margin-bottom: 0.75rem;">
            <button class="btn btn-outline opt-theme-btn" data-theme="dark" onclick="setTheme('dark')" style="flex-direction: column; gap: 0.35rem; padding: 0.55rem 0.35rem; justify-content: center;">
              <span class="theme-swatch-circle" style="background:#0f172a;border:1.5px solid #475569;width:16px;height:16px;"></span>
              <span style="font-size: 0.78rem;">Dark</span>
            </button>
            <button class="btn btn-outline opt-theme-btn" data-theme="light" onclick="setTheme('light')" style="flex-direction: column; gap: 0.35rem; padding: 0.55rem 0.35rem; justify-content: center;">
              <span class="theme-swatch-circle" style="background:#ffffff;border:1.5px solid #cbd5e1;width:16px;height:16px;"></span>
              <span style="font-size: 0.78rem;">Light</span>
            </button>
            <button class="btn btn-outline opt-theme-btn" data-theme="sepia" onclick="setTheme('sepia')" style="flex-direction: column; gap: 0.35rem; padding: 0.55rem 0.35rem; justify-content: center;">
              <span class="theme-swatch-circle" style="background:#f4ecd8;border:1.5px solid #d97706;width:16px;height:16px;"></span>
              <span style="font-size: 0.78rem;">Sepia</span>
            </button>
            <button class="btn btn-outline opt-theme-btn" data-theme="oled" onclick="setTheme('oled')" style="flex-direction: column; gap: 0.35rem; padding: 0.55rem 0.35rem; justify-content: center;">
              <span class="theme-swatch-circle" style="background:#000000;border:1.5px solid #334155;width:16px;height:16px;"></span>
              <span style="font-size: 0.78rem;">OLED</span>
            </button>
          </div>

          <div>
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">Reader Font Family</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem;" id="settingsFontBtns">
              <button class="btn btn-outline opt-font-btn" data-font="sans" onclick="setReaderFont('sans')">Sans-Serif</button>
              <button class="btn btn-outline opt-font-btn" data-font="serif" onclick="setReaderFont('serif')">Serif</button>
              <button class="btn btn-outline opt-font-btn" data-font="mono" onclick="setReaderFont('mono')">Monospace</button>
            </div>
          </div>
        </div>

        <div style="height: 1px; background: var(--border-color);"></div>

        <!-- Sync & Integrations Section -->
        <div>
          <div style="font-weight: 700; font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.55rem;">Sync &amp; Integrations</div>
          <div style="display: flex; flex-direction: column; gap: 0.45rem;">
            <button class="btn btn-outline" style="justify-content: space-between; padding: 0.6rem 0.8rem;" onclick="closeModal('settingsModal'); openModal('syncModal');">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                <div style="text-align: left;">
                  <div style="font-weight: 600; font-size: 0.84rem;">KOReader Setup</div>
                  <div style="font-size: 0.73rem; color: var(--text-muted);">Configure 2-way sync with your e-reader</div>
                </div>
              </div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>

            <button class="btn btn-outline" style="justify-content: space-between; padding: 0.6rem 0.8rem;" onclick="closeModal('settingsModal'); openServerConnectModal();">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <div style="text-align: left;">
                  <div style="font-weight: 600; font-size: 0.84rem;">Server &amp; API Connection</div>
                  <div style="font-size: 0.73rem; color: var(--text-muted);">Manage backend endpoint and auth tokens</div>
                </div>
              </div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>

        <div style="height: 1px; background: var(--border-color);"></div>

        <!-- Tools & Content Management -->
        <div>
          <div style="font-weight: 700; font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.55rem;">Tools &amp; Content</div>
          <div style="display: flex; flex-direction: column; gap: 0.45rem;">
            <button class="btn btn-outline" style="justify-content: space-between; padding: 0.6rem 0.8rem;" onclick="closeModal('settingsModal'); openGlobalTagManager();">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                <div style="text-align: left;">
                  <div style="font-weight: 600; font-size: 0.84rem;">Manage Tags</div>
                  <div style="font-size: 0.73rem; color: var(--text-muted);">Overview and cleanup library tags</div>
                </div>
              </div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>

            <button class="btn btn-outline" style="justify-content: space-between; padding: 0.6rem 0.8rem;" onclick="closeModal('settingsModal'); openModal('addTextModal');">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 9.5-9.5z"></path></svg>
                <div style="text-align: left;">
                  <div style="font-weight: 600; font-size: 0.84rem;">Add Custom Text</div>
                  <div style="font-size: 0.73rem; color: var(--text-muted);">Save manual notes or custom markdown entries</div>
                </div>
              </div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>

        <div style="height: 1px; background: var(--border-color);"></div>

        <!-- Session & Account -->
        <div>
          <div style="font-weight: 700; font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.55rem;">Session &amp; About</div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0; font-size: 0.8rem; color: var(--text-muted);">
            <span id="settingsVersionLabel">Wallaflare v1.0.0</span>
            <button class="btn btn-danger" style="padding: 0.4rem 0.85rem; font-size: 0.8rem;" onclick="closeModal('settingsModal'); handleLogout();">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
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
        <p style="color: var(--text-secondary);">Enter these parameters into the <strong>KOReader Wallabag Plugin</strong>:</p>
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
      </div>
      <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
        <button class="btn btn-primary" onclick="closeModal('syncModal')">Done</button>
      </div>
    </div>
  </div>

  <!-- Modal: Tag Management -->
  <div class="tag-modal-overlay" id="tagModal" onclick="if(event.target === this) closeTagModal()">
    <div class="tag-modal">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h3 style="font-size: 1.15rem; font-weight: 600; margin: 0;" id="tagModalHeaderTitle">Manage Tags</h3>
        <button class="close-btn" onclick="closeTagModal()">&times;</button>
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

  <!-- Modal: Global Tag Manager -->
  <div class="tag-modal-overlay" id="globalTagModal" onclick="if(event.target === this) closeGlobalTagModal()">
    <div class="tag-modal" style="max-width: 520px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div>
          <h3 style="font-size: 1.2rem; font-weight: 600; margin: 0;">Manage All Tags</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; margin-bottom: 0;">Overview of all tags in your library</p>
        </div>
        <button class="close-btn" onclick="closeGlobalTagModal()">&times;</button>
      </div>
      <form onsubmit="event.preventDefault(); submitCreateGlobalTag();" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
        <input type="text" id="newGlobalTagInput" class="input" placeholder="Create new tag (e.g. tech, research)..." style="flex: 1;" />
        <button type="submit" class="btn btn-primary" style="padding: 0.4rem 0.9rem; font-size: 0.85rem; white-space: nowrap;">Create Tag</button>
      </form>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <span id="globalTagCountLabel" style="font-size: 0.85rem; color: var(--text-secondary);"></span>
        <button class="btn btn-outline" style="font-size: 0.8rem; padding: 0.3rem 0.65rem;" onclick="cleanupUnusedTags()">Delete Unused Tags</button>
      </div>
      <div id="globalTagListContainer" style="max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem; padding-right: 0.25rem;"></div>
    </div>
  </div>

  <!-- Backdrop for card menus -->
  <div id="cardMenuBackdrop" style="position: fixed; inset: 0; z-index: 90; display: none;" onclick="closeAllCardMenus()" oncontextmenu="event.preventDefault(); closeAllCardMenus();"></div>

  <!-- Floating Context Menu for Article Cards (Right Click) -->
  <div id="cardContextMenu" class="card-dropdown-menu" style="position: fixed; display: none; z-index: 10050; width: 225px;" onclick="event.stopPropagation()" oncontextmenu="event.preventDefault(); event.stopPropagation();"></div>

  <!-- Toast -->
  <div class="toast" id="toast">
    <span id="toastMsg">Action completed</span>
  </div>

  <!-- Hidden readerHighlightsList for backward compatibility with tests/selectors -->
  <div id="readerHighlightsList" style="display: none;"></div>

  <script>
    ${clientEpubJs}

    function isRtlText(text) {
      return /[\\u0590-\\u05FF\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]/.test(text || '');
    }

    let allEntries = [];
    let currentFilter = 'unread';
    let activeArticleId = null;
    let selectedArticleIds = new Set();
    let currentViewMode = 'list';
    let currentSortOrder = 'newest';
    let isFocusMode = false;

    // Appearance state
    let readerFont = localStorage.getItem('wf_reader_font') || 'serif';
    let readerFontSize = parseInt(localStorage.getItem('wf_reader_font_size') || '18', 10);
    let readerLineHeight = localStorage.getItem('wf_reader_line_height') || '1.68';
    let readerContentWidth = localStorage.getItem('wf_reader_content_width') || '740px';
    let activeTheme = localStorage.getItem('wf_theme') || 'dark';

    function initAppearanceSettings() {
      setReaderFontFamily(readerFont, false);
      setReaderFontSize(readerFontSize, false);
      setReaderLineHeight(readerLineHeight, false);
      setReaderContentWidth(readerContentWidth, false);
      setTheme(activeTheme, false);
    }

    function setReaderFontFamily(font, persist = true) {
      readerFont = font;
      let family = "var(--font-reader-serif)";
      if (font === 'sans') family = "var(--font-reader-sans)";
      else if (font === 'mono') family = "var(--font-reader-mono)";
      else if (font === 'dyslexic') family = "var(--font-reader-dyslexic)";

      document.documentElement.style.setProperty('--reader-font-family', family);
      if (persist) localStorage.setItem('wf_reader_font', font);

      document.querySelectorAll('#popoverFontFamilyBtns .opt-font-btn, #settingsFontBtns .opt-font-btn').forEach(btn => {
        if (btn.getAttribute('data-font') === font) {
          btn.classList.add('active', 'btn-primary');
          btn.classList.remove('btn-outline');
        } else {
          btn.classList.remove('active', 'btn-primary');
          btn.classList.add('btn-outline');
        }
      });
    }
    const setReaderFont = setReaderFontFamily;

    function setReaderFontSize(px, persist = true) {
      px = Math.max(12, Math.min(32, px));
      readerFontSize = px;
      document.documentElement.style.setProperty('--reader-font-size', px + 'px');
      const display = document.getElementById('fontSizeDisplay');
      const range = document.getElementById('fontSizeRange');
      if (display) display.textContent = px + 'px';
      if (range) range.value = String(px);
      if (persist) localStorage.setItem('wf_reader_font_size', String(px));
    }

    function adjustReaderFontSize(delta) {
      setReaderFontSize(readerFontSize + delta * 2, true);
    }

    function setReaderLineHeight(lh, persist = true) {
      readerLineHeight = String(lh);
      document.documentElement.style.setProperty('--reader-line-height', String(lh));
      if (persist) localStorage.setItem('wf_reader_line_height', String(lh));

      document.querySelectorAll('#popoverLineHeightBtns .opt-lh-btn').forEach(btn => {
        if (btn.getAttribute('data-lh') === String(lh)) {
          btn.classList.add('active', 'btn-primary');
          btn.classList.remove('btn-outline');
        } else {
          btn.classList.remove('active', 'btn-primary');
          btn.classList.add('btn-outline');
        }
      });
    }

    function setReaderContentWidth(width, persist = true) {
      readerContentWidth = width;
      document.documentElement.style.setProperty('--reader-content-max-width', width);
      if (persist) localStorage.setItem('wf_reader_content_width', width);

      document.querySelectorAll('#popoverContentWidthBtns .opt-width-btn').forEach(btn => {
        if (btn.getAttribute('data-width') === width) {
          btn.classList.add('active', 'btn-primary');
          btn.classList.remove('btn-outline');
        } else {
          btn.classList.remove('active', 'btn-primary');
          btn.classList.add('btn-outline');
        }
      });
    }

    function setTheme(theme, persist = true) {
      activeTheme = theme;
      document.documentElement.className = theme;
      if (persist) localStorage.setItem('wf_theme', theme);

      document.querySelectorAll('#popoverThemeBtns .opt-theme-btn, #settingsModal .opt-theme-btn').forEach(btn => {
        if (btn.getAttribute('data-theme') === theme) {
          btn.classList.add('active', 'btn-primary');
          btn.classList.remove('btn-outline');
        } else {
          btn.classList.remove('active', 'btn-primary');
          btn.classList.add('btn-outline');
        }
      });

      document.querySelectorAll('.sidebar-theme-picker .theme-swatch-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-theme') === theme;
        btn.classList.toggle('active', isActive);
      });
    }

    function toggleTheme() {
      const themes = ['dark', 'light', 'sepia', 'oled'];
      const idx = themes.indexOf(activeTheme);
      const nextTheme = themes[(idx + 1) % themes.length];
      setTheme(nextTheme);
    }

    function toggleReaderAppearancePopover(e) {
      if (e) e.stopPropagation();
      const popover = document.getElementById('readerAppearancePopover');
      if (!popover) return;
      const isOpen = popover.style.display !== 'none' && popover.style.display !== '';
      if (isOpen) {
        popover.style.display = 'none';
      } else {
        closeAllCardMenus();
        closeReaderMoreMenu();
        popover.style.display = 'flex';
      }
    }

    function closeReaderAppearancePopover() {
      const popover = document.getElementById('readerAppearancePopover');
      if (popover) popover.style.display = 'none';
    }

    function toggleReaderFocusMode(force) {
      if (typeof force === 'boolean') isFocusMode = force;
      else isFocusMode = !isFocusMode;

      if (isFocusMode) {
        document.body.classList.add('focus-mode');
        showToast('Focus Mode activated (press f or Esc to exit)', 2000);
      } else {
        document.body.classList.remove('focus-mode');
      }
    }

    function toggleReaderMoreMenu(e) {
      if (e) e.stopPropagation();
      const menu = document.getElementById('readerMoreMenuDropdown');
      if (!menu) return;
      const isOpen = menu.classList.contains('open');
      closeAllCardMenus();
      closeReaderAppearancePopover();
      if (isOpen) {
        menu.classList.remove('open');
      } else {
        menu.classList.add('open');
        const backdrop = document.getElementById('cardMenuBackdrop');
        if (backdrop) backdrop.style.display = 'block';
      }
    }

    function closeReaderMoreMenu() {
      const menu = document.getElementById('readerMoreMenuDropdown');
      if (menu) menu.classList.remove('open');
    }

    function toggleReaderExportSubmenu() {
      document.getElementById('readerExportWrap')?.classList.toggle('expanded');
    }

    function toggleBatchExportSubmenu() {
      document.getElementById('batchExportWrap')?.classList.toggle('expanded');
    }

    function openActiveOriginalLink() {
      if (!activeArticleId) return;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item && item.url) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }
    }

    function getEffectiveServerUrl() {
      const configured = localStorage.getItem('wf_server_url');
      if (configured && configured.trim().startsWith('http')) {
        return configured.trim().replace(new RegExp('/+$ '.trim()), '');
      }
      if (window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.startsWith('capacitor://') && !window.location.origin.startsWith('file://')) {
        return window.location.origin;
      }
      return '';
    }

    function getApiBaseUrl() {
      if (isCapacitorApp()) {
        const configured = localStorage.getItem('wf_server_url');
        if (configured && configured.trim().startsWith('http')) {
          return configured.trim().replace(new RegExp('/+$ '.trim()), '');
        }
      }
      return '';
    }

    function isCapacitorApp() {
      return Boolean(window.IS_CAPACITOR_APP || window.Capacitor?.isNativePlatform?.() || window.AndroidNative);
    }

    function getAuthToken() {
      return localStorage.getItem('wf_auth_token') || '';
    }

    function setAuthToken(token) {
      if (token) localStorage.setItem('wf_auth_token', token);
      else localStorage.removeItem('wf_auth_token');
    }

    async function authFetch(url, options = {}) {
      const fullUrl = url.startsWith('http') ? url : (getApiBaseUrl() + url);
      const headers = new Headers(options.headers || {});
      const token = getAuthToken();
      if (token) {
        headers.set('Authorization', 'Bearer ' + token);
      }
      const response = await fetch(fullUrl, { ...options, headers });
      if (response.status === 401) {
        showAuthOverlay();
      }
      // Inspect header-reported web asset version and trigger background OTA if newer
      const webVer = response.headers.get('X-Wallaflare-Web-Version');
      const minNative = response.headers.get('X-Wallaflare-Min-Native-Version');
      if (webVer) {
        checkCapacitorOtaFromVersion(webVer, minNative);
      }
      return response;
    }

    function showAuthOverlay() {
      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'flex';
    }

    function hideAuthOverlay() {
      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'none';
    }

    async function handleLogin(e) {
      e.preventDefault();
      const input = document.getElementById('authKeyInput');
      const submitBtn = document.getElementById('authSubmitBtn');
      const errorBanner = document.getElementById('authErrorMsg');
      const token = input ? input.value.trim() : '';
      if (!token) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
      }
      if (errorBanner) errorBanner.style.display = 'none';

      try {
        setAuthToken(token);
        const res = await authFetch('/api/entries.json?perPage=1');
        if (res.ok || res.status === 200) {
          hideAuthOverlay();
          input.value = '';
          showToast('✓ Library Unlocked');
          loadArticles(false);
          loadGlobalTags();
        } else {
          setAuthToken('');
          if (errorBanner) {
            errorBanner.textContent = 'Invalid authentication token / password.';
            errorBanner.style.display = 'block';
          }
        }
      } catch (err) {
        if (errorBanner) {
          errorBanner.textContent = 'Connection error. Please check server URL.';
          errorBanner.style.display = 'block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Unlock';
        }
      }
    }

    function handleLogout() {
      showConfirmDialog('Log Out', 'Are you sure you want to log out of Wallaflare?', 'Log Out', true).then(confirmed => {
        if (confirmed) {
          setAuthToken('');
          showAuthOverlay();
          showToast('Logged out');
        }
      });
    }

    // Modal management
    function openModal(id) {
      clearActiveTextSelection();
      const modalEl = document.getElementById(id);
      if (modalEl) {
        modalEl.classList.add('open');
        if (id === 'addUrlModal') {
          setTimeout(() => document.getElementById('urlInput')?.focus(), 60);
        } else if (id === 'addTextModal') {
          loadGlobalTags().then(() => renderAddTextTagChips());
          setTimeout(() => document.getElementById('textTitle')?.focus(), 60);
        } else if (id === 'syncModal') {
          const syncUrlEl = document.getElementById('syncServerUrl');
          if (syncUrlEl) {
            syncUrlEl.textContent = getEffectiveServerUrl() || window.location.origin;
          }
        }
      }
    }

    async function handleManualRefresh(btn) {
      const svg = btn?.querySelector('svg') || btn;
      if (svg) svg.classList.add('is-refreshing-spin');
      try {
        await Promise.all([loadArticles(false), loadGlobalTags()]);
      } finally {
        if (svg) svg.classList.remove('is-refreshing-spin');
      }
    }

    function closeModal(id) {
      const modalEl = document.getElementById(id);
      if (modalEl) modalEl.classList.remove('open');
    }

    // Confirmation dialog
    let confirmResolve = null;
    function showConfirmDialog(title, message, confirmBtnText = 'Confirm', isDanger = false) {
      return new Promise((resolve) => {
        confirmResolve = resolve;
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMsg').textContent = message;
        const btn = document.getElementById('confirmModalBtn');
        btn.textContent = confirmBtnText;
        btn.className = isDanger ? 'btn btn-primary' : 'btn btn-primary';
        openModal('confirmModal');
      });
    }

    function handleConfirmModalOk() {
      closeModal('confirmModal');
      if (confirmResolve) { confirmResolve(true); confirmResolve = null; }
    }

    function handleConfirmModalCancel() {
      closeModal('confirmModal');
      if (confirmResolve) { confirmResolve(false); confirmResolve = null; }
    }

    let toastTimeout = null;
    function showToast(msg, duration = 3000) {
      const toast = document.getElementById('toast');
      const msgEl = document.getElementById('toastMsg');
      if (!toast || !msgEl) return;
      msgEl.textContent = msg;
      toast.classList.add('show');
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        toastTimeout = null;
      }, duration);
    }

    function hideToast() {
      const toast = document.getElementById('toast');
      if (toast) toast.classList.remove('show');
      if (toastTimeout) { clearTimeout(toastTimeout); toastTimeout = null; }
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

    // Keyboard Shortcuts & Modal Dismissal Hierarchy
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
        return;
      }

      if (e.key === 'Escape') {
        // 1. Dismiss active text selection or highlight toolbar/popover
        const sel = window.getSelection();
        const highlightToolbar = document.getElementById('readerHighlightToolbar');
        const highlightPopover = document.getElementById('highlightPopover');
        const annHeader = document.getElementById('readerTopBarAnnotation');
        let dismissed = false;
        if (highlightToolbar && highlightToolbar.style.display !== 'none') {
          highlightToolbar.style.display = 'none';
          activeSelectionRange = null;
          activeSelectedQuote = '';
          dismissed = true;
        }
        if (annHeader && annHeader.style.display !== 'none') {
          clearActiveTextSelection();
          dismissed = true;
        }
        if (highlightPopover && highlightPopover.style.display !== 'none') {
          closeHighlightPopover();
          dismissed = true;
        }
        if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
          clearActiveTextSelection();
          dismissed = true;
        }
        if (dismissed) { e.preventDefault(); return; }

        // 2. Close Popovers and Dropdowns
        const appearancePopover = document.getElementById('readerAppearancePopover');
        if (appearancePopover && appearancePopover.style.display !== 'none') {
          e.preventDefault();
          closeReaderAppearancePopover();
          return;
        }
        const openCardMenu = document.querySelector('.card-dropdown-menu.open');
        if (openCardMenu) {
          e.preventDefault();
          closeAllCardMenus();
          closeReaderMoreMenu();
          return;
        }
        const mobileNav = document.getElementById('mobileNavDropdown');
        if (mobileNav && mobileNav.classList.contains('open')) {
          e.preventDefault();
          closeMobileNavMenu();
          return;
        }

        // 3. Close Dialogs & Modals
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal && confirmModal.classList.contains('open')) {
          e.preventDefault();
          handleConfirmModalCancel();
          return;
        }
        const annotationNoteModal = document.getElementById('annotationNoteModal');
        if (annotationNoteModal && annotationNoteModal.classList.contains('open')) {
          e.preventDefault();
          closeAnnotationNoteModal();
          return;
        }
        const readerHighlightsModal = document.getElementById('readerHighlightsModal');
        if (readerHighlightsModal && readerHighlightsModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('readerHighlightsModal');
          return;
        }
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

        // 4. Focus Mode
        if (isFocusMode) {
          e.preventDefault();
          toggleReaderFocusMode(false);
          return;
        }

        // 5. Article Deselect / Reader Back
        if (document.body.classList.contains('is-reading-mobile')) {
          e.preventDefault();
          handleReaderBack();
          return;
        }
        if (activeArticleId) {
          e.preventDefault();
          closeReader(true);
          return;
        }

        // 6. Selection Mode
        if (isSelectionMode()) {
          e.preventDefault();
          clearArticleSelection();
          return;
        }
      }

      // Keyboard Navigation: j / k / ArrowDown / ArrowUp
      if ((e.key === 'j' || e.key === 'ArrowDown' || e.key === 'k' || e.key === 'ArrowUp') &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA' &&
          !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (modalOpen) return;

        const visibleEntries = getFilteredEntries();
        if (!visibleEntries || visibleEntries.length === 0) return;

        e.preventDefault();
        const isNext = (e.key === 'j' || e.key === 'ArrowDown');
        let targetIndex = 0;

        if (activeArticleId) {
          const currentIdx = visibleEntries.findIndex(item => item.id === activeArticleId);
          if (currentIdx >= 0) {
            targetIndex = isNext ? Math.min(visibleEntries.length - 1, currentIdx + 1) : Math.max(0, currentIdx - 1);
          } else {
            targetIndex = 0;
          }
        } else {
          targetIndex = isNext ? 0 : (visibleEntries.length - 1);
        }

        const targetEntry = visibleEntries[targetIndex];
        if (targetEntry) {
          openReader(targetEntry.id, true);
          const card = document.getElementById('entry-card-' + targetEntry.id);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }

      // 'f' key for Focus Mode
      if (e.key === 'f' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen && window.innerWidth >= 1024 && activeArticleId) {
          e.preventDefault();
          toggleReaderFocusMode();
        }
      }

      // 'e' key for Archive
      if (e.key === 'e' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen) {
          if (isSelectionMode() && selectedArticleIds.size > 0) {
            e.preventDefault();
            batchToggleArchive();
          } else if (activeArticleId) {
            e.preventDefault();
            toggleActiveArchive();
          }
        }
      }

      // 's' key for Star
      if (e.key === 's' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen) {
          if (isSelectionMode() && selectedArticleIds.size > 0) {
            e.preventDefault();
            batchToggleStar();
          } else if (activeArticleId) {
            e.preventDefault();
            toggleActiveStar();
          }
        }
      }

      // Delete / Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA' &&
          !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
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

    // Android Back Button Navigation
    window.handleAndroidBackButton = function() {
      // 1. Text Selection & Highlight Tools
      const highlightToolbar = document.getElementById('readerHighlightToolbar');
      const highlightPopover = document.getElementById('highlightPopover');
      const annHeader = document.getElementById('readerTopBarAnnotation');
      const sel = window.getSelection();
      let dismissed = false;
      if (highlightToolbar && highlightToolbar.style.display !== 'none') {
        highlightToolbar.style.display = 'none';
        activeSelectionRange = null;
        activeSelectedQuote = '';
        dismissed = true;
      }
      if (annHeader && annHeader.style.display !== 'none') {
        clearActiveTextSelection();
        dismissed = true;
      }
      if (highlightPopover && highlightPopover.style.display !== 'none') {
        closeHighlightPopover();
        dismissed = true;
      }
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        clearActiveTextSelection();
        dismissed = true;
      }
      if (dismissed) return true;

      // 2. Popovers and Dropdown menus
      const appearancePopover = document.getElementById('readerAppearancePopover');
      if (appearancePopover && appearancePopover.style.display !== 'none') {
        closeReaderAppearancePopover();
        return true;
      }
      const openCardMenu = document.querySelector('.card-dropdown-menu.open');
      if (openCardMenu) {
        closeAllCardMenus();
        closeReaderMoreMenu();
        return true;
      }
      const mobileNav = document.getElementById('mobileNavDropdown');
      if (mobileNav && mobileNav.classList.contains('open')) {
        closeMobileNavMenu();
        return true;
      }

      // 3. Modals & Dialogs
      const annotationNoteModal = document.getElementById('annotationNoteModal');
      if (annotationNoteModal && annotationNoteModal.classList.contains('open')) {
        closeAnnotationNoteModal();
        return true;
      }
      const readerHighlightsModal = document.getElementById('readerHighlightsModal');
      if (readerHighlightsModal && readerHighlightsModal.classList.contains('open')) {
        closeModal('readerHighlightsModal');
        return true;
      }
      const openModalEl = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
      if (openModalEl) {
        openModalEl.classList.remove('open');
        return true;
      }

      // 4. Focus Mode
      if (isFocusMode) {
        toggleReaderFocusMode(false);
        return true;
      }

      // 5. Mobile reading view
      if (document.body.classList.contains('is-reading-mobile') || (window.innerWidth < 1024 && activeArticleId)) {
        closeReader(true);
        return true;
      }

      // 6. Selection mode
      if (isSelectionMode()) {
        clearArticleSelection();
        return true;
      }

      return false;
    };

    // Navigation & Routing
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

    // Article Loading & Caching
    let isLoadingArticles = false;
    async function loadArticles(silent = false) {
      if (isLoadingArticles) return;
      isLoadingArticles = true;

      if (isCapacitorApp()) {
        const settingsBtn = document.getElementById('serverSettingsBtn');
        if (settingsBtn) settingsBtn.style.display = 'flex';
        if (!localStorage.getItem('wf_server_url')) {
          openServerConnectModal();
          isLoadingArticles = false;
          return;
        }
      }

      renderFromInstantLocalCache();

      try {
        const res = await authFetch('/api/entries.json?perPage=50&_t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          allEntries = Array.isArray(data) ? data : (data._embedded?.items || []);
          syncLocalEntriesCache(allEntries);
          updateCounts();
          renderSidebarTags();
          filterArticles();
        } else if (res.status !== 401) {
          handleConnectionFailure(silent);
        }
      } catch (err) {
        handleConnectionFailure(silent);
      } finally {
        isLoadingArticles = false;
      }
    }

    function renderFromInstantLocalCache() {
      try {
        const fast = localStorage.getItem('wf_cached_articles');
        if (fast) {
          const parsed = JSON.parse(fast);
          if (Array.isArray(parsed) && parsed.length > 0 && allEntries.length === 0) {
            allEntries = parsed;
            updateCounts();
            renderSidebarTags();
            filterArticles();
          }
        }
      } catch (err) {}
    }

    function syncLocalEntriesCache(entries) {
      try {
        localStorage.setItem('wf_cached_articles', JSON.stringify(entries || []));
      } catch (err) {}
      saveArticlesToOfflineDb(entries || []);
    }

    // Tag list and filtering
    let selectedTagFilter = null;
    let cachedGlobalTags = [];
    let isSidebarTagsCollapsed = false;

    function getEffectiveGlobalTags() {
      const map = new Map();
      (cachedGlobalTags || []).forEach(t => {
        const label = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim();
        const slug = (typeof t === 'string' ? t : (t.slug || t.label || t.name || '')).trim();
        const key = (slug || label).toLowerCase();
        if (key) map.set(key, { id: t.id || Date.now(), label: label || slug, slug: slug || label, count: 0 });
      });

      (allEntries || []).forEach(entry => {
        (entry.tags || []).forEach(t => {
          const label = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim();
          const slug = (typeof t === 'string' ? t : (t.slug || t.label || t.name || '')).trim();
          const key = (slug || label).toLowerCase();
          if (key) {
            if (map.has(key)) {
              map.get(key).count++;
            } else {
              map.set(key, { id: (typeof t === 'object' && t.id) ? t.id : Date.now(), label: label || slug, slug: slug || label, count: 1 });
            }
          }
        });
      });
      return Array.from(map.values());
    }

    async function loadGlobalTags() {
      try {
        const res = await authFetch('/api/tags.json?_t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          cachedGlobalTags = await res.json();
          renderSidebarTags();
        }
      } catch (e) {}
    }

    function renderSidebarTags() {
      const listEl = document.getElementById('sidebarTagList');
      const countEl = document.getElementById('sidebarTagCount');
      const listMobileEl = document.getElementById('sidebarTagListMobile');
      const countMobileEl = document.getElementById('sidebarTagCountMobile');

      const tags = getEffectiveGlobalTags();
      if (countEl) countEl.textContent = String(tags.length);
      if (countMobileEl) countMobileEl.textContent = String(tags.length);

      const htmlContent = tags.length === 0
        ? '<div style="font-size: 0.75rem; color: var(--text-muted); padding: 0.35rem 0.5rem; font-style: italic;">No tags yet</div>'
        : tags.map(t => {
            const isActive = selectedTagFilter && selectedTagFilter.toLowerCase() === (t.slug || t.label).toLowerCase();
            return '<button class="sidebar-tag-item ' + (isActive ? 'active' : '') + '" onclick="filterByTag(\\\'' + escapeHtml(t.slug || t.label) + '\\\')">' +
              '<span>#' + escapeHtml(t.label) + '</span>' +
              (t.count > 0 ? '<span class="badge-count">' + t.count + '</span>' : '') +
            '</button>';
          }).join('');

      if (listEl) listEl.innerHTML = htmlContent;
      if (listMobileEl) listMobileEl.innerHTML = htmlContent;
    }

    function toggleSidebarTagsCollapse() {
      isSidebarTagsCollapsed = !isSidebarTagsCollapsed;
      const listEl = document.getElementById('sidebarTagList');
      const chevron = document.getElementById('sidebarTagChevron');
      const listMobileEl = document.getElementById('sidebarTagListMobile');
      const chevronMobile = document.getElementById('sidebarTagChevronMobile');

      if (listEl) listEl.classList.toggle('collapsed', isSidebarTagsCollapsed);
      if (chevron) chevron.style.transform = isSidebarTagsCollapsed ? 'rotate(-90deg)' : 'none';
      if (listMobileEl) listMobileEl.classList.toggle('collapsed', isSidebarTagsCollapsed);
      if (chevronMobile) chevronMobile.style.transform = isSidebarTagsCollapsed ? 'rotate(-90deg)' : 'none';
    }

    function filterByTag(slug) {
      if (selectedTagFilter === slug) {
        selectedTagFilter = null;
      } else {
        selectedTagFilter = slug;
      }
      renderSidebarTags();
      filterArticles();
    }

    function setFilter(filter, updateHistory = true) {
      currentFilter = filter;
      document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById('tab' + filter.charAt(0).toUpperCase() + filter.slice(1));
      const activeMobileBtn = document.getElementById('tab' + filter.charAt(0).toUpperCase() + filter.slice(1) + 'Mobile');
      if (activeBtn) activeBtn.classList.add('active');
      if (activeMobileBtn) activeMobileBtn.classList.add('active');
      filterArticles();

      if (updateHistory) {
        const newPath = filter === 'unread' ? '/' : ('/' + filter);
        if (window.location.pathname !== newPath) {
          history.pushState({ filter }, '', newPath);
        }
      }
    }

    function updateCounts() {
      const unread = allEntries.filter(e => !e.is_archived).length;
      const starred = allEntries.filter(e => e.is_starred).length;
      const archive = allEntries.filter(e => e.is_archived).length;
      const total = allEntries.length;

      const unreadEl = document.getElementById('countUnread');
      const starredEl = document.getElementById('countStarred');
      const archiveEl = document.getElementById('countArchive');
      const totalEl = document.getElementById('countAll');

      const unreadMobileEl = document.getElementById('countUnreadMobile');
      const starredMobileEl = document.getElementById('countStarredMobile');
      const archiveMobileEl = document.getElementById('countArchiveMobile');
      const totalMobileEl = document.getElementById('countAllMobile');

      if (unreadEl) unreadEl.textContent = String(unread);
      if (starredEl) starredEl.textContent = String(starred);
      if (archiveEl) archiveEl.textContent = String(archive);
      if (totalEl) totalEl.textContent = String(total);

      if (unreadMobileEl) unreadMobileEl.textContent = String(unread);
      if (starredMobileEl) starredMobileEl.textContent = String(starred);
      if (archiveMobileEl) archiveMobileEl.textContent = String(archive);
      if (totalMobileEl) totalMobileEl.textContent = String(total);
    }

    function getFilteredEntries() {
      const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
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
          return tags.some(t => {
            const label = typeof t === 'string' ? t : (t.label || t.name || t.slug || '');
            const slug = typeof t === 'string' ? t : (t.slug || t.label || t.name || '');
            return (slug && slug.toLowerCase() === filterLower) || (label && label.toLowerCase() === filterLower);
          });
        });
      }

      if (search) {
        filtered = filtered.filter(e =>
          (e.title && e.title.toLowerCase().includes(search)) ||
          (e.domain_name && e.domain_name.toLowerCase().includes(search)) ||
          (e.text && e.text.toLowerCase().includes(search))
        );
      }

      return sortEntries(filtered);
    }

    function sortEntries(entries) {
      const list = [...entries];
      if (currentSortOrder === 'oldest') {
        return list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      } else if (currentSortOrder === 'shortest') {
        return list.sort((a, b) => (a.reading_time || 1) - (b.reading_time || 1));
      } else if (currentSortOrder === 'longest') {
        return list.sort((a, b) => (b.reading_time || 1) - (a.reading_time || 1));
      } else if (currentSortOrder === 'title') {
        return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      }
      // newest
      return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    function filterArticles() {
      const banner = document.getElementById('activeTagFilterBanner');
      const activeTagName = document.getElementById('activeTagName');
      if (banner && activeTagName) {
        if (selectedTagFilter) {
          banner.style.display = 'flex';
          activeTagName.textContent = '#' + selectedTagFilter;
        } else {
          banner.style.display = 'none';
        }
      }

      const filtered = getFilteredEntries();
      renderArticles(filtered);
    }

    function renderArticles(entries) {
      const grid = document.getElementById('articlesGrid');
      const empty = document.getElementById('emptyState');
      if (!grid) return;

      if (!entries || entries.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
      }

      if (empty) empty.style.display = 'none';

      grid.innerHTML = entries.map(item => {
        const domain = item.domain_name || 'direct-input';
        const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : '');
        const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : '';
        const date = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
        const rawContentText = item.text || item.excerpt || (item.content ? item.content.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim() : "");
        const excerpt = rawContentText ? (rawContentText.length > 160 ? rawContentText.slice(0, 160) + "..." : rawContentText) : "No preview available";
        const isChecked = selectedArticleIds.has(item.id);
        const isReading = activeArticleId === item.id;

        const starSvg = item.is_starred
          ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
          : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

        const tags = Array.isArray(item.tags) ? item.tags : [];
        const tagsHtml = tags.length > 0
          ? '<div class="card-tags">' + tags.map(t => {
              const label = typeof t === 'string' ? t : (t.label || t.name || t.slug);
              const slug = typeof t === 'string' ? t : (t.slug || t.label || t.name);
              return '<span class="tag-badge" onclick="event.stopPropagation(); filterByTag(\\\'' + escapeHtml(slug) + '\\\')">#' + escapeHtml(label) + '</span>';
            }).join('') + '</div>'
          : '';

        const totalMin = item.reading_time || 1;
        const savedRatio = parseFloat(localStorage.getItem('wf_scroll_' + item.id) || '0');
        const progressPct = Math.round(savedRatio * 100);
        let readingProgressText = totalMin + ' min read';
        if (progressPct >= 95) readingProgressText = 'Finished (' + totalMin + 'm)';
        else if (progressPct > 0) readingProgressText = Math.max(1, Math.round(totalMin * (1 - savedRatio))) + ' of ' + totalMin + ' min left';

        const imgHtml = item.preview_picture
          ? '<div class="card-image-wrap"><img src="' + escapeHtml(item.preview_picture) + '" alt="' + escapeHtml(item.title) + '" loading="lazy" class="card-image" onerror="this.parentElement.remove()" /></div>'
          : '';

        return '<div class="article-card ' + (isChecked ? 'is-selected ' : '') + (isReading ? 'is-reading' : '') + '" id="entry-card-' + item.id + '" data-id="' + item.id + '" ontouchstart="handleCardTouchStart(event, ' + item.id + ')" ontouchmove="handleCardTouchMove(event)" ontouchend="handleCardTouchEnd(event)" ontouchcancel="handleCardTouchEnd(event)" oncontextmenu="handleCardContextMenu(event, ' + item.id + ')" onclick="handleCardClick(event, ' + item.id + ')">' +
          '<div class="card-select-wrap" onclick="event.stopPropagation(); toggleArticleSelection(' + item.id + ');">' +
            '<div class="card-checkbox ' + (isChecked ? 'checked' : '') + '">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
            '</div>' +
          '</div>' +
          '<div class="card-main-content">' +
            '<div class="card-text-column">' +
              '<div class="card-meta">' +
                '<span class="card-domain">' + escapeHtml(domain) + '</span>' +
                (author ? '<span>by ' + escapeHtml(author) + '</span>' : '') +
              '</div>' +
              '<h2 class="card-title">' + escapeHtml(item.title) + '</h2>' +
              '<p class="card-excerpt">' + escapeHtml(excerpt) + '</p>' +
              tagsHtml +
            '</div>' +
            imgHtml +
          '</div>' +
          '<div class="card-footer">' +
            '<span class="card-date">' + date + '</span>' +
            '<span style="font-size: 0.75rem; color: var(--text-muted);">' + readingProgressText + '</span>' +
            '<div style="display: flex; gap: 0.35rem;">' +
              '<button class="action-btn ' + (item.is_starred ? 'active-star' : '') + '" title="Star" onclick="event.stopPropagation(); toggleStar(' + item.id + ', ' + item.is_starred + ')">' + starSvg + '</button>' +
              '<button class="action-btn ' + (item.is_archived ? 'active-archive' : '') + '" title="Archive" onclick="event.stopPropagation(); toggleArchive(' + item.id + ', ' + item.is_archived + ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    let cardLongPressTimer = null;
    let cardTouchStartX = 0;
    let cardTouchStartY = 0;
    let cardLongPressTriggered = false;

    function handleCardTouchStart(e, id) {
      if (e.target.closest('button, a, .card-dropdown-menu, .card-select-wrap, .tag-badge')) return;
      cardLongPressTriggered = false;
      cardTouchStartX = e.touches[0].clientX;
      cardTouchStartY = e.touches[0].clientY;
      clearTimeout(cardLongPressTimer);
      cardLongPressTimer = setTimeout(() => {
        cardLongPressTriggered = true;
        try {
          if (window.Capacitor?.Plugins?.Haptics) {
            window.Capacitor.Plugins.Haptics.impact({ style: 'medium' });
          } else if (navigator.vibrate) {
            navigator.vibrate(40);
          }
        } catch (_) {}
        toggleArticleSelection(id);
      }, 420);
    }

    function handleCardTouchMove(e) {
      if (!cardLongPressTimer) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      if (Math.hypot(currentX - cardTouchStartX, currentY - cardTouchStartY) > 10) {
        clearTimeout(cardLongPressTimer);
        cardLongPressTimer = null;
      }
    }

    function handleCardTouchEnd(e) {
      if (cardLongPressTimer) {
        clearTimeout(cardLongPressTimer);
        cardLongPressTimer = null;
      }
    }

    function handleCardClick(e, id) {
      if (e.target.closest('button, a, .card-dropdown-menu, .card-select-wrap, .tag-badge')) return;

      if (cardLongPressTriggered) {
        cardLongPressTriggered = false;
        return;
      }

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

    // 3-Pane Reader open & close
    // Capacitor Status Bar Handler for Mobile App
    function setReaderStatusBar(hidden) {
      try {
        if (window.Capacitor?.Plugins?.StatusBar) {
          if (hidden) {
            window.Capacitor.Plugins.StatusBar.hide();
          } else {
            window.Capacitor.Plugins.StatusBar.show();
          }
        }
      } catch (e) {}
    }

    let readerTopBarAutoHideTimer = null;
    let lastReaderScrollTop = 0;
    let readerScrollAnchorY = 0;
    let readerScrollDirection = 'none';
    let isReaderTopBarHidden = false;

    function shouldReaderAutoHide() {
      if (isCapacitorApp()) return true;
      if (window.innerWidth < 1024) return true;
      return Boolean(isFocusMode || document.body.classList.contains('focus-mode'));
    }

    function showReaderTopBar(restoreStatusBar = true) {
      const topBar = document.getElementById('readerTopBar');
      if (topBar) {
        topBar.classList.remove('is-hidden');
        isReaderTopBarHidden = false;
      }
      if (restoreStatusBar) {
        setReaderStatusBar(false);
      }
    }

    function hideReaderTopBar(hideStatusBar = true) {
      const topBar = document.getElementById('readerTopBar');
      const popover = document.getElementById('readerAppearancePopover');
      const moreMenu = document.getElementById('readerMoreMenuDropdown');
      if (popover && popover.style.display !== 'none') return;
      if (moreMenu && moreMenu.classList.contains('open')) return;

      if (topBar) {
        topBar.classList.add('is-hidden');
        isReaderTopBarHidden = true;
        closeReaderAppearancePopover();
        closeReaderMoreMenu();
      }
      if (hideStatusBar && activeArticleId) {
        setReaderStatusBar(true);
      }
    }

    function scheduleReaderTopBarAutoHide(delay = 700) {
      clearTimeout(readerTopBarAutoHideTimer);
      if (!shouldReaderAutoHide()) return;
      readerTopBarAutoHideTimer = setTimeout(() => {
        hideReaderTopBar(true);
      }, delay);
    }

    function handleReaderBodyClick(e) {
      if (e.target.closest('a, button, mark, input, .annotation-note-card, .reader-top-bar, .reader-appearance-popover')) return;
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) return;

      if (!shouldReaderAutoHide()) return;

      if (isReaderTopBarHidden) {
        showReaderTopBar(true);
      } else {
        hideReaderTopBar(true);
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
        } catch (e) {}
      }

      if (!item) return;

      activeArticleId = id;
      document.getElementById('readerTitle').textContent = item.title;

      const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : '');
      const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : '';
      let metaHtml = '<span>' + escapeHtml(item.domain_name || '') + '</span>';
      if (author) metaHtml += ' &bull; <span style="font-weight: 500;">by ' + escapeHtml(author) + '</span>';
      metaHtml += ' &bull; <span>' + (item.reading_time || 1) + ' min read</span>' +
        ' &bull; <span>' + (item.created_at ? new Date(item.created_at).toLocaleDateString() : '') + '</span>';
      if (item.url) {
        metaHtml += ' &bull; <a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener" class="reader-original-link"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg><span>Original Link</span></a>';
      }
      document.getElementById('readerMeta').innerHTML = metaHtml;

      const coverWrap = document.getElementById('readerCoverWrap');
      if (item.preview_picture) {
        coverWrap.innerHTML = '<div class="reader-cover"><img src="' + escapeHtml(item.preview_picture) + '" alt="Cover" class="reader-cover-img" onerror="this.parentElement.remove()" /></div>';
      } else {
        coverWrap.innerHTML = '';
      }

      const readerBodyEl = document.getElementById('readerBody');
      const rawContent = item.content || '<p>No content available.</p>';
      readerBodyEl.innerHTML = rawContent;
      applyAnnotationsToReader(item);

      // Star & Archive active state
      const starBtn = document.getElementById('readerStarBtn');
      const starIcon = document.getElementById('readerStarIcon');
      if (item.is_starred) {
        starBtn?.classList.add('active-star');
        starIcon?.setAttribute('fill', 'currentColor');
      } else {
        starBtn?.classList.remove('active-star');
        starIcon?.setAttribute('fill', 'none');
      }

      const archiveBtn = document.getElementById('readerArchiveBtn');
      if (item.is_archived) archiveBtn?.classList.add('active-archive');
      else archiveBtn?.classList.remove('active-archive');

      // RTL handling
      const isRtl = (item.language && ['he', 'iw', 'ar', 'fa', 'ur', 'yi'].includes(item.language.toLowerCase().split('-')[0])) || isRtlText(item.title + ' ' + (item.text || ''));
      const contentWrap = document.querySelector('.reader-content-wrap');
      if (isRtl) {
        contentWrap?.classList.add('is-rtl');
        readerBodyEl.setAttribute('dir', 'rtl');
      } else {
        contentWrap?.classList.remove('is-rtl');
        readerBodyEl.setAttribute('dir', 'ltr');
      }

      // Show Reader in Pane 3
      const emptyPane = document.getElementById('readerEmptyPane');
      const readerView = document.getElementById('readerView');
      if (emptyPane) emptyPane.style.display = 'none';
      if (readerView) {
        readerView.style.display = 'flex';
        readerView.classList.add('open');
      }

      // Mark active card with .is-reading
      document.querySelectorAll('.article-card').forEach(c => {
        const cId = parseInt(c.dataset.id, 10);
        if (cId === id) c.classList.add('is-reading');
        else c.classList.remove('is-reading');
      });

      // Mobile reading mode & status bar
      if (window.innerWidth < 1024) {
        document.body.classList.add('is-reading-mobile');
      }
      showReaderTopBar(true);
      scheduleReaderTopBarAutoHide(700);

      // Restore scroll position
      const scrollEl = document.getElementById('readerScrollContainer');
      lastReaderScrollTop = 0;
      readerScrollAnchorY = 0;
      readerScrollDirection = 'none';
      if (scrollEl) {
        const savedRatio = parseFloat(localStorage.getItem('wf_scroll_' + id) || '0');
        if (savedRatio > 0.005) {
          setTimeout(() => {
            const total = scrollEl.scrollHeight - scrollEl.clientHeight;
            if (total > 0) scrollEl.scrollTop = savedRatio * total;
            updateReadingProgress();
          }, 60);
        } else {
          scrollEl.scrollTop = 0;
        }
      }
      updateReadingProgress();

      if (pushHistory) {
        history.pushState({ readerId: id }, '', '/read/' + id);
      }
    }

    function closeReader(updateHistory = true) {
      activeArticleId = null;
      clearTimeout(readerTopBarAutoHideTimer);
      showReaderTopBar(true);
      setReaderStatusBar(false);
      document.body.classList.remove('is-reading-mobile');
      toggleReaderFocusMode(false);

      const emptyPane = document.getElementById('readerEmptyPane');
      const readerView = document.getElementById('readerView');
      if (emptyPane) emptyPane.style.display = 'flex';
      if (readerView) {
        readerView.style.display = 'none';
        readerView.classList.remove('open');
      }

      document.querySelectorAll('.article-card.is-reading').forEach(c => c.classList.remove('is-reading'));
      document.getElementById('readingProgress').style.width = '0%';
      clearActiveTextSelection();
      closeReaderAppearancePopover();
      closeReaderMoreMenu();

      if (updateHistory) {
        const newPath = currentFilter === 'unread' ? '/' : ('/' + currentFilter);
        if (window.location.pathname !== newPath) {
          history.pushState({}, '', newPath);
        }
      }
    }

    function handleReaderBack() {
      if (isFocusMode) {
        toggleReaderFocusMode(false);
        return;
      }
      if (window.innerWidth < 1024) {
        closeReader(true);
      } else {
        closeReader(true);
      }
    }

    let scrollSaveTimer = null;
    function handleReaderScroll() {
      updateReadingProgress();
      const container = document.getElementById('readerScrollContainer');
      if (!container) return;
      const st = container.scrollTop;

      if (!shouldReaderAutoHide()) {
        showReaderTopBar(true);
        lastReaderScrollTop = Math.max(0, st);
        return;
      }

      if (st <= 10) {
        showReaderTopBar(true);
        readerScrollAnchorY = 0;
        lastReaderScrollTop = 0;
        return;
      }

      if (st > lastReaderScrollTop) {
        // Scrolling Down
        if (readerScrollDirection !== 'down') {
          readerScrollDirection = 'down';
          readerScrollAnchorY = st;
        }
        const distanceDown = st - readerScrollAnchorY;
        if (distanceDown >= 55) { // ~3 lines of text
          hideReaderTopBar(true);
          readerScrollAnchorY = st;
        }
      } else if (st < lastReaderScrollTop) {
        // Scrolling Up
        if (readerScrollDirection !== 'up') {
          readerScrollDirection = 'up';
          readerScrollAnchorY = st;
        }
        const distanceUp = readerScrollAnchorY - st;
        if (distanceUp >= 50) { // ~3 lines of text
          showReaderTopBar(true);
          readerScrollAnchorY = st;
        }
      }
      lastReaderScrollTop = Math.max(0, st);
    }

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

    // Article actions
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
        if (activeArticleId === id) {
          const starBtn = document.getElementById('readerStarBtn');
          const starIcon = document.getElementById('readerStarIcon');
          if (next) {
            starBtn?.classList.add('active-star');
            starIcon?.setAttribute('fill', 'currentColor');
          } else {
            starBtn?.classList.remove('active-star');
            starIcon?.setAttribute('fill', 'none');
          }
        }
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
        if (activeArticleId === id) {
          const archiveBtn = document.getElementById('readerArchiveBtn');
          if (next) archiveBtn?.classList.add('active-archive');
          else archiveBtn?.classList.remove('active-archive');
        }
        showToast(next ? 'Archived article' : 'Moved to unread');
      }
    }

    async function toggleActiveStar() {
      if (!activeArticleId) return;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item) await toggleStar(activeArticleId, item.is_starred);
    }

    async function toggleActiveArchive() {
      if (!activeArticleId) return;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item) await toggleArchive(activeArticleId, item.is_archived);
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
          closeReader(true);
        }
      }
    }

    function deleteActiveArticle() {
      if (activeArticleId) deleteEntryAction(activeArticleId);
    }

    function refetchActiveArticleContent() {
      if (activeArticleId) refetchArticleContent(activeArticleId);
    }

    async function refetchArticleContent(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item || !item.url) return;

      const ok = await showConfirmDialog(
        'Re-fetch Article',
        'Re-fetch article from original source URL (' + (item.domain_name || item.url) + ')?',
        'Re-fetch',
        false
      );
      if (!ok) return;

      showToast('Re-fetching article from source...');
      try {
        const res = await authFetch('/api/entries/' + id + '/reload.json', { method: 'PATCH' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const updated = await res.json();
        const idx = allEntries.findIndex(e => e.id === id);
        if (idx >= 0) allEntries[idx] = updated;
        if (activeArticleId === id) openReader(id, false);
        filterArticles();
        showToast('✓ Article content re-fetched successfully!');
      } catch (err) {
        showToast('Failed to re-fetch: ' + err.message);
      }
    }

    // Markdown conversion & Export Engine
    function htmlToMarkdown(html) {
      if (!html) return '';
      const doc = new DOMParser().parseFromString('<!DOCTYPE html><html><body>' + html + '</body></html>', 'text/html');
      const root = doc.body || doc;
      const nl = String.fromCharCode(10);
      const nl2 = nl + nl;
      const tick = String.fromCharCode(96);
      const fence = tick + tick + tick;
      const wsRegex = new RegExp('[' + String.fromCharCode(32, 9, 10, 13) + ']+', 'g');

      function nodeToMd(node) {
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

    function highlightTextInNode(container, ann) {
      const quote = (ann.quote || '').trim();
      if (!quote) return;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      let node;
      let candidates = [];

      while ((node = walker.nextNode())) {
        if (node.parentElement && node.parentElement.closest('mark.reader-hl')) continue;
        const text = node.nodeValue || '';
        let idx = text.indexOf(quote);
        while (idx !== -1) {
          candidates.push({ node, idx, text });
          idx = text.indexOf(quote, idx + Math.max(1, quote.length));
        }
      }

      if (candidates.length === 0) return;

      let best = candidates[0];
      const targetNode = best.node;
      const idx = best.idx;
      const text = targetNode.nodeValue || '';
      const beforeText = text.slice(0, idx);
      const matchText = text.slice(idx, idx + quote.length);
      const afterText = text.slice(idx + quote.length);

      const mark = document.createElement('mark');
      mark.className = 'reader-hl reader-hl-' + (ann.color || 'yellow') + (ann.text ? ' has-note' : '');
      mark.dataset.annotationId = String(ann.id);
      mark.title = ann.text ? (ann.color + ' highlight: ' + ann.text) : (ann.color + ' highlight');
      mark.textContent = matchText;
      mark.onclick = (e) => {
        e.stopPropagation();
        openHighlightPopover(ann, mark);
      };

      const parent = targetNode.parentNode;
      if (!parent) return;

      if (beforeText) parent.insertBefore(document.createTextNode(beforeText), targetNode);
      parent.insertBefore(mark, targetNode);
      if (afterText) parent.insertBefore(document.createTextNode(afterText), targetNode);
      parent.removeChild(targetNode);
    }

    function getSortedAnnotations(item, sortMode = "position") {
      if (!item || !item.annotations || !Array.isArray(item.annotations)) return [];
      const list = [...item.annotations];

      if (sortMode === "time") {
        return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }

      const markElements = Array.from(document.querySelectorAll("#readerBody mark.reader-hl"));
      if (markElements.length > 0 && activeArticleId === item.id) {
        const domIndexMap = new Map();
        markElements.forEach((m, idx) => {
          const id = parseInt(m.dataset.annotationId, 10);
          if (id && !domIndexMap.has(id)) domIndexMap.set(id, idx);
        });
        return list.sort((a, b) => {
          const posA = domIndexMap.has(a.id) ? domIndexMap.get(a.id) : 99999;
          const posB = domIndexMap.has(b.id) ? domIndexMap.get(b.id) : 99999;
          if (posA !== posB) return posA - posB;
          return (a.id || 0) - (b.id || 0);
        });
      }

      const fullText = (item.content || item.text || "").toLowerCase();
      return list.sort((a, b) => {
        const getOffset = (ann) => {
          if (ann.target && Array.isArray(ann.target.selector)) {
            const posSel = ann.target.selector.find(s => s.type === "TextPositionSelector");
            if (posSel && typeof posSel.start === "number") return posSel.start;
          }
          if (ann.quote) {
            const idx = fullText.indexOf(ann.quote.toLowerCase().slice(0, 30));
            if (idx >= 0) return idx;
          }
          return 99999;
        };
        const offA = getOffset(a);
        const offB = getOffset(b);
        if (offA !== offB) return offA - offB;
        return (a.id || 0) - (b.id || 0);
      });
    }

    async function exportMarkdown(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
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

        let annotations = getSortedAnnotations(item, 'position');
        let bodyMd = htmlToMarkdown(item.content || item.text || '');

        const footnotes = [];
        let noteCounter = 1;
        if (annotations.length > 0) {
          for (const ann of annotations) {
            const quote = (ann.quote || '').trim();
            if (!quote) continue;
            const fnRef = (ann.text && ann.text.trim()) ? ('[^note-' + noteCounter + ']') : '';
            if (fnRef) {
              footnotes.push('[^note-' + noteCounter + ']: 💬 **Note**: ' + ann.text.trim());
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
            summaryMd += '- ' + colorEmoji + ' **\"' + (ann.quote || '').trim() + '\"**' + nl;
            if (ann.text && ann.text.trim()) summaryMd += '  > 💬 **Note**: ' + ann.text.trim() + nl;
          }
        }

        let footnotesMd = footnotes.length > 0 ? (nl2 + footnotes.join(nl) + nl) : '';
        const fullMd = frontmatter + '# ' + title + nl2 + bodyMd + summaryMd + footnotesMd + nl;
        const filename = title.replace(/[/\:*?"<>|]/g, '').trim() + '.md';

        const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8' });
        await shareOrDownloadBlob(blob, filename, 'text/markdown');
        showToast('✓ Markdown exported');
      } catch (err) {
        showToast('Failed to export Markdown');
      }
    }

    async function shareOrDownloadBlob(blob, filename, mimeType) {
      const type = mimeType || blob.type || 'application/octet-stream';

      // 1. In Capacitor Native App: prioritize WallaflareNativePlugin or Capacitor Share
      if (isCapacitorApp()) {
        try {
          const nativePlugin = window.Capacitor?.Plugins?.WallaflareNative || window.WallaflareNative;
          const sharePlugin = window.Capacitor?.Plugins?.Share;
          const filesystemPlugin = window.Capacitor?.Plugins?.Filesystem;

          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const res = reader.result;
              const base64data = typeof res === 'string' ? res.split(',')[1] : '';
              resolve(base64data);
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(blob);
          const base64Data = await base64Promise;

          if (base64Data) {
            if (nativePlugin) {
              if (typeof nativePlugin.shareFile === 'function') {
                await nativePlugin.shareFile({ filename, mimeType: type, base64Data });
                return;
              } else if (typeof nativePlugin.shareEpub === 'function') {
                await nativePlugin.shareEpub({ filename, base64Data });
                return;
              }
            }

            if (filesystemPlugin && sharePlugin) {
              const writeResult = await filesystemPlugin.writeFile({
                path: filename,
                data: base64Data,
                directory: 'CACHE'
              });

              if (writeResult && writeResult.uri) {
                await sharePlugin.share({
                  title: filename,
                  url: writeResult.uri,
                  dialogTitle: 'Share ' + filename
                });
                return;
              }
            }
          }
        } catch (e) {
          console.warn('Native Capacitor share failed, falling back to Web Share / Download', e);
        }
      }

      // 2. Web Share API (native share sheet on mobile browsers & Android WebView)
      try {
        if (typeof File !== 'undefined' && typeof navigator.canShare === 'function') {
          const file = new File([blob], filename, { type: type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: filename
            });
            return;
          }
        }
      } catch (shareErr) {
        if (shareErr && shareErr.name === 'AbortError') return;
      }

      // 3. Fallback to standard browser blob URL download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove(); }, 3500);
    }

    function exportActiveMarkdown() {
      if (activeArticleId) exportMarkdown(activeArticleId);
    }

    async function exportPdf(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      showToast('Generating PDF...');
      try {
        if (typeof window.WallaflarePdf !== 'undefined' && typeof window.WallaflarePdf.generatePdf === 'function') {
          const pdfBytes = await window.WallaflarePdf.generatePdf(item);
          const filename = (item.title || 'article').replace(/[/\\:*?"<>|]/g, '').trim() + '.pdf';
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          await shareOrDownloadBlob(blob, filename, 'application/pdf');
          showToast('✓ PDF exported');
        } else {
          window.print();
        }
      } catch (e) {
        showToast('Failed to generate PDF');
      }
    }

    function exportActivePdf() {
      if (activeArticleId) exportPdf(activeArticleId);
    }

    async function downloadEpub(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      showToast('Exporting EPUB...');
      try {
        if (typeof window.WallaflareEpub !== 'undefined' && typeof window.WallaflareEpub.generateEpub === 'function') {
          const u8 = await window.WallaflareEpub.generateEpub(item, window.location.origin);
          const blob = new Blob([u8], { type: 'application/epub+zip' });
          const filename = (item.title || 'article').replace(/[/\\:*?"<>|]/g, '').trim() + '.epub';
          await shareOrDownloadBlob(blob, filename, 'application/epub+zip');
          showToast('✓ EPUB exported');
        } else {
          const res = await authFetch('/api/entries/' + id + '/export.epub');
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const blob = await res.blob();
          const filename = (item.title || 'article').replace(/[/\\:*?"<>|]/g, '').trim() + '.epub';
          await shareOrDownloadBlob(blob, filename, 'application/epub+zip');
          showToast('✓ EPUB exported');
        }
      } catch (e) {
        showToast('Failed to export EPUB');
      }
    }

    function downloadActiveEpub() {
      if (activeArticleId) downloadEpub(activeArticleId);
    }

    // Highlights DOM & Annotations Engine
    let activeSelectionRange = null;
    let activeSelectedQuote = '';
    let activePopoverAnnotation = null;

    function applyAnnotationsToReader(item) {
      if (!item) return;
      const annotations = item.annotations || [];
      const container = document.getElementById("readerBody");
      if (!container) return;

      const existingMarks = container.querySelectorAll("mark.reader-hl");
      existingMarks.forEach(m => {
        const parent = m.parentNode;
        if (parent) {
          while (m.firstChild) parent.insertBefore(m.firstChild, m);
          parent.removeChild(m);
          parent.normalize();
        }
      });

      for (const ann of annotations) {
        if (!ann || !ann.quote) continue;
        highlightTextInNode(container, ann);
      }

      updateHighlightsBadge(annotations.length);
    }

    function updateHighlightsBadge(count) {
      const badge = document.getElementById('readerHighlightsBadgeMobile');
      if (badge) {
        badge.textContent = String(count);
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
    }

    function toggleReaderHighlightsModal() {
      if (!activeArticleId) return;
      openArticleHighlightsModal(activeArticleId);
    }

    let activeModalHighlightsArticleId = null;
    let activeModalHighlightsFilter = "all";
    let activeModalHighlightsSort = "position";

    function openArticleHighlightsModal(articleId) {
      activeModalHighlightsArticleId = articleId;
      activeModalHighlightsFilter = "all";
      renderModalHighlightsList();
      openModal("readerHighlightsModal");
    }

    function filterHighlightsModalList(filterType, btn) {
      activeModalHighlightsFilter = filterType;
      document.querySelectorAll("#highlightsFilterPills .hl-filter-pill").forEach(p => p.classList.remove("active"));
      if (btn) btn.classList.add("active");
      renderModalHighlightsList();
    }

    function setHighlightsSort(sortMode, btn) {
      activeModalHighlightsSort = sortMode;
      document.querySelectorAll("#highlightsSortWrap .hl-sort-btn").forEach(b => b.classList.remove("active"));
      if (btn) btn.classList.add("active");
      renderModalHighlightsList();
    }

    function renderModalHighlightsList() {
      const container = document.getElementById("modalHighlightsList");
      const countBadge = document.getElementById("modalHighlightsCountBadge");
      if (!container) return;

      const item = allEntries.find(e => e.id === activeModalHighlightsArticleId);
      const annotations = getSortedAnnotations(item, activeModalHighlightsSort);
      if (countBadge) countBadge.textContent = String(annotations.length);

      if (annotations.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No highlights in this article yet.</div>';
        return;
      }

      let filtered = annotations;
      if (activeModalHighlightsFilter === "notes") {
        filtered = annotations.filter(a => a.text && a.text.trim().length > 0);
      } else if (activeModalHighlightsFilter !== "all") {
        filtered = annotations.filter(a => (a.color || "yellow") === activeModalHighlightsFilter);
      }

      container.innerHTML = filtered.map(ann => {
        const colorBorder = ann.color === "green" ? "#22c55e" : (ann.color === "blue" ? "#3b82f6" : (ann.color === "purple" ? "#a855f7" : "#eab308"));
        return '<div class="modal-hl-item" style="border-left: 4px solid ' + colorBorder + ';" onclick="scrollToAnnotation(' + ann.id + ', ' + activeModalHighlightsArticleId + ')">' +
          '<div style="font-weight: 500; font-size: 0.88rem;">\"' + escapeHtml(ann.quote) + '\"</div>' +
          (ann.text ? '<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.3rem;">💬 ' + escapeHtml(ann.text) + '</div>' : '') +
        '</div>';
      }).join('');
    }

    function scrollToAnnotation(annId, articleId = null) {
      closeModal("readerHighlightsModal");
      const mark = document.querySelector('mark[data-annotation-id="' + annId + '"]');
      if (mark) {
        mark.scrollIntoView({ behavior: "smooth", block: "center" });
        mark.style.outline = "3px solid var(--accent)";
        setTimeout(() => { mark.style.outline = ""; }, 2200);
      }
    }

    function openHighlightPopover(ann, targetEl) {
      activePopoverAnnotation = ann;
      const popover = document.getElementById("highlightPopover");
      if (!popover) return;
      const noteEl = document.getElementById("popoverNoteText");
      if (noteEl) noteEl.textContent = ann.text || 'No note attached.';
      popover.style.display = "block";
      const rect = targetEl.getBoundingClientRect();
      popover.style.top = Math.max(10, rect.bottom + 6) + "px";
      popover.style.left = Math.max(10, Math.min(window.innerWidth - 290, rect.left)) + "px";
    }

    function closeHighlightPopover() {
      const popover = document.getElementById("highlightPopover");
      if (popover) popover.style.display = "none";
      activePopoverAnnotation = null;
    }

    function copyPopoverQuote() {
      if (activePopoverAnnotation && activePopoverAnnotation.quote) {
        copyDirectText(activePopoverAnnotation.quote);
      }
      closeHighlightPopover();
    }


    async function changePopoverHighlightColor(color) {
      if (!activePopoverAnnotation || !activeArticleId) return;
      activePopoverAnnotation.color = color;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item) {
        applyAnnotationsToReader(item);
        syncLocalEntriesCache(allEntries);
      }
      closeHighlightPopover();
      try {
        await authFetch('/api/annotations/' + activePopoverAnnotation.id + '.json', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color })
        });
      } catch (e) {}
    }

    async function deletePopoverHighlight() {
      if (!activePopoverAnnotation || !activeArticleId) return;
      const annId = activePopoverAnnotation.id;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item && item.annotations) {
        item.annotations = item.annotations.filter(a => a.id !== annId);
        applyAnnotationsToReader(item);
        syncLocalEntriesCache(allEntries);
      }
      closeHighlightPopover();
      try {
        await authFetch('/api/annotations/' + annId + '.json', { method: 'DELETE' });
        showToast('Highlight deleted');
      } catch (e) {}
    }

    function handleCreateHighlight(color = 'yellow') {
      const sel = window.getSelection();
      const selQuote = sel ? sel.toString().trim() : '';
      const quote = (selQuote || activeSelectedQuote || (activeSelectionRange ? activeSelectionRange.toString().trim() : '')).trim();
      if (!quote || !activeArticleId) return;

      const item = allEntries.find(e => e.id === activeArticleId);
      if (!item) return;

      const newAnn = {
        id: Date.now(),
        entry_id: item.id,
        quote: quote,
        color: color,
        text: '',
        created_at: new Date().toISOString()
      };
      if (!item.annotations) item.annotations = [];
      item.annotations.push(newAnn);

      clearActiveTextSelection();
      applyAnnotationsToReader(item);
      syncLocalEntriesCache(allEntries);

      authFetch('/api/annotations/' + item.id + '.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote, color, text: '' })
      }).then(res => res.json()).then(saved => {
        const idx = item.annotations.findIndex(a => a.id === newAnn.id);
        if (idx >= 0) item.annotations[idx] = saved;
        syncLocalEntriesCache(allEntries);
      }).catch(() => {});
    }

    function handleCreateHighlightWithNote() {
      const sel = window.getSelection();
      const selQuote = sel ? sel.toString().trim() : '';
      const quote = (selQuote || activeSelectedQuote || (activeSelectionRange ? activeSelectionRange.toString().trim() : '')).trim();
      if (!quote || !activeArticleId) return;
      clearActiveTextSelection();
      openAnnotationNoteModal(null, { quote, color: 'yellow' });
    }

    function handleCopySelection() {
      const sel = window.getSelection();
      const selQuote = sel ? sel.toString().trim() : '';
      const quote = (selQuote || activeSelectedQuote || (activeSelectionRange ? activeSelectionRange.toString().trim() : '')).trim();
      if (quote) copyDirectText(quote);
      clearActiveTextSelection();
    }


    let activeModalAnnotation = null;
    let pendingHighlightData = null;
    let modalSelectedColor = 'yellow';

    function selectModalNoteColor(color, btn) {
      modalSelectedColor = color;
      document.querySelectorAll('#modalNoteColors .hl-color-btn').forEach(b => b.classList.remove('active-color'));
      if (btn) btn.classList.add('active-color');
    }

    function openAnnotationNoteModal(ann, pendingData = null) {
      activeModalAnnotation = ann || null;
      pendingHighlightData = pendingData || null;
      modalSelectedColor = (ann ? ann.color : (pendingData ? pendingData.color : 'yellow')) || 'yellow';
      closeHighlightPopover();

      const preview = document.getElementById('annotationNoteQuotePreview');
      const input = document.getElementById('annotationNoteInput');
      const quote = ann ? ann.quote : (pendingData ? pendingData.quote : '');
      if (preview) preview.textContent = quote;
      if (input) input.value = ann ? (ann.text || '') : '';

      openModal('annotationNoteModal');
      setTimeout(() => input?.focus(), 60);
    }

    function closeAnnotationNoteModal() {
      activeModalAnnotation = null;
      pendingHighlightData = null;
      closeModal('annotationNoteModal');
    }

    async function handleSaveAnnotationNoteForm(e) {
      e.preventDefault();
      if (!activeArticleId) return;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (!item) return;

      const input = document.getElementById('annotationNoteInput');
      const text = input ? input.value.trim() : '';
      const color = modalSelectedColor || 'yellow';

      if (pendingHighlightData) {
        const quote = pendingHighlightData.quote;
        closeAnnotationNoteModal();
        const newAnn = { id: Date.now(), entry_id: item.id, quote, color, text, created_at: new Date().toISOString() };
        if (!item.annotations) item.annotations = [];
        item.annotations.push(newAnn);
        applyAnnotationsToReader(item);
        syncLocalEntriesCache(allEntries);
        authFetch('/api/annotations/' + item.id + '.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quote, color, text })
        }).then(res => res.json()).then(saved => {
          const idx = item.annotations.findIndex(a => a.id === newAnn.id);
          if (idx >= 0) item.annotations[idx] = saved;
          syncLocalEntriesCache(allEntries);
        }).catch(() => {});
        return;
      }

      if (activeModalAnnotation) {
        activeModalAnnotation.text = text;
        activeModalAnnotation.color = color;
        applyAnnotationsToReader(item);
        syncLocalEntriesCache(allEntries);
        closeAnnotationNoteModal();
        try {
          await authFetch('/api/annotations/' + activeModalAnnotation.id + '.json', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, color })
          });
        } catch (e) {}
      }
    }

    function clearActiveTextSelection() {
      const sel = window.getSelection();
      if (sel) {
        try { sel.removeAllRanges(); } catch (e) {}
      }
      const toolbar = document.getElementById('readerHighlightToolbar');
      if (toolbar) toolbar.style.display = 'none';

      const defaultHeader = document.getElementById('readerTopBarDefault');
      const annHeader = document.getElementById('readerTopBarAnnotation');
      if (defaultHeader) defaultHeader.style.display = 'flex';
      if (annHeader) annHeader.style.display = 'none';

      activeSelectionRange = null;
      activeSelectedQuote = '';
    }

    function initReaderSelectionHandlers() {
      const handleSelection = () => {
        const readerView = document.getElementById('readerView');
        const readerBody = document.getElementById('readerBody');
        const desktopToolbar = document.getElementById('readerHighlightToolbar');
        const defaultHeader = document.getElementById('readerTopBarDefault');
        const annHeader = document.getElementById('readerTopBarAnnotation');

        if (!activeArticleId || !readerView || readerView.style.display === 'none' || !readerBody) {
          if (desktopToolbar) desktopToolbar.style.display = 'none';
          if (defaultHeader) defaultHeader.style.display = 'flex';
          if (annHeader) annHeader.style.display = 'none';
          activeSelectionRange = null;
          activeSelectedQuote = '';
          return;
        }

        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          const noteModal = document.getElementById('annotationNoteModal');
          if (noteModal && noteModal.classList.contains('open')) return;

          if (desktopToolbar && desktopToolbar.style.display !== 'none') {
            desktopToolbar.style.display = 'none';
          }
          if (annHeader && annHeader.style.display !== 'none') {
            if (defaultHeader) defaultHeader.style.display = 'flex';
            annHeader.style.display = 'none';
          }
          activeSelectionRange = null;
          activeSelectedQuote = '';
          return;
        }

        const range = sel.getRangeAt(0);
        if (!readerBody.contains(range.commonAncestorContainer) && readerBody !== range.commonAncestorContainer) {
          if (desktopToolbar) desktopToolbar.style.display = 'none';
          if (defaultHeader) defaultHeader.style.display = 'flex';
          if (annHeader) annHeader.style.display = 'none';
          activeSelectionRange = null;
          activeSelectedQuote = '';
          return;
        }

        const text = sel.toString().trim();
        if (!text) {
          if (desktopToolbar) desktopToolbar.style.display = 'none';
          if (defaultHeader) defaultHeader.style.display = 'flex';
          if (annHeader) annHeader.style.display = 'none';
          activeSelectionRange = null;
          activeSelectedQuote = '';
          return;
        }

        activeSelectionRange = range.cloneRange();
        activeSelectedQuote = text;
        closeHighlightPopover();

        const isDesktop = window.innerWidth >= 1024;
        if (isDesktop) {
          if (defaultHeader) defaultHeader.style.display = 'flex';
          if (annHeader) annHeader.style.display = 'none';
          if (desktopToolbar) {
            desktopToolbar.style.display = 'flex';
            const rect = range.getBoundingClientRect();
            const top = Math.max(10, rect.top - 48);
            const left = Math.max(10, Math.min(window.innerWidth - 250, rect.left + (rect.width / 2) - 110));
            desktopToolbar.style.top = top + 'px';
            desktopToolbar.style.left = left + 'px';
          }
        } else {
          if (desktopToolbar) desktopToolbar.style.display = 'none';
          if (defaultHeader) defaultHeader.style.display = 'none';
          if (annHeader) {
            annHeader.style.display = 'flex';
            const countEl = document.getElementById('readerTopBarSelCount');
            if (countEl) {
              countEl.textContent = text.length > 14 ? (text.slice(0, 13) + '…') : text;
            }
          }
          showReaderTopBar(false);
        }
      };

      document.addEventListener('selectionchange', handleSelection);
      document.addEventListener('mouseup', () => {
        setTimeout(handleSelection, 20);
      });
      document.addEventListener('touchend', () => {
        setTimeout(handleSelection, 40);
      });

      document.addEventListener('mousedown', (e) => {
        const insideToolbar = e.target.closest('#readerHighlightToolbar');
        const insideTopBar = e.target.closest('#readerTopBar');
        const insidePopover = e.target.closest('#highlightPopover');
        const insideMark = e.target.closest('mark.reader-hl');
        const insideModal = e.target.closest('.modal-backdrop');

        const toolbar = document.getElementById('readerHighlightToolbar');
        if (toolbar && toolbar.style.display !== 'none' && !insideToolbar && !insideTopBar) {
          toolbar.style.display = 'none';
          activeSelectionRange = null;
          activeSelectedQuote = '';
        }

        const popover = document.getElementById('highlightPopover');
        if (popover && popover.style.display !== 'none' && !insidePopover && !insideMark && !insideModal) {
          closeHighlightPopover();
        }
      });
    }

    function copyDirectText(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('✓ Copied to clipboard');
      });
    }

    function copySyncValue(elementId, btn) {
      const el = document.getElementById(elementId);
      if (el) copyDirectText(el.textContent.trim(), btn);
    }

    // View Modes (List / Grid / Compact) & Sorting
    function setViewMode(mode) {
      currentViewMode = mode;
      localStorage.setItem('wf_view_mode', mode);
      const grid = document.getElementById('articlesGrid');
      if (grid) {
        grid.className = 'articles-grid view-' + mode;
      }
    }

    function cycleViewMode() {
      const modes = ['list', 'grid', 'compact'];
      const idx = modes.indexOf(currentViewMode);
      setViewMode(modes[(idx + 1) % modes.length]);
      showToast('Layout: ' + currentViewMode.toUpperCase());
    }

    function toggleSortMenu() {
      const menu = document.getElementById('sortDropdownMenu');
      if (menu) {
        const isOpen = menu.classList.contains('open');
        closeAllCardMenus();
        if (!isOpen) {
          menu.classList.add('open');
          const backdrop = document.getElementById('cardMenuBackdrop');
          if (backdrop) backdrop.style.display = 'block';
        }
      }
    }

    function setSortOrder(order) {
      currentSortOrder = order;
      localStorage.setItem('wf_sort_order', order);
      closeAllCardMenus();
      filterArticles();
      showToast('Sorted by: ' + order);
    }

    function handleSearchInput() {
      const input = document.getElementById('searchInput');
      const clearBtn = document.getElementById('searchClearBtn');
      if (clearBtn) clearBtn.style.display = input && input.value ? 'inline-flex' : 'none';
      filterArticles();
    }

    function clearSearchInput() {
      const input = document.getElementById('searchInput');
      const clearBtn = document.getElementById('searchClearBtn');
      if (input) input.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      filterArticles();
    }

    // Batch Selection Mode
    function isSelectionMode() {
      return selectedArticleIds.size > 0;
    }

    function toggleArticleSelection(id, force) {
      if (selectedArticleIds.has(id)) selectedArticleIds.delete(id);
      else selectedArticleIds.add(id);

      updateBatchUI();
    }

    function clearArticleSelection() {
      selectedArticleIds.clear();
      updateBatchUI();
    }

    function toggleSelectAllArticles() {
      const visible = getFilteredEntries();
      if (selectedArticleIds.size === visible.length) {
        selectedArticleIds.clear();
      } else {
        selectedArticleIds = new Set(visible.map(e => e.id));
      }
      updateBatchUI();
    }

    function updateBatchUI() {
      const header = document.getElementById('batchActionHeader');
      const standard = document.getElementById('standardNavHeader');
      const countLabel = document.getElementById('batchSelectedCount');
      const count = selectedArticleIds.size;

      if (count > 0) {
        document.body.classList.add('selection-mode-active');
        if (header) header.style.display = 'flex';
        if (standard) standard.style.display = 'none';
        if (countLabel) countLabel.textContent = count + ' selected';

        // Visibility based on selection count
        const highlightsBtn = document.getElementById('batchHighlightsBtn');
        const openOriginalBtn = document.getElementById('batchOpenOriginalBtn');
        const editTitleBtn = document.getElementById('batchEditTitleBtn');
        const exportPdfBtn = document.getElementById('batchExportPdfBtn');
        const exportEpubLabel = document.getElementById('batchExportEpubLabel');
        const exportMdLabel = document.getElementById('batchExportMdLabel');
        const exportJsonLabel = document.getElementById('batchExportJsonLabel');

        if (count === 1) {
          if (highlightsBtn) { highlightsBtn.classList.remove('is-hidden'); highlightsBtn.style.setProperty('display', 'flex', 'important'); }
          if (openOriginalBtn) { openOriginalBtn.classList.remove('is-hidden'); openOriginalBtn.style.setProperty('display', 'flex', 'important'); }
          if (editTitleBtn) { editTitleBtn.classList.remove('is-hidden'); editTitleBtn.style.setProperty('display', 'flex', 'important'); }
          if (exportPdfBtn) { exportPdfBtn.classList.remove('is-hidden'); exportPdfBtn.style.setProperty('display', 'flex', 'important'); }
          if (exportEpubLabel) exportEpubLabel.textContent = 'EPUB (.epub)';
          if (exportMdLabel) exportMdLabel.textContent = 'Markdown (.md)';
          if (exportJsonLabel) exportJsonLabel.textContent = 'JSON (.json)';
        } else {
          if (highlightsBtn) { highlightsBtn.classList.add('is-hidden'); highlightsBtn.style.setProperty('display', 'none', 'important'); }
          if (openOriginalBtn) { openOriginalBtn.classList.add('is-hidden'); openOriginalBtn.style.setProperty('display', 'none', 'important'); }
          if (editTitleBtn) { editTitleBtn.classList.add('is-hidden'); editTitleBtn.style.setProperty('display', 'none', 'important'); }
          if (exportPdfBtn) { exportPdfBtn.classList.add('is-hidden'); exportPdfBtn.style.setProperty('display', 'none', 'important'); }
          if (exportEpubLabel) exportEpubLabel.textContent = 'Export All as ZIP (EPUBs)';
          if (exportMdLabel) exportMdLabel.textContent = 'Export All as ZIP (Markdown)';
          if (exportJsonLabel) exportJsonLabel.textContent = 'Export All as JSON';
        }
      } else {
        document.body.classList.remove('selection-mode-active');
        if (header) header.style.display = 'none';
        if (standard) standard.style.display = 'flex';
      }

      document.querySelectorAll('.article-card').forEach(card => {
        const id = parseInt(card.dataset.id, 10);
        const isSelected = selectedArticleIds.has(id);
        card.classList.toggle('is-selected', isSelected);
        const checkbox = card.querySelector('.card-checkbox');
        if (checkbox) checkbox.classList.toggle('checked', isSelected);
      });
    }

    function toggleBatchMenu() {
      const menu = document.getElementById('batchDropdownMenu');
      if (menu) {
        const isOpen = menu.classList.contains('open');
        closeAllCardMenus();
        if (!isOpen) {
          updateBatchUI();
          menu.classList.add('open');
          const backdrop = document.getElementById('cardMenuBackdrop');
          if (backdrop) backdrop.style.display = 'block';
        }
      }
    }

    function closeBatchMenu() {
      document.getElementById('batchDropdownMenu')?.classList.remove('open');
      const exportWrap = document.getElementById('batchExportWrap');
      if (exportWrap) exportWrap.classList.remove('expanded');
      const backdrop = document.getElementById('cardMenuBackdrop');
      if (backdrop) backdrop.style.display = 'none';
    }

    function toggleBatchExportSubmenu() {
      document.getElementById('batchExportWrap')?.classList.toggle('expanded');
    }

    function batchOpenHighlights() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 1) {
        closeAllCardMenus();
        openArticleHighlightsModal(ids[0]);
      }
    }

    function batchOpenOriginal() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 1) {
        closeAllCardMenus();
        const item = allEntries.find(e => e.id === ids[0]);
        if (item && item.url) {
          window.open(item.url, '_blank', 'noopener,noreferrer');
        }
      }
    }

    function batchEditTitle() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 1) {
        closeAllCardMenus();
        openEditTitleModal(ids[0]);
      }
    }

    async function handleBatchExportEpub() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      closeAllCardMenus();
      if (ids.length === 1) {
        downloadEpub(ids[0]);
        clearArticleSelection();
        return;
      }

      showToast('Generating ' + ids.length + ' EPUB files...');
      try {
        const zipFiles = {};
        for (const id of ids) {
          const item = allEntries.find(e => e.id === id);
          if (!item) continue;
          if (typeof window.WallaflareEpub !== 'undefined' && typeof window.WallaflareEpub.generateEpub === 'function') {
            const u8 = await window.WallaflareEpub.generateEpub(item, window.location.origin);
            const safeName = (item.title || ('article-' + id)).replace(/[/\\:*?"<>|]/g, '').trim() + '.epub';
            zipFiles[safeName] = u8;
          }
        }
        const zipper = window.WallaflareEpub?.zipSync || window.fflate?.zipSync;
        if (zipper && Object.keys(zipFiles).length > 0) {
          const zippedData = zipper(zipFiles);
          const blob = new Blob([zippedData], { type: 'application/zip' });
          const filename = 'wallaflare-epubs-' + Date.now() + '.zip';
          await shareOrDownloadBlob(blob, filename, 'application/zip');
          showToast('✓ ' + Object.keys(zipFiles).length + ' EPUBs exported to ZIP');
          clearArticleSelection();
        } else {
          showToast('EPUB generator ready');
        }
      } catch (e) {
        showToast('Failed to batch export EPUBs');
      }
    }

    async function handleBatchExportMarkdown() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      closeAllCardMenus();
      if (ids.length === 1) {
        exportMarkdown(ids[0]);
        clearArticleSelection();
        return;
      }

      showToast('Creating Markdown ZIP archive...');
      try {
        const zipFiles = {};
        const strToU8 = window.WallaflareEpub?.strToU8 || window.fflate?.strToU8 || ((s) => new TextEncoder().encode(s));
        const zipper = window.WallaflareEpub?.zipSync || window.fflate?.zipSync;

        for (const id of ids) {
          const item = allEntries.find(e => e.id === id);
          if (!item) continue;
          const bodyMd = htmlToMarkdown(item.content || item.text || '');
          const mdContent = '# ' + (item.title || 'Untitled') + '\\n\\n' +
            '- **Source:** ' + (item.url || 'N/A') + '\\n' +
            '- **Author:** ' + (item.author || 'N/A') + '\\n' +
            '- **Date:** ' + (item.created_at || new Date().toISOString()) + '\\n\\n' +
            '---\\n\\n' +
            bodyMd;
          const safeName = (item.title || ('article-' + id)).replace(/[/\\:*?"<>|]/g, '').trim() + '.md';
          zipFiles[safeName] = strToU8(mdContent);
        }

        if (zipper && Object.keys(zipFiles).length > 0) {
          const zippedData = zipper(zipFiles);
          const blob = new Blob([zippedData], { type: 'application/zip' });
          const filename = 'wallaflare-markdown-' + Date.now() + '.zip';
          await shareOrDownloadBlob(blob, filename, 'application/zip');
          showToast('✓ ' + Object.keys(zipFiles).length + ' Markdown files exported to ZIP');
          clearArticleSelection();
        }
      } catch (e) {
        showToast('Failed to export Markdown ZIP');
      }
    }

    function handleBatchExportPdf() {
      const ids = Array.from(selectedArticleIds);
      closeAllCardMenus();
      if (ids.length === 1) {
        exportPdf(ids[0]);
        clearArticleSelection();
      }
    }

    async function handleBatchExportJson() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      closeAllCardMenus();
      const items = ids.map(id => allEntries.find(e => e.id === id)).filter(Boolean);
      const jsonStr = JSON.stringify(items, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const filename = (items.length === 1 ? ((items[0].title || 'article').replace(/[/\\:*?"<>|]/g, '').trim() + '.json') : ('wallaflare-export-' + Date.now() + '.json'));
      await shareOrDownloadBlob(blob, filename, 'application/json');
      showToast('✓ Exported ' + items.length + ' article(s) as JSON');
      clearArticleSelection();
    }

    async function batchRefetchContent() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      showToast('Re-fetching ' + ids.length + ' articles...');
      for (const id of ids) {
        try {
          await authFetch('/api/entries/' + id + '/reload.json', { method: 'PATCH' });
        } catch (e) {}
      }
      clearArticleSelection();
      await loadArticles(true);
      showToast('Content re-fetched');
    }

    async function batchToggleStar() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      showToast('Updating ' + ids.length + ' articles...');
      for (const id of ids) {
        const item = allEntries.find(e => e.id === id);
        if (item) item.is_starred = item.is_starred ? 0 : 1;
      }
      syncLocalEntriesCache(allEntries);
      filterArticles();
      clearArticleSelection();
    }

    async function batchToggleArchive() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      showToast('Archiving ' + ids.length + ' articles...');
      for (const id of ids) {
        const item = allEntries.find(e => e.id === id);
        if (item) item.is_archived = item.is_archived ? 0 : 1;
      }
      syncLocalEntriesCache(allEntries);
      filterArticles();
      clearArticleSelection();
    }

    function batchManageTags() {
      if (selectedArticleIds.size === 0) return;
      openTagModal(Array.from(selectedArticleIds));
    }

    async function batchDeleteArticles() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      const ok = await showConfirmDialog('Delete Articles', 'Are you sure you want to delete ' + ids.length + ' articles?', 'Delete', true);
      if (!ok) return;
      allEntries = allEntries.filter(e => !selectedArticleIds.has(e.id));
      syncLocalEntriesCache(allEntries);
      clearArticleSelection();
      filterArticles();
      showToast('Articles deleted');
    }

    function toggleMobileNavMenu(e) {
      if (e) e.stopPropagation();
      const drawer = document.getElementById('mobileNavDropdown');
      const backdrop = document.getElementById('mobileNavBackdrop');
      if (drawer) {
        drawer.style.transform = '';
        drawer.style.transition = '';
      }
      if (backdrop) {
        backdrop.style.opacity = '';
        backdrop.style.transition = '';
      }
      drawer?.classList.toggle('open');
      backdrop?.classList.toggle('open');
    }

    function closeMobileNavMenu() {
      const drawer = document.getElementById('mobileNavDropdown');
      const backdrop = document.getElementById('mobileNavBackdrop');
      drawer?.classList.remove('open');
      backdrop?.classList.remove('open');
      if (drawer) {
        drawer.style.transform = '';
        drawer.style.transition = '';
      }
      if (backdrop) {
        backdrop.style.opacity = '';
        backdrop.style.transition = '';
      }
    }

    function setupMobileDrawerSwipeTracking() {
      const drawer = document.getElementById('mobileNavDropdown');
      const backdrop = document.getElementById('mobileNavBackdrop');
      if (!drawer || !backdrop) return;

      let startX = 0;
      let startY = 0;
      let currentX = 0;
      let isTracking = false;
      let isHorizontal = false;

      drawer.addEventListener('touchstart', (e) => {
        if (!drawer.classList.contains('open')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = startX;
        isTracking = true;
        isHorizontal = false;
        drawer.style.transition = 'none';
        backdrop.style.transition = 'none';
      }, { passive: true });

      drawer.addEventListener('touchmove', (e) => {
        if (!isTracking) return;
        currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX;
        const diffY = currentY - startY;

        if (!isHorizontal) {
          if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 8) {
            isHorizontal = true;
          } else if (Math.abs(diffY) > 8) {
            isTracking = false;
            return;
          }
        }

        if (isHorizontal && diffX < 0) {
          const drawerWidth = drawer.offsetWidth || 285;
          const translateX = Math.max(-drawerWidth, diffX);
          drawer.style.transform = 'translateX(' + translateX + 'px)';
          const progress = Math.max(0, Math.min(1, 1 + (diffX / drawerWidth)));
          backdrop.style.opacity = String(progress);
        }
      }, { passive: true });

      const handleSwipeEnd = () => {
        if (!isTracking) return;
        isTracking = false;
        drawer.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        backdrop.style.transition = 'opacity 0.25s ease';

        const diffX = currentX - startX;
        if (isHorizontal && diffX < -65) {
          closeMobileNavMenu();
          setTimeout(() => {
            drawer.style.transform = '';
            backdrop.style.opacity = '';
            drawer.style.transition = '';
            backdrop.style.transition = '';
          }, 260);
        } else {
          drawer.style.transform = '';
          backdrop.style.opacity = '';
          setTimeout(() => {
            drawer.style.transition = '';
            backdrop.style.transition = '';
          }, 260);
        }
      };

      drawer.addEventListener('touchend', handleSwipeEnd, { passive: true });
      drawer.addEventListener('touchcancel', handleSwipeEnd, { passive: true });
    }

    function closeAllCardMenus() {
      document.getElementById('cardMenuBackdrop')?.style.setProperty('display', 'none');
      document.querySelectorAll('.card-dropdown-menu.open').forEach(m => m.classList.remove('open'));
      closeCardContextMenu();
      closeBatchMenu();
      closeReaderMoreMenu();
    }

    let contextMenuArticleId = null;

    function handleCardContextMenu(e, id) {
      e.preventDefault();
      e.stopPropagation();
      openCardContextMenu(e.clientX, e.clientY, id);
    }

    function openCardContextMenu(clientX, clientY, id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      contextMenuArticleId = id;

      closeAllCardMenus();
      closeHighlightPopover();
      closeReaderAppearancePopover();

      const menu = document.getElementById('cardContextMenu');
      if (!menu) return;

      const starLabel = item.is_starred ? 'Unstar' : 'Star';
      const archiveLabel = item.is_archived ? 'Move to Unread' : 'Archive';

      const origLinkBtn = item.url
        ? ('<button class="menu-item" onclick="closeCardContextMenu(); openArticleOriginalLink(' + id + ');"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg><span>Open Original Link</span></button>')
        : '';

      menu.innerHTML = 
        '<div style="padding: 0.45rem 0.65rem 0.4rem 0.65rem; border-bottom: 1px solid var(--border-color); font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 230px;">' +
          escapeHtml(item.title) +
        '</div>' +
        '<button class="menu-item" onclick="closeCardContextMenu(); openReader(' + id + ');">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>' +
          '<span>Read Article</span>' +
        '</button>' +
        '<button class="menu-item" onclick="closeCardContextMenu(); toggleStar(' + id + ', ' + item.is_starred + ');">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (item.is_starred ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' +
          '<span>' + starLabel + '</span>' +
        '</button>' +
        '<button class="menu-item" onclick="closeCardContextMenu(); toggleArchive(' + id + ', ' + item.is_archived + ');">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>' +
          '<span>' + archiveLabel + '</span>' +
        '</button>' +
        '<button class="menu-item" onclick="closeCardContextMenu(); openTagModal(' + id + ');">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>' +
          '<span>Edit Tags</span>' +
        '</button>' +
        '<button class="menu-item" onclick="closeCardContextMenu(); openArticleHighlightsModal(' + id + ');">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' +
          '<span>Highlights & Notes</span>' +
        '</button>' +
        '<div class="menu-item-expandable" id="contextExportWrap">' +
          '<button class="menu-item menu-item-parent" onclick="event.stopPropagation(); toggleContextExportSubmenu();">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' +
            '<span>Export</span>' +
            '<svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
          '</button>' +
          '<div class="menu-sub-items" id="contextExportSub">' +
            '<button class="menu-item menu-sub-item" onclick="closeCardContextMenu(); downloadEpub(' + id + ');"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>EPUB (.epub)</span></button>' +
            '<button class="menu-item menu-sub-item" onclick="closeCardContextMenu(); exportMarkdown(' + id + ');"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span>Markdown (.md)</span></button>' +
            '<button class="menu-item menu-sub-item" onclick="closeCardContextMenu(); exportPdf(' + id + ');"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h3a1.5 1.5 0 0 0 0-3H8v6"></path><path d="M14 10v6"></path></svg><span>PDF (.pdf)</span></button>' +
          '</div>' +
        '</div>' +
        origLinkBtn +
        '<button class="menu-item" onclick="closeCardContextMenu(); openEditTitleModal(' + id + ');">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' +
          '<span>Edit Title</span>' +
        '</button>' +
        '<button class="menu-item" onclick="closeCardContextMenu(); refetchArticleContent(' + id + ');">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>' +
          '<span>Re-fetch Content</span>' +
        '</button>' +
        '<div class="menu-divider"></div>' +
        '<button class="menu-item menu-item-danger" onclick="closeCardContextMenu(); deleteEntryAction(' + id + ');">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
          '<span>Delete Article</span>' +
        '</button>';

      menu.style.display = 'flex';
      menu.classList.add('open');

      const menuWidth = 225;
      const menuHeight = 360;
      const x = Math.min(clientX, window.innerWidth - menuWidth - 12);
      const y = Math.min(clientY, window.innerHeight - menuHeight - 12);
      menu.style.left = Math.max(8, x) + 'px';
      menu.style.top = Math.max(8, y) + 'px';

      const backdrop = document.getElementById('cardMenuBackdrop');
      if (backdrop) backdrop.style.display = 'block';
    }

    function closeCardContextMenu() {
      const menu = document.getElementById('cardContextMenu');
      if (menu) {
        menu.style.display = 'none';
        menu.classList.remove('open');
      }
      contextMenuArticleId = null;
      const backdrop = document.getElementById('cardMenuBackdrop');
      if (backdrop) backdrop.style.display = 'none';
    }

    function toggleContextExportSubmenu() {
      document.getElementById('contextExportWrap')?.classList.toggle('expanded');
    }

    function openArticleOriginalLink(id) {
      const item = allEntries.find(e => e.id === id);
      if (item && item.url) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }
    }

    // Ingest URL & Text Handlers
    function handleAddArticleBtnClick() {
      openModal('addUrlModal');
    }

    async function handleIngestUrl(e) {
      e.preventDefault();
      const input = document.getElementById('urlInput');
      const btn = document.getElementById('ingestUrlBtn');
      const url = input?.value.trim();
      if (!url) return;

      btn.disabled = true;
      btn.textContent = 'Extracting...';

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
        allEntries.unshift(item);
        syncLocalEntriesCache(allEntries);
        updateCounts();
        filterArticles();
        loadGlobalTags();
        showToast('✓ Article saved successfully!');
        openReader(item.id);
      } catch (err) {
        showToast('Failed to save article: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Fetch & Save';
      }
    }

    async function handleIngestText(e) {
      e.preventDefault();
      const title = document.getElementById('textTitle')?.value.trim();
      const content = document.getElementById('textContent')?.value.trim();
      const author = document.getElementById('textAuthor')?.value.trim();
      const tags = document.getElementById('textTags')?.value.trim();
      const url = document.getElementById('textUrl')?.value.trim();
      const previewPicture = document.getElementById('textPreviewPicture')?.value.trim();
      const btn = document.getElementById('ingestTextBtn');

      if (!title || !content) return;
      btn.disabled = true;

      try {
        const res = await authFetch('/api/entries.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, author, tags, url, preview_picture: previewPicture })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const item = await res.json();
        closeModal('addTextModal');
        allEntries.unshift(item);
        syncLocalEntriesCache(allEntries);
        updateCounts();
        filterArticles();
        loadGlobalTags();
        showToast('✓ Custom entry saved');
        openReader(item.id);
      } catch (err) {
        showToast('Failed to save entry');
      } finally {
        btn.disabled = false;
      }
    }

    // Tag management modal logic
    let activeTagModalIds = [];
    function openTagModal(target) {
      if (typeof target === 'number') activeTagModalIds = [target];
      else if (Array.isArray(target)) activeTagModalIds = target;
      else if (activeArticleId) activeTagModalIds = [activeArticleId];
      if (activeTagModalIds.length === 0) return;

      const titleEl = document.getElementById('tagModalHeaderTitle');
      const articleTitleEl = document.getElementById('tagModalArticleTitle');
      if (activeTagModalIds.length === 1) {
        const item = allEntries.find(e => e.id === activeTagModalIds[0]);
        if (titleEl) titleEl.textContent = 'Manage Tags';
        if (articleTitleEl) articleTitleEl.textContent = item ? item.title : '';
      } else {
        if (titleEl) titleEl.textContent = 'Batch Tag Editor (' + activeTagModalIds.length + ' articles)';
        if (articleTitleEl) articleTitleEl.textContent = 'Editing tags across ' + activeTagModalIds.length + ' selected articles';
      }

      renderTagModalUI();
      document.getElementById('tagModal')?.classList.add('open');
    }

    function closeTagModal() {
      activeTagModalIds = [];
      document.getElementById('tagModal')?.classList.remove('open');
    }

    function renderTagModalUI() {
      const container = document.getElementById('tagModalCurrentTags');
      const availContainer = document.getElementById('tagModalAvailableTags');
      const quickSection = document.getElementById('quickTagsSection');
      if (!container) return;

      // Collect all applied tags across active target articles
      const appliedTagMap = new Map();
      activeTagModalIds.forEach(id => {
        const item = allEntries.find(e => e.id === id);
        if (item && item.tags) {
          item.tags.forEach(t => {
            const label = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim();
            const key = label.toLowerCase();
            if (key) appliedTagMap.set(key, label);
          });
        }
      });

      const appliedTags = Array.from(appliedTagMap.values());
      if (appliedTags.length === 0) {
        container.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No tags applied</span>';
      } else {
        container.innerHTML = appliedTags.map(label => {
          return '<span class="tag-badge" style="cursor: default; display: inline-flex; align-items: center; gap: 0.35rem;">' +
            '#' + escapeHtml(label) +
            '<button type="button" style="background: none; border: none; color: currentColor; cursor: pointer; padding: 0; font-size: 0.85rem; line-height: 1;" onclick="removeTagFromActiveArticles(\\\'' + escapeHtml(label) + '\\\')" title="Remove tag">&times;</button>' +
          '</span>';
        }).join(' ');
      }

      // Available quick library tags to choose from
      const allLibTags = getEffectiveGlobalTags();
      const availableQuickTags = allLibTags.filter(t => !appliedTagMap.has(t.label.toLowerCase()) && !appliedTagMap.has(t.slug.toLowerCase()));

      if (availContainer && quickSection) {
        if (availableQuickTags.length > 0) {
          quickSection.style.display = 'block';
          availContainer.innerHTML = availableQuickTags.map(t => {
            return '<button type="button" class="tag-badge" style="cursor: pointer; background: var(--bg-tertiary); border: 1px dashed var(--border-color);" onclick="addQuickTagToActiveArticles(\\\'' + escapeHtml(t.label) + '\\\')" title="Add tag">' +
              '+ #' + escapeHtml(t.label) +
            '</button>';
          }).join(' ');
        } else {
          quickSection.style.display = 'none';
        }
      }
    }

    function addQuickTagToActiveArticles(tagName) {
      if (!tagName || activeTagModalIds.length === 0) return;
      const ids = [...activeTagModalIds];
      for (const id of ids) {
        const item = allEntries.find(e => e.id === id);
        if (item) {
          if (!item.tags) item.tags = [];
          const exists = item.tags.some(t => {
            const l = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim().toLowerCase();
            return l === tagName.toLowerCase();
          });
          if (!exists) {
            item.tags.push({ label: tagName, slug: tagName.toLowerCase() });
          }
        }
      }
      syncLocalEntriesCache(allEntries);
      renderTagModalUI();
      renderSidebarTags();
      filterArticles();
      showToast('Tag #' + tagName + ' added');

      if (ids.length === 1) {
        authFetch('/api/entries/' + ids[0] + '/tags.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: tagName })
        }).then(() => loadGlobalTags()).catch(() => {});
      } else {
        authFetch('/api/entries/tags/lists.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: ids, tags: tagName })
        }).then(() => loadGlobalTags()).catch(() => {});
      }
    }

    function removeTagFromActiveArticles(tagName) {
      if (!tagName || activeTagModalIds.length === 0) return;
      const ids = [...activeTagModalIds];
      const tagLower = tagName.toLowerCase();
      for (const id of ids) {
        const item = allEntries.find(e => e.id === id);
        if (item && item.tags) {
          item.tags = item.tags.filter(t => {
            const l = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim().toLowerCase();
            return l !== tagLower;
          });
        }
      }
      syncLocalEntriesCache(allEntries);
      renderTagModalUI();
      renderSidebarTags();
      filterArticles();
      showToast('Tag #' + tagName + ' removed');

      if (ids.length === 1) {
        authFetch('/api/entries/' + ids[0] + '/tags/' + encodeURIComponent(tagName) + '.json', {
          method: 'DELETE'
        }).then(() => loadGlobalTags()).catch(() => {});
      } else {
        authFetch('/api/entries/tags/lists.json', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: ids, tag: tagName })
        }).then(() => loadGlobalTags()).catch(() => {});
      }
    }

    function submitAddTag() {
      const input = document.getElementById('newTagInput');
      const rawVal = input ? input.value.trim() : '';
      if (!rawVal || activeTagModalIds.length === 0) return;

      const tagsToAdd = rawVal.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean);
      if (tagsToAdd.length === 0) return;

      for (const tag of tagsToAdd) {
        addQuickTagToActiveArticles(tag);
      }
      input.value = '';
      renderTagModalUI();
    }

    function openGlobalTagManager() {
      renderGlobalTagManagerUI();
      openModal('globalTagModal');
    }

    function closeGlobalTagModal() {
      closeModal('globalTagModal');
    }

    function renderGlobalTagManagerUI() {
      const container = document.getElementById('globalTagListContainer');
      const countLabel = document.getElementById('globalTagCountLabel');
      if (!container) return;

      const tags = getEffectiveGlobalTags();
      if (countLabel) countLabel.textContent = tags.length + ' tag' + (tags.length === 1 ? '' : 's') + ' total';

      if (tags.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.88rem;">No tags in library yet</div>';
        return;
      }

      container.innerHTML = tags.map(t => {
        return '<div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.65rem; background: var(--bg-tertiary); border-radius: var(--radius-sm);">' +
          '<div style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; flex: 1;" onclick="closeGlobalTagModal(); filterByTag(\\\'' + escapeHtml(t.slug || t.label) + '\\\');">' +
            '<span style="font-weight: 600; font-size: 0.88rem; color: var(--accent);">#' + escapeHtml(t.label) + '</span>' +
            '<span class="badge-count" style="font-size: 0.72rem;">' + t.count + ' article' + (t.count === 1 ? '' : 's') + '</span>' +
          '</div>' +
          '<button class="btn-icon" style="color: var(--text-muted); padding: 0.2rem 0.4rem; height: auto;" onclick="deleteGlobalTag(\\\'' + escapeHtml(t.slug || t.label) + '\\\')" title="Remove tag from all articles">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
          '</button>' +
        '</div>';
      }).join('');
    }

    async function deleteGlobalTag(tagSlugOrLabel) {
      const tagLower = tagSlugOrLabel.toLowerCase();
      let modified = false;
      for (const entry of allEntries) {
        if (entry.tags && entry.tags.length > 0) {
          const prevLen = entry.tags.length;
          entry.tags = entry.tags.filter(t => {
            const label = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim().toLowerCase();
            return label !== tagLower;
          });
          if (entry.tags.length !== prevLen) modified = true;
        }
      }
      if (cachedGlobalTags) {
        cachedGlobalTags = cachedGlobalTags.filter(t => (t.slug || '').toLowerCase() !== tagLower && (t.label || '').toLowerCase() !== tagLower);
      }
      if (modified) {
        syncLocalEntriesCache(allEntries);
        renderSidebarTags();
        filterArticles();
      }
      renderGlobalTagManagerUI();
      showToast('Tag #' + tagSlugOrLabel + ' removed');

      try {
        await authFetch('/api/tags/' + encodeURIComponent(tagSlugOrLabel) + '.json', {
          method: 'DELETE'
        });
        loadGlobalTags();
      } catch (e) {}
    }

    async function submitCreateGlobalTag() {
      const input = document.getElementById('newGlobalTagInput');
      const val = input ? input.value.trim().replace(/^#/, '') : '';
      if (!val) return;
      if (!cachedGlobalTags) cachedGlobalTags = [];
      const exists = cachedGlobalTags.some(t => (t.label || '').toLowerCase() === val.toLowerCase() || (t.slug || '').toLowerCase() === val.toLowerCase());
      if (!exists) {
        cachedGlobalTags.push({ id: Date.now(), label: val, slug: val.toLowerCase(), count: 0 });
      }
      input.value = '';
      renderSidebarTags();
      renderGlobalTagManagerUI();
      showToast('Tag #' + val + ' created');

      try {
        const res = await authFetch('/api/tags.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: val })
        });
        if (res.ok) {
          const created = await res.json();
          const idx = cachedGlobalTags.findIndex(t => t.slug === created.slug || t.label.toLowerCase() === created.label.toLowerCase());
          if (idx >= 0) cachedGlobalTags[idx] = created;
          else cachedGlobalTags.push(created);
        }
        loadGlobalTags();
      } catch (e) {}
    }

    function cleanupUnusedTags() {
      const usedTags = new Set();
      (allEntries || []).forEach(e => {
        (e.tags || []).forEach(t => {
          const l = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim().toLowerCase();
          if (l) usedTags.add(l);
        });
      });
      cachedGlobalTags = (cachedGlobalTags || []).filter(t => {
        const l = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim().toLowerCase();
        return usedTags.has(l);
      });
      renderSidebarTags();
      renderGlobalTagManagerUI();
      showToast('Unused tags cleaned');
    }

    function openEditTitleModal(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      document.getElementById('editTitleEntryId').value = String(id);
      document.getElementById('editTitleInput').value = item.title;
      openModal('editTitleModal');
    }

    async function handleSaveTitle(e) {
      e.preventDefault();
      const id = parseInt(document.getElementById('editTitleEntryId').value, 10);
      const newTitle = document.getElementById('editTitleInput').value.trim();
      if (!id || !newTitle) return;

      const item = allEntries.find(e => e.id === id);
      if (item) {
        item.title = newTitle;
        if (activeArticleId === id) document.getElementById('readerTitle').textContent = newTitle;
      }
      closeModal('editTitleModal');
      filterArticles();
      showToast('✓ Title updated');
      authFetch('/api/entries/' + id + '.json', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      }).catch(() => {});
    }

    function openServerConnectModal() {
      openModal('serverConnectModal');
    }
    function handleSaveServerConnection(e) {
      e.preventDefault();
      const url = document.getElementById('serverUrlInput')?.value.trim();
      const token = document.getElementById('serverTokenInput')?.value.trim();
      if (url) localStorage.setItem('wf_server_url', url);
      if (token) setAuthToken(token);
      closeModal('serverConnectModal');
      loadArticles(false);
      loadGlobalTags();
    }

    // Offline DB placeholder
    function saveArticlesToOfflineDb() {}
    function getArticlesFromOfflineDb() { return []; }
    // Pull to Refresh Implementation
    let touchStartY = 0;
    let isPulling = false;
    const ptrWrap = document.getElementById('pullToRefreshWrap');
    const ptrSvg = document.getElementById('pullToRefreshSvg');

    function initPullToRefresh() {
      const scrollContainer = document.getElementById('articlesScrollContainer');
      if (!scrollContainer) return;

      scrollContainer.addEventListener('touchstart', (e) => {
        if (activeArticleId) return;
        if (scrollContainer.scrollTop <= 2 && e.touches.length === 1) {
          touchStartY = e.touches[0].pageY;
          isPulling = true;
        }
      }, { passive: true });

      scrollContainer.addEventListener('touchmove', (e) => {
        if (!isPulling || activeArticleId || e.touches.length !== 1) return;
        const currentY = e.touches[0].pageY;
        const delta = currentY - touchStartY;

        if (delta > 5 && scrollContainer.scrollTop <= 2) {
          if (e.cancelable) e.preventDefault();
          const pullDist = Math.min(80, delta * 0.45);
          if (ptrWrap) {
            ptrWrap.style.visibility = 'visible';
            ptrWrap.style.opacity = String(Math.min(1, pullDist / 35));
            ptrWrap.style.transform = 'translate(-50%, ' + pullDist + 'px)';
          }
          if (ptrSvg) {
            ptrSvg.style.transform = 'rotate(' + (delta * 2.5) + 'deg)';
          }
        } else if (delta < 0) {
          isPulling = false;
        }
      }, { passive: false });

      scrollContainer.addEventListener('touchend', async (e) => {
        if (!isPulling) return;
        isPulling = false;
        const currentY = e.changedTouches[0]?.pageY || 0;
        const delta = currentY - touchStartY;

        if (delta > 60 && scrollContainer.scrollTop <= 2 && !activeArticleId) {
          if (ptrWrap) {
            ptrWrap.style.transform = 'translate(-50%, 50px)';
          }
          if (ptrSvg) {
            ptrSvg.classList.add('is-refreshing-spin');
          }
          try {
            await Promise.all([loadArticles(false), loadGlobalTags()]);
          } finally {
            setTimeout(() => {
              if (ptrWrap) {
                ptrWrap.style.transform = 'translate(-50%, -20px)';
                ptrWrap.style.opacity = '0';
                ptrWrap.style.visibility = 'hidden';
              }
              if (ptrSvg) {
                ptrSvg.classList.remove('is-refreshing-spin');
              }
            }, 300);
          }
        } else {
          if (ptrWrap) {
            ptrWrap.style.transform = 'translate(-50%, -20px)';
            ptrWrap.style.opacity = '0';
            ptrWrap.style.visibility = 'hidden';
          }
        }
      }, { passive: true });
    }

    // Refocus / Bring to Foreground Refresh
    function initRefocusRefresh() {
      let lastRefreshTime = Date.now();
      const triggerRefresh = () => {
        const now = Date.now();
        if (now - lastRefreshTime > 4000) {
          lastRefreshTime = now;
          loadArticles(true);
          loadGlobalTags();
        }
      };

      window.addEventListener('focus', triggerRefresh);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          triggerRefresh();
        }
      });
      document.addEventListener('resume', triggerRefresh);
      if (window.Capacitor?.App?.addListener) {
        window.Capacitor.App.addListener('appStateChange', (state) => {
          if (state && state.isActive) {
            triggerRefresh();
          }
        });
      }
    }

    // -------------------------------------------------------------
    // Capacitor OTA Updater Engine
    // -------------------------------------------------------------
    function isCapacitorApp() {
      return !!(window.IS_CAPACITOR_APP || window.Capacitor?.isNativePlatform?.() || window.AndroidNative);
    }

    function getAppWebVersion() {
      return window.WF_BUILD_VERSION || '${OTA_VERSION}';
    }

    function compareSemVer(a, b) {
      const pa = String(a || '1.0.0').split(/[\.-]/).map(n => parseInt(n, 10) || 0);
      const pb = String(b || '1.0.0').split(/[\.-]/).map(n => parseInt(n, 10) || 0);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
      }
      return 0;
    }

    let isDownloadingOta = false;
    async function checkCapacitorOtaFromVersion(serverVer, minNative) {
      if (!isCapacitorApp() || isDownloadingOta || !serverVer) return;
      const updater = window.Capacitor?.Plugins?.CapacitorUpdater;
      if (!updater) return;

      const currentLocal = window.WF_BUILD_VERSION || (await updater.getLatest().catch(() => null))?.version || '';
      if (serverVer === currentLocal) return;

      const nativeVer = window.WF_NATIVE_VERSION || '1.0.0';
      if (minNative && compareSemVer(nativeVer, minNative) < 0) {
        console.warn('[OTA] Native app update required for web version:', serverVer);
        return;
      }

      isDownloadingOta = true;
      try {
        const serverBase = getEffectiveServerUrl();
        const downloadUrl = (serverBase ? serverBase : '') + '/api/app/bundle.zip';
        console.log('[OTA] Downloading updated bundle reported in header:', serverVer);

        const downloaded = await updater.download({
          url: downloadUrl,
          version: serverVer
        });

        if (downloaded) {
          await updater.set(downloaded);
          console.log('[OTA] Bundle installed successfully for version:', serverVer);
          if (!activeArticleId && (!window.location.pathname || window.location.pathname === '/' || window.location.pathname === '/unread')) {
            showToast('✓ Updated to latest web assets');
            setTimeout(() => {
              updater.reload().catch(() => window.location.reload());
            }, 600);
          } else {
            showOtaRestartBanner();
          }
        }
      } catch (err) {
        console.warn('[OTA] Header updater error:', err);
      } finally {
        isDownloadingOta = false;
      }
    }

    function showOtaRestartBanner() {
      showToast('🚀 New update ready! Tap here to reload', 12000);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.style.cursor = 'pointer';
        toast.onclick = () => {
          const updater = window.Capacitor?.Plugins?.CapacitorUpdater;
          if (updater) {
            updater.reload().catch(() => window.location.reload());
          } else {
            window.location.reload();
          }
        };
      }
    }

    async function initCapacitorOtaUpdater() {
      if (!isCapacitorApp()) return;
      const updater = window.Capacitor?.Plugins?.CapacitorUpdater;
      if (updater) {
        await updater.notifyAppReady().catch(() => {});
      }
    }

    function updateVersionDisplay() {
      const ver = getAppWebVersion();
      const label = document.getElementById('sidebarVersionLabel');
      const mobileLabel = document.getElementById('mobileVersionLabel');
      const settingsLabel = document.getElementById('settingsVersionLabel');
      const text = 'Wallaflare v1.0.0 (Web: ' + ver + ')';
      if (label) label.textContent = text;
      if (mobileLabel) mobileLabel.textContent = text;
      if (settingsLabel) settingsLabel.textContent = text;
    }

    function initReaderHoverTopBar() {
      const readerPane = document.getElementById('paneReader');
      if (!readerPane) return;
      readerPane.addEventListener('mousemove', (e) => {
        if (window.innerWidth >= 1024 && activeArticleId) {
          if (e.clientY <= 65) {
            showReaderTopBar(true);
          }
        }
      });
    }

    function initSelectionDeselectListener() {
      // 1. Deselect cards when clicking blank canvas
      document.addEventListener('click', (e) => {
        if (selectedArticleIds.size > 0) {
          if (!e.target.closest('.article-card, #batchActionHeader, #batchDropdownMenu, .tag-modal, .tag-modal-overlay, .confirm-modal-overlay, .modal-overlay, .sidebar-nav-item, #mobileNavDropdown, #cardMenuBackdrop')) {
            clearArticleSelection();
          }
        }

        // 2. Close modal when clicking dark backdrop directly
        if (e.target.classList && (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('tag-modal-overlay'))) {
          const id = e.target.id;
          if (id === 'annotationNoteModal') {
            closeAnnotationNoteModal();
          } else if (id) {
            closeModal(id);
          }
        }
      });

      // 3. Dismiss highlight popover when tapping outside
      const dismissPopover = (e) => {
        const popover = document.getElementById('highlightPopover');
        if (popover && popover.style.display !== 'none') {
          if (!e.target.closest('#highlightPopover, mark.reader-hl')) {
            closeHighlightPopover();
          }
        }
      };
      document.addEventListener('pointerdown', dismissPopover);

      // 4. Right-click outside context menu closes it without opening native browser context menu
      document.addEventListener('contextmenu', (e) => {
        const card = e.target.closest('.article-card');
        if (card) {
          // Handled per-card by oncontextmenu
          return;
        }
        const openMenu = document.querySelector('.card-dropdown-menu.open, #cardContextMenu.open');
        if (openMenu) {
          e.preventDefault();
          closeAllCardMenus();
        }
      });
    }

    // Initialize UI
    if (isCapacitorApp()) {
      document.documentElement.classList.add('is-capacitor-app');
    }
    initAppearanceSettings();
    setViewMode(localStorage.getItem('wf_view_mode') || 'list');
    updateVersionDisplay();
    handleRouteState();
    loadArticles(true);
    loadGlobalTags();
    initPullToRefresh();
    initRefocusRefresh();
    setupMobileDrawerSwipeTracking();
    initReaderHoverTopBar();
    initSelectionDeselectListener();
    initReaderSelectionHandlers();
    initCapacitorOtaUpdater();
  </script>
</body>
</html>`;
}
