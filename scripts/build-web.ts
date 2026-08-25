import { buildEpubClientBundle } from "./bundle-epub-client";
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fflate from 'fflate';
import { renderDashboardHtml } from '../src/views/dashboard';

async function main() {
  await buildEpubClientBundle();

  const wwwDir = path.resolve(__dirname, '../www');
  if (!fs.existsSync(wwwDir)) {
    fs.mkdirSync(wwwDir, { recursive: true });
  }

  const pkgJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  const baseVersion = pkgJson.version || '1.0.0';

  const rawHtml = renderDashboardHtml('Wallaflare');
  
  // Compute deterministic content hash of the web dashboard
  const contentHash = crypto.createHash('sha256').update(rawHtml).digest('hex').slice(0, 10);
  const otaVersion = `${baseVersion}-${contentHash}`;
  const minNativeVersion = "1.0.0";

  const capacitorHtml = rawHtml.replace('<head>', `<head>\n  <script>window.IS_CAPACITOR_APP = true; window.WF_BUILD_VERSION = "${otaVersion}"; window.WF_NATIVE_VERSION = "1.0.0";</script>`);
  fs.writeFileSync(path.join(wwwDir, 'index.html'), capacitorHtml, 'utf8');

  // Zip index.html for OTA
  const zipped = fflate.zipSync({
    "index.html": fflate.strToU8(capacitorHtml)
  });
  fs.writeFileSync(path.join(wwwDir, 'bundle.zip'), Buffer.from(zipped));

  const manifest = {
    version: otaVersion,
    min_native_version: minNativeVersion,
    url: '/api/app/bundle.zip',
    checksum: contentHash,
    built_at: new Date().toISOString()
  };
  fs.writeFileSync(path.join(wwwDir, 'version.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // Generate src/views/ota-bundle.ts for Cloudflare Worker to serve
  const otaBundleBase64 = Buffer.from(zipped).toString('base64');
  const otaTs = `// Auto-generated OTA bundle for Wallaflare Capacitor app
export const OTA_VERSION = ${JSON.stringify(otaVersion)};
export const OTA_MIN_NATIVE_VERSION = ${JSON.stringify(minNativeVersion)};
export const OTA_BUNDLE_B64 = ${JSON.stringify(otaBundleBase64)};
export const OTA_CHECKSUM = ${JSON.stringify(contentHash)};
`;
  fs.writeFileSync(path.resolve(__dirname, '../src/views/ota-bundle.ts'), otaTs, 'utf8');

  console.log(`✓ Successfully generated www/index.html & OTA bundle ${otaVersion} (${zipped.length} bytes zipped)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
