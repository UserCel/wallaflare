import { OutboxMutation } from "../types";
import { PREF_KEYS } from "./preferences";

export const OUTBOX_STORAGE_KEY = "wf_pending_mutations";

export function getPendingMutations(): OutboxMutation[] {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function savePendingMutations(mutations: OutboxMutation[]): void {
  if (!mutations || mutations.length === 0) {
    localStorage.removeItem(OUTBOX_STORAGE_KEY);
  } else {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(mutations));
  }
}

export function enqueueMutation(action: string, payload: any): OutboxMutation {
  const mutations = getPendingMutations();
  const mutation: OutboxMutation = {
    id: "mut_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    action,
    payload,
    createdAt: Date.now(),
    retryCount: 0
  };
  mutations.push(mutation);
  savePendingMutations(mutations);
  return mutation;
}

export async function processOutboxMutations(authFetchFn: (url: string, opts?: any) => Promise<Response>): Promise<void> {
  const mutations = getPendingMutations();
  if (mutations.length === 0) return;

  while (true) {
    const currentQueue = getPendingMutations();
    if (currentQueue.length === 0) break;
    const mut = currentQueue[0];

    let success = false;
    let removeOnError = false;

    try {
      if (mut.action === "delete") {
        const res = await authFetchFn(`/api/entries/${mut.payload.id}.json`, { method: "DELETE" });
        if (res.ok || res.status === 404) success = true;
        else if (res.status >= 400 && res.status < 500) removeOnError = true;
      } else if (mut.action === "batch_delete") {
        const res = await authFetchFn("/api/entries/list.json", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mut.payload)
        });
        if (res.ok) success = true;
        else if (res.status >= 400 && res.status < 500) removeOnError = true;
      } else if (mut.action === "toggle_star") {
        const res = await authFetchFn(`/api/entries/${mut.payload.id}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ starred: mut.payload.is_starred })
        });
        if (res.ok || res.status === 404) success = true;
        else if (res.status >= 400 && res.status < 500) removeOnError = true;
      } else if (mut.action === "toggle_archive") {
        const res = await authFetchFn(`/api/entries/${mut.payload.id}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archive: mut.payload.is_archived })
        });
        if (res.ok || res.status === 404) success = true;
        else if (res.status >= 400 && res.status < 500) removeOnError = true;
      } else if (mut.action === "edit_title") {
        const res = await authFetchFn(`/api/entries/${mut.payload.id}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: mut.payload.title })
        });
        if (res.ok || res.status === 404) success = true;
        else if (res.status >= 400 && res.status < 500) removeOnError = true;
      } else if (mut.action === "add_tag") {
        const res = await authFetchFn(`/api/entries/${mut.payload.id}/tags.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: mut.payload.tag })
        });
        if (res.ok) success = true;
        else if (res.status >= 400 && res.status < 500) removeOnError = true;
      } else if (mut.action === "remove_tag") {
        const res = await authFetchFn(`/api/entries/${mut.payload.id}/tags/${encodeURIComponent(mut.payload.tag)}.json`, {
          method: "DELETE"
        });
        if (res.ok || res.status === 404) success = true;
        else if (res.status >= 400 && res.status < 500) removeOnError = true;
      } else {
        success = true;
      }
    } catch (networkErr) {
      break;
    }

    if (success || removeOnError) {
      const updated = getPendingMutations().filter((m) => m.id !== mut.id);
      savePendingMutations(updated);
    } else {
      break;
    }
  }
}
