import { API } from './UserAuth';
import messageStore from '../pages/MessageStore';

const LAST_TIMESTAMP_KEY = 'system_broadcast_last_timestamp';

/**
 * SystemBroadcastService
 * Syncs System Broadcast Messages from REST API check endpoint,
 * applies 1-week alert suppression rule, and maps system messages
 * to the dedicated "Letschat" read-only chatbox (ID: BROADCAST_SYSTEM).
 */
export const checkSystemBroadcasts = async () => {
  const userId = localStorage.getItem('userid');
  if (!userId) return;

  const lastTimestamp = localStorage.getItem(LAST_TIMESTAMP_KEY);

  try {
    let url = `${API}/system/messages/check`;
    if (lastTimestamp) {
      url += `?lastTimestamp=${encodeURIComponent(lastTimestamp)}`;
    }

    let res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Id': userId,
        'ngrok-skip-browser-warning': 'true'
      }
    });

    // Fallback to /api/system/messages/check if /system/messages/check returns 404
    if (res.status === 404) {
      let fallbackUrl = `${API}/api/system/messages/check`;
      if (lastTimestamp) {
        fallbackUrl += `?lastTimestamp=${encodeURIComponent(lastTimestamp)}`;
      }
      res = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId,
          'ngrok-skip-browser-warning': 'true'
        }
      });
    }

    if (!res.ok) return;

    // Ensure BROADCAST_SYSTEM chat entry exists in chatsMap
    const cachedMap = JSON.parse(localStorage.getItem('chatsMap') || '{}');
    if (!cachedMap['BROADCAST_SYSTEM']) {
      cachedMap['BROADCAST_SYSTEM'] = {
        id: 'BROADCAST_SYSTEM',
        chatId: 'BROADCAST_SYSTEM',
        chatName: 'Letschat (System)',
        type: 'broadcast',
        isSystem: true,
        verified: true,
        profile: `${import.meta.env.BASE_URL}icon.png`
      };
      localStorage.setItem('chatsMap', JSON.stringify(cachedMap));
    } else {
      cachedMap['BROADCAST_SYSTEM'].profile = `${import.meta.env.BASE_URL}icon.png`;
      cachedMap['BROADCAST_SYSTEM'].chatName = 'Letschat (System)';
      cachedMap['BROADCAST_SYSTEM'].isSystem = true;
      localStorage.setItem('chatsMap', JSON.stringify(cachedMap));
    }

    const data = await res.json();
    if (!data || !data.hasNew || !Array.isArray(data.messages) || data.messages.length === 0) {
      if (data && data.latestTimestamp) {
        localStorage.setItem(LAST_TIMESTAMP_KEY, data.latestTimestamp);
      }
      return;
    }

    // Save latest timestamp
    if (data.latestTimestamp) {
      localStorage.setItem(LAST_TIMESTAMP_KEY, data.latestTimestamp);
    }

    // 1-Week Alert Suppression Rule (7 days in ms)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let hasRecentUnread = false;
    let recentUnreadCount = 0;

    data.messages.forEach(msg => {
      const createdAtMs = new Date(msg.createdAt || msg.created_at || Date.now()).getTime();
      const isOlderThan7Days = (now - createdAtMs) > SEVEN_DAYS_MS;

      const formattedMsg = {
        msgid: msg.msgId || msg.msgid || `SYS_BCAST_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        chatid: "BROADCAST_SYSTEM",
        sendername: "Letschat",
        userid: "SYSTEM_ADMIN",
        type: msg.type || "text",
        content: msg.type === "text" ? (msg.content || "") : (msg.content || ""),
        mediaUrl: msg.type !== "text" ? msg.content : null,
        caption: msg.caption || "",
        timestamp: msg.createdAt || msg.created_at || new Date().toISOString(),
        status: "delivered",
        isSystemBroadcast: true,
        isold: false
      };

      // Add message to MessageStore & IndexedDB
      messageStore.addMessage(formattedMsg);

      if (!isOlderThan7Days) {
        hasRecentUnread = true;
        recentUnreadCount++;
      }
    });

    // Update unread count for BROADCAST_SYSTEM if recent messages exist and chat is not open
    const currentActiveChat = messageStore.getActivechat();
    if (hasRecentUnread && currentActiveChat !== 'BROADCAST_SYSTEM') {
      const existingCount = messageStore.getSpaceCount('BROADCAST_SYSTEM', 0);
      messageStore.setCount('BROADCAST_SYSTEM', 0, existingCount + recentUnreadCount);
    }

  } catch (err) {
    console.warn('[SystemBroadcastService] Check error:', err);
  }
};

export const initSystemBroadcastSync = () => {
  try {
    const cachedMap = JSON.parse(localStorage.getItem('chatsMap') || '{}');
    if (!cachedMap['BROADCAST_SYSTEM']) {
      cachedMap['BROADCAST_SYSTEM'] = {
        id: 'BROADCAST_SYSTEM',
        chatId: 'BROADCAST_SYSTEM',
        chatName: 'Letschat (System)',
        type: 'broadcast',
        isSystem: true,
        verified: true,
        profile: `${import.meta.env.BASE_URL}icon.png`
      };
      localStorage.setItem('chatsMap', JSON.stringify(cachedMap));
    }
  } catch (e) {}

  // Check immediately on startup
  checkSystemBroadcasts();

  // Check on window focus and visibility change
  const handleFocusOrVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkSystemBroadcasts();
    }
  };

  window.addEventListener('focus', handleFocusOrVisibility);
  document.addEventListener('visibilitychange', handleFocusOrVisibility);

  return () => {
    window.removeEventListener('focus', handleFocusOrVisibility);
    document.removeEventListener('visibilitychange', handleFocusOrVisibility);
  };
};
