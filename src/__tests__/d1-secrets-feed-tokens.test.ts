import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import {
  hashPassword,
  verifyPasswordHash,
  verifyMasterPassword,
  setMasterPassword,
  isMasterPasswordConfigured,
  getOrCreateFeedToken,
  setFeedToken,
  verifyFeedToken,
  getConfig,
  setConfig,
  clearConfigCache
} from '../db/queries';

function createMockD1Database() {
  const store = new Map<string, string>();
  const apiTokens = new Map<string, any>();
  const rateLimits = new Map<string, any>();

  return {
    _store: store,
    prepare(query: string) {
      let bound: any[] = [];
      const stmt = {
        bind(...params: any[]) {
          bound = params;
          return stmt;
        },
        async first<T = any>() {
          if (query.includes('FROM config WHERE key = ?')) {
            const val = store.get(bound[0]);
            return val !== undefined ? ({ value: val } as T) : null;
          }
          if (query.includes('FROM api_tokens WHERE token_hash = ?')) {
            const row = apiTokens.get(bound[0]);
            return row ? (row as T) : null;
          }
          if (query.includes('FROM auth_rate_limits WHERE ip = ?')) {
            return (rateLimits.get(bound[0]) || null) as T;
          }
          return null as T;
        },
        async all<T = any>() {
          if (query.includes('FROM api_tokens')) {
            return { results: Array.from(apiTokens.values()) as T[] };
          }
          return { results: [] as T[] };
        },
        async run() {
          if (query.includes('config') && query.includes('INSERT INTO')) {
            store.set(bound[0], bound[1]);
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM config WHERE key = ?')) {
            const existed = store.delete(bound[0]);
            return { meta: { changes: existed ? 1 : 0 } };
          }
          if (query.includes('DELETE FROM config')) {
            const count = store.size;
            store.clear();
            return { meta: { changes: count } };
          }
          if (query.includes('auth_rate_limits') && query.includes('INSERT INTO')) {
            rateLimits.set(bound[0], { failed_attempts: bound[1], last_attempt_at: bound[2], locked_until: bound[3] });
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM auth_rate_limits')) {
            rateLimits.delete(bound[0]);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 1 }, success: true };
        }
      };
      return stmt;
    }
  };
}

