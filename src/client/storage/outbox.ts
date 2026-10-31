import { authFetch } from "../sync/api";

export const OUTBOX_STORAGE_KEY = "wf_pending_mutations";
let isProcessingOutbox = false;

export function getPendingMutations(): any[] {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePendingMutations(mutations: any[]): void {
  try {
    if (!mutations || mutations.length === 0) {
      localStorage.removeItem(OUTBOX_STORAGE_KEY);
    } else {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(mutations));
    }
  } catch (e) {
    console.warn("Failed to save pending mutations to storage:", e);
  }
}

export function enqueueMutation(action: string, payload: any): any {
  const mutations = getPendingMutations();
  const mutation = {
    id: "mut_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    action: action,
    payload: payload,
    createdAt: Date.now(),
    retryCount: 0
  };
  mutations.push(mutation);
  savePendingMutations(mutations);
  processOutboxMutations();
  return mutation;
}

export async function processOutboxMutations(): Promise<void> {
  if (isProcessingOutbox) return;
  const mutations = getPendingMutations();
  if (mutations.length === 0) return;

  isProcessingOutbox = true;
  try {
    while (true) {
      const currentQueue = getPendingMutations();
      if (currentQueue.length === 0) break;
      const mut = currentQueue[0];

      let success = false;
      let removeOnError = false;

      try {
        if (mut.action === "delete") {
          const res = await authFetch("/api/entries/" + mut.payload.id + ".json", { method: "DELETE" });
          if (res.ok || res.status === 404) success = true;
          else if (res.status >= 400 && res.status < 500) removeOnError = true;
        } else if (mut.action === "batch_delete") {
          const res = await authFetch("/api/entries/list.json", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: mut.payload.ids })
          });
          if (res.ok || res.status === 404) success = true;
          else if (res.status >= 400 && res.status < 500) removeOnError = true;
        } else if (mut.action === "toggle_star") {
          const res = await authFetch("/api/entries/" + mut.payload.id + ".json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ starred: mut.payload.is_starred })
          });
          if (res.ok || res.status === 404) success = true;
          else if (res.status >= 400 && res.status < 500) removeOnError = true;
        } else if (mut.action === "batch_star") {
          const res = await authFetch("/api/entries/list.json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: mut.payload.ids, starred: mut.payload.starred })
          });
          if (res.ok || res.status === 404) success = true;
          else if (res.status >= 400 && res.status < 500) removeOnError = true;
        } else if (mut.action === "toggle_archive") {
          const res = await authFetch("/api/entries/" + mut.payload.id + ".json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archive: mut.payload.is_archived })
          });
          if (res.ok || res.status === 404) success = true;
          else if (res.status >= 400 && res.status < 500) removeOnError = true;
        } else if (mut.action === "batch_archive") {
          const res = await authFetch("/api/entries/list.json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: mut.payload.ids, archive: mut.payload.archive })
          });
          if (res.ok || res.status === 404) success = true;
          else if (res.status >= 400 && res.status < 500) removeOnError = true;
        } else if (mut.action === "edit_title") {
          const res = await authFetch("/api/entries/" + mut.payload.id + ".json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: mut.payload.title })
          });
          if (res.ok || res.status === 404) success = true;
          else if (res.status >= 400 && res.status < 500) removeOnError = true;
        } else if (mut.action === "add_tag") {
          const res = await authFetch("/api/entries/" + mut.payload.id + "/tags.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: mut.payload.tag })
          });
          if (res.ok || res.status === 404) success = true;
          else if (res.status >= 400 && res.status < 500) removeOnError = true;
        } else if (mut.action === "remove_tag") {
          const res = await authFetch("/api/entries/" + mut.payload.id + "/tags/" + encodeURIComponent(mut.payload.tag) + ".json", {
            method: "DELETE"
          });
          if (res.ok || res.status === 404) success = true;
          else if (res.status >= 400 && res.status < 500) removeOnError = true;
        } else if (mut.action === "batch_add_tag") {
          const res = await authFetch("/api/entries/tags/lists.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: mut.payload.ids, tags: mut.payload.tag })
          });
          if (res.ok || res.status === 404) success = true;
          else if (res.status >= 400 && res.status < 500) removeOnError = true;
        } else if (mut.action === "batch_remove_tag") {
          const res = await authFetch("/api/entries/tags/lists.json", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: mut.payload.ids, tag: mut.payload.tag })
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
        const updated = getPendingMutations().filter(m => m.id !== mut.id);
        savePendingMutations(updated);
      } else {
        mut.retryCount = (mut.retryCount || 0) + 1;
        if (mut.retryCount > 10) {
          const updated = getPendingMutations().filter(m => m.id !== mut.id);
          savePendingMutations(updated);
        }
        break;
      }
    }
  } finally {
    isProcessingOutbox = false;
  }
}

// Attach to window for global access & HTML inline event handlers
if (typeof window !== "undefined") {
  const w = window as any;
  w.OUTBOX_STORAGE_KEY = OUTBOX_STORAGE_KEY;
  w.getPendingMutations = getPendingMutations;
  w.savePendingMutations = savePendingMutations;
  w.enqueueMutation = enqueueMutation;
  w.processOutboxMutations = processOutboxMutations;
}
