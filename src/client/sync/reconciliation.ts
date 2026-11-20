import { Article, SyncCounts } from "../types";

export interface PendingAnnotationMutation {
  entryId: number;
  annId: string | number;
  seq: number;
  text?: string;
  color?: string;
  quote?: string;
  target?: any;
  committed?: boolean;
  committedAt?: number;
  committedUpdatedAt?: string;
}

const pendingAnnotationMutations = new Map<string, PendingAnnotationMutation>();
let mutationSeqCounter = 0;

/**
 * Registers an optimistic in-flight annotation mutation so concurrent syncs
 * do not overwrite local edits with stale server snapshots.
 */
export function registerPendingAnnotationMutation(
  entryId: number,
  annId: string | number,
  patch: { text?: string; color?: string; quote?: string; target?: any }
): number {
  const seq = ++mutationSeqCounter;
  const key = String(annId);
  const prev = pendingAnnotationMutations.get(key);
  pendingAnnotationMutations.set(key, {
    entryId,
    annId,
    seq,
    text: patch.text !== undefined ? patch.text : prev?.text,
    color: patch.color !== undefined ? patch.color : prev?.color,
    quote: patch.quote !== undefined ? patch.quote : prev?.quote,
    target: patch.target !== undefined ? patch.target : prev?.target,
    committed: false,
  });
  return seq;
}

/**
 * Marks a pending annotation mutation as committed on the server so any
 * still-in-flight sync that snapshotted before the commit won't revert it.
 */
export function markPendingAnnotationCommitted(
  annId: string | number,
  seq: number,
  updatedAt?: string
): void {
  const key = String(annId);
  const current = pendingAnnotationMutations.get(key);
  if (current && current.seq === seq) {
    current.committed = true;
    current.committedAt = Date.now();
    if (updatedAt) current.committedUpdatedAt = updatedAt;
  }
}

/**
 * Clears a pending annotation mutation if it is still the latest sequence for that annotation.
 */
export function clearPendingAnnotationMutation(annId: string | number, seq: number): void {
  const key = String(annId);
  const current = pendingAnnotationMutations.get(key);
  if (current && current.seq === seq) {
    pendingAnnotationMutations.delete(key);
  }
}

/**
 * Migrates a pending mutation from a temporary client ID (tmp_*) to the server-assigned ID.
 */
export function migratePendingAnnotationMutation(oldId: string | number, newId: string | number): void {
  const oldKey = String(oldId);
  const current = pendingAnnotationMutations.get(oldKey);
  if (current) {
    pendingAnnotationMutations.delete(oldKey);
    pendingAnnotationMutations.set(String(newId), { ...current, annId: newId });
  }
}

/**
 * Overlays in-flight annotation mutations and uncommitted tmp_ highlights onto
 * incoming server entries so concurrent syncs never revert recent user edits.
 */
export function preservePendingAnnotationsInEntries(freshEntries: Article[], localEntries: Article[]): Article[] {
  const hasTemp = localEntries.some(
    (e: any) => Array.isArray(e.annotations) && e.annotations.some((a: any) => String(a.id).startsWith("tmp_"))
  );
  if (pendingAnnotationMutations.size === 0 && !hasTemp) {
    return freshEntries;
  }

  const now = Date.now();
  const localMap = new Map(localEntries.map((e) => [e.id, e]));

  return freshEntries.map((entry: any) => {
    const localEntry: any = localMap.get(entry.id);
    const annotations = Array.isArray(entry.annotations) ? entry.annotations.map((a: any) => ({ ...a })) : [];
    let changed = false;

    for (const ann of annotations) {
      const key = String(ann.id);
      const pending = pendingAnnotationMutations.get(key);
      if (pending && pending.entryId === entry.id) {
        if (pending.committed) {
          const serverCaughtUp =
            (pending.committedUpdatedAt && ann.updated_at && ann.updated_at >= pending.committedUpdatedAt) ||
            ((pending.text === undefined || ann.text === pending.text) &&
              (pending.color === undefined || ann.color === pending.color) &&
              (pending.quote === undefined || ann.quote === pending.quote)) ||
            (pending.committedAt !== undefined && now - pending.committedAt > 15000);
          if (serverCaughtUp) {
            pendingAnnotationMutations.delete(key);
            continue;
          }
        }
        if (pending.text !== undefined) ann.text = pending.text;
        if (pending.color !== undefined) ann.color = pending.color;
        if (pending.quote !== undefined) ann.quote = pending.quote;
        if (pending.target !== undefined) ann.target = pending.target;
        changed = true;
      }
    }

    if (localEntry && Array.isArray(localEntry.annotations)) {
      for (const localAnn of localEntry.annotations) {
        if (String(localAnn.id).startsWith("tmp_") && !annotations.some((a: any) => String(a.id) === String(localAnn.id))) {
          annotations.push(localAnn);
          changed = true;
        }
      }
    }

    return changed ? { ...entry, annotations } : entry;
  });
}

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
  // If the server has 0 total items in the library, clear all local entries immediately
  if (payload.counts?.total === 0 || (!isDeltaSync && payload.total === 0)) {
    return [];
  }

  let updated = [...localEntries];

  // 1. Prune deleted items by tombstone ID
  if (Array.isArray(payload.deleted_ids) && payload.deleted_ids.length > 0) {
    const delSet = new Set(payload.deleted_ids);
    updated = updated.filter((e) => !delSet.has(e.id));
  }

  // 2. Smart merge fresh updated/new entries
  if (payload.entries && payload.entries.length > 0) {
    const protectedFresh = preservePendingAnnotationsInEntries(payload.entries, updated);
    const freshMap = new Map(protectedFresh.map((e) => [e.id, e]));
    const merged = [...protectedFresh];
    for (const existing of updated) {
      if (!freshMap.has(existing.id)) {
        merged.push(existing);
      }
    }
    return merged;
  }

  return updated;
}