describe('D1 Master Password & Dedicated Feed Token Vault', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockD1Database();
    clearConfigCache(mockDb);
  });

  describe('PBKDF2 Password Hashing', () => {
    it('creates salted PBKDF2 hash and verifies correctly', async () => {
      const password = 'my-super-secret-password-123';
      const { hashString, saltHex, hashHex } = await hashPassword(password);

      expect(hashString).toMatch(/^pbkdf2:100000:[a-f0-9]{32}:[a-f0-9]{64}$/);
      expect(saltHex).toHaveLength(32);
      expect(hashHex).toHaveLength(64);

      const isValid = await verifyPasswordHash(password, hashString);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPasswordHash('wrong-password', hashString);
      expect(isInvalid).toBe(false);
    });

    it('rejects invalid or malformed hash strings gracefully', async () => {
      expect(await verifyPasswordHash('pass', '')).toBe(false);
      expect(await verifyPasswordHash('pass', 'md5:bad_hash')).toBe(false);
      expect(await verifyPasswordHash('pass', 'pbkdf2:1000')).toBe(false);
    });
  });

  describe('Auto-Migration from env.AUTH_TOKEN to D1 config', () => {
    it('automatically hashes and seeds D1 config on first successful login with env.AUTH_TOKEN', async () => {
      const env = { AUTH_TOKEN: 'initial-wrangler-secret-pass' } as any;

      // Initially, no password exists in D1
      expect(await getConfig(mockDb, 'admin_password')).toBeNull();

      // First verification with correct AUTH_TOKEN
      const verifyResult = await verifyMasterPassword(mockDb, env, 'initial-wrangler-secret-pass');
      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.migrated).toBe(true);

      // Now D1 must have the salted PBKDF2 hash stored
      const storedHash = await getConfig(mockDb, 'admin_password');
      expect(storedHash).not.toBeNull();
      expect(storedHash).toContain('pbkdf2:100000:');

      // Subsequent login verifies against D1 directly
      const nextResult = await verifyMasterPassword(mockDb, { AUTH_TOKEN: 'different-or-empty' } as any, 'initial-wrangler-secret-pass');
      expect(nextResult.valid).toBe(true);

      // Wrong password fails
      const badResult = await verifyMasterPassword(mockDb, env, 'wrong-password');
      expect(badResult.valid).toBe(false);
    });
  });

  describe('Change Master Password in D1 (POST /api/admin/change-password)', () => {
    it('updates master password and validates minimum length', async () => {
      const env = { DB: mockDb, AUTH_TOKEN: 'old-master-pass-123' } as any;

      // Seed D1
      await verifyMasterPassword(mockDb, env, 'old-master-pass-123');

      // 1. Rejects short password (< 8 chars)
      const shortRes = await app.request('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: 'old-master-pass-123', new_password: 'short' })
      }, env);
      expect(shortRes.status).toBe(400);
      const shortJson = await shortRes.json();
      expect(shortJson.error).toBe('invalid_password');

      // 2. Rejects wrong current password
      const wrongCurrentRes = await app.request('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: 'incorrect-password', new_password: 'new-valid-master-password-456' })
      }, env);
      expect(wrongCurrentRes.status).toBe(401);

      // 3. Successfully updates password
      const successRes = await app.request('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: 'old-master-pass-123', new_password: 'new-valid-master-password-456' })
      }, env);
      expect(successRes.status).toBe(200);
      const successJson = await successRes.json();
      expect(successJson.success).toBe(true);
      expect(successRes.headers.get('Set-Cookie')).toContain('PHPSESSID=');

      // 4. Old password is now rejected
      const oldCheck = await verifyMasterPassword(mockDb, env, 'old-master-pass-123');
      expect(oldCheck.valid).toBe(false);

      // 5. New password succeeds
      const newCheck = await verifyMasterPassword(mockDb, env, 'new-valid-master-password-456');
      expect(newCheck.valid).toBe(true);
    });
  });

  describe('Syndication Feed Tokens (OPDS 1.2 & RSS 2.0)', () => {
    it('auto-generates clean 16-character feed token and allows custom setting', async () => {
      const env = { DB: mockDb, AUTH_TOKEN: 'master-secret' } as any;
      const { createSessionToken } = await import('../services/auth');
      const sessionToken = await createSessionToken(env);
      const authHeaders = { 'Cookie': `PHPSESSID=${sessionToken}` };

      // 1. First retrieval generates a default token
      const defaultToken = await getOrCreateFeedToken(mockDb, env);
      expect(defaultToken).toMatch(/^wf_[a-z0-9]{13}$/);

      // 2. GET /api/feed-token returns URLs
      const getRes = await app.request('/api/feed-token', {
        method: 'GET',
        headers: authHeaders
      }, env);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.feed_token).toBe(defaultToken);
      expect(getJson.opds_url).toContain(`/opds?token=${defaultToken}`);
      expect(getJson.rss_urls.all).toContain(`/feed/all/${defaultToken}/rss.xml`);

      // 3. POST /api/feed-token allows customizing token for e-ink devices (e.g. Xteink)
      const customRes = await app.request('/api/feed-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ token: 'my-xteink-token' })
      }, env);
      expect(customRes.status).toBe(200);
      const customJson = await customRes.json();
      expect(customJson.feed_token).toBe('my-xteink-token');
      expect(customJson.opds_url).toContain('?token=my-xteink-token');

      // 4. Custom token works in verifyFeedToken
      expect(await verifyFeedToken(mockDb, env, 'my-xteink-token')).toBe(true);
      expect(await verifyFeedToken(mockDb, env, defaultToken)).toBe(false);

      // 5. Rejects invalid token formats (spaces, special symbols)
      const invalidRes = await app.request('/api/feed-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ token: 'bad token with spaces!' })
      }, env);
      expect(invalidRes.status).toBe(400);

      // 6. Regenerate creates a new random token
      const regenRes = await app.request('/api/feed-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ token: 'regenerate' })
      }, env);
      expect(regenRes.status).toBe(200);
      const regenJson = await regenRes.json();
      expect(regenJson.feed_token).toMatch(/^wf_[a-z0-9]{13}$/);
      expect(regenJson.feed_token).not.toBe('my-xteink-token');
    });

    it('seeds admin_password on-demand upon first login verification and feed_token upon first access', async () => {
      const env = {
        DB: mockDb,
        AUTH_TOKEN: 'existing-secret-from-wrangler',
        READ_TOKEN: 'existing-read-token'
      } as any;

      // Before request, config is empty
      expect(await getConfig(mockDb, 'admin_password')).toBeNull();
      expect(await getConfig(mockDb, 'feed_token')).toBeNull();

      // 1. feed_token is seeded when feed token is accessed
      const token = await getOrCreateFeedToken(mockDb, env);
      expect(token).toBe('existing-read-token');
      expect(await getConfig(mockDb, 'feed_token')).toBe('existing-read-token');
      // admin_password is still not touched
      expect(await getConfig(mockDb, 'admin_password')).toBeNull();

      // 2. admin_password is seeded when verifyMasterPassword runs with the env secret
      const check = await verifyMasterPassword(mockDb, env, 'existing-secret-from-wrangler');
      expect(check.valid).toBe(true);
      expect(check.migrated).toBe(true);

      const seededPass = await getConfig(mockDb, 'admin_password');
      expect(seededPass).not.toBeNull();
      expect(await verifyPasswordHash('existing-secret-from-wrangler', seededPass!)).toBe(true);
    });

    it('requires authentication for /api/feed-token when password is configured', async () => {
      const env = { DB: mockDb, AUTH_TOKEN: 'admin-password-123' } as any;

      // Unauthenticated request should be rejected by authMiddleware
      const unauthedRes = await app.request('/api/feed-token', { method: 'GET' }, env);
      expect(unauthedRes.status).toBe(401);

      // Request with valid session cookie should succeed
      const { createSessionToken } = await import('../services/auth');
      const sessionToken = await createSessionToken(env);
      const authedRes = await app.request('/api/feed-token', {
        method: 'GET',
        headers: { 'Cookie': `PHPSESSID=${sessionToken}` }
      }, env);
      expect(authedRes.status).toBe(200);
      const json = await authedRes.json();
      expect(json.success).toBe(true);
      expect(json.feed_token).toMatch(/^wf_/);
    });

    it('strictly rejects master password on /feed and /opds with uniform generic error', async () => {
      const env = { DB: mockDb, AUTH_TOKEN: 'master-admin-password' } as any;
      await setFeedToken(mockDb, 'valid-feed-token');

      // 1. Passing master password on /opds returns generic 401
      const opdsMasterRes = await app.request('/opds?token=master-admin-password', { method: 'GET' }, env);
      expect(opdsMasterRes.status).toBe(401);
      const opdsMasterText = await opdsMasterRes.text();
      expect(opdsMasterText).toContain('Dedicated read token required. Please provide a valid feed token from your Wallaflare dashboard.');

      // 2. Passing completely wrong token returns the exact same generic 401 error message (no detection oracle!)
      const opdsWrongRes = await app.request('/opds?token=random-guess-1234', {
        method: 'GET',
        headers: { 'CF-Connecting-IP': '10.0.0.99' }
      }, env);
      expect(opdsWrongRes.status).toBe(401);
      const opdsWrongText = await opdsWrongRes.text();
      expect(opdsWrongText).toContain('Dedicated read token required. Please provide a valid feed token from your Wallaflare dashboard.');

      // 3. Passing master password on /feed returns generic 401
      const feedMasterRes = await app.request('/feed/unread?token=master-admin-password', { method: 'GET' }, env);
      expect(feedMasterRes.status).toBe(401);
      const feedMasterText = await feedMasterRes.text();
      expect(feedMasterText).toContain('Dedicated read token required. Please provide a valid feed token from your Wallaflare dashboard.');

      // 4. Valid feed token succeeds on both
      const opdsGoodRes = await app.request('/opds?token=valid-feed-token', { method: 'GET' }, env);
      expect(opdsGoodRes.status).toBe(200);

      const feedGoodRes = await app.request('/feed/unread?token=valid-feed-token', { method: 'GET' }, env);
      expect(feedGoodRes.status).toBe(200);
    });
  });
});
