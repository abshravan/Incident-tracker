"use client";

/**
 * Attachment bytes live in IndexedDB, not in the zustand store: localStorage
 * caps out around 5MB and a single screenshot can spend most of that. The
 * store keeps only `Attachment` metadata, keyed by the same id used here.
 *
 * Swapping in a real backend means replacing these four functions with uploads
 * to object storage — nothing else reads the blobs directly.
 */

const DB_NAME = "incident-tracker/files";
const STORE = "attachments";
const VERSION = 1;

/** Per-file ceiling, so one paste cannot fill the user's disk quota. */
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable"));
  }
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = work(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

export function putAttachment(id: string, blob: Blob) {
  return run("readwrite", (store) => store.put(blob, id));
}

export function getAttachment(id: string) {
  return run<Blob | undefined>("readonly", (store) => store.get(id));
}

export function deleteAttachment(id: string) {
  return run("readwrite", (store) => store.delete(id));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const isImage = (type: string) => type.startsWith("image/");
