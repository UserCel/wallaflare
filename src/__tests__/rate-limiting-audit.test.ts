import { describe, it, expect } from 'vitest';
import app from '../index';
import { EntryRow } from '../types';

function createMockRateLimitDb() {
  let entries: EntryRow[] = [];
  let rateLimits: Map<string, { failed_attempts: number; last_attempt_at: number; locked_until: number }> = new Map();
  let syncState = { id: 1, revision: 1, instance_id: 1780000000000, updated_at: new Date().toISOString() };

  return {
    _rateLimits: rateLimits,
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmt = {
        bind(...params: any[]) {
          boundParams = params;
          return stmt;
        },
        async first<T = any>() {
          if (query.includes('FROM sync_state')) {
            return syncState as T;
          }
          if (query.includes('SUM(CASE WHEN is_archived = 0')) {
            return { unread: 0, starred: 0, archive: 0, total: 0 } as T;
          }
          if (query.includes('SELECT COUNT(*)')) {
            return { total: 0 } as T;
          }
          if (query.includes('FROM auth_rate_limits WHERE ip = ?')) {
            const ip = boundParams[0];
            return (rateLimits.get(ip) || null) as T;
          }
          return null as T;
        },
        async all<T = any>() {
          return { results: [] as T[] };
        },
        async run() {
          if (query.includes('auth_rate_limits') && query.includes('INSERT INTO')) {
            const ip = boundParams[0];
            rateLimits.set(ip, {
              failed_attempts: boundParams[1],
              last_attempt_at: boundParams[2],
              locked_until: boundParams[3],
            });
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM auth_rate_limits')) {
            boundParams.forEach(p => rateLimits.delete(p));
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 1 } };
        },
      };
      return stmt;
    },
  };
}

