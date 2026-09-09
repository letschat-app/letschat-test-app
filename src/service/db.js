import { openDB } from 'idb';

const DB_NAME = 'LetsChatDB';
const DB_VERSION = 15;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'idToCheck' });
        store.createIndex('chatid', 'chatid', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('chatid_timestamp', ['chatid', 'timestamp'], { unique: false });
      }
      
      // Migration for chatid_spaceid_timestamp index
      const messageStore = transaction.objectStore('messages');
      if (!messageStore.indexNames.contains('chatid_spaceid_timestamp')) {
        messageStore.createIndex('chatid_spaceid_timestamp', ['chatid', 'spaceid', 'timestamp'], { unique: false });
      }
      
      if (!messageStore.indexNames.contains('expiresAt')) {
        messageStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      if (!messageStore.indexNames.contains('isStarred')) {
        messageStore.createIndex('isStarred', 'isStarred', { unique: false });
      }

      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
      // Media Caching Stores
      if (!db.objectStoreNames.contains('mediaInfo')) {
        const store = db.createObjectStore('mediaInfo', { keyPath: 'id' });
        store.createIndex('lastUsed', 'lastUsed', { unique: false });
      }
      if (!db.objectStoreNames.contains('mainCache')) {
        const store = db.createObjectStore('mainCache', { keyPath: 'id' });
        store.createIndex('lastUsed', 'lastUsed', { unique: false });
      }
      if (!db.objectStoreNames.contains('thumbCache')) {
        const store = db.createObjectStore('thumbCache', { keyPath: 'id' });
        store.createIndex('lastUsed', 'lastUsed', { unique: false });
      }
      // Offline Sync Store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'tempmsgid' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Store for data received via Web Share Target
      if (!db.objectStoreNames.contains('sharedData')) {
        db.createObjectStore('sharedData', { keyPath: 'id', autoIncrement: true });
      }

      // Store to mirror chatsMap from localStorage for Service Worker access
      if (!db.objectStoreNames.contains('chatsStore')) {
        db.createObjectStore('chatsStore', { keyPath: 'chatId' });
      }

      // User Profiles Cache (resolving user names and avatars)
      if (!db.objectStoreNames.contains('usersCache')) {
        db.createObjectStore('usersCache', { keyPath: 'userId' });
      }

      // Offline Assignment Payloads
      if (!db.objectStoreNames.contains('assignmentsCache')) {
        db.createObjectStore('assignmentsCache', { keyPath: 'id' });
      }

      // Offline Submissions List
      if (!db.objectStoreNames.contains('submissionsCache')) {
        db.createObjectStore('submissionsCache', { keyPath: 'assignmentId' });
      }

      // Offline Personal Chat Info (Usernames & Profiles per specific chat)
      if (!db.objectStoreNames.contains('chatInfoCache')) {
        db.createObjectStore('chatInfoCache', { keyPath: 'chatId' });
      }

      // Offline Group Members Array
      if (!db.objectStoreNames.contains('groupMembersCache')) {
        db.createObjectStore('groupMembersCache', { keyPath: 'chatId' });
      }
      
      // Global app metadata (e.g., userId) for SW access
      if (!db.objectStoreNames.contains('metaStore')) {
        db.createObjectStore('metaStore', { keyPath: 'key' });
      }
      
      if (!db.objectStoreNames.contains('mutedStore')) {
        db.createObjectStore('mutedStore');
      }
    },
  });
};

// --- Group Members List Cache ---

export const saveGroupMembersToDB = async (chatId, members) => {
  if (!chatId || !members) return;
  const db = await initDB();
  await db.put('groupMembersCache', { chatId: String(chatId), data: members, lastUpdated: Date.now() });
};

export const getGroupMembersFromDB = async (chatId) => {
  const db = await initDB();
  const cached = await db.get('groupMembersCache', String(chatId));
  return cached ? cached.data : [];
};

// --- Muting ---

