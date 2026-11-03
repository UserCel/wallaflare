import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { createMockD1Database } from './mock-db';

/**
 * End-to-End Wallabag Android App Contract & Regression Test Suite
 *
 * Simulates the exact multi-step connection wizard and network handshake performed
 * by the official Wallabag Android application (fr.gaulupeau.apps.InThePoche):
 * 1. ConnectionWizardActivity & TestConnectionTask:
 *    - Instance reachability on GET /
 *    - CSRF extraction & session auth on POST /login_check
 * 2. GetCredentialsTask & WallabagWebService.getApiClientCredentials():
 *    - Fetches /developer HTML
 *    - Scrapes OAuth client via strict regex (header starting with "Android app",
 *      exact 4-paragraph structure, trailing delete link, exactly one ul.collapsible)
 * 3. TestApiAccessTask:
 *    - First POST /oauth/v2/token exchange using scraped credentials
 *    - Connection test probe on /api/entries/exists.json?url=wallabag-apiwrapper-test.example.com
 * 4. SummaryFragment & Background Sync:
 *    - Second POST /oauth/v2/token exchange for permanent device token
 *    - Automated probe token pruning (ensures only 1 active token remains)
 *    - First sync on /api/tags.json and /api/entries.json
 */
describe('Official Wallabag Android App Handshake (fr.gaulupeau.apps.InThePoche)', () => {
  let mockDb: any;
  const SECRET = 'test-master-password-wallabag-app';
  const APP_UA = 'okhttp/4.9.2';

  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  /**
   * Helper that mirrors WallabagWebService.getApiClientCredentials() regex scraper.
   * Extracts client ID, secret, redirect URI, grant types, and delete link from /developer HTML.
   */
  function scrapeWallabagDeveloperClients(html: string) {
    // 1. Ensure exactly one collapsible client container exists (guard against PAT list collisions)
    const collapsibleLists = html.match(/<ul[^>]*class=["'][^"']*collapsible[^"']*["']/g) || [];
    expect(collapsibleLists.length).toBe(1);

    // 2. Parse individual client <li> elements
    const liRegex = /<li>\s*<div class="collapsible-header">([\s\S]*?)<\/div>\s*<div class="collapsible-body">([\s\S]*?)<\/div>\s*<\/li>/g;
    const clients: Array<{
      name: string;
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      grantTypes: string;
      deleteUrl: string;
    }> = [];

    let match: RegExpExecArray | null;
    while ((match = liRegex.exec(html)) !== null) {
      const headerText = match[1].trim();
      const bodyHtml = match[2];

      // Extract <code> blocks inside sequential <p> tags
      const codeMatches = [...bodyHtml.matchAll(/<p[^>]*>.*?<code>(.*?)<\/code>.*?<\/p>/gs)].map(m => m[1].trim());

      // Extract trailing delete anchor required by WallabagWebService.java
      const deleteMatch = bodyHtml.match(/<a\s+href="([^"]*\/developer\/client\/delete\/\d+)"[^>]*>Delete<\/a>/i);

      if (codeMatches.length >= 4 && deleteMatch) {
        clients.push({
          name: headerText,
          clientId: codeMatches[0],
          clientSecret: codeMatches[1],
          redirectUri: codeMatches[2],
          grantTypes: codeMatches[3],
          deleteUrl: deleteMatch[1],
        });
      }
    }

    return clients;
  }

  it('successfully executes the complete Wallabag Android App connection wizard flow', async () => {
    // =========================================================================
    // Step 1: TestConnectionTask & Instance Detection
    // =========================================================================
    // The app tests server connectivity with its OkHttp User-Agent
    const rootRes = await app.request('/', {
      headers: { 'User-Agent': APP_UA }
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(rootRes.status).toBe(200);

    // =========================================================================
    // Step 2: Web Login Scraper (WallabagWebService.login)
    // =========================================================================
    // App requests /login to locate the login form & CSRF token
    const loginPageRes = await app.request('/login', {
      headers: { 'User-Agent': APP_UA }
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(loginPageRes.status).toBe(200);
    const loginHtml = await loginPageRes.text();

    // Verify form action, method, and input elements expected by Wallabag app
    expect(loginHtml).toContain('<form action="/login_check" method="post" name="loginform">');
    const csrfMatch = loginHtml.match(/name="_csrf_token"\s+value="([^"]+)"/);
    expect(csrfMatch).toBeTruthy();
    const csrfToken = csrfMatch![1];

    // Submit credentials to /login_check
    const loginSubmitRes = await app.request('/login_check', {
      method: 'POST',
      headers: {
        'User-Agent': APP_UA,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `_username=wallaflare&_password=${encodeURIComponent(SECRET)}&_csrf_token=${encodeURIComponent(csrfToken)}`
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(loginSubmitRes.status).toBe(302);
    expect(loginSubmitRes.headers.get('Location')).toContain('/developer');

    // Extract session cookie (PHPSESSID)
    const setCookie = loginSubmitRes.headers.get('Set-Cookie') || '';
    expect(setCookie).toContain('PHPSESSID=');
    const sessionCookie = setCookie.split(';')[0];

    // =========================================================================
    // Step 3: GetCredentialsTask & Scraper
    // =========================================================================
    // App accesses /developer using the session cookie and OkHttp User-Agent
    const devRes = await app.request('/developer', {
      headers: {
        'User-Agent': APP_UA,
        'Cookie': sessionCookie
      }
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(devRes.status).toBe(200);
    const devHtml = await devRes.text();

    // WallabagWebService requires regular page markers (logout link & API management header)
    expect(devHtml).toContain('<a href="/logout">Logout</a>');
    expect(devHtml).toContain('<h2>API clients management</h2>');

    // Scrape clients using the exact Wallabag Android App parser contract
    const clients = scrapeWallabagDeveloperClients(devHtml);
    expect(clients.length).toBeGreaterThan(0);

    // Look for client whose name starts with "Android app"
    const androidClient = clients.find(c => c.name.startsWith('Android app'));
    expect(androidClient).toBeDefined();
    expect(androidClient!.clientId).toBe('wallaflare');
    expect(androidClient!.clientSecret).toBeTruthy();
    expect(androidClient!.grantTypes).toContain('password');
    expect(androidClient!.deleteUrl).toContain('/developer/client/delete/38185');

    // =========================================================================
    // Step 4: TestApiAccessTask (Initial Connection Verification Probe)
    // =========================================================================
    // App exchanges scraped credentials for initial probe token
    const testTokenRes = await app.request('/oauth/v2/token', {
      method: 'POST',
      headers: {
        'User-Agent': APP_UA,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: androidClient!.clientId,
        client_secret: androidClient!.clientSecret,
        username: 'wallaflare',
        password: SECRET,
      }).toString()
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(testTokenRes.status).toBe(200);
    const testTokenData = await testTokenRes.json() as any;
    expect(testTokenData.access_token).toBeTruthy();
    expect(testTokenData.token_type).toBe('bearer');
    expect(testTokenData.refresh_token).toBeTruthy();

    // TestApiAccessTask probes article existence URL
    const probeRes = await app.request('/api/entries/exists.json?url=wallabag-apiwrapper-test.example.com', {
      headers: {
        'User-Agent': APP_UA,
        'Authorization': `Bearer ${testTokenData.access_token}`
      }
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(probeRes.status).toBe(200);
    const probeData = await probeRes.json() as any;
    expect(probeData.exists).toBe(false);

    // =========================================================================
    // Step 5: SaveConfigurationTask & Probe Token Pruning
    // =========================================================================
    // 1 second later, the app requests the permanent token for background sync
    const permanentTokenRes = await app.request('/oauth/v2/token', {
      method: 'POST',
      headers: {
        'User-Agent': APP_UA,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: androidClient!.clientId,
        client_secret: androidClient!.clientSecret,
        username: 'wallaflare',
        password: SECRET,
      }).toString()
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(permanentTokenRes.status).toBe(200);
    const permanentTokenData = await permanentTokenRes.json() as any;
    expect(permanentTokenData.access_token).toBeTruthy();

    // Verify database state: the ephemeral probe token was cleanly pruned, leaving 1 token
    const tokenList = await (mockDb as any).prepare('SELECT * FROM api_tokens').bind().all();
    const allTokens = tokenList.results || [];
    const androidTokens = allTokens.filter((t: any) => t.label === 'Wallabag Android App');
    expect(androidTokens.length).toBe(1);
    expect(androidTokens[0].label).toBe('Wallabag Android App');

    // =========================================================================
    // Step 6: First Background Sync
    // =========================================================================
    // Fetch tags
    const tagsRes = await app.request('/api/tags.json', {
      headers: {
        'User-Agent': APP_UA,
        'Authorization': `Bearer ${permanentTokenData.access_token}`
      }
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(tagsRes.status).toBe(200);

    // Fetch entries
    const entriesRes = await app.request('/api/entries.json?perPage=30&page=1', {
      headers: {
        'User-Agent': APP_UA,
        'Authorization': `Bearer ${permanentTokenData.access_token}`
      }
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(entriesRes.status).toBe(200);
    const entriesData = await entriesRes.json() as any;
    expect(entriesData).toHaveProperty('_embedded.items');
  });

  it('serves pure minimal template to app User-Agents without Personal Access Tokens scripts', async () => {
    // App User-Agent should get clean, unadorned HTML without scripts
    const appRes = await app.request('/developer', {
      headers: { 'User-Agent': APP_UA }
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    const appHtml = await appRes.text();
    expect(appHtml).not.toContain('Personal Access Tokens');
    expect(appHtml).not.toContain('<script>');
    expect(appHtml).toContain('Android app - #38185');

    // Web browser User-Agent with valid session should get full dashboard with Personal Access Tokens
    const webRes = await app.request('/developer', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      }
    }, {
      DB: mockDb,
      AUTH_TOKEN: '', // open mode for browser inspection
    });
    const webHtml = await webRes.text();
    expect(webHtml).toContain('Personal Access Tokens');
    expect(webHtml).toContain('pat-list');
    expect(webHtml).toContain('Manage in Settings &rarr; Apps &amp; Sync');
    expect(webHtml).toContain('?settings=integrations');
  });

  it('rejects invalid password on /login_check and /oauth/v2/token', async () => {
    // 1. Invalid password on /login_check redirects to /login?error=1
    const badLoginRes = await app.request('/login_check', {
      method: 'POST',
      headers: {
        'User-Agent': APP_UA,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: '_username=wallaflare&_password=wrong-password'
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(badLoginRes.status).toBe(302);
    expect(badLoginRes.headers.get('Location')).toContain('/login?error=1');

    // 2. Invalid password on /oauth/v2/token returns 400 invalid_grant
    const badTokenRes = await app.request('/oauth/v2/token', {
      method: 'POST',
      headers: {
        'User-Agent': APP_UA,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'wallaflare',
        client_secret: 'wallaflare',
        username: 'wallaflare',
        password: 'wrong-password',
      }).toString()
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(badTokenRes.status).toBe(400);
    const errData = await badTokenRes.json() as any;
    expect(errData.error).toBe('invalid_grant');
  });
});
