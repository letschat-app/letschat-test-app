import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

// Precache all assets injected by Vite PWA
precacheAndRoute(self.__WB_MANIFEST);

// SPA Navigation Fallback
try {
  registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
} catch (e) {
  console.warn('Navigation fallback setup failed:', e);
}

// ─── Firebase Cloud Messaging (MUST be top-level) ───
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDryeR4MrHUWHByT967oI6m2cWMeV0xbXY",
  authDomain: "letschat-86583.firebaseapp.com",
  projectId: "letschat-86583",
  storageBucket: "letschat-86583.firebasestorage.app",
  messagingSenderId: "317759005455",
  appId: "1:317759005455:web:bcff4f930457756a8a547a",
  measurementId: "G-EKF9DDTJ4P"
});

const messaging = firebase.messaging();
const API = "https://letschat-backend-69jf.onrender.com/api"; 
const DB_VERSION = 16;

// ─── Message Handler: User-Controlled Activation ─────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING — activating now');
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Web Share Target POST Handler ───────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const mediaFiles = formData.getAll('media');
          const title = formData.get('title');
          const text = formData.get('text');
          const sharedUrl = formData.get('url');

          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('LetsChatDB', DB_VERSION);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          const tx = db.transaction('sharedData', 'readwrite');
          const store = tx.objectStore('sharedData');

          if (mediaFiles?.length > 0) {
            for (const file of mediaFiles) {
              if (file.size > 0) {
                store.add({ type: 'file', file, name: file.name, mimeType: file.type, timestamp: Date.now() });
              }
            }
          }
          if (title || text || sharedUrl) {
            store.add({ type: 'text', title, text, url: sharedUrl, timestamp: Date.now() });
          }

          await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = reject;
          });

          return Response.redirect('./#/share-target?received=true', 303);
        } catch (err) {
          console.error('[SW] Share target failed:', err);
          return Response.redirect('./#/share-target?error=true', 303);
        }
      })()
    );
  }
});

