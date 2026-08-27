import { Article, SyncCounts } from "../types";

export interface DeltaSyncPayload {
  up_to_date?: boolean;
  sync_rev?: number;
  entries?: Article[];
  deleted_ids?: number[];
  counts?: SyncCounts;
  total?: number;
  pages?: number;
}

export function reconcileDeltaSync(localEntries: Article[], payload: DeltaSyncPayload, isDeltaSync: boolean): Article[] {
  let updated = [...localEntries];

  // 1. Prune deleted items
  if (Array.isArray(payload.deleted_ids) && payload.deleted_ids.length > 0) {
    const delSet = new Set(payload.deleted_ids);
    updated = updated.filter((e) => !delSet.has(e.id));
  }

  const serverHasZeroTotal = payload.counts?.total === 0 || (!isDeltaSync && payload.total === 0);

  // 2. Smart merge
  if (!isDeltaSync && serverHasZeroTotal) {
    return [];
  } else if (payload.entries && payload.entries.length > 0) {
    const freshMap = new Map(payload.entries.map((e) => [e.id, e]));
    const merged = [...payload.entries];
    for (const existing of updated) {
      if (!freshMap.has(existing.id)) {
        merged.push(existing);
      }
    }
    return merged;
  }

  return updated;
}
