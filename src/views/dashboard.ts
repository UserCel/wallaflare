import { OTA_VERSION } from './ota-bundle';
import { clientEpubJs } from './epub-client-bundle';
import { clientDashboardCss, clientDashboardJs } from './dashboard-bundle';
import { getDashboardHtmlBody } from './dashboard-html';

export function renderDashboardHtml(appName: string = 'Wallaflare', hasReadToken: boolean = false, isAuthenticated?: boolean): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="generator" content="wallabag">
  <meta name="wallabag:version" content="2.6.9">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#0f172a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${appName}">
  <link rel="icon" type="image/svg+xml" href="/favicon.ico">
  <link rel="alternate icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/img/icon-192.png">
  <title>${appName}</title>
  <script>
    window.WF_HAS_READ_TOKEN = ${hasReadToken ? 'true' : 'false'};
    try {
      var hasLocalToken = !!(localStorage.getItem('wf_auth_token') || localStorage.getItem('wf_server_token'));
      var hasCookie = document.cookie.indexOf('PHPSESSID') !== -1 || document.cookie.indexOf('wf_auth_token') !== -1;
      var serverAuthed = ${isAuthenticated === true ? 'true' : 'null'};
      if (serverAuthed !== true && !hasLocalToken && !hasCookie) {
        document.documentElement.classList.add('wf-needs-auth');
      }
    } catch(e) {}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=JetBrains+Mono:wght@400;500;700&family=Lexend:wght@400;500;700&display=optional" rel="stylesheet">
  <style>
${clientDashboardCss}
  </style>
</head>
${getDashboardHtmlBody(appName)}
  <script>
    ${clientEpubJs}
    ${clientDashboardJs.replace(/\${OTA_VERSION}/g, OTA_VERSION)}
  </script>
</body>
</html>`;
}
