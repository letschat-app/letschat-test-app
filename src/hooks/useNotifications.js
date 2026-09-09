import { useState, useEffect } from 'react';
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

export const useNotifications = () => {
  const [fcmToken, setFcmToken] = useState(localStorage.getItem('fcmToken'));
  const [permissionStatus, setPermissionStatus] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const userId = localStorage.getItem('userid');
  const navigate = useNavigate();

  const requestPermissionAndGetToken = async () => {
    console.log('[useNotifications] requestPermissionAndGetToken called...');
    try {
      if (!('Notification' in window)) {
        console.warn('[useNotifications] Notifications not supported in this browser.');
        setPermissionStatus('unsupported');
        return;
      }

      console.log('[useNotifications] Current permission:', Notification.permission);
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      console.log('[useNotifications] Permission result:', permission);

      if (permission === 'granted') {
        if ('serviceWorker' in navigator) {
          console.log('[useNotifications] Waiting for Service Worker to be ready...');
          const registration = await navigator.serviceWorker.ready;
          console.log('[useNotifications] Service Worker ready. Fetching FCM token...');

          let token;
          try {
            token = await getToken(messaging, {
              vapidKey: VAPID_KEY,
              serviceWorkerRegistration: registration
            });
          } catch (tokenErr) {
            // SILENT RETRY: If push service is busy (common during SW update), wait 1s and try once more
            if (tokenErr.message?.includes('push service error') || tokenErr.code?.includes('failed-service-worker-registration')) {
              console.log('[useNotifications] Push service busy, retrying in 1s...');
              await new Promise(r => setTimeout(r, 1000));
              token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
              });
            } else {
              throw tokenErr;
            }
          }

          if (token) {
            console.log('[useNotifications] FCM Token retrieved successfully:', token);
            setFcmToken(token);
            localStorage.setItem('fcmToken', token);
            localStorage.removeItem('notificationsDisabled'); // Clear manual disable flag on success
            if (userId) {
              console.log('[useNotifications] Syncing token with backend for user:', userId);
              await syncTokenWithBackend(token);
            } else {
              console.warn('[useNotifications] Token retrieved but no userId found. Skipping sync.');
            }
          } else {
            console.warn('[useNotifications] No FCM token returned from Firebase.');
          }
        } else {
          console.warn('[useNotifications] Service Workers not supported in this browser.');
        }
      }
    } catch (err) {
      console.error('[useNotifications] Error in requestPermissionAndGetToken:', err);
    }
  };

  const disableNotifications = async () => {
    console.log('[useNotifications] Disabling notifications...');
    try {
      if (fcmToken) {
        // Try to delete token, but don't crash if SW registration is missing (common on GH Pages)
        try {
          await deleteToken(messaging);
          console.log('[useNotifications] FCM Token deleted from Firebase successfully');
        } catch (fcmErr) {
          console.warn('[useNotifications] Could not delete FCM token from Firebase (likely SW mismatch), proceeding with local removal:', fcmErr.message);
        }
      }
      setFcmToken(null);
      localStorage.removeItem('fcmToken');
      localStorage.setItem('notificationsDisabled', 'true'); // Prevent auto-sync
      
      if (userId) {
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
    // Sync if granted but no token (or if we just updated the Service Worker)
    const isManuallyDisabled = localStorage.getItem('notificationsDisabled') === 'true';
    const justUpdated = localStorage.getItem('sw_just_updated') === 'true';

    if (Notification.permission === 'granted' && (!fcmToken || justUpdated) && userId && !isManuallyDisabled) {
      if (justUpdated) {
        console.log('[useNotifications] Forced refresh detected after SW update.');
        localStorage.removeItem('sw_just_updated');
      }
      requestPermissionAndGetToken();
    }

    // Monitor Service Worker changes
    if ('serviceWorker' in navigator) {
      const handleControllerChange = async () => {
        console.log('[useNotifications] Service Worker controller changed (version update). Refreshing token...');
        // Only auto-refresh if the user previously had notifications active
        const savedToken = localStorage.getItem('fcmToken');
        if (savedToken || Notification.permission === 'granted') {
          await requestPermissionAndGetToken();
        }
      };

      const handleSWMessage = async (event) => {
        console.log('[useNotifications] Message received from Service Worker:', event.data);
        if (event.data && event.data.type === 'SW_ACTIVATED') {
          console.log(`[useNotifications] New SW Version ${event.data.version} activated. Triggering token sync...`);
          await requestPermissionAndGetToken();
        }
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.addEventListener('message', handleSWMessage);

      console.log('[useNotifications] Service Worker listeners established.');

      const unsubscribe = onMessage(messaging, async (payload) => {
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

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
        unsubscribe();
      };
    }
  }, [userId, fcmToken]);

  return { fcmToken, permissionStatus, requestPermissionAndGetToken, disableNotifications };
};
