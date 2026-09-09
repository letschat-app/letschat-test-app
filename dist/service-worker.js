// ============================================================
// LetsChat Service Worker — Production V4 "Battle-Hardened"
// ============================================================
// Strategy:
//   - Precache: Explicit APP_SHELL (index.html + icons)
//   - Runtime:  Race-Optimized Stale-While-Revalidate for /assets/
//   - Safety:   Message-based skipWaiting (NO forced activation)
//   - FCM:      Firebase messaging kept at top level (always active)
//   - Cache:    Max entry limit enforced to prevent disk abuse
// ============================================================

// ─── Firebase Cloud Messaging (MUST be top-level, not inside any handler) ───
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

// ─── Cache Configuration ────────────────────────────────────────────────────
const CACHE_VERSION = 'letchat-v2.0.9';
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Only cache files guaranteed to exist at build time
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon.png',
];

// Max entries allowed per cache to prevent unbounded disk usage
const CACHE_LIMITS = {
  [CACHE_VERSION]: 20,    // App shell rarely exceeds this
  [RUNTIME_CACHE]: 60,    // Vite assets (hashed JS/CSS/images)
};

// ─── Cache Utilities ─────────────────────────────────────────────────────────

/**
 * Trims cache entries to the defined limit (LRU-like: removes oldest keys).
 * @param {string} cacheName - The cache to trim
 * @param {number} maxEntries - Maximum number of entries to keep
 */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // Delete the oldest entries (front of the list)
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map(key => cache.delete(key)));
    console.log(`[SW] Trimmed ${toDelete.length} entries from "${cacheName}"`);
  }
}

/**
 * Determines if a URL should be excluded from caching.
 * Excludes: API calls, chrome-extension, non GET/same-origin.
 * @param {URL} url
 * @param {string} method
 */
function shouldBypass(url, method) {
  if (method !== 'GET') {
    // Allow POST for share-target
    if (method === 'POST' && url.pathname.endsWith('/share-target')) {
      return false;
    }
    return true;
  }
  if (url.pathname.startsWith('/api/')) return true;
  if (url.protocol === 'chrome-extension:') return true;
  // Skip cross-origin requests (Firebase CDN, etc.)
  if (url.origin !== self.location.origin) return true;
  return false;
}

// ─── Install: Precache App Shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing version: ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => console.log('[SW] App shell precached successfully'))
      .catch(err => console.error('[SW] Precache failed:', err))
    // ⚠️ NO skipWaiting() here — activation is user-controlled via SKIP_WAITING message
  );
});

// ─── Activate: Clean Old Caches + Claim Clients ──────────────────────────────
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating version: ${CACHE_VERSION}`);
  event.waitUntil(
    Promise.all([
      // 1. Delete all caches that don't belong to this version
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_VERSION && key !== RUNTIME_CACHE)
            .map(key => {
              console.log(`[SW] Deleting old cache: ${key}`);
              return caches.delete(key);
            })
        )
      ),
      // 2. Take control of all open pages immediately
      self.clients.claim()
    ])
      .then(() => {
        // 3. Notify all clients of the new version (for version tracking in React)
        return self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: CACHE_VERSION,
              timestamp: Date.now(),
            });
          });
        });
      })
  );
});

// ─── Message Handler: User-Controlled Activation ─────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING — activating now');
    self.skipWaiting();
  }
});

// ─── Fetch: Smart Caching Strategy ───────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ── Bypass: API, non-GET, cross-origin ──
  if (shouldBypass(url, event.request.method)) return;

  // ── Special: Web Share Target POST ──
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
    return;
  }

  // ── Strategy 1: Navigation Requests (SPA fallback) ──
  // For page navigations, try network first. If it fails OR returns non-200,
  // fall back to the precached /index.html so React Router can take over.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) {
            console.log(`[SW] Navigation got ${response?.status}, falling back to ./index.html`);
            return caches.match('./index.html');
          }
          return response;
        })
        .catch(() => {
          console.log('[SW] Navigation failed (offline), serving ./index.html from cache');
          return caches.match('./index.html');
        })
    );
    return;
  }

  // ── Strategy 2: App Shell (exact match) ──
  // Cache-first for the explicitly defined shell files.
  // We resolve relative paths in APP_SHELL against the SW scope for robust matching.
  const isShellFile = APP_SHELL.some(path => {
    const absolutePath = new URL(path, self.registration.scope).pathname;
    return url.pathname === absolutePath;
  });

  if (isShellFile) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
    return;
  }

  // ── Strategy 3: Vite Assets (/assets/) — Race-Optimized SWR ──
  // Return from cache INSTANTLY if available, then update cache in background.
  // This eliminates loading latency on repeat visits.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(event.request);

        // Fire background network fetch regardless (to keep cache fresh)
        const networkFetch = fetch(event.request)
          .then(async networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(RUNTIME_CACHE);
              cache.put(event.request, networkResponse.clone());
              // Enforce max entry limit after every put
              await trimCache(RUNTIME_CACHE, CACHE_LIMITS[RUNTIME_CACHE]);
            }
            return networkResponse;
          })
          .catch(() => null);

        // Return cache hit immediately; otherwise wait for network
        return cachedResponse || networkFetch;
      })()
    );
    return;
  }

  // ── Strategy 4: All Other Same-Origin Requests — Network First ──
  // Don't cache dynamic content (e.g., /files/, /share-target).
  // Just pass through.
});

const API = "https://letschat-backend-69jf.onrender.com/api"; // This should ideally be injected at build time
const DB_VERSION = 15;

// ─── FCM: Background Message Handler ─────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] FCM background message received:', payload);

  const data = payload.data || {};
  const { type, chatId, title, unread, msgs } = data;

  // 1. Handle Special Types (EVENT/DAILY)
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

  // Resolution Logic
  const resolveAndShow = async () => {
    let dynamicTitle = title || 'New Message';

    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('LetsChatDB', DB_VERSION);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      // 0. Check if chat is muted
      if (db.objectStoreNames.contains('mutedStore')) {
        const txMute = db.transaction('mutedStore', 'readonly');
        const isMuted = await new Promise((resolve) => {
          const req = txMute.objectStore('mutedStore').get(chatId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(false);
        });
        if (isMuted) {
          console.log(`[SW] Chat ${chatId} is muted. Skipping notification.`);
          return;
        }
      }

      // 1. Check local IndexedDB mirror
      if (db.objectStoreNames.contains('chatsStore')) {
        const tx = db.transaction('chatsStore', 'readonly');
        const res = await new Promise((resolve) => {
          const req = tx.objectStore('chatsStore').get(chatId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });

        if (res?.chatName) {
          dynamicTitle = res.chatName;
          showNotification(dynamicTitle);
          return;
        }
      }

      // 2. Fallback: Call API
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
          console.log('[SW] Cache miss for chatId, fetching from API for user:', currentUserId);
          const apiRes = await fetch(`${API}/user/chatbox/${currentUserId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });

          if (apiRes.ok) {
            const chatData = await apiRes.json();
            const matchedChat = chatData.find(c => String(c.chatId) === String(chatId));

            if (matchedChat?.chatName) {
              dynamicTitle = matchedChat.chatName;

              // Update local store for next time
              const txUpdate = db.transaction('chatsStore', 'readwrite');
              txUpdate.objectStore('chatsStore').put(matchedChat);
            }
          }
        }
      }

      // Check for mentions
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
      console.error('[SW] Resolution failed:', err);
      // Try to check mentions even on error if currentUserId is known
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
  // Open the space list by default using the query parameter
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
