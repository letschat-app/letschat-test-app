// MessageStore.js
import { saveMessageToDB, getMessagesFromDB, getUnreadMessagesForChat, getLatestMessagesForAllSpaces, initDB } from "../service/db";

const messageStore = {
  messages: {},
  new: {},
  listeners: [],
  activeChat: null,
  volatileQueue: [],
  volatileChats: new Set(JSON.parse(localStorage.getItem('roomRegistry') || '[]')), // Hydrate from localStorage
  transientIndicators: {}, // { chatid: { userid: { content, sendername, expiry } } }
  indicatorTimeouts: {}, // To manage cleanup
  onlineStatuses: {}, // { userId: boolean }
  roomCounts: {}, // Separate store for Discovery Room unread counts (FCM driven)
  batchFrontiers: {}, // { "chatid_spaceId": oldestTimestampFromLastServerBatch }
  processedReactions: new Set(), // To prevent double-toggling of echoed reactions
  setParseCallback(fn) {
    console.log("Setting parse callback");
    this.parseCallback = fn;
  },

  handleBatch(batchData) {
    const { chatid, msgs, hasmore } = batchData;
    if (!chatid) return;

    // Update frontier: Store the oldest timestamp of THIS batch for subsequent "load-more" calls
    if (msgs && msgs.length > 0) {
      const spaceId = batchData.usermsgId || 0;
      // The batch is usually sorted by timestamp. We want the oldest one.
      // If server sends newest first, it's msgs[msgs.length - 1].
      // If server sends oldest first, it's msgs[0].
      // Let's find the minimum timestamp in the batch to be safe.
      let oldestInBatch = msgs[0].timestamp;
      msgs.forEach(m => {
        if (new Date(m.timestamp) < new Date(oldestInBatch)) {
          oldestInBatch = m.timestamp;
        }
      });
      this.batchFrontiers[`${chatid}_${spaceId}`] = oldestInBatch;
    }

    if (!this.messages[chatid]) {
      this.messages[chatid] = [];
    }

    if (msgs && msgs.length > 0) {
      const reversedMsgs = [...msgs].reverse();
      const existingIds = new Set(this.messages[chatid].map(m => m.msgid || m.tempmsgid || m.timestamp));
      const freshMsgs = [];

      reversedMsgs.forEach(msg => {
        // Add chatid to msg if missing
        if (!msg.chatid) msg.chatid = chatid;
        
        const actualMsgType = msg.msgtype || msg.type;
        const actualRepliedTo = msg.repliedTo || msg.repliedto;
        if (actualMsgType === 'reaction' && actualRepliedTo) {
          // Send it to addMessage to attempt applying it to in-memory messages
          this.addMessage(msg);
          return; // Do NOT push to freshMsgs
        }

        const idToCheck = msg.msgid || msg.tempmsgid || msg.timestamp;
        
        // Very basic differential check: if not exists, add it.
        // (For full sync, you'd also check if existing msgs changed status/reactions,
        // but since this is load-more history, new items are most critical)
        if (!existingIds.has(idToCheck)) {
          freshMsgs.push(msg);
          saveMessageToDB(msg, idToCheck).catch(err => console.error(err));
        } else {
          // If it exists, update it in DB and Memory if needed
          const existingMsgIndex = this.messages[chatid].findIndex(m => (m.msgid || m.tempmsgid || m.timestamp) === idToCheck);
          if (existingMsgIndex !== -1) {
            const existingMsg = this.messages[chatid][existingMsgIndex];
            // Update if status changed or it's a newer version
            if (existingMsg.status !== msg.status || JSON.stringify(existingMsg.reactions) !== JSON.stringify(msg.reactions)) {
              this.messages[chatid][existingMsgIndex] = { ...existingMsg, ...msg };
              saveMessageToDB(this.messages[chatid][existingMsgIndex], idToCheck).catch(err => console.error(err));
            }
          }
        }
      });

      if (freshMsgs.length > 0) {
        this.messages[chatid] = [...freshMsgs, ...this.messages[chatid]];
        this.messages[chatid].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }
    }

    // Single notification for the batch
    this.notifyListeners({ 
      type: 'batch_loaded', 
      chatid, 
      hasmore: hasmore === undefined ? true : hasmore, 
      count: msgs ? msgs.length : 0 
    });
  },

  async loadInitialMessages(chatid, limit = 20, spaceId = null) {
    if (!this.messages[chatid]) {
      this.messages[chatid] = [];
    }
    const dbMessages = await getMessagesFromDB(chatid, limit, 0, spaceId);
    if (dbMessages.length > 0) {
      const existingIds = new Set(this.messages[chatid].map(m => m.msgid || m.tempmsgid || m.timestamp));
      const freshMsgs = [];
      const batchReactions = [];
      dbMessages.forEach(msg => {
        const actualMsgType = msg.msgtype || msg.type;
        const actualRepliedTo = msg.repliedTo || msg.repliedto;
        if (actualMsgType === 'reaction' && actualRepliedTo) {
          batchReactions.push(msg);
          return;
        }

        const idToCheck = msg.msgid || msg.tempmsgid || msg.timestamp;
        if (!existingIds.has(idToCheck)) {
          freshMsgs.push(msg);
        }
      });
      // Append IDB messages before any new WebSocket messages that might have arrived
      this.messages[chatid] = [...freshMsgs, ...this.messages[chatid]];
      this.messages[chatid].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      batchReactions.forEach(reaction => this.addMessage(reaction));
      
      this.notifyListeners({ chatid, bulkLoad: true });
    }
    return dbMessages;
  },

  async loadAllSpacesMessages(chatid, limitPerSpace = 20) {
    if (!this.messages[chatid]) {
      this.messages[chatid] = [];
    }
    const dbMessages = await getLatestMessagesForAllSpaces(chatid, limitPerSpace);
    if (dbMessages.length > 0) {
      const existingIds = new Set(this.messages[chatid].map(m => m.msgid || m.tempmsgid || m.timestamp));
      const freshMsgs = [];
      const batchReactions = [];
      
      dbMessages.forEach(msg => {
        const actualMsgType = msg.msgtype || msg.type;
        const actualRepliedTo = msg.repliedTo || msg.repliedto;
        if (actualMsgType === 'reaction' && actualRepliedTo) {
          batchReactions.push(msg);
          return;
        }
        if (!existingIds.has(msg.msgid || msg.tempmsgid || msg.timestamp)) {
          freshMsgs.push(msg);
        }
      });

      if (freshMsgs.length > 0 || batchReactions.length > 0) {
        if (freshMsgs.length > 0) {
          this.messages[chatid] = [...freshMsgs, ...this.messages[chatid]];
          this.messages[chatid].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
        batchReactions.forEach(reaction => this.addMessage(reaction));
        this.notifyListeners({ chatid, bulkLoad: true });
      }
    }
    return dbMessages;
  },

  async loadUnreadMessages(chatid) {
    if (!this.messages[chatid]) {
      this.messages[chatid] = [];
    }
    const unread = await getUnreadMessagesForChat(chatid);
    if (unread.length > 0) {
      const existingIds = new Set(this.messages[chatid].map(m => m.msgid || m.tempmsgid || m.timestamp));
      const freshMsgs = [];
      const batchReactions = [];
      
      unread.forEach(msg => {
        const actualMsgType = msg.msgtype || msg.type;
        const actualRepliedTo = msg.repliedTo || msg.repliedto;
        if (actualMsgType === 'reaction' && actualRepliedTo) {
          batchReactions.push(msg);
          return;
        }
        if (!existingIds.has(msg.msgid || msg.tempmsgid || msg.timestamp)) {
          freshMsgs.push(msg);
        }
      });

      if (freshMsgs.length > 0 || batchReactions.length > 0) {
        if (freshMsgs.length > 0) {
          this.messages[chatid] = [...freshMsgs, ...this.messages[chatid]];
          this.messages[chatid].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
        batchReactions.forEach(reaction => this.addMessage(reaction));
        this.notifyListeners({ chatid, bulkLoad: true });
      }
    }
    return unread;
  },

  async loadMoreMessages(chatid, beforeTimestamp, limit = 20, spaceId = null) {

    console.log("========== LOAD MORE START ==========");
    console.log("Request params:", { chatid, beforeTimestamp, limit });

    if (!this.messages[chatid]) {
      console.log("No memory store found for chat:", chatid);
      return [];
    }

    console.log("Current memory message count:", this.messages[chatid].length);

    console.log("Fetching from IndexedDB...");
    const dbMessages = await getMessagesFromDB(chatid, limit, beforeTimestamp, spaceId);

    console.log("DB returned count:", dbMessages.length);

    if (dbMessages.length > 0) {
      console.log(
        "DB message IDs:",
        dbMessages.map(m => m.msgid || m.tempmsgid || m.timestamp)
      );

      console.log(
        "DB first timestamp:",
        dbMessages[0]?.timestamp
      );

      console.log(
        "DB last timestamp:",
        dbMessages[dbMessages.length - 1]?.timestamp
      );
    }

    if (dbMessages.length > 0) {

      const existingIds = new Set(
        this.messages[chatid].map(
          m => m.msgid || m.tempmsgid || m.timestamp
        )
      );

      console.log("Existing IDs in memory:", existingIds.size);

      const freshMsgs = [];
      const batchReactions = [];

      dbMessages.forEach(msg => {
        const actualMsgType = msg.msgtype || msg.type;
        const actualRepliedTo = msg.repliedTo || msg.repliedto;
        if (actualMsgType === 'reaction' && actualRepliedTo) {
          batchReactions.push(msg);
          return;
        }

        const idToCheck = msg.msgid || msg.tempmsgid || msg.timestamp;

        if (!existingIds.has(idToCheck)) {
          freshMsgs.push(msg);
        } else {
          console.log("Duplicate skipped:", idToCheck);
        }
      });

      console.log("Fresh messages count:", freshMsgs.length);

      if (freshMsgs.length > 0 || batchReactions.length > 0) {
        if (freshMsgs.length > 0) {
          this.messages[chatid] = [...this.messages[chatid], ...freshMsgs];
          this.messages[chatid].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
        batchReactions.forEach(reaction => this.addMessage(reaction));
        
        console.log(
          "Fresh message IDs:",
          freshMsgs.map(m => m.msgid || m.tempmsgid || m.timestamp)
        );
      }

      console.log(
        "Memory BEFORE insert:",
        this.messages[chatid].map(m => m.msgid || m.tempmsgid || m.timestamp)
      );

      this.messages[chatid] = [
        ...freshMsgs,
        ...this.messages[chatid]
      ];

      console.log("Sorting messages by timestamp...");

      this.messages[chatid].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      console.log(
        "Memory AFTER insert:",
        this.messages[chatid].map(m => m.msgid || m.tempmsgid || m.timestamp)
      );

      console.log("Memory size after insert:", this.messages[chatid].length);

      console.log("Notifying UI listeners...");

      this.notifyListeners({
        chatid,
        bulkLoad: true
      });

    } else {

      console.log("No messages returned from DB");

    }

    console.log("========== LOAD MORE END ==========");

    return dbMessages;
  },

  addMessage(msg) {
    const { chatid, msgid, tempmsgid, timestamp, isold, content, msgtype, repliedTo, userid, sendername, type } = msg;

    if (!chatid) {
      console.warn("Message missing chatid:", msg);
      return;
    }

    const actualRepliedTo = repliedTo || msg.repliedto;
    const actualMsgType = msgtype || type;

    if (actualMsgType === 'reaction' && actualRepliedTo) {
      const reactionEventId = msgid || tempmsgid || timestamp;
      if (reactionEventId) {
        if (!this.processedReactions) this.processedReactions = new Set();
        if (this.processedReactions.has(reactionEventId)) {
          return; // Skip echoing the exact same reaction event
        }
        this.processedReactions.add(reactionEventId);
      }

      if (!this.messages[chatid]) this.messages[chatid] = [];
      const messages = this.messages[chatid];
      const targetIndex = messages.findIndex(m => m.msgid === actualRepliedTo || m.tempmsgid === actualRepliedTo);
      if (targetIndex !== -1) {
        const targetMsg = { ...messages[targetIndex] };
        if (!targetMsg.reactions) targetMsg.reactions = {};
        
        const reactionText = content;
        if (!targetMsg.reactions[reactionText]) targetMsg.reactions[reactionText] = [];
        
        // Toggle logic: if user already reacted with this exact text, remove it. Otherwise add it.
        const existingIdx = targetMsg.reactions[reactionText].findIndex(r => r.userId === userid);
        if (existingIdx !== -1) {
          targetMsg.reactions[reactionText].splice(existingIdx, 1);
          if (targetMsg.reactions[reactionText].length === 0) delete targetMsg.reactions[reactionText];
        } else {
          targetMsg.reactions[reactionText].push({ userId: userid, username: sendername });
        }

        this.messages[chatid][targetIndex] = targetMsg;
        const idToSave = targetMsg.msgid || targetMsg.tempmsgid || targetMsg.timestamp;
        saveMessageToDB(targetMsg, idToSave).catch(console.error);
        this.notifyListeners(targetMsg);
      }
      return;
    }

    let isNewChat = false;
    if (!this.messages[chatid]) {
      this.messages[chatid] = [];
      try {
        const chatsMap = JSON.parse(localStorage.getItem("chatsMap") || '{}');
        if (!chatsMap[chatid] && !msg.isSimulation) {
          isNewChat = true;
        }
      } catch (e) {}
    }

    // Unique identifier
    const idToCheck = msgid || tempmsgid || timestamp;

    if (!idToCheck) {
      console.warn("Message missing identifier:", msg);
      return;
    }

    // Save to IndexedDB asynchronously
    const persistenceMsg = { ...msg };
    saveMessageToDB(persistenceMsg, idToCheck).catch(err => console.error("IDB save failed:", err));

    // Find if message already exists
    const index = this.messages[chatid].findIndex(
      (m) => (m.msgid || m.tempmsgid || m.timestamp) === idToCheck
    );

    if (index !== -1) {
      const existing = this.messages[chatid][index];
      
      // Determine if there's any meaningful change
      const isIdUpgrade = msgid && !existing.msgid;
      const isContentDiff = existing.content !== content;
      const isStatusDiff = status && existing.status !== status;
      const isDeletionDiff = existing.isdeleted !== msg.isdeleted || 
                             existing.isdeletedeone !== msg.isdeletedeone;

      if (isIdUpgrade || isContentDiff || isStatusDiff || isDeletionDiff) {
        if (import.meta.env.DEV) console.log(`[MessageStore] Updating message ${idToCheck}:`, { isIdUpgrade, isContentDiff, isStatusDiff });
        
        // Update in-place to maintain order
        this.messages[chatid][index] = { ...existing, ...msg };
        
        // Save to IndexedDB
        const persistenceMsg = { ...this.messages[chatid][index] };
        saveMessageToDB(persistenceMsg, idToCheck).catch(() => {});
        
        // Notify UI
        this.notifyListeners(this.messages[chatid][index]);
      } else {
        // Identical message already in memory - SILENT SKIP
        // This prevents the "refresh position" jump and unnecessary re-renders during bulk load.
      }
    } else {
      // New message → push normally
      if (import.meta.env.DEV) console.log("Adding new message:", chatid);
      this.messages[chatid].push(msg);
      
      // Sort to ensure correct order if messages arrive out of sync
      this.messages[chatid].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));


      // Skip unread count and parsing for simulation messages
      if (msg.isSimulation) {
        this.notifyListeners(msg);
        return;
      }

      if (!isold && !msg.tempmsgid && (this.activeChat != msg.chatid)) {
        const sId = msg.spaceid || 0;
        if (isold === false) {
          if (!this.new[chatid]) this.new[chatid] = {};
          this.new[chatid][sId] = (this.new[chatid][sId] || 0) + 1;
        } else {
          if (this.isNew(msg.timestamp, this.getChatEpoch(msg.chatid))) {
            if (!this.new[chatid]) this.new[chatid] = {};
            this.new[chatid][sId] = (this.new[chatid][sId] || 0) + 1;
          }
        }
      }
      if (this.parseCallback) {
        try {
          this.parseCallback(msg);
        } catch (err) {
          console.error("Error in parseCallback:", err);
        }
      } else {
        console.warn("Parse callback not set");
      }
      this.notifyListeners(msg);
      
      // Notify listeners to sync chat list if this is a completely unknown chat
      if (isNewChat) {
        console.log(`[MessageStore] Unknown chatid ${chatid} detected, triggering chatbox sync...`);
        this.notifyListeners({ type: 'unknown_chat', chatid });
      }
    }
  },
  getActivechatbox() {
    return this.activeChat
  },
  setActivechatbox(chatid) {
    console.log("changing from", this.activeChat, "to", chatid)
    this.activeChat = chatid
  },
  getChatEpoch(chatId) {
    const stored = JSON.parse(localStorage.getItem("visited") || "{}");
    return stored[chatId] || null; // returns null if chatId does not exist
  },
  isNew(messageTimestampISO, lastVisitedEpoch) {
    if (!lastVisitedEpoch) return true;

    const messageEpoch = Date.parse(messageTimestampISO);
    if (isNaN(messageEpoch)) return true;

    return messageEpoch > lastVisitedEpoch;
  },


  add2Message(msg) {
    const { chatid } = msg;
    if (!this.messages[chatid]) {
      this.messages[chatid] = [];
    }
    console.log("Adding message to:", chatid);
    this.messages[chatid].push(msg);
    this.notifyListeners(msg);
  },

  getBatchFrontier(chatid, spaceId = 0) {
    return this.batchFrontiers[`${chatid}_${spaceId}`];
  },

  getMessages(chatid) {
    return this.messages[chatid] || [];
  },

  getCount() {
    return JSON.parse(JSON.stringify(this.new || {}));
  },

  getChatCount(chatid) {
    if (!this.new || !this.new[chatid]) return 0;
    if (typeof this.new[chatid] === 'number') return this.new[chatid];
    return Object.values(this.new[chatid]).reduce((sum, val) => sum + val, 0);
  },

  getSpaceCount(chatid, spaceid) {
    if (!this.new || !this.new[chatid]) return 0;
    if (typeof this.new[chatid] === 'number') return spaceid === 0 ? this.new[chatid] : 0;
    return this.new[chatid][spaceid] || 0;
  },

  getCountsnap() {
    return { ...(this.new || {}) };
  },

  setCount(chatid, spaceid = null) {
    if (!this.new) this.new = {};
    if (spaceid !== null) {
      if (this.new[chatid] && typeof this.new[chatid] === 'object') {
        this.new[chatid][spaceid] = 0;
      }
    } else {
      this.new[chatid] = 0;
    }
    this.notifyListeners();
    return this.new;
  },
  
  setUnreadCount(chatid, count, spaceid = 0) {
    if (!this.new) this.new = {};
    if (!this.new[chatid] || typeof this.new[chatid] !== 'object') {
      this.new[chatid] = {};
    }
    this.new[chatid][spaceid] = parseInt(count) || 0;
    this.notifyListeners();
  },

  setRoomUnreadCount(chatid, count) {
    this.roomCounts[chatid] = parseInt(count) || 0;
    this.notifyListeners();
  },

  getRoomCounts() {
    return { ...this.roomCounts };
  },

  getLastMessage() {
    const result = {};
    for (const chatid in this.messages) {
      const msgs = this.messages[chatid];
      if (msgs && msgs.length > 0) {
        // Return a map of spaceid -> last message
        const spaceLastMsgs = {};
        msgs.forEach(m => {
          const sId = m.spaceid || 0;
          if (!spaceLastMsgs[sId] || new Date(m.timestamp) > new Date(spaceLastMsgs[sId].timestamp)) {
            spaceLastMsgs[sId] = m;
          }
        });
        result[chatid] = spaceLastMsgs;
      } else {
        result[chatid] = {};
      }
    }
    return result;
  },

  getChatLastMessage(chatid) {
    const msgs = this.messages[chatid];
    if (!msgs || msgs.length === 0) return null;
    return msgs[msgs.length - 1];
  },

  getSpaceLastMessage(chatid, spaceid) {
    const msgs = this.messages[chatid];
    if (!msgs || msgs.length === 0) return null;
    const spaceMsgs = msgs.filter(m => (m.spaceid || 0) == spaceid);
    if (spaceMsgs.length === 0) return null;
    return spaceMsgs[spaceMsgs.length - 1];
  },

  getid(tempid, chatid) {
    const messages = this.messages[chatid];
    if (!messages) return null;
    const msgIndex = messages.findIndex(
      (msg) => msg.tempmsgid === tempid
    );
    if (msgIndex === -1) return null;
    return messages[msgIndex].msgid || null;
  },
  updateMessageStatus(ack) {
    const { chatid, tempmsgid, msgid, status } = ack;
    const messages = this.messages[chatid];

    if (!messages) return;

    const msgIndex = messages.findIndex(
      (msg) => msg.tempmsgid === tempmsgid || msg.msgid === msgid
    );
    if (status.startsWith("deleted")) {
      if (msgIndex !== -1) {
        this.messages[chatid][msgIndex] = {
          ...this.messages[chatid][msgIndex],
          isdeletedeone: status.replace("deleted", "")
        };
        // DB update now handled entirely by updateMessageStatusInDB triggered from Websocket.js
        this.notifyListeners(this.messages[chatid][msgIndex]);
        console.log("Message status updated:", this.messages[chatid][msgIndex]);
      }
      return;
    }
    if (status == "revived") {
      if (msgIndex !== -1) {
        this.messages[chatid][msgIndex] = {
          ...this.messages[chatid][msgIndex],
          isdeletedeone: null,
          revived: true
        };
        this.notifyListeners(this.messages[chatid][msgIndex]);
        console.log("Message status updated:", this.messages[chatid][msgIndex]);
      }
      return;
    }
    if (msgIndex !== -1) {
      this.messages[chatid][msgIndex] = {
        ...this.messages[chatid][msgIndex],
        msgid,
        status
      };
      this.notifyListeners(this.messages[chatid][msgIndex]);
      console.log("Message status updated:", this.messages[chatid][msgIndex]);
    }
  },

  updateMessage(chatid, tempmsgid, updateData) {
    if (!chatid || !this.messages[chatid]) return;
    const msgIndex = this.messages[chatid].findIndex(
      (m) => m.tempmsgid === tempmsgid || m.msgid === tempmsgid
    );
    if (msgIndex !== -1) {
      const updated = { ...this.messages[chatid][msgIndex], ...updateData };
      this.messages[chatid][msgIndex] = updated;
      const idToCheck = updated.msgid || updated.tempmsgid || updated.timestamp;

      saveMessageToDB(updated, idToCheck).catch(console.error);

      this.notifyListeners(updated);
    }
  },

  removeOptimistic(chatid, tempmsgid) {
    if (!chatid || !this.messages[chatid]) return;

    // 1. Remove from memory
    const index = this.messages[chatid].findIndex(
      (m) => m.tempmsgid === tempmsgid || m.msgid === tempmsgid
    );
    if (index !== -1) {
      console.log(`[MessageStore] Removing optimistic message from memory: ${tempmsgid}`);
      this.messages[chatid].splice(index, 1);
    }

    // 2. Remove from IndexedDB
    // We use the same ID logic as addMessage to ensure we target the correct entry
    initDB().then(db => {
      db.delete('messages', tempmsgid).catch(err => {
        console.warn(`[MessageStore] Failed to delete ${tempmsgid} from IDB:`, err);
      });
      // Also clear from caches
      db.delete('mainCache', tempmsgid).catch(() => { });
      db.delete('thumbCache', `${tempmsgid}_thumb`).catch(() => { });
    });

    // 3. Notify UI
    this.notifyListeners({ chatid, removedId: tempmsgid });
  },

  delete(chatid, msgid, dfor) {
    const messages = this.messages[chatid];
    if (!messages) return;

    const msgIndex = messages.findIndex(
      (msg) => msg.msgid === msgid
    );
    if (msgIndex !== -1) {
      this.messages[chatid][msgIndex] = {
        ...this.messages[chatid][msgIndex],
        isdeleted: dfor === "me" ? true : false,
        isdeletedeone: dfor === "eone" ? localStorage.getItem("userid") : null,
        revived: this.messages[chatid][msgIndex].revived ? true : false
      };
      const idToCheck = this.messages[chatid][msgIndex].msgid || this.messages[chatid][msgIndex].tempmsgid || this.messages[chatid][msgIndex].timestamp;
      saveMessageToDB(this.messages[chatid][msgIndex], idToCheck).catch(console.error);
      this.notifyListeners(this.messages[chatid][msgIndex]);
      console.log("Message status updated to deleted:", this.messages[chatid][msgIndex]);
    }
  },

  revive(chatid, msgid, dfor) {
    const messages = this.messages[chatid];
    if (!messages) return;

    const msgIndex = messages.findIndex(
      (msg) => msg.msgid === msgid
    );
    if (msgIndex !== -1) {
      this.messages[chatid][msgIndex] = {
        ...this.messages[chatid][msgIndex],
        isdeleted: false,
        isdeletedeone: null,
        revived: this.messages[chatid][msgIndex].revived ? this.messages[chatid][msgIndex].revived : dfor === "eone" ? true : false
      };
      const idToCheck = this.messages[chatid][msgIndex].msgid || this.messages[chatid][msgIndex].tempmsgid || this.messages[chatid][msgIndex].timestamp;
      saveMessageToDB(this.messages[chatid][msgIndex], idToCheck).catch(console.error);
      this.notifyListeners(this.messages[chatid][msgIndex]);
      console.log("Message status updated to deleted:", this.messages[chatid][msgIndex]);
    }
  },

  updateIsOld(chatid, spaceid) {
    const messages = this.messages[chatid];
    if (!messages) return;

    this.messages[chatid] = messages.map(msg => {
      if (msg.spaceid === spaceid) {
        return { ...msg, isold: true };
      }
      return msg;
    });

    console.log("Message status updated to new:", this.messages[chatid]);

  },

  addListener(callback) {
    console.log("Listener added");
    this.listeners.push(callback);
  },

  removeListener(callback) {
    console.log("Listener removed");
    this.listeners = this.listeners.filter(cb => cb !== callback);
  },

  notifyListeners(msg) {
    console.log(`[MessageStore] Notifying ${this.listeners.length} listeners`);
    this.listeners.forEach((listener, index) => {
      console.log(`Calling listener ${index}`);
      listener(msg);
    });
  },

  clearStore() {
    this.messages = {};
    this.listeners = [];
    this.parseCallback = null;
    console.log("Message store cleared");
  },

  markAsVolatile(chatid) {
    if (!chatid) return;
    console.log(`[MessageStore] Marking chat as volatile: ${chatid}`);
    this.volatileChats.add(chatid);
    // Persist to localStorage so the blocklist survives reloads
    const registry = Array.from(this.volatileChats);
    localStorage.setItem('roomRegistry', JSON.stringify(registry));
  },

  isVolatile(chatid) {
    return this.volatileChats.has(chatid);
  },

  updateOnlineStatuses(map) {
    if (!map || typeof map !== 'object') return;
    this.onlineStatuses = { ...this.onlineStatuses, ...map };
    this.notifyListeners({ type: 'onlineStatusUpdate', statusMap: map });
  },

  setIndicator(chatid, userid, sendername, content) {
    if (!chatid || !userid) return;
    
    // 1. Initialize structures
    if (!this.transientIndicators[chatid]) this.transientIndicators[chatid] = {};
    if (!this.indicatorTimeouts[chatid]) this.indicatorTimeouts[chatid] = {};

    // 2. Override Logic: typing/recording hide in-chat
    if (content === 'typing' || content === 'recording') {
      const existing = this.transientIndicators[chatid][userid];
      if (existing && existing.content === 'in-chat') {
        clearTimeout(this.indicatorTimeouts[chatid][userid]);
        delete this.transientIndicators[chatid][userid];
      }
    }

    // 3. Set the new indicator
    const ttl = 4500; // Updated to 4.5 secs for better stability
    
    // Clear previous timeout for this specific user in this specific chat
    if (this.indicatorTimeouts[chatid][userid]) {
      clearTimeout(this.indicatorTimeouts[chatid][userid]);
    }

    this.transientIndicators[chatid][userid] = {
      content,
      sendername,
      expiry: Date.now() + ttl
    };

    // 4. Set Cleanup Timeout
    this.indicatorTimeouts[chatid][userid] = setTimeout(() => {
      if (this.transientIndicators[chatid] && this.transientIndicators[chatid][userid]) {
        delete this.transientIndicators[chatid][userid];
        this.notifyListeners({ type: 'indicator', chatid, userid });
      }
    }, ttl);

    // 5. Notify UI
    this.notifyListeners({ type: 'indicator', chatid, userid, content });
  },

  getIndicators(chatid) {
    if (!this.transientIndicators[chatid]) return [];
    
    // Filter out any that might have expired but not been cleaned yet
    const now = Date.now();
    return Object.keys(this.transientIndicators[chatid])
      .map(userid => ({ userid, ...this.transientIndicators[chatid][userid] }))
      .filter(ind => ind.expiry > now);
  }
};

export default messageStore;