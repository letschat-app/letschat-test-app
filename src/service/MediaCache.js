/**
 * MediaCache.js
 * Tiered caching service for LetsChat media.
 */
import { initDB } from './db';
import { API } from './UserAuth';

const MAX_MEMORY_THUMBS = 100;
const MAX_CACHE_SIZE = 200 * 1024 * 1024; // 200MB limit
const CLEANUP_THRESHOLD = 180 * 1024 * 1024; // Trigger cleanup at 180MB
const TARGET_CLEANUP_SIZE = 100 * 1024 * 1024; // Cleanup down to 100MB

/** In-memory cache for thumbnail Blob URLs */
export const memoryThumbCache = new Map();
const memoryThumbKeys = []; // To track order for simple LRU

/**
 * Revoke an Object URL and remove from memory cache
 */
const revokeFromMemory = (id) => {
  const url = memoryThumbCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    memoryThumbCache.delete(id);
    const idx = memoryThumbKeys.indexOf(id);
    if (idx > -1) memoryThumbKeys.splice(idx, 1);
  }
};

/**
 * Save to memory cache with size limit
 */
const saveToMemory = (id, blobUrl) => {
  if (memoryThumbCache.has(id)) {
    revokeFromMemory(id);
  }
  
  if (memoryThumbKeys.length >= MAX_MEMORY_THUMBS) {
    const oldestId = memoryThumbKeys.shift();
    revokeFromMemory(oldestId);
  }
  
  memoryThumbCache.set(id, blobUrl);
  memoryThumbKeys.push(id);
};

/**
 * Get Media Metadata from Cache or Network
 */
export const getMediaInfo = async (mediaId) => {
  const db = await initDB();
  
  // 1. Check Cache
  const cached = await db.get('mediaInfo', mediaId);
  if (cached) {
    // Update lastUsed in background
    db.put('mediaInfo', { ...cached, lastUsed: Date.now() });
    return cached.data;
  }
  
  // 2. Fetch from Network
  try {
    const response = await fetch(`${API}/files/get-url/${mediaId}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'userid': localStorage.getItem('userid')
      }
    });
    if (!response.ok) throw new Error('Failed to fetch media info');
    const data = await response.json();
    
    // 3. Save to Cache
    await db.put('mediaInfo', {
      id: mediaId,
      data,
      lastUsed: Date.now()
    });
    
    return data;
  } catch (err) {
    console.error('[MediaCache] Info fetch failed:', err);
    throw err;
  }
};

/**
 * Get Media Blob from Cache (Memory -> IDB -> Network)
 * @param {string} cacheKey - Stable identifier for the cache (e.g., file ID or hash)
 * @param {string} fetchUrl - URL to fetch from if not in cache (can be transient/signed)
 * @param {string} storeName - 'mainCache' or 'thumbCache'
 */
export const getMediaBlob = async (cacheKey, fetchUrl, storeName) => {
  if (!cacheKey) return null;
  const db = await initDB();
  
  // 1. Check In-Memory (Thumbnails only)
  if (storeName === 'thumbCache') {
    const memUrl = memoryThumbCache.get(cacheKey);
    if (memUrl) return memUrl;
  }
  
  // 2. Check IndexedDB
  try {
    const cached = await db.get(storeName, cacheKey);
    if (cached) {
      console.log(`[MediaCache] HIT: ${storeName}/${cacheKey}`);
      // Update lastUsed
      db.put(storeName, { ...cached, lastUsed: Date.now() });
      const blobUrl = URL.createObjectURL(cached.blob);
      
      if (storeName === 'thumbCache') {
        saveToMemory(cacheKey, blobUrl);
      }
      return blobUrl;
    }
  } catch (err) {
    console.warn(`[MediaCache] IDB lookup error for ${cacheKey}:`, err);
  }
  
  // 3. Fetch from Network
  if (!fetchUrl) return null;
  console.log(`[MediaCache] MISS: ${storeName}/${cacheKey}. Fetching...`);

  try {
    const res = await fetch(fetchUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
    const blob = await res.blob();
    
    // 4. Save to Cache (IDB)
    await saveBlobToCache(cacheKey, blob, storeName);
    
    const blobUrl = URL.createObjectURL(blob);
    if (storeName === 'thumbCache') {
      saveToMemory(cacheKey, blobUrl);
    }
    return blobUrl;
  } catch (err) {
    console.warn('[MediaCache] Network fetch failed, falling back to URL:', err);
    return fetchUrl; // Return original URL as fallback
  }
};

/**
 * Save Blob to Cache and handle LRU cleanup
 */
export const saveBlobToCache = async (id, blob, storeName) => {
  const db = await initDB();
  const size = blob.size;
  
  await db.put(storeName, {
    id,
    blob,
    size,
    lastUsed: Date.now()
  });
  
  // Cleanup check
  const totalSize = await calculateStoreSize(storeName);
  if (totalSize > CLEANUP_THRESHOLD) {
    await performLRU(storeName);
  }
};

/**
 * Rename Cache Key (Used to migrate optimistic files to final IDs)
 */
export const renameCacheKey = async (oldKey, newKey, storeName) => {
  if (!oldKey || !newKey) return;
  const db = await initDB();
  try {
    const cached = await db.get(storeName, oldKey);
    if (cached) {
      await db.put(storeName, { ...cached, id: newKey });
      await db.delete(storeName, oldKey);
    }
  } catch (err) {
    console.warn(`[MediaCache] Failed to rename cache ${oldKey} -> ${newKey}:`, err);
  }
};

/**
 * Sum up sizes in a store
 */
const calculateStoreSize = async (storeName) => {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readonly');
  let total = 0;
  let cursor = await tx.store.openCursor();
  while (cursor) {
    total += cursor.value.size || 0;
    cursor = await cursor.continue();
  }
  return total;
};

/**
 * LRU Cleanup logic
 */
const performLRU = async (storeName) => {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  const index = tx.store.index('lastUsed');
  let cursor = await index.openCursor(); // Oldest first
  
  let currentSize = await calculateStoreSize(storeName);
  
  while (cursor && currentSize > TARGET_CLEANUP_SIZE) {
    const sizeRemoved = cursor.value.size || 0;
    const id = cursor.value.id;
    
    // If in memory, remove too
    if (storeName === 'thumbCache') {
      revokeFromMemory(id);
    }
    
    await cursor.delete();
    currentSize -= sizeRemoved;
    cursor = await cursor.continue();
  }
  
  await tx.done;
  console.log(`[MediaCache] LRU Complete for ${storeName}. Current size: ${(currentSize/1024/1024).toFixed(2)}MB`);
};
