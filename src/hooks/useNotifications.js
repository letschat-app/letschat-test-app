import { useState, useEffect, useRef } from 'react';
import { messaging, getToken, onMessage, deleteToken } from '../service/firebase';
import { registerFCMToken, removeFCMToken } from '../service/UserAuth';
import { isChatMuted } from '../service/db';
import { useNavigate } from 'react-router-dom';
import messageStore from '../pages/MessageStore';
import { formatPushNotification } from '../sw/notificationFormat.js';

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

  const requestPermissionAndGetToken = async (forceRefresh = false, forceSync = false) => {
    if (isRefreshingRef.current) {
      console.log('[useNotifications] Token request already in progress, skipping duplicate call.');
      return null;
    }
    isRefreshingRef.current = true;
    console.log('[useNotifications] requestPermissionAndGetToken called with forceRefresh =', forceRefresh, 'forceSync =', forceSync);
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
              await syncTokenWithBackend(token, forceSync);
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

  const syncTokenWithBackend = async (token, force = false) => {
    try {
      const currentUserId = localStorage.getItem('userid') || userId;
      const deviceId = getOrCreateDeviceId();
      if (token) {
        if (!currentUserId) {
          console.warn('[useNotifications] Cannot sync token: No userId found in localStorage');
          return;
        }
        const lastSyncedToken = localStorage.getItem('lastSyncedToken');
        const lastSyncedAt = parseInt(localStorage.getItem('lastSyncedAt') || '0', 10);
        const lastSyncedUserId = localStorage.getItem('lastSyncedUserId');
        const sessionSynced = sessionStorage.getItem('fcm_session_synced') === 'true';
        const isExpired = Date.now() - lastSyncedAt > 4 * 60 * 60 * 1000;
        const needsSync = force || (token !== lastSyncedToken) || (currentUserId !== lastSyncedUserId) || !sessionSynced || isExpired;
        if (!needsSync) {
          return; // Already synced with backend
        }
        await registerFCMToken({ userId: currentUserId, deviceId, token });
        localStorage.setItem('lastSyncedToken', token);
        localStorage.setItem('lastSyncedUserId', currentUserId);
        sessionStorage.setItem('fcm_session_synced', 'true');
        localStorage.setItem('lastSyncedAt', String(Date.now()));
        console.log('[useNotifications] FCM Token registered for user:', currentUserId, 'device:', deviceId);
      } else {
        await removeFCMToken(deviceId);
        localStorage.removeItem('lastSyncedToken');
        localStorage.removeItem('lastSyncedAt');
        localStorage.removeItem('lastSyncedUserId');
        sessionStorage.removeItem('fcm_session_synced');
        console.log('FCM Token removed from backend for device:', deviceId);
      }
    } catch (err) {
      console.error('Failed to sync FCM token with backend', err);
    }
  };

    useEffect(() => {
    const hasNotificationSupport = typeof window !== 'undefined' && 'Notification' in window;
    const isManuallyDisabled = localStorage.getItem('notificationsDisabled') === 'true';
    const currentUserId = localStorage.getItem('userid') || userId;

    // 1. Initial Sync on App Launch / Mount (without tearing down token, forced backend sync)
    if (hasNotificationSupport && Notification.permission === 'granted' && currentUserId && !isManuallyDisabled && messaging) {
      requestPermissionAndGetToken(false, true);
    }

    // 2. Monitor Service Worker changes
    if ('serviceWorker' in navigator) {
      const handleControllerChange = async () => {
        console.log('[useNotifications] Service Worker controller changed. Verifying token...');
        if (hasNotificationSupport && Notification.permission === 'granted' && !isManuallyDisabled) {
          await requestPermissionAndGetToken(false, true);
        }
      };

      const handleSWMessage = async (event) => {
        if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.path) {
          console.log('[useNotifications] Navigating to clicked notification path:', event.data.path);
          navigate(event.data.path);
          return;
        }
        if (event.data && event.data.type === 'SW_ACTIVATED') {
          console.log(`[useNotifications] SW Version ${event.data.version} activated. Verifying token...`);
          if (hasNotificationSupport && Notification.permission === 'granted' && !isManuallyDisabled) {
            await requestPermissionAndGetToken(false, true);
          }
        }
      };

      let hiddenTimestamp = 0;
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          hiddenTimestamp = Date.now();
        } else if (document.visibilityState === 'visible') {
          if (hasNotificationSupport && Notification.permission === 'granted' && !isManuallyDisabled) {
            const wasLongHidden = hiddenTimestamp > 0 && (Date.now() - hiddenTimestamp > 5 * 60 * 1000);
            requestPermissionAndGetToken(false, wasLongHidden);
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

            // 1. Broadcast to Store for InAppToast and UI updates
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

            // 3. Foreground System Notification: Show notification UNLESS that particular chat is open
            try {
              const currentUserId = localStorage.getItem('userid');
              const senderId = data.senderId || data.senderid;

              // Don't notify self for own sent messages
              if (!senderId || senderId !== currentUserId) {
                const incomingChatId = chatId || data.chatId || data.chatid || data.roomid;
                const activeChatId = messageStore.getActivechatbox();
                const isPageVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
                const isPageFocused = typeof document !== 'undefined' && document.hasFocus && document.hasFocus();

                // Suppress ONLY if it is a chat message and the user is actively viewing that exact chat right now
                const isChatMessage = type === 'CHAT' || (!type && incomingChatId);
                const isViewingThisChat = isChatMessage && isPageVisible && isPageFocused && incomingChatId && activeChatId && (String(incomingChatId) === String(activeChatId));

                if (!isViewingThisChat) {
                  const isMuted = incomingChatId ? await isChatMuted(incomingChatId) : false;
                  if (!isMuted) {
                    const iconUrl = `${import.meta.env.BASE_URL}icon-notify.png`.replace(/\/+/g, '/');
                    const badgeUrl = `${import.meta.env.BASE_URL}badge-96.png`.replace(/\/+/g, '/');
                    const formatted = formatPushNotification(data, { icon: iconUrl, badge: badgeUrl });

                    const isSilent = data.silent === 'true';
                    let shouldAlert = !isSilent;
                    if (data.alertKind === 'mention' || data.alertKind === 'reply') {
                      shouldAlert = true;
                    }

                    const notifOptions = {
                      body: formatted.body || '',
                      icon: iconUrl,
                      badge: badgeUrl,
                      tag: formatted.tag || ('letschat-fg-' + Date.now()),
                      data: formatted.data || data || {},
                      renotify: Boolean(formatted.tag) && shouldAlert,
                      silent: !shouldAlert
                    };

                    if (shouldAlert) {
                      notifOptions.vibrate = [200, 100, 200];
                    }

                    if ('serviceWorker' in navigator) {
                      const reg = await navigator.serviceWorker.ready;
                      if (reg && reg.showNotification) {
                        await reg.showNotification(formatted.title, notifOptions);
                      }
                    } else if ('Notification' in window) {
                      new Notification(formatted.title, notifOptions);
                    }
                  }
                }
              }
            } catch (notifErr) {
              console.warn('[useNotifications] Error showing foreground notification:', notifErr);
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

// Safe unified logout cleanup (Item A4)
export const cleanupFCMOnLogout = async () => {
  const deviceId = localStorage.getItem('deviceId');
  if (deviceId) {
    try {
      await removeFCMToken(deviceId);
    } catch (err) {
      console.warn('[cleanupFCMOnLogout] Failed to remove FCM token from backend:', err);
    }
  }
  try {
    if (messaging) {
      await deleteToken(messaging);
    }
  } catch (err) {
    console.warn('[cleanupFCMOnLogout] deleteToken(messaging) failed:', err);
  }
  try {
    localStorage.removeItem('fcmToken');
    localStorage.removeItem('lastSyncedToken');
    localStorage.removeItem('lastSyncedAt');
    await clearFirebaseTokenDB();
  } catch (e) {}
};
