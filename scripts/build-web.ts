import * as fs from 'fs';
import * as path from 'path';
import { renderDashboardHtml } from '../src/views/dashboard';

const wwwDir = path.resolve(__dirname, '../www');
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

let html = renderDashboardHtml('Wallaflare');
html = html.replace('<head>', '<head>\n  <script>window.IS_CAPACITOR_APP = true;</script>');
fs.writeFileSync(path.join(wwwDir, 'index.html'), html, 'utf8');
console.log('✓ Successfully generated www/index.html (' + html.length + ' bytes) for Capacitor build!');
