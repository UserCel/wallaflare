import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockD1Database } from "./mock-db";

describe("Web Sub-Routes & 404 Not Found Handling", () => {
  it("serves the dashboard HTML on /all, /unread, /starred, and /archive", async () => {
    const env = { DB: createMockD1Database() } as any;
    for (const path of ["/all", "/unread", "/starred", "/archive"]) {
      const res = await app.request(`https://wallaflare.example.com${path}`, { method: "GET" }, env);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
    }
  });

  it("serves a styled 404 HTML page with a link back to / for unknown browser routes", async () => {
    const env = { DB: createMockD1Database() } as any;
    const res = await app.request("https://wallaflare.example.com/does-not-exist", {
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml" },
    }, env);
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("Page Not Found");
    expect(html).toContain("/does-not-exist");
    expect(html).toContain('href="/"');
  });

  it("escapes HTML in the unknown path on the 404 page", async () => {
    const env = { DB: createMockD1Database() } as any;
    const res = await app.request("https://wallaflare.example.com/%3Cscript%3Ealert(1)%3C/script%3E", {
      method: "GET",
      headers: { Accept: "text/html" },
    }, env);
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("returns JSON 404 for unknown API routes", async () => {
    const env = { DB: createMockD1Database() } as any;
    const res = await app.request("https://wallaflare.example.com/api/nonexistent-endpoint", {
      method: "GET",
    }, env);
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    const json = await res.json();
    expect(json.error).toBe("Not Found");
  });
});