export const toggleMuteChat = async (chatId, isMuted) => {
  if (!chatId) return;
  const db = await initDB();
  if (isMuted) {
    await db.put('mutedStore', true, String(chatId));
  } else {
    await db.delete('mutedStore', String(chatId));
  }
};

export const isChatMuted = async (chatId) => {
  if (!chatId) return false;
  const db = await initDB();
  const val = await db.get('mutedStore', String(chatId));
  return !!val;
};

// --- Chat Info Cache Utilities ---

export const saveChatInfoToDB = async (chatInfo) => {
  if (!chatInfo || !chatInfo.chatId) return;
  const db = await initDB();
  chatInfo.chatId = String(chatInfo.chatId);
  await db.put('chatInfoCache', chatInfo);
};

export const getChatInfoFromDB = async (chatId) => {
  const db = await initDB();
  return db.get('chatInfoCache', String(chatId));
};

// --- Assignment & Submissions Offline Cache Utilities ---

export const saveAssignmentToDB = async (assignment) => {
  if (!assignment || !assignment.id) return;
  const db = await initDB();
  assignment.id = String(assignment.id);
  await db.put('assignmentsCache', assignment);
};

export const getAssignmentFromDB = async (assignmentId) => {
  const db = await initDB();
  return db.get('assignmentsCache', String(assignmentId));
};

export const saveSubmissionsToDB = async (assignmentId, submissions) => {
  if (!assignmentId) return;
  const db = await initDB();
  await db.put('submissionsCache', { assignmentId: String(assignmentId), data: submissions, lastUpdated: Date.now() });
};

export const getSubmissionsFromDB = async (assignmentId) => {
  const db = await initDB();
  const cached = await db.get('submissionsCache', String(assignmentId));
  return cached ? cached.data : null;
};

/**
 * Save user info to usersCache
 */
export const saveUserToDB = async (user) => {
  if (!user || !user.userId) return;
  const db = await initDB();
  await db.put('usersCache', user);
};

export const saveUsersBatchToDB = async (users) => {
  if (!users || !users.length) return;
  const db = await initDB();
  const tx = db.transaction('usersCache', 'readwrite');
  for (const user of users) {
    if (user.userId) await tx.store.put(user);
  }
  await tx.done;
};

export const getUserFromDB = async (userId) => {
  const db = await initDB();
  return db.get('usersCache', userId);
};

/**
 * Syncs the entire chatsMap into IndexedDB for background thread access.
 */
export const syncChatsMapToDB = async (chatsMap) => {
  try {
    const db = await initDB();
    const tx = db.transaction('chatsStore', 'readwrite');
    // Using put to overwrite existing or insert new without clearing fully
    for (const chatId in chatsMap) {
      if (chatsMap.hasOwnProperty(chatId)) {
        await tx.store.put(chatsMap[chatId]);
      }
    }
    await tx.done;
  } catch (err) {
    console.error("[DB] Failed to sync chatsMap:", err);
  }
};

export const saveUserIdToDB = async (userId) => {
  if (!userId) return;
  const db = await initDB();
  await db.put('metaStore', { key: 'userid', value: userId });
};

export const getUserIdFromDB = async () => {
  const db = await initDB();
  const res = await db.get('metaStore', 'userid');
  return res ? res.value : null;
};

export const saveEventToDB = async (event) => {
  const db = await initDB();
  await db.put('events', event);
};

export const getEventsFromDB = async () => {
  const db = await initDB();
  return db.getAll('events');
};

export const saveMessageToDB = async (msg, idToCheck) => {
  const db = await initDB();
  const msgWithId = { ...msg, idToCheck };
  await db.put('messages', msgWithId);
};

export const deleteMessageFromDB = async (idToCheck) => {
  const db = await initDB();
  await db.delete('messages', idToCheck);
};

