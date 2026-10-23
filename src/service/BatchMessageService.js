/**
 * BatchMessageService.js
 * Manages saved batch data (Batch ID, Owner user ID, Batch name, List of chat IDs, timestamps).
 * Ensures saved batches are private to their authenticated owner (isolated by userId in localStorage).
 */

const STORAGE_PREFIX = 'letschat_batches_';

export function getBatchesKey(userId) {
  return `${STORAGE_PREFIX}${userId || 'anonymous'}`;
}

/**
 * Retrieve all saved batches for a specific user, sorted by updatedAt descending.
 */
export function getSavedBatches(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getBatchesKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  } catch (err) {
    console.error('[BatchMessageService] Error loading batches:', err);
    return [];
  }
}

/**
 * Persist batches array for a user.
 */
function persistBatches(userId, batches) {
  if (!userId) return;
  try {
    localStorage.setItem(getBatchesKey(userId), JSON.stringify(batches));
    window.dispatchEvent(new CustomEvent('letschat_batches_updated', { detail: { userId } }));
  } catch (err) {
    console.error('[BatchMessageService] Error saving batches:', err);
  }
}

/**
 * Create a new saved batch.
 */
export function createBatch(userId, name, chatIds) {
  if (!userId) throw new Error('User ID is required');
  const cleanName = (name || '').trim();
  if (!cleanName) throw new Error('Batch name is required');
  const cleanChatIds = Array.from(new Set((chatIds || []).map(id => String(id))));
  if (cleanChatIds.length === 0) throw new Error('At least one chat must be selected');

  const existing = getSavedBatches(userId);
  const now = new Date().toISOString();
  const newBatch = {
    id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: String(userId),
    name: cleanName,
    chatIds: cleanChatIds,
    createdAt: now,
    updatedAt: now
  };

  const updated = [newBatch, ...existing];
  persistBatches(userId, updated);
  return newBatch;
}

/**
 * Update an existing batch.
 */
export function updateBatch(userId, batchId, { name, chatIds }) {
  if (!userId) throw new Error('User ID is required');
  const cleanName = (name || '').trim();
  if (!cleanName) throw new Error('Batch name is required');
  const cleanChatIds = Array.from(new Set((chatIds || []).map(id => String(id))));
  if (cleanChatIds.length === 0) throw new Error('At least one chat must remain in the batch');

  const existing = getSavedBatches(userId);
  const index = existing.findIndex(b => b.id === batchId);
  if (index === -1) throw new Error('Batch not found');

  const updatedBatch = {
    ...existing[index],
    name: cleanName,
    chatIds: cleanChatIds,
    updatedAt: new Date().toISOString()
  };

  existing[index] = updatedBatch;
  persistBatches(userId, existing);
  return updatedBatch;
}

/**
 * Delete a saved batch.
 */
export function deleteBatch(userId, batchId) {
  if (!userId) return false;
  const existing = getSavedBatches(userId);
  const filtered = existing.filter(b => b.id !== batchId);
  persistBatches(userId, filtered);
  return true;
}
