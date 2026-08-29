import { OTA_VERSION } from './ota-bundle';
import { clientEpubJs } from './epub-client-bundle';
import { clientDashboardCss, clientDashboardJs } from './dashboard-bundle';
import { getDashboardHtmlBody } from './dashboard-html';

export function renderDashboardHtml(appName: string = 'Wallaflare', hasOpdsToken: boolean = false): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="generator" content="wallabag">
  <meta name="wallabag:version" content="2.6.9">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📖</text></svg>">
  <title>${appName}</title>
  <script>window.WF_HAS_OPDS_TOKEN = ${hasOpdsToken ? 'true' : 'false'};</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=JetBrains+Mono:wght@400;500;700&display=optional" rel="stylesheet">
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