export const getMessagesFromDB = async (chatid, limit = 20, beforeTimestamp = null, spaceId = null) => {
  const db = await initDB();
  
  // Since we want the LATEST messages, and IDB orders ascending by default,
  // we use a cursor to iterate backwards (prev).
  const tx = db.transaction('messages', 'readonly');
  
  let index;
  let range;

  if (spaceId !== null && spaceId !== undefined) {
    index = tx.store.index('chatid_spaceid_timestamp');
    const sId = parseInt(spaceId, 10);
    if (beforeTimestamp) {
      range = IDBKeyRange.bound([chatid, sId, ''], [chatid, sId, beforeTimestamp], false, true);
    } else {
      range = IDBKeyRange.bound([chatid, sId, ''], [chatid, sId, '\uffff']);
    }
  } else {
    index = tx.store.index('chatid_timestamp');
    if (beforeTimestamp) {
      range = IDBKeyRange.bound([chatid, ''], [chatid, beforeTimestamp], false, true);
    } else {
      range = IDBKeyRange.bound([chatid, ''], [chatid, '\uffff']);
    }
  }
  
  let cursor = await index.openCursor(range, 'prev');
  
  const results = [];
  while (cursor && results.length < limit) {
    results.push(cursor.value);
    cursor = await cursor.continue();
  }

  // Reverse them so they are in chronological order for the UI
  return results.reverse();
};

export const getLatestMessagesForAllSpaces = async (chatid, limitPerSpace = 20) => {
  const db = await initDB();
  const tx = db.transaction('messages', 'readonly');
  const index = tx.store.index('chatid_spaceid_timestamp');

  // Identify all unique spaceids for this chatid using the index
  const spaceIds = new Set();
  let cursor = await index.openCursor(IDBKeyRange.bound([chatid, -Infinity], [chatid, Infinity]));
  
  while (cursor) {
    const sId = cursor.key[1];
    spaceIds.add(sId);
    // Jump to the next potential spaceId
    cursor = await cursor.continue([chatid, sId + 1, '']);
  }

  // Fetch latest messages for each spaceId
  const allResults = [];
  for (const sId of spaceIds) {
    const range = IDBKeyRange.bound([chatid, sId, ''], [chatid, sId, '\uffff']);
    let spaceCursor = await index.openCursor(range, 'prev');
    let count = 0;
    const spaceResults = [];
    while (spaceCursor && count < limitPerSpace) {
      spaceResults.push(spaceCursor.value);
      spaceCursor = await spaceCursor.continue();
      count++;
    }
    allResults.push(...spaceResults.reverse());
  }

  return allResults;
};

export const getUnreadMessagesForChat = async (chatid) => {
  const db = await initDB();
  const tx = db.transaction('messages', 'readonly');
  const index = tx.store.index('chatid');
  
  const allMessages = await index.getAll(IDBKeyRange.only(chatid));
  return allMessages.filter(msg => msg.isold === false);
};

/**
 * Marks all isold:false messages for a given chatid as isold:true in IndexedDB.
 * Only touches the database — does NOT update in-memory MessageStore.
 * Called when the user opens a chat so that on the next app load,
 * those messages are correctly treated as already-read history.
 */
export const markMessagesAsOldInDB = async (chatid) => {
  const db = await initDB();
  const tx = db.transaction('messages', 'readwrite');
  const index = tx.store.index('chatid');

  let cursor = await index.openCursor(IDBKeyRange.only(chatid));
  let count = 0;

  while (cursor) {
    if (cursor.value.isold === false) {
      cursor.update({ ...cursor.value, isold: true });
      count++;
    }
    cursor = await cursor.continue();
  }

  await tx.done;
  if (count > 0) {
    console.log(`[DB] markMessagesAsOldInDB: marked ${count} messages as old for chatid=${chatid}`);
  }
};

