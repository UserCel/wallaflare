import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

async function packageRelease() {
  const rootDir = path.resolve(__dirname, '..');
  const releaseDir = path.resolve(rootDir, 'release-assets');
  if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true, force: true });
  }
  fs.mkdirSync(releaseDir, { recursive: true });

  // 1. Read web / server version from package.json
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const webVersion = pkg.version || '1.0.0';

  // 2. Read Android version from android/app/build.gradle
  const gradleContent = fs.readFileSync(path.join(rootDir, 'android/app/build.gradle'), 'utf8');
  const androidMatch = gradleContent.match(/versionName\s+["']([^"']+)["']/);
  const androidVersion = androidMatch ? androidMatch[1] : '1.0.0';

  // 3. Read KOReader version from integrations/koreader/wallaflare.koplugin/_meta.lua
  const metaContent = fs.readFileSync(path.join(rootDir, 'integrations/koreader/wallaflare.koplugin/_meta.lua'), 'utf8');
  const kopluginMatch = metaContent.match(/version\s*=\s*["']([^"']+)["']/);
  const kopluginVersion = kopluginMatch ? kopluginMatch[1] : '1.0.0';

  // 4. Git short SHA
  let gitSha = 'unknown';
  try {
    gitSha = execSync('git rev-parse --short HEAD', { cwd: rootDir }).toString().trim();
  } catch {}

  console.log(`📦 Packaging Release Assets:`);
  console.log(`   - Web App Version:    ${webVersion}`);
  console.log(`   - Android Native:     ${androidVersion}`);
  console.log(`   - KOReader Plugin:    ${kopluginVersion}`);
  console.log(`   - Git Commit SHA:      ${gitSha}`);

  // 5. Ensure web assets & KOReader plugin zip are generated
  const kopluginZipSource = path.join(rootDir, 'www/download/wallaflare.koplugin.zip');
  if (!fs.existsSync(kopluginZipSource)) {
    console.log(`Building web & KOReader assets...`);
    execSync('npm run build:web', { cwd: rootDir, stdio: 'inherit' });
  }

  // Copy KOReader zip with versioned and static filenames
  const kopluginTargetName = `wallaflare-koplugin-v${kopluginVersion}.zip`;
  fs.copyFileSync(kopluginZipSource, path.join(releaseDir, kopluginTargetName));
  fs.copyFileSync(kopluginZipSource, path.join(releaseDir, 'wallaflare.koplugin.zip'));
  console.log(`✓ Created ${kopluginTargetName} & wallaflare.koplugin.zip`);

  // 6. Locate APK
  const apkDebug = path.join(rootDir, 'android/app/build/outputs/apk/debug/app-debug.apk');
  const apkRelease = path.join(rootDir, 'android/app/build/outputs/apk/release/app-release.apk');
  const apkReleaseUnsigned = path.join(rootDir, 'android/app/build/outputs/apk/release/app-release-unsigned.apk');

  let sourceApk = '';
  if (fs.existsSync(apkRelease)) sourceApk = apkRelease;
  else if (fs.existsSync(apkDebug)) sourceApk = apkDebug;
  else if (fs.existsSync(apkReleaseUnsigned)) sourceApk = apkReleaseUnsigned;

  const androidTargetName = `wallaflare-android-v${androidVersion}-web-v${webVersion}-${gitSha}.apk`;
  if (sourceApk && fs.existsSync(sourceApk)) {
    fs.copyFileSync(sourceApk, path.join(releaseDir, androidTargetName));
    fs.copyFileSync(sourceApk, path.join(releaseDir, 'wallaflare.apk'));
    console.log(`✓ Created ${androidTargetName} & wallaflare.apk`);
  } else {
    console.warn(`⚠️ No compiled APK found at ${apkDebug}. Run 'npm run build:apk' to build it.`);
  }

  // Generate RELEASE_NOTES.md
  const summaryMd = `### 📦 Wallaflare Release Artifacts

| Component | Version | Artifact |
| :--- | :--- | :--- |
| 🌐 **Web Dashboard & Edge Engine** | \`v${webVersion}\` | Embedded in Cloudflare Worker & Android APK |
| 📱 **Native Android App** | \`v${androidVersion}\` | [\`${androidTargetName}\`](https://github.com/UserCel/wallaflare/releases/latest/download/${androidTargetName}) |
| 📖 **KOReader E-Ink Plugin** | \`v${kopluginVersion}\` | [\`${kopluginTargetName}\`](https://github.com/UserCel/wallaflare/releases/latest/download/${kopluginTargetName}) |

> *Note: \`wallaflare.apk\` and \`wallaflare.koplugin.zip\` are also attached as permanent unversioned download links.*
`;

  fs.writeFileSync(path.join(releaseDir, 'RELEASE_NOTES.md'), summaryMd, 'utf8');
  console.log(`\n🎉 Release assets ready in release-assets/`);
}

packageRelease().catch(err => {
  console.error(err);
  process.exit(1);
});
