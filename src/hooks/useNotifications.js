import { useState, useEffect, useRef } from 'react';
import { messaging, getToken, onMessage, deleteToken } from '../service/firebase';
import { registerFCMToken, removeFCMToken } from '../service/UserAuth';
import { isChatMuted } from '../service/db';
import { useNavigate } from 'react-router-dom';
import messageStore from '../pages/MessageStore';

const VAPID_KEY = "BKxC4cRGOl1Kx9VRilXr6Yk5Pf4KFzrw6VW2b3TdtPgbJ9HCBrDfcJ1YH4SIlo-wIuOMilLVpNhVVdx9E6ztbVU";

const getOrCreateDeviceId = () => {
  let devId = localStorage.getItem('deviceId');
  if (!devId) {
    devId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    localStorage.setItem('deviceId', devId);
  }
  return devId;
};

// Helper: completely purge Firebase token IndexedDB database so SDK cannot reuse stale cached token
const clearFirebaseTokenDB = async () => {
  try {
    if (typeof indexedDB !== 'undefined') {
      const dbs = ['firebase-messaging-database'];
      for (const dbName of dbs) {
        await new Promise((resolve) => {
          const req = indexedDB.deleteDatabase(dbName);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
          setTimeout(resolve, 300);
        });
      }
    }
  } catch (err) {
    console.warn('[useNotifications] Could not clear firebase-messaging-database:', err);
  }
};