describe('Automated Rate-Limiting Security Audit for All Protected Endpoints', () => {
  const MASTER_SECRET = 'audit_master_secret_888';

  // Extract all unique route paths from Hono router
  const registeredRoutes = app.routes
    .filter((r) => r.path && !r.path.includes('*') && !r.path.includes(':id') && !r.path.includes(':tag') && !r.path.includes(':domain'))
    .map((r) => ({ method: r.method, path: r.path }));

  // Deduplicate method + path combinations
  const uniqueRoutes = Array.from(
    new Map(registeredRoutes.map((r) => [`${r.method} ${r.path}`, r])).values()
  );

  it('identifies and verifies rate limiting across all protected endpoints in the system', async () => {
    const mockDb = createMockRateLimitDb();
    let protectedEndpointsChecked = 0;

    for (let i = 0; i < uniqueRoutes.length; i++) {
      const { method, path } = uniqueRoutes[i];
      const testIp = `198.51.100.${i + 1}`;

      // 1. Send probe without credentials to check if endpoint is protected
      const probeRes = await app.request(path, {
        method,
        headers: {
          'CF-Connecting-IP': testIp,
        },
      }, {
        DB: mockDb as any,
        AUTH_TOKEN: MASTER_SECRET,
      });

      // If endpoint requires authentication (returns 401)
      if (probeRes.status === 401) {
        protectedEndpointsChecked++;

        // 2. Submit 5 failed attempts with invalid credentials
        for (let attempt = 1; attempt <= 5; attempt++) {
          let headers: Record<string, string> = {
            'CF-Connecting-IP': testIp,
          };
          let body: string | undefined;

          if (path.startsWith('/opds')) {
            headers['Authorization'] = 'Basic ' + Buffer.from(`wallaflare:wrong_token_${attempt}`).toString('base64');
          } else {
            headers['Authorization'] = `Bearer wrong_token_${attempt}`;
          }

          if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify({ token: `wrong_token_${attempt}` });
          }

          const failRes = await app.request(path, {
            method,
            headers,
            body,
          }, {
            DB: mockDb as any,
            AUTH_TOKEN: MASTER_SECRET,
          });

          if (attempt < 5) {
            expect(failRes.status).toBe(401);
          } else {
            // 5th failed attempt must trigger 429 lockout
            expect(failRes.status).toBe(429);
          }
        }

        // 3. 6th attempt from the same IP must be immediately blocked with 429 Too Many Requests
        const lockedRes = await app.request(path, {
          method,
          headers: {
            'CF-Connecting-IP': testIp,
            'Authorization': `Bearer ${MASTER_SECRET}`,
          },
        }, {
          DB: mockDb as any,
          AUTH_TOKEN: MASTER_SECRET,
        });

        expect(lockedRes.status).toBe(429);
      }
    }

    console.log(`[Rate-Limiting Audit] Successfully audited ${protectedEndpointsChecked} protected endpoints across all modules.`);
    expect(protectedEndpointsChecked).toBeGreaterThan(15);
  });

  it('verifies rate limiting lockout on login and verification endpoints (POST /login_check & POST /api/auth/verify)', async () => {
    const mockDb = createMockRateLimitDb();

    // 1. Test /api/auth/verify
    const verifyIp = '198.51.200.1';
    for (let i = 1; i <= 5; i++) {
      const res = await app.request('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': verifyIp,
        },
        body: JSON.stringify({ token: `wrong_${i}` }),
      }, {
        DB: mockDb as any,
        AUTH_TOKEN: MASTER_SECRET,
      });

      if (i < 5) {
        expect(res.status).toBe(400);
      } else {
        expect(res.status).toBe(429);
      }
    }

    const verifyLocked = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': verifyIp,
      },
      body: JSON.stringify({ token: MASTER_SECRET }),
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: MASTER_SECRET,
    });
    expect(verifyLocked.status).toBe(429);

    // 2. Test /login_check (attempts 1-5 redirect with error, attempt 6+ blocks with 429)
    const loginIp = '198.51.200.2';
    for (let i = 1; i <= 5; i++) {
      const res = await app.request('/login_check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'CF-Connecting-IP': loginIp,
        },
        body: `_username=wallaflare&_password=wrong_${i}`,
      }, {
        DB: mockDb as any,
        AUTH_TOKEN: MASTER_SECRET,
      });

      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toContain('/login?error=1');
    }

    const loginLocked = await app.request('/login_check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'CF-Connecting-IP': loginIp,
      },
      body: `_username=wallaflare&_password=${MASTER_SECRET}`,
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: MASTER_SECRET,
    });
    expect(loginLocked.status).toBe(429);
  });
  it('blocks token-interleaving attacks: valid OPDS_TOKEN cannot reset admin brute-force counter', async () => {
    const mockDb = createMockRateLimitDb();
    const attackerIp = '198.51.100.99';
    const MASTER_TOKEN = 'secret_admin_master_123';
    const OPDS_TOKEN = 'valid_opds_reader_key_777';

    // 1. Attacker sends 4 failed guesses against admin endpoint
    for (let i = 1; i <= 4; i++) {
      const res = await app.request('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': attackerIp,
        },
        body: JSON.stringify({ token: `guessed_wrong_${i}` }),
      }, {
        DB: mockDb as any,
        AUTH_TOKEN: MASTER_TOKEN,
        OPDS_TOKEN: OPDS_TOKEN,
      });

      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(json.attempts_left).toBe(5 - i);
    }

    // 2. Attacker uses valid OPDS_TOKEN on /opds to try resetting the rate-limit counter
    const opdsRes = await app.request(`/opds?token=${OPDS_TOKEN}`, {
      method: 'GET',
      headers: {
        'CF-Connecting-IP': attackerIp,
      },
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: MASTER_TOKEN,
      OPDS_TOKEN: OPDS_TOKEN,
    });
    expect(opdsRes.status).toBe(200);

    // 3. Attacker sends 5th failed guess against admin endpoint
    // Despite the valid OPDS request, the admin counter was NOT reset and MUST trigger 429 lockout!
    const fifthGuessRes = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': attackerIp,
      },
      body: JSON.stringify({ token: 'guessed_wrong_5' }),
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: MASTER_TOKEN,
      OPDS_TOKEN: OPDS_TOKEN,
    });

    expect(fifthGuessRes.status).toBe(429);
    const lockedJson = await fifthGuessRes.json() as any;
    expect(lockedJson.locked).toBe(true);

    // 4. Once admin is locked out, all scopes including OPDS are blocked
    const lockedOpdsRes = await app.request(`/opds?token=${OPDS_TOKEN}`, {
      method: 'GET',
      headers: {
        'CF-Connecting-IP': attackerIp,
      },
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: MASTER_TOKEN,
      OPDS_TOKEN: OPDS_TOKEN,
    });
    expect(lockedOpdsRes.status).toBe(429);
  });

  it('isolates OPDS e-reader lockouts: misconfigured e-reader does not lock user out of web dashboard', async () => {
    const mockDb = createMockRateLimitDb();
    const homeIp = '198.51.100.100';
    const MASTER_TOKEN = 'secret_admin_master_123';
    const OPDS_TOKEN = 'valid_opds_reader_key_777';

    // 1. E-reader at home sends 5 failed requests with wrong token to /opds
    for (let i = 1; i <= 5; i++) {
      const res = await app.request(`/opds?token=broken_typo_token_${i}`, {
        method: 'GET',
        headers: {
          'CF-Connecting-IP': homeIp,
        },
      }, {
        DB: mockDb as any,
        AUTH_TOKEN: MASTER_TOKEN,
        OPDS_TOKEN: OPDS_TOKEN,
      });

      if (i < 5) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(429);
      }
    }

    // 2. /opds is locked out
    const opdsLocked = await app.request(`/opds?token=broken_typo_token_6`, {
      method: 'GET',
      headers: { 'CF-Connecting-IP': homeIp },
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: MASTER_TOKEN,
      OPDS_TOKEN: OPDS_TOKEN,
    });
    expect(opdsLocked.status).toBe(429);

    // 3. User on same home IP can STILL access web dashboard & verify master AUTH_TOKEN
    const adminRes = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': homeIp,
      },
      body: JSON.stringify({ token: MASTER_TOKEN }),
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: MASTER_TOKEN,
      OPDS_TOKEN: OPDS_TOKEN,
    });
    expect(adminRes.status).toBe(200);

    // 4. Authenticating with master AUTH_TOKEN also cleared the OPDS lockout!
    const opdsUnlocked = await app.request(`/opds?token=${OPDS_TOKEN}`, {
      method: 'GET',
      headers: { 'CF-Connecting-IP': homeIp },
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: MASTER_TOKEN,
      OPDS_TOKEN: OPDS_TOKEN,
    });
    expect(opdsUnlocked.status).toBe(200);
  });
  it('enforces strict credential segregation: AUTH_TOKEN cannot be probed or cracked via /opds when OPDS_TOKEN is set', async () => {
    const mockDb = createMockRateLimitDb();
    const probeIp = '198.51.100.101';
    const MASTER_TOKEN = 'secret_admin_master_123';
    const OPDS_TOKEN = 'valid_opds_reader_key_777';

    // Attacker tries to pass the real AUTH_TOKEN on /opds
    const res = await app.request(`/opds?token=${MASTER_TOKEN}`, {
      method: 'GET',
      headers: {
        'CF-Connecting-IP': probeIp,
      },
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: MASTER_TOKEN,
      OPDS_TOKEN: OPDS_TOKEN,
    });

    // When OPDS_TOKEN is set, /opds strictly rejects AUTH_TOKEN
    expect(res.status).toBe(401);

    // Only OPDS_TOKEN is accepted on /opds
    const validOpdsRes = await app.request(`/opds?token=${OPDS_TOKEN}`, {
      method: 'GET',
      headers: {
        'CF-Connecting-IP': probeIp,
      },
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: MASTER_TOKEN,
      OPDS_TOKEN: OPDS_TOKEN,
    });
    expect(validOpdsRes.status).toBe(200);
  });
});