export const getStarredMessages = async (chatid = null) => {
  const db = await initDB();
  const tx = db.transaction('messages', 'readonly');
  const store = tx.objectStore('messages');
  
  let starred = [];
  try {
    if (store.indexNames.contains('isStarred')) {
      const index = store.index('isStarred');
      starred = await index.getAll(IDBKeyRange.only(true));
    }
  } catch (err) {
    console.warn("Index query failed, falling back to manual filter:", err);
  }

  // Fallback: if index query yielded nothing but we want to be sure
  if (starred.length === 0) {
    const all = await store.getAll();
    starred = all.filter(m => m.isStarred === true);
  }
  
  if (chatid) {
    // Use loose equality (==) in case chatid is a string from URL but number in DB
    return starred.filter(msg => msg.chatid == chatid).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  return starred.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export const getMessageById = async (idToCheck) => {
  const db = await initDB();
  return db.get('messages', idToCheck);
};

export const clearMessagesForChat = async (chatid) => {
  const db = await initDB();
  const tx = db.transaction('messages', 'readwrite');
  const index = tx.store.index('chatid');
  const cursor = await index.openCursor(IDBKeyRange.only(chatid));
  
  let currentCursor = cursor;
  while (currentCursor) {
    await currentCursor.delete();
    currentCursor = await currentCursor.continue();
  }
  await tx.done;
};

export const updateMessageStatusInDB = async (ack) => {
  const db = await initDB();
  const { tempmsgid, msgid, status } = ack;

  try {
    let existingMsg = null;
    let oldId = null;

    // Try finding by tempmsgid first
    if (tempmsgid) {
      existingMsg = await db.get('messages', tempmsgid);
      oldId = tempmsgid;
    }
    // Fallback to msgid
    if (!existingMsg && msgid) {
      existingMsg = await db.get('messages', msgid);
      oldId = msgid;
    }

    if (existingMsg) {
      // If the ID is upgrading from tempmsgid to msgid, delete the old temp record
      if (tempmsgid && msgid && oldId === tempmsgid && tempmsgid !== msgid) {
        await db.delete('messages', tempmsgid);
      }

      if (status && status.startsWith("deleted")) {
        existingMsg.isdeletedeone = status.replace("deleted", "");
      } else if (status === "revived") {
        existingMsg.isdeletedeone = null;
        existingMsg.revived = true;
      } else {
        if (msgid) existingMsg.msgid = msgid;
        if (status) existingMsg.status = status;
      }

      existingMsg.idToCheck = existingMsg.msgid || existingMsg.tempmsgid || existingMsg.timestamp;
      await db.put('messages', existingMsg);
      // console.log("[DB] Message status updated successfully:", existingMsg);
    } else {
      console.warn("[DB] Could not find message to update status:", ack);
    }
  } catch (err) {
    console.error("[DB] Error updating message status:", err);
  }
};

/**
 * Deletes all messages for volatile chats (rooms) that have not been opened in 1 day.
 */
export const purgeExpiredMessages = async () => {
  const visited = JSON.parse(localStorage.getItem('visited') || '{}');
  const roomRegistry = JSON.parse(localStorage.getItem('roomRegistry') || '[]');
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const db = await initDB();
  const tx = db.transaction('messages', 'readwrite');
  const index = tx.store.index('chatid');

  let deletedCount = 0;

  for (const roomId of roomRegistry) {
    const lastVisitedVal = visited[roomId];
    let lastVisitedTime = 0;
    if (lastVisitedVal) {
      lastVisitedTime = new Date(lastVisitedVal).getTime();
    }

    if (now - lastVisitedTime > oneDay) {
      let cursor = await index.openCursor(IDBKeyRange.only(roomId));
      while (cursor) {
        await cursor.delete();
        deletedCount++;
        cursor = await cursor.continue();
      }
    }
  }

  if (deletedCount > 0) {
    console.log(`[DB] Purged ${deletedCount} room messages due to 1-day LRU.`);
  }
  await tx.done;
};

/**
 * Clear all data from 'sharedData' store.
 */
export const clearSharedData = async () => {
  const db = await initDB();
  const tx = db.transaction('sharedData', 'readwrite');
  await tx.store.clear();
  await tx.done;
};

/**
 * Get all shared items.
 */
export const getSharedData = async () => {
  const db = await initDB();
  return db.getAll('sharedData');
};
