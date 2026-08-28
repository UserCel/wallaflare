import { describe, it, expect } from "vitest";
import { reconcileDeltaSync } from "../client/sync/reconciliation";
import { Article } from "../client/types";

describe("Sync Reconciliation & Deletion Bug Fixes", () => {
  const dummyArticle = (id: number): Article => ({
    id,
    title: `Article ${id}`,
    url: `https://example.com/${id}`,
    domain_name: "example.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  it("clears all local entries when server has 0 total items during delta sync", () => {
    const localEntries = [dummyArticle(223), dummyArticle(224)];
    
    // Server reports total = 0 during a delta sync (e.g. all articles deleted from another device)
    const payload = {
      up_to_date: false,
      sync_rev: 5,
      entries: [],
      deleted_ids: [],
      counts: { unread: 0, archive: 0, starred: 0, total: 0 },
      total: 0,
    };

    const result = reconcileDeltaSync(localEntries, payload, true);
    expect(result).toHaveLength(0);
  });

  it("prunes tombstones correctly and does not retain deleted articles", () => {
    const localEntries = [dummyArticle(223), dummyArticle(224), dummyArticle(225)];

    const payload = {
      up_to_date: false,
      sync_rev: 6,
      entries: [],
      deleted_ids: [223, 224],
      counts: { unread: 1, archive: 0, starred: 0, total: 1 },
      total: 1,
    };

    const result = reconcileDeltaSync(localEntries, payload, true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(225);
  });
});
