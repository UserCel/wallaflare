import { authFetch } from "../sync/api";

export const OUTBOX_STORAGE_KEY = "wf_pending_mutations";
export const DEAD_LETTER_STORAGE_KEY = "wf_dead_letter_mutations";
let isProcessingOutbox = false;

function notifyOutboxChanged(count: number): void {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    try {
      window.dispatchEvent(new CustomEvent("wf:outbox-changed", { detail: { count } }));
    } catch {}
  }
}

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
      notifyOutboxChanged(0);
    } else {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(mutations));
      notifyOutboxChanged(mutations.length);
    }
  } catch (e) {
    console.warn("Failed to save pending mutations to storage:", e);
  }
}

export function enqueueMutation(action: string, payload: any): any {
  let mutations = getPendingMutations();
  if (action === "set_reading_progress" && payload?.id) {
    mutations = mutations.filter(m => !(m.action === "set_reading_progress" && m.payload?.id === payload.id));
  }
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
      if (mut.nextRetryAt && Date.now() < Number(mut.nextRetryAt)) {
        break;
      }

      let success = false;
      let removeOnError = false;
      let authOrRateBlocked = false;
      const handleResponseStatus = (res: Response) => {
        if (res.ok || res.status === 404) {
          success = true;
        } else if (res.status === 401 || res.status === 429) {
          authOrRateBlocked = true;
        } else if (res.status >= 400 && res.status < 500) {
          removeOnError = true;
        }
      };

      try {
        if (mut.action === "delete") {
          const res = await authFetch("/api/entries/" + mut.payload.id + ".json", { method: "DELETE" });
          handleResponseStatus(res);
        } else if (mut.action === "batch_delete") {
          const res = await authFetch("/api/entries/list.json", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: mut.payload.ids })
          });
          handleResponseStatus(res);
        } else if (mut.action === "toggle_star") {
          const res = await authFetch("/api/entries/" + mut.payload.id + ".json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ starred: mut.payload.is_starred })
          });
          handleResponseStatus(res);
        } else if (mut.action === "batch_star") {
          const res = await authFetch("/api/entries/list.json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: mut.payload.ids, starred: mut.payload.starred })
          });
          handleResponseStatus(res);
        } else if (mut.action === "toggle_archive") {
          const res = await authFetch("/api/entries/" + mut.payload.id + ".json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archive: mut.payload.is_archived })
          });
          handleResponseStatus(res);
        } else if (mut.action === "batch_archive") {
          const res = await authFetch("/api/entries/list.json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: mut.payload.ids, archive: mut.payload.archive })
          });
          handleResponseStatus(res);
        } else if (mut.action === "edit_title") {
          const res = await authFetch("/api/entries/" + mut.payload.id + ".json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: mut.payload.title })
          });
          handleResponseStatus(res);
        } else if (mut.action === "set_bookmark") {
          const res = await authFetch("/api/entries/" + mut.payload.id + ".json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookmark: mut.payload.bookmark ?? null })
          });
          handleResponseStatus(res);
        } else if (mut.action === "set_reading_progress") {
          const res = await authFetch("/api/entries/" + mut.payload.id + ".json", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reading_progress: mut.payload.reading_progress ?? 0 })
          });
          handleResponseStatus(res);
        } else if (mut.action === "create_url") {
          const res = await authFetch("/api/entries.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: mut.payload.url, title: mut.payload.title })
          });
          handleResponseStatus(res);
        } else if (mut.action === "add_tag") {
          const res = await authFetch("/api/entries/" + mut.payload.id + "/tags.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: mut.payload.tag })
          });
          handleResponseStatus(res);
        } else if (mut.action === "remove_tag") {
          const res = await authFetch("/api/entries/" + mut.payload.id + "/tags/" + encodeURIComponent(mut.payload.tag) + ".json", {
            method: "DELETE"
          });
          handleResponseStatus(res);
        } else if (mut.action === "batch_add_tag") {
          const res = await authFetch("/api/entries/tags/lists.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: mut.payload.ids, tags: mut.payload.tag })
          });
          handleResponseStatus(res);
        } else if (mut.action === "batch_remove_tag") {
          const res = await authFetch("/api/entries/tags/lists.json", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: mut.payload.ids, tag: mut.payload.tag })
          });
          handleResponseStatus(res);
        } else {
          success = true;
        }
      } catch (networkErr) {
        break;
      }

      if (authOrRateBlocked) {
        break;
      }

      if (success || removeOnError) {
        const updated = getPendingMutations().filter(m => m.id !== mut.id);
        savePendingMutations(updated);
      } else {
        const nextRetryCount = (mut.retryCount || 0) + 1;
        if (nextRetryCount > 10) {
          try {
            const deadRaw = localStorage.getItem(DEAD_LETTER_STORAGE_KEY);
            const deadList = deadRaw ? JSON.parse(deadRaw) : [];
            deadList.push({ ...mut, retryCount: nextRetryCount, failedAt: Date.now() });
            localStorage.setItem(DEAD_LETTER_STORAGE_KEY, JSON.stringify(deadList.slice(-50)));
          } catch {}
          const updated = getPendingMutations().filter(m => m.id !== mut.id);
          savePendingMutations(updated);
        } else {
          const backoffMs = Math.min(300_000, Math.pow(2, nextRetryCount) * 1000);
          const updated = getPendingMutations().map(m =>
            m.id === mut.id ? { ...m, retryCount: nextRetryCount, nextRetryAt: Date.now() + backoffMs } : m
          );
          savePendingMutations(updated);
          break;
        }
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
