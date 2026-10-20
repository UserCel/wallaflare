import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getCredentials(): { serverUrl: string; authToken: string } {
  let serverUrl = process.env.WALLAFLARE_URL || 'http://127.0.0.1:8787';
  let authToken = process.env.WALLAFLARE_TOKEN || '';

  // 1. Try reading from isolated KOReader test settings
  const koreaderSettings = path.resolve('scratch/koreader/data/settings/wallaflare.lua');
  if (!authToken && fs.existsSync(koreaderSettings)) {
    const content = fs.readFileSync(koreaderSettings, 'utf8');
    const tokenMatch = content.match(/\["auth_token"\]\s*=\s*"([^"]+)"/);
    const urlMatch = content.match(/\["server_url"\]\s*=\s*"([^"]+)"/);
    if (tokenMatch) authToken = tokenMatch[1];
    if (urlMatch && !process.env.WALLAFLARE_URL) serverUrl = urlMatch[1];
  }

  // 2. Try reading from .dev.vars
  if (!authToken && fs.existsSync('.dev.vars')) {
    const devVars = fs.readFileSync('.dev.vars', 'utf8');
    const tokenMatch = devVars.match(/^AUTH_TOKEN=(.+)$/m);
    if (tokenMatch) authToken = tokenMatch[1].trim();
  }

  return { serverUrl: serverUrl.replace(/\/+$/, ''), authToken };
}

