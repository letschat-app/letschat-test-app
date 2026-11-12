import { formatPushNotification, resolveNotificationPath, matchesChatNotification } from './sw/notificationFormat.js';
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

// ─── Firebase Cloud Messaging (Bundled Firebase 12 Modular SDK) ───
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

const firebaseApp = initializeApp({
  apiKey: "AIzaSyDryeR4MrHUWHByT967oI6m2cWMeV0xbXY",
  authDomain: "letschat-86583.firebaseapp.com",
  projectId: "letschat-86583",
  storageBucket: "letschat-86583.firebasestorage.app",
  messagingSenderId: "317759005455",
  appId: "1:317759005455:web:bcff4f930457756a8a547a",
  measurementId: "G-EKF9DDTJ4P"
});

const messaging = getMessaging(firebaseApp);
const lastAlertTsMap = new Map();
// ─── Resolve Notification Icon Relative to App Scope (Handles Subdirectory Deployments) ───
const NOTIFICATION_ICON = (() => {
  try {
    const scope = (typeof self !== 'undefined' && self.registration && self.registration.scope)
      ? self.registration.scope
      : (typeof location !== 'undefined' ? location.origin + '/' : '/');
    const normalizedScope = scope.endsWith('/') ? scope : scope + '/';
    return new URL('icon-notify.png', normalizedScope).href;
  } catch (e) {
    return 'icon-notify.png';
  }
})();

const NOTIFICATION_BADGE = (() => {
  try {
    const scope = (typeof self !== 'undefined' && self.registration && self.registration.scope)
      ? self.registration.scope
      : (typeof location !== 'undefined' ? location.origin + '/' : '/');
    const normalizedScope = scope.endsWith('/') ? scope : scope + '/';
    return new URL('badge-96.png', normalizedScope).href;
  } catch (e) {
    return 'badge-96.png';
  }
})();


const API = "https://letschat-5dxg.onrender.com/api"; 
const DB_VERSION = 16;
const APP_VERSION = '2.1.1';

const showUpdateNotification = async () => {
  try {
    console.log('[SW] Showing background update notification');
    await self.registration.showNotification('New version of LetsChat available', {
      body: 'A new version of LetsChat is available. Tap to update.',
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_BADGE,
      tag: 'app-update-available',
      renotify: true,
      requireInteraction: true,
      data: { type: 'APP_UPDATE' }
    });
  } catch (err) {
    console.warn('[SW] Failed to show update notification in SW:', err);
  }
};

// ─── Service Worker Lifecycle & User-Controlled Activation ───────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] New Service Worker installing...');
  // If an active service worker already exists, this is an UPDATE (not a fresh install)
  const isUpdate = Boolean(self.registration && self.registration.active);
  if (isUpdate) {
    console.log('[SW] Update detected during install event (active worker exists)');
    event.waitUntil(showUpdateNotification());
  }
});

// Periodic background sync event for update checks
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-update') {
    console.log('[SW] Periodic sync check-update triggered');
    event.waitUntil(self.registration.update().catch(() => {}));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING — activating now');
    self.skipWaiting();
  } else if (event.data?.type === 'CLOSE_CHAT_NOTIFICATIONS' && event.data?.chatId) {
    event.waitUntil(
      self.registration.getNotifications()
        .then((notifs) => {
          for (const notif of notifs) {
            if (matchesChatNotification(notif.data, notif.tag, event.data.chatId)) {
              notif.close();
            }
          }
        })
        .catch((err) => console.warn('[SW] Failed closing chat notifications:', err))
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      console.log('[SW] Activated & claimed clients — broadcasting SW_ACTIVATED');
      const windowClients = await self.clients.matchAll({ type: 'window' });
      for (const client of windowClients) {
        client.postMessage({
          type: 'SW_ACTIVATED',
          version: APP_VERSION
        });
      }
    })()
  );
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

          if (!db.objectStoreNames.contains('sharedData')) {
            db.close();
            return Response.redirect(new URL('/share-target', event.request.url).href, 303);
          }

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
          db.close();

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
onBackgroundMessage(messaging, async (payload) => {
  console.log('[SW] FCM background message received:', payload);
  try {
    self.registration.update().catch(() => {});
  } catch (e) {}

  try {
    const data = payload.data || {};

    // ─── Protocol v2 Handler ───
    if (data.v === '2') {
      const formatted = formatPushNotification(data, { icon: NOTIFICATION_ICON, badge: NOTIFICATION_BADGE });
      const isSilent = data.silent === 'true';

      let shouldAlert = !isSilent;
      if (data.alertKind === 'mention' || data.alertKind === 'reply') {
        shouldAlert = true; // Mentions and replies always alert
      }

      const notifOptions = {
        body: formatted.body || '',
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        tag: formatted.tag || 'letschat-default',
        data: formatted.data || {},
        renotify: Boolean(formatted.tag) && shouldAlert,
        silent: !shouldAlert,
      };

      if (shouldAlert) {
        notifOptions.vibrate = [200, 100, 200];
      }

      return await self.registration.showNotification(formatted.title, notifOptions);
    }

    // ─── Firebase Console Campaign / Direct Notification Block Fallback ───
    if (payload.notification) {
      // R4: When payload.notification is present, Firebase Web SDK automatically displays it.
      // Manual showNotification here causes duplicate notifications.
      console.log('[SW] Firebase notification payload detected — handled automatically by SDK.');
      return;
    }

    // ─── Non-v2 Data Fallback (Formats using notificationFormat) ───
    const formatted = formatPushNotification(data, { icon: NOTIFICATION_ICON, badge: NOTIFICATION_BADGE });
    return await self.registration.showNotification(formatted.title, {
      body: formatted.body || '',
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_BADGE,
      tag: formatted.tag || 'letschat-default',
      data: formatted.data || {},
      renotify: Boolean(formatted.tag),
      vibrate: [200, 100, 200],
    });
  } catch (swErr) {
    console.error('[SW] Error displaying background notification:', swErr);
    // Bulletproof Fallback: Guarantees a notification is shown so Chrome never penalizes the SW
    try {
      const data = payload?.data || {};
      const fallbackTitle = data.title || data.eventTitle || 'New update in LetsChat';
      const fallbackBody = data.body || data.description || 'You received a new message or update.';
      return await self.registration.showNotification(fallbackTitle, {
        body: fallbackBody,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        tag: 'letschat-fallback-' + Date.now(),
        data: data,
        renotify: true,
        vibrate: [200, 100, 200]
      });
    } catch (fallbackErr) {
      console.error('[SW] Critical fallback notification display failed:', fallbackErr);
    }
  }
});

