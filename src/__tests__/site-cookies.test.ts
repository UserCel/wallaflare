import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { apiRouter } from "../routes/api";
import {
  saveSiteCookie,
  getSiteCookies,
  getSiteCookieForDomain,
  toggleSiteCookie,
  deleteSiteCookie,
} from "../db/queries";

// In-Memory SQLite / Mock D1 Database for testing
class MockD1Database {
  public tables: Record<string, any[]> = {
    site_cookies: [],
    entries: [],
    tags: [],
    entry_tags: [],
    annotations: [],
    deleted_entries: [],
    sync_state: [{ id: 1, revision: 1, instance_id: 1, updated_at: new Date().toISOString() }],
  };

  prepare(query: string) {
    const q = query.trim();
    const handleAll = async (params: any[] = []) => {
      if (q.includes("SELECT") && q.includes("site_cookies")) {
        if (q.includes("WHERE is_enabled = 1")) {
          return { results: this.tables.site_cookies.filter((r) => r.is_enabled === 1) };
        }
        return { results: [...this.tables.site_cookies] };
      }
      return { results: [] };
    };

    const handleRun = async (params: any[] = []) => {
      if (q.includes("UPDATE sync_state")) {
        this.tables.sync_state[0].revision += 1;
        return { meta: { changes: 1 } };
      }
      if (q.includes("INSERT INTO site_cookies")) {
        const [domain, siteName, cookieValue, revision, createdAt, updatedAt] = params;
        const existingIdx = this.tables.site_cookies.findIndex(
          (r) => r.domain.toLowerCase() === domain.toLowerCase()
        );
        if (existingIdx >= 0) {
          this.tables.site_cookies[existingIdx] = {
            ...this.tables.site_cookies[existingIdx],
            site_name: siteName,
            cookie_value: cookieValue,
            is_enabled: 1,
            revision: revision || 2,
            updated_at: updatedAt,
          };
        } else {
          this.tables.site_cookies.push({
            id: this.tables.site_cookies.length + 1,
            domain,
            site_name: siteName,
            cookie_value: cookieValue,
            is_enabled: 1,
            revision: revision || 2,
            created_at: createdAt,
            updated_at: updatedAt,
          });
        }
        return { meta: { changes: 1 } };
      }
      if (q.includes("UPDATE site_cookies SET is_enabled = ?")) {
        const [isEnabled, revision, updatedAt, domain] = params;
        const site = this.tables.site_cookies.find(
          (r) => r.domain.toLowerCase() === domain.toLowerCase()
        );
        if (site) {
          site.is_enabled = isEnabled;
          site.revision = revision;
          site.updated_at = updatedAt;
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 0 } };
      }
      if (q.includes("DELETE FROM site_cookies WHERE domain = ?")) {
        const [domain] = params;
        const initialLen = this.tables.site_cookies.length;
        this.tables.site_cookies = this.tables.site_cookies.filter(
          (r) => r.domain.toLowerCase() !== domain.toLowerCase()
        );
        return { meta: { changes: initialLen - this.tables.site_cookies.length } };
      }
      return { meta: { changes: 1 } };
    };

    const handleFirst = async () => {
      if (q.includes("SELECT revision FROM sync_state")) {
        return { revision: this.tables.sync_state[0].revision };
      }
      return null;
    };

    return {
      bind: (...params: any[]) => ({
        all: () => handleAll(params),
        first: handleFirst,
        run: () => handleRun(params),
      }),
      run: () => handleRun([]),
      all: () => handleAll([]),
      first: handleFirst,
    };
  }
}

describe("Site Cookies & Logged-In Sites Vault API", () => {
  let mockDb: any;
  let app: Hono<any>;

  beforeEach(() => {
    mockDb = new MockD1Database();
    app = new Hono();
    app.route("/", apiRouter);
  });

  it("saves, retrieves, toggles enable/disable, and matches site cookies by domain", async () => {
    await saveSiteCookie(mockDb, "medium.com", "Medium", "sid=secret123; uid=user456");
    await saveSiteCookie(mockDb, "substack.com", "Substack", "connect.sid=sub789");

    const list = await getSiteCookies(mockDb);
    expect(list).toHaveLength(2);
    expect(list.find((s) => s.domain === "medium.com")?.is_enabled).toBe(1);

    // Exact domain lookup when enabled
    const cookie = await getSiteCookieForDomain(mockDb, "medium.com");
    expect(cookie).toBe("sid=secret123; uid=user456");

    // Subdomain lookup (e.g. blog.medium.com -> matches medium.com)
    const subCookie = await getSiteCookieForDomain(mockDb, "towardsdatascience.medium.com");
    expect(subCookie).toBe("sid=secret123; uid=user456");

    // Toggle disabled
    await toggleSiteCookie(mockDb, "medium.com", false);
    const cookieAfterDisable = await getSiteCookieForDomain(mockDb, "medium.com");
    expect(cookieAfterDisable).toBeNull();

    // Toggle re-enabled
    await toggleSiteCookie(mockDb, "medium.com", true);
    const cookieAfterEnable = await getSiteCookieForDomain(mockDb, "medium.com");
    expect(cookieAfterEnable).toBe("sid=secret123; uid=user456");

    // Deletion
    const deleted = await deleteSiteCookie(mockDb, "medium.com");
    expect(deleted).toBe(true);

    const remaining = await getSiteCookies(mockDb);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].domain).toBe("substack.com");
  });

  it("handles GET, POST, PATCH, and DELETE /api/site-cookies routes", async () => {
    // 1. POST
    const postReq = new Request("http://localhost/api/site-cookies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test_token",
      },
      body: JSON.stringify({
        domain: "patreon.com",
        site_name: "Patreon",
        cookie_value: "session=xyz",
      }),
    });

    const postRes = await app.fetch(postReq, { DB: mockDb, AUTH_TOKEN: "test_token" });
    expect(postRes.status).toBe(200);

    // 2. GET
    const getReq = new Request("http://localhost/api/site-cookies", {
      headers: { "Authorization": "Bearer test_token" },
    });
    const getRes = await app.fetch(getReq, { DB: mockDb, AUTH_TOKEN: "test_token" });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json<any>();
    expect(getData.sites).toHaveLength(1);
    expect(getData.sites[0].domain).toBe("patreon.com");
    expect(getData.sites[0].is_enabled).toBe(1);

    // 3. PATCH (Toggle Disable)
    const patchReq = new Request("http://localhost/api/site-cookies/patreon.com", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test_token",
      },
      body: JSON.stringify({ is_enabled: false }),
    });
    const patchRes = await app.fetch(patchReq, { DB: mockDb, AUTH_TOKEN: "test_token" });
    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json<any>();
    expect(patchData.is_enabled).toBe(0);

    // 4. DELETE
    const deleteReq = new Request("http://localhost/api/site-cookies/patreon.com", {
      method: "DELETE",
      headers: { "Authorization": "Bearer test_token" },
    });
    const deleteRes = await app.fetch(deleteReq, { DB: mockDb, AUTH_TOKEN: "test_token" });
    expect(deleteRes.status).toBe(200);

    const remaining = await getSiteCookies(mockDb);
    expect(remaining).toHaveLength(0);
  });
});