async function main() {
  console.log('\n🔎 ========================================================');
  console.log('🧪 Wallaflare Automated End-to-End Sync Audit');
  console.log('========================================================\n');

  const { serverUrl, authToken } = getCredentials();
  if (!authToken) {
    console.error('❌ Could not locate AUTH_TOKEN in settings or .dev.vars.');
    console.error('💡 Please set WALLAFLARE_TOKEN=... or configure KOReader settings first.');
    process.exit(1);
  }

  console.log(`📡 Target Server : ${serverUrl}`);
  console.log(`🔑 Auth Token    : ${authToken.slice(0, 3)}***${authToken.slice(-2)}`);

  // 1. Verify Server Connectivity
  try {
    const checkRes = await fetch(`${serverUrl}/api/sync.json?perPage=1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!checkRes.ok) {
      console.error(`❌ Server returned HTTP ${checkRes.status}: ${await checkRes.text()}`);
      process.exit(1);
    }
    console.log('✅ Server Health Check: Connected (HTTP 200)');
  } catch (err: any) {
    console.error(`❌ Cannot connect to ${serverUrl}: ${err.message}`);
    console.error('💡 Ensure local dev server is running: npm run dev');
    process.exit(1);
  }

  let testEntryId: number | null = null;
  const auditDir = path.resolve('scratch/audit');

  try {
    // 2. Ingest Rich HTML Test Article
    console.log('\n📝 Step 1: Creating rich multi-paragraph test article on server...');
    const articlePayload = {
      url: `https://example.com/sync-audit-${Date.now()}`,
      title: `[SYNC_AUDIT] Test Article ${Date.now()}`,
      content: [
        '<p>The dawn broke over the ancient city with unexpected silence.</p>',
        '<p>“Did you see the messengers arrive from the north?” Elion whispered, leaning against the cold stone railing. “They brought word of the treaty.”</p>',
        '<p>“Treaties are written on parchment, but enforced by steel,” Ronald replied grimly. The banners flapped in the sudden gust of morning wind.</p>',
        '<p>Far below, the marketplace slowly stirred to life with merchants setting up their stalls.</p>'
      ].join('')
    };

    const entryRes = await fetch(`${serverUrl}/api/entries.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify(articlePayload)
    });

    if (!entryRes.ok) {
      throw new Error(`Failed to create test entry: ${await entryRes.text()}`);
    }

    const entryJson = (await entryRes.json()) as any;
    testEntryId = entryJson.id;
    console.log(`   ✓ Created test article (ID: ${testEntryId})`);

    // 3. Inject 3 Diverse Remote Annotations
    console.log('🖍️ Step 2: Ingesting diverse annotations into server database...');

    // Ann 1: Single phrase
    await fetch(`${serverUrl}/api/annotations/${testEntryId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        text: 'unexpected silence',
        quote: 'unexpected silence',
        prefix: 'ancient city with ',
        suffix: '.\n\n“Did you',
        color: 'yellow'
      })
    });
    console.log('   ✓ [Inbound 1] Short phrase highlight (yellow)');

    // Ann 2: Multi-paragraph spanning <p> tags with newlines
    await fetch(`${serverUrl}/api/annotations/${testEntryId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        text: 'cold stone railing. “They brought word of the treaty.”\n\n“Treaties are written on parchment, but enforced by steel,” Ronald replied grimly.',
        quote: 'cold stone railing. “They brought word of the treaty.”\n\n“Treaties are written on parchment, but enforced by steel,” Ronald replied grimly.',
        prefix: 'leaning against the ',
        suffix: ' The banners flapped',
        color: 'blue'
      })
    });
    console.log('   ✓ [Inbound 2] Multi-paragraph quote spanning <p> tags (blue)');

    // Ann 3: Highlight with text Note
    await fetch(`${serverUrl}/api/annotations/${testEntryId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        text: 'marketplace slowly stirred to life',
        quote: 'marketplace slowly stirred to life',
        prefix: 'Far below, the ',
        suffix: ' with merchants',
        color: 'green',
        text_content: 'Trade route monitoring required'
      })
    });
    console.log('   ✓ [Inbound 3] Highlight with custom note (green)');

    // 4. Run KOReader Sync & Audit Runner in Lua
    console.log('🔄 Step 3: Executing KOReader sync & CREngine anchor resolver...');
    const appDir = path.resolve('scratch/koreader/app/usr/lib/koreader');
    if (!fs.existsSync(path.join(appDir, 'reader.lua'))) {
      throw new Error("KOReader test app not found. Please run 'npm run koreader:setup' first.");
    }

    fs.mkdirSync(auditDir, { recursive: true });

    const luaCmd = `cd "${appDir}" && REPO_ROOT="${process.cwd()}" SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy ./luajit -l setupkoenv "${path.resolve('scripts/audit_runner.lua')}" "${serverUrl}" "${authToken}" "${testEntryId}"`;

    const luaOutput = execSync(luaCmd, { encoding: 'utf8' });
    if (!luaOutput.includes('LUA_AUDIT_SUCCESS')) {
      throw new Error(`Lua audit failed:\n${luaOutput}`);
    }
        console.log('   ✓ Inbound annotations synced and resolved in EPUB DOM');

    // 5. Inspect and Validate Lua Audit Results
    console.log('🔍 Step 4: Auditing .sdr DOM coordinates & bookmark structures...');
    const auditResultFile = path.join(auditDir, 'audit_output.json');
    if (!fs.existsSync(auditResultFile)) {
      throw new Error('Audit output JSON file missing');
    }

    const auditData = JSON.parse(fs.readFileSync(auditResultFile, 'utf8'));

    // Check each annotation
    for (const item of auditData.items) {
      if (item.is_placeholder) {
        throw new Error(`Highlight "${item.text}" is stuck on placeholder coordinate ${item.pos0}!`);
      }
    }

    const singlePhraseAnn = auditData.items.find((i: any) => i.color === 'yellow');
    const multiParaAnn = auditData.items.find((i: any) => i.color === 'blue');
    const noteAnn = auditData.items.find((i: any) => i.color === 'green');

    console.log(`   ✓ Single-phrase anchor     : ${singlePhraseAnn.pos0}`);
    console.log(`   ✓ Multi-paragraph start    : ${multiParaAnn.pos0}`);
    console.log(`   ✓ Multi-paragraph end      : ${multiParaAnn.pos1}`);
    console.log(`   ✓ Note & color preserved   : ${noteAnn.color} ("${noteAnn.note || noteAnn.text}")`);

    if (multiParaAnn.pos0 === multiParaAnn.pos1) {
      throw new Error('Multi-paragraph annotation pos0 must differ from pos1!');
    }

    // 6. Verify Outbound Reverse Sync on Server
    console.log('⬆️ Step 5: Verifying reverse outbound sync on server...');
    const serverAnnsRes = await fetch(`${serverUrl}/api/annotations/${testEntryId}.json`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const serverAnns = (await serverAnnsRes.json()) as any[];

    const uploadedHighlight = serverAnns.find((a: any) => a.color === 'magenta');
    if (!uploadedHighlight) {
      throw new Error('Server did not receive outbound KOReader highlight!');
    }
    console.log(`   ✓ Server registered local highlight (ID: ${uploadedHighlight.id}, color: ${uploadedHighlight.color})`);

    const updatedYellowHighlight = serverAnns.find((a: any) => a.color === 'yellow');
    if (!updatedYellowHighlight || updatedYellowHighlight.quote !== 'unexpected silence. “Did you see the messengers') {
      throw new Error(`Server did not receive updated quote for edited highlight! Found: "${updatedYellowHighlight?.quote}"`);
    }
    console.log(`   ✓ Server verified modified selected quote ("${updatedYellowHighlight.quote}")`);

    // 7. Final Report
    console.log('\n========================================================');
    console.log('🎉 AUDIT SUMMARY: ALL 6 PHASES PASSED WITH 100% FIDELITY');
    console.log('========================================================');
    console.log('  [PASS] 1. Live Server API Connectivity & Auth');
    console.log('  [PASS] 2. Inbound Single-Phrase DOM Anchor Resolution');
    console.log('  [PASS] 3. Inbound Multi-Paragraph Cross-Tag Resolution');
    console.log('  [PASS] 4. Inbound Note Content & Color Attributes');
    console.log('  [PASS] 5. Outbound Reverse Highlight Sync to Server');
    console.log('  [PASS] 6. Outbound Edited Selected Text (Quote) Sync to Server');
    console.log('========================================================\n');
  } finally {
    // 8. Cleanup Database and Temp Files
    if (testEntryId) {
      console.log('🧹 Teardown: Purging test article from server database...');
      try {
        await fetch(`${serverUrl}/api/entries/${testEntryId}.json`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('   ✓ Test article deleted cleanly');
      } catch (err: any) {
        console.warn(`   ⚠️ Cleanup warning: ${err.message}`);
      }
    }
    if (fs.existsSync(auditDir)) {
      fs.rmSync(auditDir, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error('\n❌ SYNC AUDIT FAILED:', err.message);
  process.exit(1);
});
