import { initDB } from './db';

/**
 * PulseMediaCache.js
 * Dedicated IndexedDB & In-Memory Caching Service for Pulses.
 * Handles automatic client-side 24h expiration and media purging, plus offline viewer log storage.
 */

export const pulseMemoryCache = new Map();
export const pulsePreviewCache = new Map();

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
 * Save contact pulse feed data to IndexedDB for instant offline-first rendering
 */
export const saveFeedDataToDB = async (feedData) => {
  if (!feedData) return;
  try {
    const db = await initDB();
    const userId = localStorage.getItem("userid") || "default";
    await db.put('pulseStore', {
      pulseId: `feed_${userId}`,
      isFeedCache: true,
      data: feedData,
      lastUpdated: Date.now()
    });
  } catch (e) {
    console.warn('[PulseMediaCache] Failed to save feed data to DB:', e);
  }
};

/**
 * Get contact pulse feed data from IndexedDB
 */
export const getFeedDataFromDB = async () => {
  try {
    const db = await initDB();
    const userId = localStorage.getItem("userid") || "default";
    const res = await db.get('pulseStore', `feed_${userId}`);
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

const isPulseExpired = (p, now) => {
  if (!p) return false;
  if (p.status === 'expired') return true;
  if (p.expiresAt) {
    const exp = typeof p.expiresAt === 'number' ? p.expiresAt : new Date(p.expiresAt).getTime();
    if (!isNaN(exp) && exp <= now) return true;
  }
  if (p.createdAt) {
    const created = typeof p.createdAt === 'number' ? p.createdAt : new Date(p.createdAt).getTime();
    if (!isNaN(created) && (created + 24 * 60 * 60 * 1000) <= now) return true;
  }
  return false;
};

/**
 * Automatic Client-Side Expired Pulse Purge:
 * Client does NOT wait for server confirmation to delete media!
 * Deletes binary media blobs from IDB & revokes memory URLs for expired pulses.
 * Cleanses in-memory caches, standalone pulseStore records, and feed/mine cache payloads.
 */
export const purgeExpiredPulseMedia = async () => {
  try {
    const now = Date.now();

    // 1. In-memory cache purge: remove expired pulse previews and revoke expired Object URLs
    for (const [pId, p] of pulsePreviewCache.entries()) {
      if (isPulseExpired(p, now)) {
        pulsePreviewCache.delete(pId);
        revokePulseMemoryUrl(pId);
      }
    }

    const db = await initDB();

    // 2. Purge binary media blobs from pulseMediaCache
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

    // 3. Purge or mark expired pulses in pulseStore
    const pulseTx = db.transaction('pulseStore', 'readwrite');
    let pulseCursor = await pulseTx.store.openCursor();
    let updatedPulseCount = 0;

    while (pulseCursor) {
      const record = pulseCursor.value;

      // 3A. Owner "mine" cache payload: cleanse activePulses -> expiredPulses
      if (record.isMineFeed && record.data) {
        const mineData = record.data;
        const active = mineData.activePulses || mineData.pulses || [];
        const expired = mineData.expiredPulses || [];
        const stillActive = [];
        let modified = false;

        for (const p of active) {
          if (isPulseExpired(p, now)) {
            modified = true;
            revokePulseMemoryUrl(p.pulseId || p.id || p.pulse_id);
            expired.push({
              ...p,
              status: 'expired',
              imageUrl: null,
              audioUrl: null,
              videoUrl: null,
              mediaUrl: null,
              pulseUrl: null,
              content: p.type === 'text' ? p.content : 'Media expired and deleted.'
            });
          } else {
            stillActive.push(p);
          }
        }

        if (modified) {
          record.data = {
            ...mineData,
            activePulses: stillActive,
            pulses: stillActive,
            expiredPulses: expired,
            lastCleaned: now
          };
          await pulseCursor.update(record);
          updatedPulseCount++;
        }
        pulseCursor = await pulseCursor.continue();
        continue;
      }

      // 3B. Contact "feed" cache payload: cleanse expired pulses from each contact's pulse list
      if (record.isFeedCache && Array.isArray(record.data)) {
        let feedModified = false;
        const newFeed = [];

        for (const contactItem of record.data) {
          const contactPulses = contactItem.pulses || [];
          const activeContactPulses = [];

          for (const p of contactPulses) {
            if (isPulseExpired(p, now)) {
              feedModified = true;
              revokePulseMemoryUrl(p.pulseId || p.id || p.pulse_id);
            } else {
              activeContactPulses.push(p);
            }
          }

          if (activeContactPulses.length > 0) {
            newFeed.push({
              ...contactItem,
              pulses: activeContactPulses
            });
          } else {
            // Entire contact has no active pulses left
            feedModified = true;
          }
        }

        if (feedModified) {
          record.data = newFeed;
          record.lastCleaned = now;
          await pulseCursor.update(record);
          updatedPulseCount++;
        }
        pulseCursor = await pulseCursor.continue();
        continue;
      }

      // 3C. Standalone pulse records
      if (isPulseExpired(record, now)) {
        revokePulseMemoryUrl(record.pulseId || record.id);
        const expiredRecord = {
          ...record,
          status: 'expired',
          imageUrl: null,
          audioUrl: null,
          videoUrl: null,
          mediaUrl: null,
          pulseUrl: null,
          content: record.type === 'text' ? record.content : 'Media expired and deleted.'
        };
        await pulseCursor.update(expiredRecord);
        updatedPulseCount++;
      }
      pulseCursor = await pulseCursor.continue();
    }
    await pulseTx.done;

    if (purgedMediaCount > 0 || updatedPulseCount > 0) {
      console.log(`[PulseMediaCache] Background purge completed: evicted ${purgedMediaCount} media blobs and sanitized ${updatedPulseCount} pulse cache records.`);
    }
  } catch (err) {
    console.error('[PulseMediaCache] Purge failed:', err);
  }
};

export const cachePulsePreview = (pulse) => {
  if (!pulse) return;
  const pId = String(pulse.pulseId || pulse.pulse_id || pulse.id);
  if (pId) {
    pulsePreviewCache.set(pId, pulse);
  }
};

export const getPulseFromStore = async (pulseId) => {
  if (!pulseId) return null;
  const pIdStr = String(pulseId);
  if (pulsePreviewCache.has(pIdStr)) {
    return pulsePreviewCache.get(pIdStr);
  }

  try {
    const db = await initDB();
    const item = await db.get('pulseStore', pIdStr);
    if (item && item.pulse) {
      pulsePreviewCache.set(pIdStr, item.pulse);
      return item.pulse;
    }

    // Check feed cache in DB
    const feed = await getFeedDataFromDB();
    if (Array.isArray(feed)) {
      for (const fItem of feed) {
        const pulses = fItem.pulses || (fItem.pulseId || fItem.pulse_id ? [fItem] : []);
        const match = pulses.find(p => String(p.pulseId || p.id || p.pulse_id) === pIdStr);
        if (match) {
          pulsePreviewCache.set(pIdStr, match);
          return match;
        }
      }
    }

    // Check mine data in DB
    const mine = await getMineDataFromDB();
    if (mine) {
      const active = mine.activePulses || mine.pulses || [];
      const match = active.find(p => String(p.pulseId || p.id || p.pulse_id) === pIdStr);
      if (match) {
        pulsePreviewCache.set(pIdStr, match);
        return match;
      }
    }
  } catch (e) {
    console.warn('[PulseMediaCache] getPulseFromStore error:', e);
  }
  return null;
};

purgeExpiredPulseMedia();
setInterval(purgeExpiredPulseMedia, 60 * 1000);
