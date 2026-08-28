import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { apiRouter } from "../routes/api";
import {
  saveSiteCookie,
  getSiteCookies,
  getSiteCookieForDomain,
  deleteSiteCookie,
  clearAllSiteCookies,
} from "../db/queries";

class MockSyncD1Database {
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
      if (q.includes("PRAGMA table_info")) {
        return { results: [{ name: "id" }, { name: "domain" }, { name: "site_name" }, { name: "cookie_value" }, { name: "is_enabled" }, { name: "revision" }] };
      }
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
      if (q.includes("DELETE FROM site_cookies")) {
        const initialLen = this.tables.site_cookies.length;
        this.tables.site_cookies = [];
        return { meta: { changes: initialLen } };
      }
      return { meta: { changes: 1 } };
    };

    const handleFirst = async () => {
      if (q.includes("SELECT revision FROM sync_state")) {
        return { revision: this.tables.sync_state[0].revision };
      }
      if (q.includes("SELECT name FROM sqlite_master")) {
        return { name: "site_cookies" };
      }
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

describe("Site Cookie Deletion & Multi-Device Sync Propagation Tests", () => {
  let mockDb: any;
  let app: Hono<any>;

  beforeEach(() => {
    mockDb = new MockSyncD1Database();
    app = new Hono();
    app.route("/", apiRouter);
  });

  it("bumps revision on deletion and propagates removal across sync clients", async () => {
    await saveSiteCookie(mockDb, "github.com", "GitHub", "user_session=secret123");
    await saveSiteCookie(mockDb, "substack.com", "Substack", "connect.sid=sub456");

    let currentList = await getSiteCookies(mockDb, true);
    expect(currentList).toHaveLength(2);
    expect(currentList.map((s) => s.domain)).toContain("github.com");
    expect(currentList.map((s) => s.domain)).toContain("substack.com");

    let githubCookie = await getSiteCookieForDomain(mockDb, "github.com");
    expect(githubCookie).toBe("user_session=secret123");

    const delReq = new Request("http://localhost/api/site-cookies/github.com", {
      method: "DELETE",
      headers: { "Authorization": "Bearer test_token" },
    });
    const delRes = await app.fetch(delReq, { DB: mockDb, AUTH_TOKEN: "test_token" });
    expect(delRes.status).toBe(200);
    const delData = await delRes.json<any>();
    expect(delData.success).toBe(true);

    githubCookie = await getSiteCookieForDomain(mockDb, "github.com");
    expect(githubCookie).toBeNull();

    const syncReq = new Request("http://localhost/api/site-cookies", {
      headers: { "Authorization": "Bearer test_token" },
    });
    const syncRes = await app.fetch(syncReq, { DB: mockDb, AUTH_TOKEN: "test_token" });
    expect(syncRes.status).toBe(200);
    const syncData = await syncRes.json<any>();

    expect(syncData.sites).toHaveLength(1);
    expect(syncData.sites[0].domain).toBe("substack.com");
    expect(syncData.sites.find((s: any) => s.domain === "github.com")).toBeUndefined();
  });

  it("handles bulk deletion of all site cookies via DELETE /api/site-cookies", async () => {
    await saveSiteCookie(mockDb, "github.com", "GitHub", "user_session=secret123");
    await saveSiteCookie(mockDb, "medium.com", "Medium", "uid=medium789");

    let currentList = await getSiteCookies(mockDb, true);
    expect(currentList).toHaveLength(2);

    const clearReq = new Request("http://localhost/api/site-cookies", {
      method: "DELETE",
      headers: { "Authorization": "Bearer test_token" },
    });
    const clearRes = await app.fetch(clearReq, { DB: mockDb, AUTH_TOKEN: "test_token" });
    expect(clearRes.status).toBe(200);
    const clearData = await clearRes.json<any>();
    expect(clearData.success).toBe(true);

    currentList = await getSiteCookies(mockDb, true);
    expect(currentList).toHaveLength(0);
  });
});
