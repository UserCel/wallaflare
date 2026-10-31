const DB_NAME = "wallaflare_offline_db";
const DB_VERSION = 1;
const STORE_ENTRIES = "entries";

export function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
          db.createObjectStore(STORE_ENTRIES, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function deduplicateEntries(entries: any[]): any[] {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();
  const result: any[] = [];
  for (const item of entries) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export async function clearIndexedDB(): Promise<void> {
  try {
    const db = await openIndexedDB();
    if (!db) return;
    const tx = db.transaction(STORE_ENTRIES, "readwrite");
    tx.objectStore(STORE_ENTRIES).clear();
  } catch {}
}

export async function saveEntriesToIndexedDB(entries: any[]): Promise<void> {
  try {
    const db = await openIndexedDB();
    if (!db) return;
    const tx = db.transaction(STORE_ENTRIES, "readwrite");
    const store = tx.objectStore(STORE_ENTRIES);
    await store.clear();
    if (Array.isArray(entries)) {
      for (const item of entries) {
        if (item && item.id) {
          store.put(item);
        }
      }
    }
  } catch (err) {
    console.warn("Failed saving to IndexedDB:", err);
  }
}

export async function deleteEntryFromIndexedDB(id: number | string): Promise<void> {
  try {
    const db = await openIndexedDB();
    if (!db) return;
    const tx = db.transaction(STORE_ENTRIES, "readwrite");
    tx.objectStore(STORE_ENTRIES).delete(id);
  } catch {}
}

export async function loadEntriesFromIndexedDB(): Promise<any[]> {
  try {
    const db = await openIndexedDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_ENTRIES, "readonly");
      const store = tx.objectStore(STORE_ENTRIES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Attach to window for global access & HTML inline event handlers
if (typeof window !== "undefined") {
  const w = window as any;
  w.openIndexedDB = openIndexedDB;
  w.deduplicateEntries = deduplicateEntries;
  w.clearIndexedDB = clearIndexedDB;
  w.saveEntriesToIndexedDB = saveEntriesToIndexedDB;
  w.deleteEntryFromIndexedDB = deleteEntryFromIndexedDB;
  w.loadEntriesFromIndexedDB = loadEntriesFromIndexedDB;
}
