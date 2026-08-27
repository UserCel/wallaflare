import { Article } from "../types";

const DB_NAME = "wallaflare_db";
const DB_VERSION = 1;
const STORE_ENTRIES = "entries";

export function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB not supported"));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        db.createObjectStore(STORE_ENTRIES, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function deduplicateEntries(entries: Article[]): Article[] {
  const seen = new Set<number>();
  const out: Article[] = [];
  for (const e of entries) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  return out;
}

export async function clearIndexedDB(): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_ENTRIES, "readwrite");
    tx.objectStore(STORE_ENTRIES).clear();
  } catch (e) {
    console.warn("Failed to clear IndexedDB:", e);
  }
}

export async function saveEntriesToIndexedDB(entries: Article[]): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_ENTRIES, "readwrite");
    const store = tx.objectStore(STORE_ENTRIES);
    for (const e of entries) {
      store.put(e);
    }
  } catch (e) {
    console.warn("Failed to save entries to IndexedDB:", e);
  }
}

export async function deleteEntryFromIndexedDB(id: number): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_ENTRIES, "readwrite");
    tx.objectStore(STORE_ENTRIES).delete(id);
  } catch (e) {
    console.warn("Failed to delete entry from IndexedDB:", e);
  }
}

export async function loadEntriesFromIndexedDB(): Promise<Article[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_ENTRIES, "readonly");
      const store = tx.objectStore(STORE_ENTRIES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}