// ─── FCM: Background Message Handler ─────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] FCM background message received:', payload);

  const data = payload.data || {};
  const { type, chatId, title, unread, msgs, chatType, repliedTo } = data;

  if (type === 'EVENT') {
    let bodyText = data.chatName ? `Group: ${data.chatName}` : 'Event Reminder';
    if (data.startTime) {
      bodyText += ` • Starts at ${data.startTime}`;
    }
    return self.registration.showNotification(title || 'Upcoming Event', {
      body: bodyText,
      icon: 'icon.png',
      badge: 'icon.png',
      tag: data.eventId || 'event',
      data: { type: 'EVENT', chatId: data.chatId, eventId: data.eventId }
    });
  }

  if (type === 'DAILY') {
    let eventCount = 0;
    try {
      let eventIds = [];
      const eventsData = data.events;
      if (typeof eventsData === 'string') {
        if (eventsData.startsWith('[')) {
          try { eventIds = JSON.parse(eventsData); } catch (e) { }
        } else {
          eventIds = eventsData.split(',').map(s => s.trim());
        }
      } else {
        eventIds = eventsData || [];
      }
      eventCount = eventIds.length;
    } catch (e) { }

    return self.registration.showNotification('Today Events', {
      body: eventCount > 0 ? `You have ${eventCount} events scheduled for today.` : 'Check your schedule for today.',
      icon: 'icon.png',
      badge: 'icon.png',
      tag: 'daily-summary',
      data: { type: 'DAILY' }
    });
  }

  if (type === 'ASSIGNMENT_MISSING') {
    const resolveAssignments = async () => {
      try {
        let assignmentIds = [];
        const assignmentsData = data.assignments;
        if (typeof assignmentsData === 'string') {
          if (assignmentsData.startsWith('[')) {
            try { assignmentIds = JSON.parse(assignmentsData); } catch (e) { }
          } else {
            assignmentIds = assignmentsData.split(',').map(s => s.trim());
          }
        } else {
          assignmentIds = assignmentsData || [];
        }

        let db = null;
        try {
          db = await new Promise((resolve, reject) => {
            const req = indexedDB.open('LetsChatDB', DB_VERSION);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
        } catch (dbErr) {
          console.warn('[SW] IndexedDB open failed:', dbErr);
        }

        let details = [];
        if (db && db.objectStoreNames.contains('assignmentsCache')) {
          const tx = db.transaction('assignmentsCache', 'readonly');
          const store = tx.objectStore('assignmentsCache');

          details = await Promise.all(assignmentIds.map(id => {
            return new Promise(res => {
              const req = store.get(String(id));
              req.onsuccess = () => res(req.result);
              req.onerror = () => res(null);
            });
          }));
        }

        let valid = details.filter(d => !!d);

        // Network fallback: If some assignments are not cached, fetch them from backend API
        const missingIds = assignmentIds.filter((id, idx) => !details[idx]);
        if (missingIds.length > 0) {
          const fetchedDetails = await Promise.all(
            missingIds.map(async (id) => {
              try {
                const res = await fetch(`${API}/classroom/assignment/get/${id}`, {
                  headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                if (res.ok) {
                  const fetchedData = await res.json();
                  if (fetchedData.deadline && typeof fetchedData.deadline === 'number') {
                    fetchedData.deadline = new Date(fetchedData.deadline * 1000).toISOString();
                  }
                  if (db && db.objectStoreNames.contains('assignmentsCache')) {
                    try {
                      const txWrite = db.transaction('assignmentsCache', 'readwrite');
                      txWrite.objectStore('assignmentsCache').put({ ...fetchedData, id: String(id) });
                    } catch (e) {}
                  }
                  return fetchedData;
                }
              } catch (e) {}
              return null;
            })
          );
          fetchedDetails.filter(Boolean).forEach(item => valid.push(item));
        }

        const getRelative = (deadline) => {
          if (!deadline) return '';
          const now = Date.now();
          const target = new Date(deadline).getTime();
          const diffMins = Math.floor((target - now) / (1000 * 60));
          if (diffMins <= 0) return 'overdue';
          if (diffMins < 60) return `due in ${diffMins} mins`;
          const hrs = Math.floor(diffMins / 60);
          if (hrs < 24) return `due in ${hrs} hrs`;
          return `due on ${new Date(deadline).toLocaleDateString()}`;
        };

        let notificationBody = '';
        if (valid.length > 0) {
          notificationBody = valid.map(a => `${a.title || 'Assignment'} (${getRelative(a.deadline)})`).join('\n');
          if (assignmentIds.length > valid.length) {
            notificationBody += `\n+${assignmentIds.length - valid.length} more assignment(s)`;
          }
        } else {
          const count = assignmentIds.length || 1;
          notificationBody = `You have ${count} pending assignment(s) due.`;
        }

        return self.registration.showNotification('Pending Assignments', {
          body: notificationBody,
          icon: 'icon.png',
          badge: 'icon.png',
          tag: 'assignments-missing',
          data: { type: 'ASSIGNMENT_MISSING' }
        });
      } catch (err) {
        console.error('[SW] Assignment resolution failed:', err);
        return self.registration.showNotification('Pending Assignments', {
          body: 'You have pending assignments due.',
          icon: 'icon.png',
          badge: 'icon.png',
          tag: 'assignments-missing',
          data: { type: 'ASSIGNMENT_MISSING' }
        });
      }
    };
    return resolveAssignments();
  }

  // 2. Default CHAT Logic
  if (!chatId) return;

  const isRoom = chatType === 'room' || (chatId && String(chatId).startsWith('room_'));

  let messageList = [];
  try {
    messageList = typeof msgs === 'string' ? JSON.parse(msgs) : (msgs || []);
  } catch {
    if (msgs) messageList = [msgs];
  }

  const formattedMessages = messageList.map(msgStr => {
    if (typeof msgStr !== 'string') return msgStr;
    const parts = msgStr.split('/%20/');
    if (parts.length < 4) return msgStr;
    const displayMap = { image: '📷 Image', video: '🎥 Video', audio: '🎤 Voice Message', voice: '🎤 Voice Message', file: '📁 File', assignment: '📚 Assignment', poll: '📊 Poll' };
    const resolvedContent = displayMap[type] || (typeof content === 'string' && content.trim().startsWith('{"poll_id"') ? '📊 Poll' : content);
    return `${username}: ${resolvedContent}`;
  });

  const last5 = formattedMessages.slice(-5);
  const unreadCount = parseInt(unread) || 1;
  let notificationBody = (!isRoom && unreadCount > 1) ? `${unreadCount} new messages:\n` : '';
  notificationBody += last5.join('\n');

  const resolveAndShow = async () => {
    let dynamicTitle = title || (isRoom ? 'New messages' : 'New Message');

    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('LetsChatDB', DB_VERSION);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      // Get current user id from metaStore
      let currentUserId = null;
      if (db.objectStoreNames.contains('metaStore')) {
        const txMeta = db.transaction('metaStore', 'readonly');
        const userIdRes = await new Promise((resolve) => {
          const req = txMeta.objectStore('metaStore').get('userid');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
        currentUserId = userIdRes?.value;
      }

      // Resolve chat name from chatsStore if available
      let chatName = null;
      if (db.objectStoreNames.contains('chatsStore')) {
        const tx = db.transaction('chatsStore', 'readonly');
        const res = await new Promise((resolve) => {
          const req = tx.objectStore('chatsStore').get(chatId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
        if (res?.chatName) {
          chatName = res.chatName;
        }
      }

      if (!chatName && currentUserId) {
        try {
          const apiRes = await fetch(`${API}/user/chatbox/${currentUserId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          if (apiRes.ok) {
            const chatData = await apiRes.json();
            const matchedChat = chatData.find(c => String(c.chatId) === String(chatId));
            if (matchedChat?.chatName) {
              chatName = matchedChat.chatName;
              if (db.objectStoreNames.contains('chatsStore')) {
                const txUpdate = db.transaction('chatsStore', 'readwrite');
                txUpdate.objectStore('chatsStore').put(matchedChat);
              }
            }
          }
        } catch (e) {}
      }

      if (chatName) {
        dynamicTitle = isRoom ? `New messages in ${chatName}` : chatName;
      }

      // Universal Reply Resolution (UserA replied to UserB / UserA replied to You)
      if (repliedTo) {
        let repliedSenderId = null;
        let repliedSenderName = null;

        // Step 1: Check local IndexedDB cache
        if (db.objectStoreNames.contains('messages')) {
          try {
            const txMsg = db.transaction('messages', 'readonly');
            const cachedMsg = await new Promise(res => {
              const req = txMsg.objectStore('messages').get(repliedTo);
              req.onsuccess = () => res(req.result);
              req.onerror = () => res(null);
            });
            if (cachedMsg) {
              repliedSenderId = cachedMsg.userid || cachedMsg.senderid || cachedMsg.SenderId;
              repliedSenderName = cachedMsg.sendername || cachedMsg.UserName || cachedMsg.senderName;
            }
          } catch (e) {}
        }

        // Step 2: Cache miss fallback - fetch strictly chat-specific nickname from backend
        if (!repliedSenderName) {
          try {
            const res = await fetch(`${API}/user/message/sender-info?msgId=${encodeURIComponent(repliedTo)}`, {
              headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (res.ok) {
              const info = await res.json();
              repliedSenderId = info.senderId;
              repliedSenderName = info.senderName || 'Member';
            }
          } catch (e) {}
        }

        // Extract latest sender and preview from payload
        const latestRaw = messageList[messageList.length - 1];
        let latestSender = 'Someone';
        let latestPreview = 'replied';
        if (typeof latestRaw === 'string') {
          const parts = latestRaw.split('/%20/');
          if (parts.length >= 4) {
            latestSender = parts[2] || latestSender;
            const msgType = parts[1];
            const displayMap = { image: '📷 Image', video: '🎥 Video', audio: '🎤 Voice Message', voice: '🎤 Voice Message', file: '📁 File', assignment: '📚 Assignment', poll: '📊 Poll' };
            latestPreview = displayMap[msgType] || (typeof parts[3] === 'string' && parts[3].trim().startsWith('{"poll_id"') ? '📊 Poll' : parts[3]);
          } else {
            latestPreview = latestRaw;
          }
        }

        const isReplyToCurrentUser = currentUserId && repliedSenderId === currentUserId;
        const targetChatDisplayName = chatName || 'Chat';

        if (isReplyToCurrentUser) {
          dynamicTitle = isRoom ? `You got a reply in ${targetChatDisplayName}` : 'You got a reply';
          notificationBody = `${latestSender} replied to You: ${latestPreview}`;
        } else if (repliedSenderName) {
          dynamicTitle = targetChatDisplayName;
          notificationBody = `${latestSender} replied to ${repliedSenderName}: ${latestPreview}`;
        }
      }

      let hasMention = false;
      if (currentUserId) {
        const mentionSyntax = `<@${currentUserId}:`;
        for (const msgStr of messageList) {
          if (typeof msgStr === 'string' && msgStr.includes(mentionSyntax)) {
            hasMention = true;
            break;
          }
        }
      }

      if (hasMention) {
        showNotification("You were mentioned", "Someone mentioned you in this chat.");
      } else {
        showNotification(dynamicTitle, notificationBody);
      }
    } catch (err) {
      showNotification(dynamicTitle, notificationBody);
    }
  };

  resolveAndShow();

  function showNotification(finalTitle, finalBody) {
    self.registration.showNotification(finalTitle, {
      body: finalBody,
      icon: 'icon.png',
      badge: 'icon.png',
      tag: isRoom ? `room-${chatId}` : chatId,
      renotify: true,
      data: { chatId, type: chatType || 'CHAT' },
      vibrate: [200, 100, 200],
    });
  }
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const tag = event.notification.tag;
  const baseUrl = self.registration.scope;

  let relativePath = '#/chats';
  if (tag === 'daily-summary' || data.type === 'DAILY' || data.type === 'EVENT') {
    relativePath = '#/calendar';
  } else if (tag === 'assignments-missing' || data.type === 'ASSIGNMENT_MISSING') {
    relativePath = '#/communities';
  } else if (data.chatId) {
    relativePath = `#/chats?showSpacesForChat=${data.chatId}`;
  }

  const urlToOpen = new URL(relativePath, baseUrl).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        try {
          const clientOrigin = new URL(client.url).origin;
          if (clientOrigin === location.origin) {
            if ('focus' in client) {
              await client.focus();
            }
            if ('navigate' in client) {
              await client.navigate(urlToOpen);
            }
            return;
          }
        } catch (e) {
          // ignore URL parsing error
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