export const useNotifications = () => {
  const [fcmToken, setFcmToken] = useState(localStorage.getItem('fcmToken'));
  const [permissionStatus, setPermissionStatus] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const userId = localStorage.getItem('userid');
  const navigate = useNavigate();
  const isRefreshingRef = useRef(false);

  const requestPermissionAndGetToken = async (forceRefresh = false) => {
    if (isRefreshingRef.current) {
      console.log('[useNotifications] Token request already in progress, skipping duplicate call.');
      return null;
    }
    isRefreshingRef.current = true;
    console.log('[useNotifications] requestPermissionAndGetToken called with forceRefresh =', forceRefresh);
    try {
      if (!('Notification' in window) || !messaging) {
        console.warn('[useNotifications] Notifications or Firebase messaging not supported in this browser.');
        setPermissionStatus('unsupported');
        return null;
      }

      console.log('[useNotifications] Current permission:', Notification.permission);
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      console.log('[useNotifications] Permission result:', permission);

      if (permission === 'granted') {
        if ('serviceWorker' in navigator) {
          console.log('[useNotifications] Waiting for Service Worker to be ready...');
          const registration = await navigator.serviceWorker.ready;
          console.log('[useNotifications] Service Worker ready. Active worker:', registration.active?.state);

          // If a forceRefresh was requested (on SW update or manual re-enable),
          // clear any stale FCM token / push subscription first to ensure a 100% clean, brand new token
          if (forceRefresh) {
            console.log('[useNotifications] Force refresh: tearing down old FCM token & PushSubscription...');
            // 1. Delete token from Firebase SDK first (while subscription still exists so Firebase can reach backend)
            try {
              await deleteToken(messaging);
              console.log('[useNotifications] deleteToken(messaging) succeeded');
            } catch (delErr) {
              console.warn('[useNotifications] deleteToken error (non-fatal, continuing):', delErr?.message);
            }

            // 2. Unsubscribe the underlying browser PushManager subscription
            try {
              const sub = await registration.pushManager?.getSubscription();
              if (sub) {
                await sub.unsubscribe();
                console.log('[useNotifications] Successfully unsubscribed old PushManager subscription');
              }
            } catch (subErr) {
              console.warn('[useNotifications] PushManager unsubscribe warning:', subErr?.message);
            }

            // 3. Clear IndexedDB token cache directly so Firebase cannot return stale cached token
            await clearFirebaseTokenDB();

            // 4. Clear local token state
            localStorage.removeItem('fcmToken');
            setFcmToken(null);

            // Small 300ms pause to ensure Android Google Play Services finishes unbinding old subscription
            await new Promise(r => setTimeout(r, 300));
          }

          let token;
          let attempts = 0;
          while (attempts < 3 && !token) {
            attempts++;
            try {
              token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
              });
            } catch (tokenErr) {
              console.warn(`[useNotifications] getToken attempt ${attempts} failed:`, tokenErr?.message);
              if (attempts < 3) {
                await new Promise(r => setTimeout(r, 1000 * attempts));
              } else {
                throw tokenErr;
              }
            }
          }

          if (token) {
            console.log('[useNotifications] FCM Token retrieved successfully:', token);
            setFcmToken(token);
            localStorage.setItem('fcmToken', token);
            localStorage.removeItem('notificationsDisabled'); // Clear manual disable flag on success
            const currentUserId = localStorage.getItem('userid') || userId;
            if (currentUserId) {
              console.log('[useNotifications] Syncing token with backend for user:', currentUserId);
              await syncTokenWithBackend(token);
            } else {
              console.warn('[useNotifications] Token retrieved but no userId found. Skipping sync.');
            }
            return token;
          } else {
            console.warn('[useNotifications] No FCM token returned from Firebase.');
          }
        } else {
          console.warn('[useNotifications] Service Workers not supported in this browser.');
        }
      }
    } catch (err) {
      console.error('[useNotifications] Error in requestPermissionAndGetToken:', err);
    } finally {
      isRefreshingRef.current = false;
    }
    return null;
  };

  const disableNotifications = async () => {
    console.log('[useNotifications] Disabling notifications...');
    try {
      // 1. Delete token from Firebase SDK first
      if (messaging) {
        try {
          await deleteToken(messaging);
          console.log('[useNotifications] FCM Token deleted from Firebase successfully');
        } catch (fcmErr) {
          console.warn('[useNotifications] Could not delete FCM token from Firebase:', fcmErr?.message);
        }
      }

      // 2. Unsubscribe from PushManager
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const sub = await registration.pushManager?.getSubscription();
          if (sub) {
            await sub.unsubscribe();
            console.log('[useNotifications] Unsubscribed from PushManager');
          }
        } catch (subErr) {
          console.warn('[useNotifications] PushManager unsubscribe warning:', subErr?.message);
        }
      }

      // 3. Clear IndexedDB cache
      await clearFirebaseTokenDB();

      // 4. Local storage & backend sync
      setFcmToken(null);
      localStorage.removeItem('fcmToken');
      localStorage.setItem('notificationsDisabled', 'true'); // Prevent auto-sync
      
      const currentUserId = localStorage.getItem('userid') || userId;
      if (currentUserId) {
        await syncTokenWithBackend(null);
      }
    } catch (err) {
      console.error('[useNotifications] Error disabling notifications:', err);
    }
  };

  const syncTokenWithBackend = async (token) => {
    try {
      const currentUserId = localStorage.getItem('userid') || userId;
      const deviceId = getOrCreateDeviceId();
      if (token) {
        if (!currentUserId) {
          console.warn('[useNotifications] Cannot sync token: No userId found in localStorage');
          return;
        }
        await registerFCMToken({ userId: currentUserId, deviceId, token });
        console.log('[useNotifications] FCM Token registered for user:', currentUserId, 'device:', deviceId);
      } else {
        await removeFCMToken(deviceId);
        console.log('FCM Token removed from backend for device:', deviceId);
      }
    } catch (err) {
      console.error('Failed to sync FCM token with backend', err);
    }
  };

  useEffect(() => {
    const hasNotificationSupport = typeof window !== 'undefined' && 'Notification' in window;
    const isManuallyDisabled = localStorage.getItem('notificationsDisabled') === 'true';
    const justUpdated = localStorage.getItem('sw_just_updated') === 'true';
    const currentUserId = localStorage.getItem('userid') || userId;

    // Automatic version update check:
    // If the app bundle updated (VITE_BUILD_TIME changed) or SW just updated,
    // force a clean token teardown and re-generation
    const currentBuildTime = import.meta.env.VITE_BUILD_TIME;
    const storedBuildTime = localStorage.getItem('app_build_version');
    const isNewBuild = Boolean(currentBuildTime && storedBuildTime && storedBuildTime !== currentBuildTime);

    if (currentBuildTime) {
      localStorage.setItem('app_build_version', currentBuildTime);
    }

    const needsForceRefresh = justUpdated || isNewBuild;

    // 1. Initial Sync on App Launch / Mount
    if (hasNotificationSupport && Notification.permission === 'granted' && currentUserId && !isManuallyDisabled && messaging) {
      if (needsForceRefresh) {
        console.log('[useNotifications] Forced refresh detected after SW update or new build.');
        localStorage.removeItem('sw_just_updated');
        requestPermissionAndGetToken(true);
      } else {
        // If an existing token is in localStorage, proactively ensure backend is in sync
        const existingToken = localStorage.getItem('fcmToken');
        if (existingToken) {
          syncTokenWithBackend(existingToken);
        }
        // Verify with Firebase / active Service Worker
        requestPermissionAndGetToken(false);
      }
    }

    // 2. Monitor Service Worker changes
    if ('serviceWorker' in navigator) {
      const handleControllerChange = async () => {
        console.log('[useNotifications] Service Worker controller changed (version update). Refreshing token...');
        localStorage.setItem('sw_just_updated', 'true');
        if (hasNotificationSupport && Notification.permission === 'granted' && !isManuallyDisabled) {
          await requestPermissionAndGetToken(true);
        }
      };

      const handleSWMessage = async (event) => {
        console.log('[useNotifications] Message received from Service Worker:', event.data);
        if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.path) {
          console.log('[useNotifications] Navigating to clicked notification path:', event.data.path);
          navigate(event.data.path);
          return;
        }
        if (event.data && event.data.type === 'SW_ACTIVATED') {
          console.log(`[useNotifications] New SW Version ${event.data.version} activated. Triggering token sync...`);
          localStorage.setItem('sw_just_updated', 'true');
          if (hasNotificationSupport && Notification.permission === 'granted' && !isManuallyDisabled) {
            await requestPermissionAndGetToken(true);
          }
        }
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          const needsRefresh = localStorage.getItem('sw_just_updated') === 'true';
          if (needsRefresh && hasNotificationSupport && Notification.permission === 'granted' && !isManuallyDisabled) {
            console.log('[useNotifications] App visible and SW update pending — refreshing FCM token...');
            localStorage.removeItem('sw_just_updated');
            requestPermissionAndGetToken(true);
          }
        }
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      console.log('[useNotifications] Service Worker listeners established.');

      let unsubscribe = () => {};
      if (messaging) {
        unsubscribe = onMessage(messaging, async (payload) => {
          console.log('Message received in foreground: ', payload);
          if ('Notification' in window && Notification.permission === 'granted') {
            const data = payload.data || {};
            const { unread, msgs, chatId, type } = data;

            // 1. Broadast to Store for InAppToast and UI updates
            if (type === 'CHAT' || type === 'EVENT' || type === 'DAILY' || type === 'ASSIGNMENT_MISSING') {
              messageStore.notifyListeners({ ...data, fromFCM: true });
            }

            // 2. Handle legacy unread counts for rooms
            if (unread && chatId) {
              let messageList = [];
              try {
                messageList = typeof msgs === 'string' ? JSON.parse(msgs) : (msgs || []);
              } catch (e) {
                messageList = msgs ? [msgs] : [];
              }

              const isIndicator = messageList.some(msg => 
                typeof msg === 'string' && msg.includes('/%20/indicator/%20/')
              );

              if (!isIndicator) {
                messageStore.setRoomUnreadCount(chatId, unread);
              }
            }
          }
        });
      }

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        unsubscribe();
      };
    }
  }, [userId]);

  return { fcmToken, permissionStatus, requestPermissionAndGetToken, disableNotifications, clearChatNotifications };
};

export const clearChatNotifications = async (chatId) => {
  if (!chatId || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const notifs = await reg.getNotifications();
    for (const notif of notifs) {
      const data = notif.data || {};
      const tag = notif.tag || '';
      if (
        data.chatId === chatId ||
        tag === `chat-${chatId}` ||
        tag === `room-${chatId}` ||
        tag === String(chatId) ||
        tag.startsWith(`mention-${chatId}-`) ||
        tag.startsWith(`reply-${chatId}-`)
      ) {
        notif.close();
      }
    }
  } catch (err) {
    console.warn('[clearChatNotifications] Error clearing notifications:', err);
  }
};
