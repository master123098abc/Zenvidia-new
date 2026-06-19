import { openDB } from 'idb';

const DB_NAME = 'zenvidia-auth-db';
const STORE_NAME = 'zenvidia-auth-store';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

export const idbStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const db = await dbPromise;
      let val = await db.get(STORE_NAME, key);
      
      // Migration from localStorage
      if (val === undefined) {
        const localVal = window.localStorage.getItem(key);
        if (localVal) {
          await db.put(STORE_NAME, localVal, key);
          val = localVal;
        }
      }
      
      return val === undefined ? null : val;
    } catch (e) {
      console.warn("idbStorage getItem error:", e);
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await dbPromise;
      await db.put(STORE_NAME, value, key);
    } catch (e) {
      console.warn("idbStorage setItem error:", e);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      const db = await dbPromise;
      await db.delete(STORE_NAME, key);
    } catch (e) {
      console.warn("idbStorage removeItem error:", e);
    }
  },
};