// ─── Notification Click ───────────────────────────────────────────────────────
async function focusOrOpenAppClient(baseUrl, urlToOpen, messagePayload) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const baseNoSlash = normalizedBase.slice(0, -1);

  try {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const appClients = windowClients
      .filter((c) => {
        try {
          return c.url === baseNoSlash || c.url.startsWith(normalizedBase) || c.url.startsWith(baseNoSlash + '#');
        } catch {
          return false;
        }
      })
      .sort((a, b) => (b.visibilityState === 'visible' ? 1 : 0) - (a.visibilityState === 'visible' ? 1 : 0));

    for (const client of appClients) {
      try {
        const wasVisible = client.visibilityState === 'visible' || client.focused;
        const focusedClient = ('focus' in client) ? await client.focus().catch(() => null) : client;
        const isNowForeground = Boolean(focusedClient && (focusedClient.focused || focusedClient.visibilityState === 'visible'));
        // On Android PWAs, hidden/suspended tabs can resolve focus() without foregrounding the Activity;
        // fall through to clients.openWindow unless the client is genuinely visible/focused.
        if (isNowForeground || wasVisible) {
          const activeClient = focusedClient || client;
          if (messagePayload) {
            activeClient.postMessage(messagePayload);
          }
          if (!wasVisible && urlToOpen && 'navigate' in activeClient && activeClient.url !== urlToOpen) {
            try { await activeClient.navigate(urlToOpen); } catch { /* ignore */ }
          }
          return activeClient;
        }
      } catch (cErr) {
        console.warn('[SW] Error focusing client:', cErr);
      }
    }
  } catch (mErr) {
    console.warn('[SW] Error matching clients:', mErr);
  }

  if (self.clients.openWindow) {
    const targetUrl = urlToOpen || normalizedBase;
    try {
      return await self.clients.openWindow(targetUrl);
    } catch (owErr) {
      console.error('[SW] openWindow failed, retrying base scope:', owErr);
      if (targetUrl !== normalizedBase) {
        try { return await self.clients.openWindow(normalizedBase); } catch { /* ignore */ }
      }
    }
  }
  return null;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const tag = event.notification.tag;
  const baseUrl = self.registration.scope;

  // ── Handle App Update Notification Click ─────────────────────────────────────
  if (data.type === 'APP_UPDATE' || tag === 'app-update-available') {
    console.log('[SW] Update notification clicked — activating new version and updating client');
    self.skipWaiting();

    event.waitUntil(
      focusOrOpenAppClient(baseUrl, null, { type: 'APPLY_UPDATE' })
    );
    return;
  }

  const rawTarget = (typeof data.path === 'string' && data.path.trim()) ? data.path.trim() : resolveNotificationPath(data);
  const cleanPath = rawTarget.replace(/^#?\/+/, '') || 'chats';
  const targetPath = '/' + cleanPath;
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const urlToOpen = new URL('#/' + cleanPath, normalizedBase).href;

  event.waitUntil(
    focusOrOpenAppClient(baseUrl, urlToOpen, { type: 'NOTIFICATION_CLICK', path: targetPath, url: urlToOpen })
  );
});
