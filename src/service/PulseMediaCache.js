import { initDB } from './db';

/**
 * PulseMediaCache.js
 * Dedicated IndexedDB & In-Memory Caching Service for Pulses.
 * Handles automatic client-side 24h expiration and media purging, plus offline viewer log storage.
 */

export const pulseMemoryCache = new Map();

/**
 * Revoke Object URL from memory
 */
export const revokePulseMemoryUrl = (id) => {
  const url = pulseMemoryCache.get(id);
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {}
    pulseMemoryCache.delete(id);
  }
};

/**
 * Save owner "mine" feed data (viewers, active & expired pulses) to IndexedDB for offline rendering
 */
export const saveMineDataToDB = async (mineData) => {
  if (!mineData) return;
  try {
    const db = await initDB();
    const userId = localStorage.getItem("userid") || "default";
    await db.put('pulseStore', {
      pulseId: `mine_${userId}`,
      isMineFeed: true,
      data: mineData,
      lastUpdated: Date.now()
    });
  } catch (e) {
    console.warn('[PulseMediaCache] Failed to save mine data to DB:', e);
  }
};

/**
 * Get owner "mine" feed data from IndexedDB
 */
export const getMineDataFromDB = async () => {
  try {
    const db = await initDB();
    const userId = localStorage.getItem("userid") || "default";
    const res = await db.get('pulseStore', `mine_${userId}`);
    return res ? res.data : null;
  } catch (err) {
    return null;
  }
};

/**
 * Store pulse metadata in pulseStore
 */
export const savePulseToStore = async (pulse) => {
  if (!pulse || (!pulse.pulseId && !pulse.id)) return;
  const pulseId = String(pulse.pulseId || pulse.id);
  
  const createdAtMs = pulse.createdAt ? new Date(pulse.createdAt).getTime() : Date.now();
  const expiresAtMs = pulse.expiresAt ? new Date(pulse.expiresAt).getTime() : (createdAtMs + 24 * 60 * 60 * 1000);

  const db = await initDB();
  const record = {
    ...pulse,
    pulseId,
    expiresAt: expiresAtMs,
    createdAt: createdAtMs,
    lastUpdated: Date.now()
  };

  await db.put('pulseStore', record);
  return record;
};

/**
 * Save batch of pulses to pulseStore
 */
export const savePulsesBatchToStore = async (pulses) => {
  if (!Array.isArray(pulses) || pulses.length === 0) return;
  for (const p of pulses) {
    await savePulseToStore(p);
  }
};

/**
 * Save binary blob to pulseMediaCache in IndexedDB
 */
export const savePulseMediaBlobToCache = async (mediaId, blob, expiresAtMs) => {
  if (!mediaId || !blob) return;
  const db = await initDB();
  await db.put('pulseMediaCache', {
    id: String(mediaId),
    blob,
    size: blob.size,
    expiresAt: expiresAtMs || (Date.now() + 24 * 60 * 60 * 1000),
    lastUsed: Date.now()
  });
};

/**
 * Get pulse media blob (Memory -> IDB -> Network)
 */
export const getPulseMediaBlob = async (mediaId, fetchUrl, expiresAtMs) => {
  if (!mediaId) return null;
  const idStr = String(mediaId);

  // 1. Memory Cache
  if (pulseMemoryCache.has(idStr)) {
    return pulseMemoryCache.get(idStr);
  }

  // 2. IndexedDB Lookup
  try {
    const db = await initDB();
    const cached = await db.get('pulseMediaCache', idStr);
    
    const now = Date.now();
    if (cached) {
      if (cached.expiresAt && cached.expiresAt <= now) {
        await db.delete('pulseMediaCache', idStr);
        return null;
      }
      
      const blobUrl = URL.createObjectURL(cached.blob);
      pulseMemoryCache.set(idStr, blobUrl);
      return blobUrl;
    }
  } catch (err) {
    console.warn('[PulseMediaCache] IDB lookup error:', err);
  }

  // 3. Network Fetch if missing
  if (!fetchUrl) return null;
  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
    const blob = await res.blob();

    const expTime = expiresAtMs || (Date.now() + 24 * 60 * 60 * 1000);
    await savePulseMediaBlobToCache(idStr, blob, expTime);

    const blobUrl = URL.createObjectURL(blob);
    pulseMemoryCache.set(idStr, blobUrl);
    return blobUrl;
  } catch (err) {
    console.warn('[PulseMediaCache] Network fetch failed:', err);
    return fetchUrl;
  }
};

/**
 * Automatic Client-Side Expired Pulse Purge:
 * Client does NOT wait for server confirmation to delete media!
 * Deletes binary media blobs from IDB & revokes memory URLs for expired pulses.
 */
export const purgeExpiredPulseMedia = async () => {
  try {
    const db = await initDB();
    const now = Date.now();

    // 1. Purge binary media blobs from pulseMediaCache
    const mediaTx = db.transaction('pulseMediaCache', 'readwrite');
    let mediaCursor = await mediaTx.store.openCursor();
    let purgedMediaCount = 0;

    while (mediaCursor) {
      const record = mediaCursor.value;
      if (record.expiresAt && record.expiresAt <= now) {
        revokePulseMemoryUrl(record.id);
        await mediaCursor.delete();
        purgedMediaCount++;
      }
      mediaCursor = await mediaCursor.continue();
    }
    await mediaTx.done;

    // 2. Purge or mark expired pulses in pulseStore
    const pulseTx = db.transaction('pulseStore', 'readwrite');
    let pulseCursor = await pulseTx.store.openCursor();
    let updatedPulseCount = 0;

    while (pulseCursor) {
      const pulse = pulseCursor.value;
      if (pulse.isMineFeed) {
        pulseCursor = await pulseCursor.continue();
        continue;
      }
      if (pulse.expiresAt && pulse.expiresAt <= now) {
        const expiredRecord = {
          ...pulse,
          status: 'expired',
          imageUrl: null,
          audioUrl: null,
          videoUrl: null,
          mediaUrl: null,
          pulseUrl: null,
          content: pulse.type === 'text' ? pulse.content : 'Media expired and deleted.'
        };
        await pulseCursor.update(expiredRecord);
        updatedPulseCount++;
      }
      pulseCursor = await pulseCursor.continue();
    }
    await pulseTx.done;

    if (purgedMediaCount > 0 || updatedPulseCount > 0) {
      console.log(`[PulseMediaCache] Purged ${purgedMediaCount} media blobs and updated ${updatedPulseCount} expired pulses.`);
    }
  } catch (err) {
    console.error('[PulseMediaCache] Purge failed:', err);
  }
};

purgeExpiredPulseMedia();
setInterval(purgeExpiredPulseMedia, 60 * 1000);
