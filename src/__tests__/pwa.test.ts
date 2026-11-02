import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { parseHTML } from "linkedom";
import { webRouter } from "../routes/web";
import { renderDashboardHtml } from "../views/dashboard";
import { handlePwaShareTarget } from "../client/utils/pwa";

describe("PWA Web App Manifest & Service Worker Tests", () => {
  let app: Hono<any>;

  beforeEach(() => {
    app = new Hono();
    app.route("/", webRouter);
  });

  it("serves a valid W3C PWA web app manifest on /manifest.webmanifest", async () => {
    const res = await app.request("https://wallaflare.example.com/manifest.webmanifest", {
      method: "GET"
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/manifest+json");

    const manifest = await res.json();
    expect(manifest.name).toBe("Wallaflare");
    expect(manifest.short_name).toBe("Wallaflare");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.background_color).toBe("#0f172a");
    expect(manifest.theme_color).toBe("#0f172a");
    expect(manifest.icons).toHaveLength(4);
    expect(manifest.icons[0].sizes).toBe("192x192");
    expect(manifest.icons[1].sizes).toBe("512x512");
    expect(manifest.share_target).toBeDefined();
    expect(manifest.share_target.action).toBe("/share-target");
  });

  it("serves the PWA web app manifest alias on /manifest.json", async () => {
    const res = await app.request("https://wallaflare.example.com/manifest.json", {
      method: "GET"
    });
    expect(res.status).toBe(200);
    const manifest = await res.json();
    expect(manifest.display).toBe("standalone");
  });

  it("serves a valid service worker on /sw.js", async () => {
    const res = await app.request("https://wallaflare.example.com/sw.js", {
      method: "GET"
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/javascript");
    expect(res.headers.get("service-worker-allowed")).toBe("/");

    const sw = await res.text();
    expect(sw).toContain("addEventListener('install'");
    expect(sw).toContain("addEventListener('activate'");
    expect(sw).toContain("addEventListener('fetch'");
  });

  it("includes PWA manifest link, theme-color, and Apple mobile web tags in dashboard HTML", () => {
    const html = renderDashboardHtml("Wallaflare", false, true);
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest">');
    expect(html).toContain('<meta name="theme-color" content="#0f172a">');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes">');
    expect(html).toContain('<link rel="apple-touch-icon" href="/img/icon-192.png">');
  });

  it("processes incoming shared URL via handlePwaShareTarget", async () => {
    const dom = parseHTML(`<!DOCTYPE html><html><body></body></html>`);
    const win = dom.window as any;
    const doc = dom.document;

    win.location = {
      href: "https://wallaflare.example.com/share-target?url=https%3A%2F%2Fexample.com%2Fnews%2F123&title=News",
      pathname: "/share-target",
      search: "?url=https%3A%2F%2Fexample.com%2Fnews%2F123&title=News"
    };

    win.history = {
      replaceState: vi.fn()
    };

    // Mock saveArticleWithFallback import returning proper SaveArticleResult
    const extractor = await import("../client/extractor");
    vi.spyOn(extractor, "saveArticleWithFallback").mockResolvedValue({
      ok: true,
      data: { id: 123, title: "News" },
      parserUsed: "server"
    } as any);

    const loadArticlesSpy = vi.fn();
    win.loadArticles = loadArticlesSpy;

    (globalThis as any).window = win;
    (globalThis as any).document = doc;

    await handlePwaShareTarget();

    // Verify address bar is cleaned to root
    expect(win.history.replaceState).toHaveBeenCalledWith({}, "", "/");
    expect(extractor.saveArticleWithFallback).toHaveBeenCalledWith("https://example.com/news/123", undefined, {
      title: "News"
    });
  });
});
