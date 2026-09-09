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
const DB_VERSION = 15;

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
  const { type, chatId, title, unread, msgs } = data;

  if (type === 'EVENT') {
    return self.registration.showNotification(title || 'Upcoming Event', {
      body: data.chatName || 'Event Reminder',
      icon: 'icon.png',
      badge: 'icon.png',
      tag: data.eventId || 'event',
      data: { chatId: data.chatId }
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
      tag: 'daily-summary'
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

        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open('LetsChatDB', DB_VERSION);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        const tx = db.transaction('assignmentsCache', 'readonly');
        const store = tx.objectStore('assignmentsCache');

        const details = await Promise.all(assignmentIds.map(id => {
          return new Promise(res => {
            const req = store.get(String(id));
            req.onsuccess = () => res(req.result);
            req.onerror = () => res(null);
          });
        }));

        const valid = details.filter(d => !!d);
        if (valid.length === 0) return;

        const getRelative = (deadline) => {
          const now = Date.now();
          const target = new Date(deadline).getTime();
          const diffMins = Math.floor((target - now) / (1000 * 60));
          if (diffMins <= 0) return 'overdue';
          if (diffMins < 60) return `due in ${diffMins} mins`;
          const hrs = Math.floor(diffMins / 60);
          if (hrs < 24) return `due in ${hrs} hrs`;
          return `due on ${new Date(deadline).toLocaleDateString()}`;
        };

        const notificationBody = valid.map(a => `${a.title} (${getRelative(a.deadline)})`).join('\n');

        return self.registration.showNotification('Pending Assignments', {
          body: notificationBody,
          icon: 'icon.png',
          badge: 'icon.png',
          tag: 'assignments-missing'
        });
      } catch (err) {
        console.error('[SW] Assignment resolution failed:', err);
      }
    };
    return resolveAssignments();
  }

  // 2. Default CHAT Logic
  if (!chatId) return;

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
    const [, type, username, content] = parts;
    const displayMap = { image: '📷 Image', video: '🎥 Video', audio: '🎤 Voice Message', voice: '🎤 Voice Message', file: '📁 File' };
    return `${username}: ${displayMap[type] || content}`;
  });

  const last5 = formattedMessages.slice(-5);
  const unreadCount = parseInt(unread) || 1;
  let notificationBody = unreadCount > 1 ? `${unreadCount} new messages:\n` : '';
  notificationBody += last5.join('\n');

  const resolveAndShow = async () => {
    let dynamicTitle = title || 'New Message';

    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('LetsChatDB', DB_VERSION);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (db.objectStoreNames.contains('mutedStore')) {
        const txMute = db.transaction('mutedStore', 'readonly');
        const isMuted = await new Promise((resolve) => {
          const req = txMute.objectStore('mutedStore').get(chatId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(false);
        });
        if (isMuted) return;
      }

      if (db.objectStoreNames.contains('chatsStore')) {
        const tx = db.transaction('chatsStore', 'readonly');
        const res = await new Promise((resolve) => {
          const req = tx.objectStore('chatsStore').get(chatId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });

        if (res?.chatName) {
          dynamicTitle = res.chatName;
          showNotification(dynamicTitle, notificationBody);
          return;
        }
      }

      let currentUserId = null;
      if (db.objectStoreNames.contains('metaStore')) {
        const txMeta = db.transaction('metaStore', 'readonly');
        const userIdRes = await new Promise((resolve) => {
          const req = txMeta.objectStore('metaStore').get('userid');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
        currentUserId = userIdRes?.value;

        if (currentUserId) {
          const apiRes = await fetch(`${API}/user/chatbox/${currentUserId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          if (apiRes.ok) {
            const chatData = await apiRes.json();
            const matchedChat = chatData.find(c => String(c.chatId) === String(chatId));
            if (matchedChat?.chatName) {
              dynamicTitle = matchedChat.chatName;
              const txUpdate = db.transaction('chatsStore', 'readwrite');
              txUpdate.objectStore('chatsStore').put(matchedChat);
            }
          }
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
      tag: chatId,
      data: { chatId },
      vibrate: [200, 100, 200],
    });
  }
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const chatId = event.notification.data?.chatId;
  const baseUrl = self.registration.scope;
  const relativePath = chatId ? `#/chats?showSpacesForChat=${chatId}` : `#/chats`;
  const urlToOpen = new URL(relativePath, baseUrl).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })
  );
});
