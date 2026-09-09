/**
 * SyncService.js
 * Manages an outbound message queue in IndexedDB for offline resilience.
 */
import { initDB } from './db';

/** 
 * Add a message to the persistent sync queue
 */
export const addToQueue = async (msg) => {
  const db = await initDB();
  // Ensure we have a timestamp for ordering
  if (!msg.timestamp) msg.timestamp = new Date().toISOString();
  await db.put('syncQueue', msg);
  console.log('[SyncService] Message queued for later:', msg.tempmsgid || msg.msgid);
};

/**
 * Remove a message from the queue (call this on server ACK)
 */
export const removeFromQueue = async (tempmsgid) => {
  if (!tempmsgid) return;
  const db = await initDB();
  await db.delete('syncQueue', tempmsgid);
  console.log('[SyncService] Message removed from queue after ACK:', tempmsgid);
};

/**
 * Get all pending messages in chronological order (FIFO)
 */
export const getPendingMessages = async () => {
  const db = await initDB();
  const tx = db.transaction('syncQueue', 'readonly');
  const index = tx.store.index('timestamp');
  
  const messages = [];
  let cursor = await index.openCursor();
  while (cursor) {
    messages.push(cursor.value);
    cursor = await cursor.continue();
  }
  return messages;
};

/**
 * Flush the entire queue through an active WebSocket
 */
export const flushQueue = async (socket) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('[SyncService] Cannot flush: socket is not open');
    return;
  }

  const pending = await getPendingMessages();
  if (pending.length === 0) return;

  console.log(`[SyncService] Attempting to sync ${pending.length} pending messages...`);

  for (const msg of pending) {
    try {
      socket.send(JSON.stringify(msg));
      // Note: We don't remove from syncQueue yet. 
      // We will remove it when the server sends an ACK back to Websocket.js.
      // This protects against the socket closing immediately after send.
    } catch (err) {
      console.error('[SyncService] Failed to send queued message:', err);
      break; // Stop and wait for next connection
    }
  }
};
