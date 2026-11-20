/**
 * groupMedia.js
 * High-performance, pure functional grouping engine for consecutive media messages.
 * Groups consecutive image and video messages from the same sender sent within 5 minutes.
 */

const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Checks if a message is eligible for media grouping.
 * Only image and video messages that are not deleted are eligible.
 */
export function isEligibleMedia(msg) {
  if (!msg) return false;
  if (msg.isdeleted || msg.isdeletedeone) return false;
  if (msg.sendername === 'server' || msg.type === 'banner' || msg.type === 'banner-pin' || msg.type === 'event-banner-pin') return false;
  const isMediaType = msg.type === 'image' || msg.type === 'video';
  if (!isMediaType) return false;
  // Has media content or active upload placeholder
  return Boolean(msg.content || msg.optimisticUrl || msg.optimisticThumbUrl || msg.isOptimistic || msg.isPendingPlaceholder);
}

/**
 * Extract stable sender ID from a message
 */
export function getSenderId(msg) {
  if (!msg) return '';
  const rawId = msg.userid ?? msg.senderid ?? msg.senderId;
  if (rawId !== undefined && rawId !== null && rawId !== '') {
    return String(rawId);
  }
  return msg.sendername || '';
}

/**
 * Get timestamp in milliseconds
 */
function getTimestampMs(msg) {
  if (!msg || !msg.timestamp) return 0;
  const t = new Date(msg.timestamp).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Check if two timestamps fall on the same calendar day
 */
function isSameDay(t1, t2) {
  if (!t1 || !t2) return true;
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * Checks if a message can join an existing active media group
 */
export function canJoinGroup(lastMsg, nextMsg, windowMs = DEFAULT_WINDOW_MS) {
  if (!isEligibleMedia(lastMsg) || !isEligibleMedia(nextMsg)) return false;

  // Must be same sender
  if (getSenderId(lastMsg) !== getSenderId(nextMsg)) return false;

  // Next message having a reply starts a new group
  if (nextMsg.repliedto) return false;

  // Same day check
  const tLast = getTimestampMs(lastMsg);
  const tNext = getTimestampMs(nextMsg);
  if (!isSameDay(tLast, tNext)) return false;

  // Rolling time window check (strictly within windowMs of the previous media item)
  if (tLast && tNext) {
    const diff = Math.abs(tNext - tLast);
    if (diff > windowMs) return false;
  }

  return true;
}

/**
 * Groups an array of messages into single messages and media groups.
 * O(n) single pass, pure function.
 *
 * @param {Array} messages - List of chat messages
 * @param {Object} options - Grouping options (e.g., windowMs)
 * @returns {Array} Array of `{ kind: 'single', message }` and `{ kind: 'mediaGroup', id, senderId, items }`
 */
export function groupMessages(messages = [], { windowMs = DEFAULT_WINDOW_MS } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const result = [];
  let currentGroup = null;

  const flushCurrentGroup = () => {
    if (!currentGroup) return;
    if (currentGroup.length === 1) {
      result.push({ kind: 'single', message: currentGroup[0] });
    } else if (currentGroup.length > 1) {
      const first = currentGroup[0];
      const last = currentGroup[currentGroup.length - 1];
      const groupId = first.msgid || first.tempmsgid || first.pendingid || `group_${first.timestamp}`;
      result.push({
        kind: 'mediaGroup',
        id: groupId,
        senderId: getSenderId(first),
        sendername: first.sendername,
        timestamp: last.timestamp || first.timestamp,
        items: currentGroup,
      });
    }
    currentGroup = null;
  };

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (!isEligibleMedia(msg)) {
      flushCurrentGroup();
      result.push({ kind: 'single', message: msg });
      continue;
    }

    if (!currentGroup) {
      currentGroup = [msg];
    } else {
      const lastInGroup = currentGroup[currentGroup.length - 1];
      if (canJoinGroup(lastInGroup, msg, windowMs)) {
        currentGroup.push(msg);
      } else {
        flushCurrentGroup();
        currentGroup = [msg];
      }
    }
  }

  flushCurrentGroup();
  return result;
}

/**
 * Incrementally appends a new incoming message to an existing grouped array.
 * Useful for real-time WebSocket feeds to avoid remounting previous groups.
 */
export function appendMessageToGroups(groups = [], newMsg, { windowMs = DEFAULT_WINDOW_MS } = {}) {
  if (!groups || groups.length === 0) {
    return groupMessages([newMsg], { windowMs });
  }

  const nextGroups = [...groups];
  const lastGroup = nextGroups[nextGroups.length - 1];

  if (!isEligibleMedia(newMsg)) {
    nextGroups.push({ kind: 'single', message: newMsg });
    return nextGroups;
  }

  if (lastGroup.kind === 'mediaGroup') {
    const lastItem = lastGroup.items[lastGroup.items.length - 1];
    if (canJoinGroup(lastItem, newMsg, windowMs)) {
      nextGroups[nextGroups.length - 1] = {
        ...lastGroup,
        timestamp: newMsg.timestamp || lastGroup.timestamp,
        items: [...lastGroup.items, newMsg],
      };
      return nextGroups;
    }
  } else if (lastGroup.kind === 'single' && isEligibleMedia(lastGroup.message)) {
    if (canJoinGroup(lastGroup.message, newMsg, windowMs)) {
      const first = lastGroup.message;
      const groupId = first.msgid || first.tempmsgid || first.pendingid || `group_${first.timestamp}`;
      nextGroups[nextGroups.length - 1] = {
        kind: 'mediaGroup',
        id: groupId,
        senderId: getSenderId(first),
        sendername: first.sendername,
        timestamp: newMsg.timestamp || first.timestamp,
        items: [first, newMsg],
      };
      return nextGroups;
    }
  }

  nextGroups.push({ kind: 'single', message: newMsg });
  return nextGroups;
}
