import { formatPushNotification, resolveNotificationPath } from './sw/notificationFormat.js';
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

// ─── Service Worker Lifecycle & User-Controlled Activation ───────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] New Service Worker installing...');
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING — activating now');
    self.skipWaiting();
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

    return self.registration.showNotification(formatted.title, notifOptions);
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
  return self.registration.showNotification(formatted.title, {
    body: formatted.body,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_BADGE,
    tag: formatted.tag || 'letschat-default',
    data: formatted.data || {},
    renotify: Boolean(formatted.tag),
    vibrate: [200, 100, 200],
  });
});

// ─── Notification Click ───────────────────────────────────────────────────────
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
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
        for (const client of windowClients) {
          try {
            const clientOrigin = new URL(client.url).origin;
            if (clientOrigin === location.origin) {
              if ('focus' in client) {
                await client.focus();
              }
              client.postMessage({ type: 'APPLY_UPDATE' });
              return;
            }
          } catch (e) {
            console.error('[SW] Error focusing/navigating client on update:', e);
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(baseUrl);
        }
      })
    );
    return;
  }

    const targetPath = resolveNotificationPath(data);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      const urlToOpen = new URL('#' + targetPath, baseUrl).href;
      for (const client of windowClients) {
        try {
          const clientOrigin = new URL(client.url).origin;
          if (clientOrigin === location.origin) {
            if ('focus' in client) {
              await client.focus();
            }
            client.postMessage({ type: 'NOTIFICATION_CLICK', path: targetPath });
            return;
          }
        } catch (e) {
          console.warn('[SW] Error focusing/messaging client:', e);
          try {
            client.postMessage({ type: 'NOTIFICATION_CLICK', path: targetPath });
            return;
          } catch (postErr) {}
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
