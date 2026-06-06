import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ZenvidiaDB extends DBSchema {
  drafts: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      timestamp: number;
      filter?: string;
      duration?: number;
      thumbnailUrl?: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ZenvidiaDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ZenvidiaDB>('zenvidia-drafts-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export interface Draft {
  id: string;
  blob: Blob;
  timestamp: number;
  filter?: string;
  duration?: number;
  thumbnailUrl?: string;
}

export const saveDraft = async (
  videoBlob: Blob,
  filter = 'none',
  duration = 0
): Promise<string> => {
  const db = await getDB();
  const id = crypto.randomUUID();
  const draft: Draft = {
    id,
    blob: videoBlob,
    timestamp: Date.now(),
    filter,
    duration,
  };
  await db.put('drafts', draft);
  return id;
};

export const getDrafts = async (): Promise<Draft[]> => {
  const db = await getDB();
  const allDrafts = await db.getAll('drafts');
  return allDrafts.sort((a, b) => b.timestamp - a.timestamp);
};

export const deleteDraft = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('drafts', id);
};

export const getTotalStorageUsed = async (): Promise<number> => {
  const drafts = await getDrafts();
  return drafts.reduce((total, d) => total + d.blob.size, 0);
};
