/**
 * IndexedDB storage for the Strong's Lexicon — enables offline access
 * without re-downloading. Three stores: chapters, definitions, translations.
 */

const DB_NAME = "lexicon_offline";
const DB_VERSION = 1;

const STORE_CHAPTERS = "chapters";
const STORE_DEFINITIONS = "definitions";
const STORE_TRANSLATIONS = "translations";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
          db.createObjectStore(STORE_CHAPTERS);
        }
        if (!db.objectStoreNames.contains(STORE_DEFINITIONS)) {
          db.createObjectStore(STORE_DEFINITIONS);
        }
        if (!db.objectStoreNames.contains(STORE_TRANSLATIONS)) {
          db.createObjectStore(STORE_TRANSLATIONS);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn("[lexiconOfflineStore] open error", req.error);
        resolve(null);
      };
      req.onblocked = () => resolve(null);
    } catch (err) {
      console.warn("[lexiconOfflineStore] init failure", err);
      resolve(null);
    }
  });

  return dbPromise;
}

async function idbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut(store: string, key: string, value: unknown): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

// Public API ----------------------------------------------------------------

export async function offlineGetChapter<T>(cacheKey: string): Promise<T | null> {
  return idbGet<T>(STORE_CHAPTERS, cacheKey);
}

export async function offlineSetChapter(cacheKey: string, value: unknown): Promise<void> {
  return idbPut(STORE_CHAPTERS, cacheKey, value);
}

export async function offlineGetDefinition<T>(strongNumber: string): Promise<T | null> {
  return idbGet<T>(STORE_DEFINITIONS, strongNumber);
}

export async function offlineSetDefinition(strongNumber: string, value: unknown): Promise<void> {
  return idbPut(STORE_DEFINITIONS, strongNumber, value);
}

export async function offlineGetTranslation<T>(strongNumber: string): Promise<T | null> {
  return idbGet<T>(STORE_TRANSLATIONS, strongNumber);
}

export async function offlineSetTranslation(strongNumber: string, value: unknown): Promise<void> {
  return idbPut(STORE_TRANSLATIONS, strongNumber, value);
}

export async function offlineGetAllTranslations(): Promise<Record<string, { def: string; kjv: string }>> {
  const db = await openDB();
  if (!db) return {};
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TRANSLATIONS, "readonly");
      const store = tx.objectStore(STORE_TRANSLATIONS);
      const result: Record<string, { def: string; kjv: string }> = {};
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          result[String(cursor.key)] = cursor.value as { def: string; kjv: string };
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      cursorReq.onerror = () => resolve(result);
    } catch {
      resolve({});
    }
  });
}
