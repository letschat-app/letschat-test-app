import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getsocket, isSocketOpen, sendSafe } from "../service/Websocket";
import { API } from "../service/UserAuth";
import messageStore from "./MessageStore";
import { getMessagesFromDB, syncChatsMapToDB } from "../service/db";
import { getMediaInfo, getMediaBlob } from "../service/MediaCache";
import { getChatIcon, getChatColor } from "../service/ChatUtils";
import MediaViewer from "../components/chat/MediaViewer";
import Avatar from "../components/chat/Avatar";
import userDiscoveryStore from "../service/UserDiscoveryStore";
import { MoreVertical, Pin, Plus, Users, RefreshCcw, Check, X } from "lucide-react";
import { SIMULATION_ID } from "../service/SimulationScript";
import { usePWA } from "../context/PWAContext";
import { useEventMediator } from "../service/EventStorage";
import spaceStore from "../service/SpaceStore";

let loadedChats = {};



export const getchat = (chatid, spaceId = 0, timestampOverride = null, type = null) => {
  const loadKey = `${chatid}_${spaceId}`;
  const isLoaded = loadedChats[loadKey];
  const signal = isLoaded ? 'check-in' : 'load';

  console.log(`[getchat] ▶ signal="${signal}" | key=${loadKey} | socketOpen=${isSocketOpen()}`);

  const json = {
    purpose: signal,
    userchatId: chatid,
    usermsgId: spaceId
  };

  sendSafe(json);

  const socket = getsocket();
  const socketExists = socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING);

  if (!isLoaded && socketExists) {
    loadedChats[loadKey] = true;
    console.log(`[getchat] ✔ Marked ${loadKey} as loaded (signal: ${signal})`);
  } else if (!isLoaded) {
    console.warn(`[getchat] ⚠ Socket not ready — ${loadKey} NOT marked as loaded`);
  }
};


// ── ProfileAvatar: extracted outside ChatNames to prevent full remount on every parent re-render ──
const ProfileAvatar = React.memo(({ chat, isHovered, isOnline, onAvatarClick }) => (
  <Avatar
    chat={chat}
    isHovered={isHovered}
    onClick={onAvatarClick}
    showStatus={chat.type === 'private'}
    isOnline={isOnline}
  />
));

// ── Utility: resolve a message's timestamp to a numeric ms value ─────────────
// Used by sorting. Pre-attaching _ts avoids repeated Date parsing in comparators.
function resolveTimestamp(msg) {
  if (!msg) return 0;
  // Handle space-mapped last messages (pick the latest)
  if (typeof msg === 'object' && !msg.msgid && !msg.tempmsgid) {
    const timestamps = Object.values(msg).map(m => resolveTimestamp(m));
    return Math.max(0, ...timestamps);
  }
  const raw = msg._ts ?? msg.timestamp ?? msg.time ?? msg.createdAt ?? msg.sentAt ?? 0;
  if (typeof raw === 'number') return raw;
  const parsed = Date.parse(raw);
  return isNaN(parsed) ? 0 : parsed;
}

// ── Utility: Resolve total unread count from nested space counts ─────────────
function resolveTotalCount(chatCount) {
  if (!chatCount) return 0;
  if (typeof chatCount === 'number') return chatCount;
  return Object.values(chatCount).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
}

// ── ChatRow: memoized per-row component ──────────────────────────────────────
// Hover state lives HERE, not in the parent, so hovering one row does NOT
// cause any other rows to re-render. Critical for lists with 100+ chats.
const ChatRow = React.memo(function ChatRow({
  chat, msg, chatCount, isPinned, isActive,
  isDesktop, isOnline, userId,
  onChatClick, onTogglePin, onAvatarClick,
  formatTime, hideAvatar, hideMessage
}) {
  const [isHovered, setIsHovered] = useState(false);

  const handleAvatarClickBound = useCallback(
    (e) => onAvatarClick(e, chat),
    [onAvatarClick, chat]
  );

  const handleTogglePin = useCallback(
    (e) => onTogglePin(e, chat.chatId),
    [onTogglePin, chat.chatId]
  );

  // Derive message preview text — pure computation, no side effects
  let preview = 'No messages yet';
  if (msg) {
    const prefix = (msg.userid == userId) ? 'You: ' : (msg.sendername ? `${msg.sendername}: ` : '');
    let text = '';
    switch (msg.type) {
      case 'image': text = '📷 Photo'; break;
      case 'video': text = '🎥 Video'; break;
      case 'audio': text = '🎤 Audio'; break;
      case 'file': text = '📄 Document'; break;
      case 'assignment': text = '📚 Assignment'; break;
      default: {
        text = msg.content || '';
        // Strip mentions from preview
        text = text.replace(/<@\w+:([^>]+)>/g, '@$1');
        break;
      }
    }
    preview = prefix + text;
  }

  // Derive space info for the tag
  const activeSpaceForChat = useMemo(() => {
    if (isActive) {
      const params = new URLSearchParams(window.location.search);
      return parseInt(params.get('space')) || 0;
    }
    return 0;
  }, [isActive, window.location.search]);

  // Override preview if there's an unread mention
  const mentionSyntax = `<@${userId}:`;
  let hasUnreadMention = false;

  const totalUnread = typeof chatCount === 'object' 
    ? (isActive ? parseInt(chatCount[activeSpaceForChat]) || 0 : resolveTotalCount(chatCount))
    : (parseInt(chatCount) || 0);

  if (totalUnread > 0) {
    const messages = messageStore.getMessages(chat.chatId);
    if (messages && messages.length > 0) {
      const recentMsgs = messages.slice(-totalUnread);
      hasUnreadMention = recentMsgs.some(m => m.content?.includes(mentionSyntax));
    } else if (msg && msg.content?.includes(mentionSyntax)) {
      hasUnreadMention = true;
    }
  }

  if (hasUnreadMention) {
    preview = "@ You were mentioned";
  }

  const time = msg?._ts ?? msg?.timestamp ?? null;

  // --- Long Press for Pining (Mobile) ---
  const longPressTimer = React.useRef(null);
  const isLongPressActive = React.useRef(false);

  const handleTouchStart = React.useCallback((e) => {
    if (isDesktop) return;
    isLongPressActive.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressActive.current = true;
      onTogglePin(e, chat.chatId);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  }, [isDesktop, chat.chatId, onTogglePin]);

  const handleTouchEnd = React.useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = React.useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = (e) => {
    if (isLongPressActive.current) {
      return;
    }
    onChatClick();
  };



  const spaceName = useMemo(() => {
    if (activeSpaceForChat === 0) return null;
    return spaceStore.getSpaceName(chat.chatId, activeSpaceForChat);
  }, [chat.chatId, activeSpaceForChat]);

  // Use space-specific count if active
  const displayCount = useMemo(() => {
    if (isActive && typeof chatCount === 'object') {
      return parseInt(chatCount[activeSpaceForChat]) || 0;
    }
    return resolveTotalCount(chatCount);
  }, [chatCount, isActive, activeSpaceForChat]);

  // -------------------------------------
  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      style={{
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: isDesktop ? '15px' : '12px',
        padding: isDesktop ? '12px 16px' : '12px 14px',
        backgroundColor: isActive ? 'var(--nav-active-bg)' : isHovered ? 'var(--bg-secondary)' : 'transparent',
        borderBottom: isDesktop ? '1px solid var(--border-color)' : 'none',
        borderRadius: isDesktop ? '0' : '14px',
        transition: 'background-color 0.15s ease',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {!hideAvatar && (
        <ProfileAvatar
          chat={chat}
          isHovered={isHovered}
          isOnline={isOnline}
          onAvatarClick={handleAvatarClickBound}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{
            fontSize: isDesktop ? '16px' : '16px',
            fontWeight: isDesktop ? '500' : '600',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            {isPinned && (
              <Pin size={14} style={{ transform: 'rotate(45deg)', color: 'var(--accent-color)' }} />
            )}
            {chat.chatName}
            {spaceName && (
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#60a5fa',
                borderRadius: '4px',
                marginLeft: '4px',
                fontWeight: '700',
                textTransform: 'uppercase'
              }}>
                {spaceName}
              </span>
            )}
          </span>
          <span style={{
            fontSize: '12px',
            color: displayCount > 0 ? 'var(--accent-color)' : 'var(--text-secondary)',
            opacity: 0.8,
            fontWeight: displayCount > 0 ? '600' : '400',
          }}>
            {formatTime(time)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {!hideMessage && (
            <span style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              opacity: 0.8,
            }}>
              {preview}
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDesktop && isHovered && (
              <button
                onClick={handleTogglePin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={isPinned ? 'Unpin chat' : 'Pin chat'}
              >
                <Pin size={16} style={{
                  transform: isPinned ? 'rotate(0deg)' : 'rotate(45deg)',
                  color: isPinned ? 'var(--accent-color)' : 'inherit',
                }} />
              </button>
            )}
            {displayCount > 0 && (
              <div style={{
                minWidth: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 6px',
                flexShrink: 0,
              }}>
                <span style={{ color: 'white', fontWeight: '700', fontSize: '11px' }}>
                  {displayCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

function ChatNames({ isDesktop = false, activeChatRoute = "", hideTitle = false }) {
  const { deferredPrompt, isInstalled, installApp } = usePWA();
  const [chatNames, setChatNames] = useState([]);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastMessages, setLastMessages] = useState({});
  const [count, setCount] = useState({});
  // hoveredIdx removed — hover state now lives inside ChatRow
  const [activeTab, setActiveTab] = useState('All');
  const [viewingMedia, setViewingMedia] = useState(null);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [pinnedChats, setPinnedChats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pinnedChats') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [discoveredUsers, setDiscoveredUsers] = useState(userDiscoveryStore.users);
  const navigate = useNavigate();
  const [visited, setVisited] = useState(() => {
    return JSON.parse(localStorage.getItem("visited") || "{}");
  });
  const [selectedChatForSpaces, setSelectedChatForSpaces] = useState(null);
  const { events: allEvents } = useEventMediator();
  const [spacesCache, setSpacesCache] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('spacesCache') || '{}');
    } catch (e) {
      return {};
    }
  });
  const hasAutoOpenedRef = useRef(false);
  const prevRouteRef = useRef(activeChatRoute);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [isAddingSpace, setIsAddingSpace] = useState(false);
  const [spaceLastMessages, setSpaceLastMessages] = useState({});

  useEffect(() => {
    if (selectedChatForSpaces) {
      const chatId = selectedChatForSpaces.chatId;
      selectedChatForSpaces.spaces.forEach(async (space) => {
        const storeMsg = messageStore.getSpaceLastMessage(chatId, space.id);
        if (!storeMsg) {
          try {
            const dbMsgs = await getMessagesFromDB(chatId, 1, null, space.id);
            if (dbMsgs && dbMsgs.length > 0) {
              setSpaceLastMessages(prev => ({...prev, [`${chatId}_${space.id}`]: dbMsgs[dbMsgs.length - 1]}));
            }
          } catch(e) { console.error("Error fetching space last msg", e); }
        }
      });
    }
  }, [selectedChatForSpaces]);

  useEffect(() => {
    const loader = document.getElementById('pwa-splash-loader');
    if (loader && !loader.classList.contains('fade-out')) {
      loader.classList.add('fade-out');
      setTimeout(() => loader.remove(), 300);
    }
  }, []);

  // Helper to persist spacesCache
  useEffect(() => {
    localStorage.setItem('spacesCache', JSON.stringify(spacesCache));
  }, [spacesCache]);

  // ── Stable Refs ──────────────────────────────────────────────────────────
  const isMounted = useRef(true);
  // Debounce timer map — lives in a ref so it persists across renders
  const lsWriteTimersRef = useRef({});

  useEffect(() => {
    const unsubscribe = userDiscoveryStore.subscribe(setDiscoveredUsers);
    if (!userDiscoveryStore.isLoaded) {
      userDiscoveryStore.fetchUsers();
    }
    return unsubscribe;
  }, []);

  const location = useLocation();

  // Walkthrough flag — read once per session, never changes mid-session
  const walkthroughCompleted = useMemo(
    () => localStorage.getItem("walkthrough_completed") === "true",
    []
  );

  // userId cached in a ref — avoids repeated localStorage.getItem('userid') calls
  const userIdRef = useRef(localStorage.getItem('userid'));

  // onlineStatuses ref — keeps polling closure fresh without adding it to deps
  const onlineRef = useRef(onlineStatuses);
  useEffect(() => { onlineRef.current = onlineStatuses; }, [onlineStatuses]);

  // pinnedChats as a Set — O(1) .has() lookup vs O(n) .includes() in sort/filter
  const pinnedSet = useMemo(() => new Set(pinnedChats), [pinnedChats]);

  // Debounced localStorage writer — stable across renders (no dep changes)
  const scheduleLocalStorageWrite = useCallback((key, value) => {
    clearTimeout(lsWriteTimersRef.current[key]);
    lsWriteTimersRef.current[key] = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(value));
    }, 300);
  }, []);

  // Stable avatar click handler — avoids re-creating per render inside map()
  const handleAvatarClick = useCallback(async (e, chat) => {
    e.stopPropagation();
    if (!chat.profile) return;
    try {
      const info = await getMediaInfo(chat.profile);
      const fullUrl = await getMediaBlob(chat.profile + '_full', info.fileKey, 'mainCache');
      if (isMounted.current) setViewingMedia({
        fileUrl: fullUrl || `${API}/files/get-url/${chat.profile}`,
        fileName: chat.chatName,
        fileType: 'image'
      });
    } catch {
      if (isMounted.current) setViewingMedia({
        fileUrl: `${API}/files/get-url/${chat.profile}`,
        fileName: chat.chatName,
        fileType: 'image'
      });
    }
  }, []);

  // Mark unmounted so async callbacks don't setState after cleanup
  useEffect(() => () => { isMounted.current = false; }, []);

  // ── Guard: redirect if not logged in — runs ONCE on mount ────────────────
  useEffect(() => {
    if (!userIdRef.current) navigate("/login");
  }, []);
  useEffect(() => {
    // ── Helper: safe localStorage read ───────────────────────────────────
    const readLS = (key) => {
      try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
    };

    // ── Hydrate state from messageStore + localStorage on mount ───────────
    const storeLastMsgs = messageStore.getLastMessage() || {};
    const storedLastMsgs = readLS('lastMessages');
    const initialLastMsgs = { ...storedLastMsgs };
    Object.keys(storeLastMsgs).forEach(chatId => {
      if (storeLastMsgs[chatId] && storeLastMsgs[chatId] !== 0)
        initialLastMsgs[chatId] = storeLastMsgs[chatId];
    });
    setLastMessages(initialLastMsgs);

    const storeCounts = messageStore.getCount() || {};
    const storedCounts = readLS('messageCounts');
    const initialCounts = { ...storedCounts };
    Object.keys(storeCounts).forEach(chatId => {
      if (storeCounts[chatId] != null) initialCounts[chatId] = storeCounts[chatId];
    });
    setCount(initialCounts);
    scheduleLocalStorageWrite('messageCounts', initialCounts);

    // ── Real-time listener: batches both state updates in one callback ─────
    const unsubscribe = messageStore.addListener(() => {
      if (!isMounted.current) return;

      const lastMsgs = messageStore.getLastMessage() || {};
      const counts = messageStore.getCount() || {};

      // Merge with current state — never overwrite with null/0
      // Attach _ts on insert so sort never calls new Date() again
      setLastMessages(prev => {
        const merged = { ...prev };
        Object.keys(lastMsgs).forEach(chatId => {
          if (lastMsgs[chatId] && lastMsgs[chatId] !== 0) {
            const m = lastMsgs[chatId];
            merged[chatId] = m._ts != null ? m : { ...m, _ts: resolveTimestamp(m) };
          }
        });
        scheduleLocalStorageWrite('lastMessages', merged);
        return merged;
      });

      setCount(prev => {
        const merged = { ...prev };
        Object.keys(counts).forEach(chatId => {
          if (counts[chatId] != null) merged[chatId] = counts[chatId];
        });
        scheduleLocalStorageWrite('messageCounts', merged);
        return merged;
      });
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [scheduleLocalStorageWrite]);

  useEffect(() => {
    const userId = userIdRef.current;
    const cachedChats = (() => {
      try { return JSON.parse(localStorage.getItem("chatsMap") || '{}'); } catch { return {}; }
    })();
    // Deduplicate on hydrate
    const uniqueCached = Object.values(cachedChats);
    setChatNames(uniqueCached);

    // Batch size of 5 — conservative limit for low-end devices (0.5GB RAM)
    // Avoids IDB thread saturation while still beating sequential reads
    const BATCH_SIZE = 5;
    const loadIDBMsgs = async (chats, signal) => {
      if (!isMounted.current) return;
      const dbLastMsgs = {};
      for (let i = 0; i < chats.length; i += BATCH_SIZE) {
        if (signal?.aborted || !isMounted.current) return;
        const batch = chats.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(chat => getMessagesFromDB(chat.chatId, 1, 0))
        );
        results.forEach((msgs, idx) => {
          if (msgs?.length > 0) {
            const m = msgs[0];
            // Attach _ts once at load time — sort never calls new Date() again
            dbLastMsgs[batch[idx].chatId] = m._ts != null ? m : { ...m, _ts: resolveTimestamp(m) };
          }
        });
      }
      if (!isMounted.current || signal?.aborted) return;
      setLastMessages(prev => {
        const merged = { ...prev, ...dbLastMsgs };
        scheduleLocalStorageWrite('lastMessages', merged);
        return merged;
      });
    };

    const controller = new AbortController();

    // Fetch offline immediately
    loadIDBMsgs(Object.values(cachedChats), controller.signal);

    if (import.meta.env.DEV) console.log("Fetching chat names");
    fetch(`${API}/user/chatbox/${userId}`, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      }
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted.current) return;

        // Deduplicate data by chatId to prevent UI duplicates
        const uniqueData = Array.from(new Map(data.map(item => [item.chatId, item])).values());
        setChatNames(uniqueData);

        // Refresh with latest items
        loadIDBMsgs(uniqueData, controller.signal);

        const chatsMap = {};
        uniqueData.forEach(chat => {
          chatsMap[chat.chatId] = chat;
          if (chat.type === 'classroom') {
            getcount(chat.chatId);
          }
        });
        localStorage.setItem("chatsMap", JSON.stringify(chatsMap));
        syncChatsMapToDB(chatsMap);
      })
      .catch(err => {
        if (err.name === 'AbortError') return; // expected on unmount
        if (import.meta.env.DEV) console.error(err.message);
        if (isMounted.current) setChatNames(Object.values(cachedChats));
      });

    return () => controller.abort();
  }, []);

  // ── Online Status Polling — pauses when tab is hidden ───────────────────
  useEffect(() => {
    let timerId = null;
    let isActive = false;

    const scheduleNext = (delay) => {
      if (!isActive) return;
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(runPoll, delay);
    };

    const runPoll = async () => {
      if (!isActive || !isMounted.current) return;

      if (!navigator.onLine) {
        if (import.meta.env.DEV) console.log("[StatusPoll] Offline, retrying in 10s");
        scheduleNext(10000);
        return;
      }

      const privateIdList = chatNames
        .filter(chat => chat.type === 'private' && (chat.id || chat.userId || chat.userIds?.[0]))
        .map(chat => chat.id || chat.userId || chat.userIds?.[0]);

      if (privateIdList.length === 0) {
        scheduleNext(10000);
        return;
      }

      if (import.meta.env.DEV) console.log("[StatusPoll] ChatNames polling for", privateIdList.length, "contacts");

      try {
        const res = await fetch(`${API}/user/check-status`, {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
            "User-Id": localStorage.getItem('userid')
          },
          body: JSON.stringify(privateIdList)
        });

        if (res.ok) {
          const statusMap = await res.json();
          const now = new Date().toISOString();
          Object.keys(statusMap).forEach(uid => {
            if (statusMap[uid] === false && onlineRef.current[uid] === true)
              localStorage.setItem(`lastSeen_${uid}`, now);
          });
          if (isMounted.current) {
            setOnlineStatuses(prev => ({ ...prev, ...statusMap }));
            messageStore.updateOnlineStatuses(statusMap);
          }
          scheduleNext(60000); // 1 min timer on success
        } else {
          scheduleNext(10000); // 10s timer on server error
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Failed to fetch online statuses:", err);
        scheduleNext(10000); // 10s timer on network error
      }
    };

    const start = () => {
      if (isActive) return;
      isActive = true;
      runPoll();
    };

    const stop = () => {
      isActive = false;
      if (timerId) { clearTimeout(timerId); timerId = null; }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Initial sync from global store
    if (isMounted.current) {
      setOnlineStatuses(prev => ({ ...prev, ...messageStore.onlineStatuses }));
    }

    const handleGlobalStatusUpdate = (update) => {
      if (!update || !isMounted.current) return;
      if (update.type === 'onlineStatusUpdate') {
        setOnlineStatuses(prev => ({ ...prev, ...update.statusMap }));
      } else if (update.type === 'unknown_chat') {
        if (import.meta.env.DEV) console.log("[ChatNames] Syncing chatbox for unknown chatid:", update.chatid);
        const userId = userIdRef.current || localStorage.getItem('userid');
        if (userId) {
          fetch(`${API}/user/chatbox/${userId}`, {
            headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" }
          })
            .then(res => res.json())
            .then(data => {
              if (!isMounted.current) return;
              const uniqueData = Array.from(new Map(data.map(item => [item.chatId, item])).values());
              setChatNames(uniqueData);
              const chatsMap = {};
              uniqueData.forEach(chat => { chatsMap[chat.chatId] = chat; });
              localStorage.setItem("chatsMap", JSON.stringify(chatsMap));
              syncChatsMapToDB(chatsMap);
            })
            .catch(err => {
              if (import.meta.env.DEV) console.error("Sync failed:", err);
            });
        }
      }
    };
    messageStore.addListener(handleGlobalStatusUpdate);

    if (chatNames.length > 0) start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
      messageStore.removeListener(handleGlobalStatusUpdate);
    };
  }, [chatNames]);

  const getcount = async (chatid) => {
    // Parse visited once — avoids repeated localStorage.getItem inside
    const visitedFromStorage = (() => {
      try { return JSON.parse(localStorage.getItem("visited") || '{}'); } catch { return {}; }
    })();
    if (isMounted.current) setVisited(visitedFromStorage);
    const date = new Date(visitedFromStorage[chatid]);
    const offset = 5.5 * 60; // +5:30 in minutes
    const localTime = new Date(date.getTime() + offset * 60 * 1000);
    const time = localTime.toISOString().slice(0, 19);

    if (!isMounted.current) return;
    const res = await fetch(`${API}/classroom/count`, {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        "chatid": chatid,
        "timestamp": time,
      }
    });
    const respone = await res.text();
    const count1 = Number(respone);

    if (!isMounted.current) return;

    const existingCounts = JSON.parse(localStorage.getItem('messageCounts') || '{}');
    existingCounts[chatid] = count1;
    localStorage.setItem('messageCounts', JSON.stringify(existingCounts));

    setCount(prev => ({ ...prev, [chatid]: count1 }));

    if (count1 !== 0) {
      if (!isMounted.current) return;
      const res2 = await fetch(`${API}/classroom/getlast`, {
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          "chatid": chatid,
          "timestamp": time,
        }
      });
      const lastmsg = await res2.json();
      if (!lastmsg || !isMounted.current) return;

      const existingMessages = JSON.parse(localStorage.getItem('lastMessages') || '{}');
      existingMessages[chatid] = lastmsg;
      localStorage.setItem('lastMessages', JSON.stringify(existingMessages));

      setLastMessages(prev => ({ ...prev, [chatid]: lastmsg }));
    }
  };

  const sortedAndFilteredChats = useMemo(() => {
    // Precompute once — avoids calling toLowerCase() twice per chat item in the filter
    const lowerSearch = searchQuery.toLowerCase();

    let filtered = chatNames.filter(chat =>
      (chat.chatName.toLowerCase().includes(lowerSearch) ||
        chat.chatId.toString().includes(searchQuery)) &&
      chat.type !== 'room' &&
      !messageStore.isVolatile(chat.chatId)
    );

    // Inject Walkthrough Guide if not completed (walkthroughCompleted computed once at mount)
    if (!walkthroughCompleted && !searchQuery) {
      const guideChat = {
        chatId: SIMULATION_ID,
        chatName: "LetsChat Guide 🤖",
        type: "guide",
        isSimulation: true
      };
      // Check if it's already in filtered (shouldn't be, but safe check)
      if (!filtered.some(c => c.chatId === SIMULATION_ID)) {
        filtered.unshift(guideChat);
      }
    }

    // Tab filtering
    if (activeTab === 'Unread') {
      filtered = filtered.filter(chat => resolveTotalCount(count[chat.chatId]) > 0);
    } else if (activeTab === 'Groups') {
      filtered = filtered.filter(chat => chat.type === 'group');
    } else if (activeTab === 'Classroom') {
      filtered = filtered.filter(chat => chat.type === 'classroom');
    }
    // 'All' shows everything

    filtered.sort((a, b) => {
      // O(1) Set lookup instead of O(n) Array.includes
      const isPinnedA = pinnedSet.has(a.chatId);
      const isPinnedB = pinnedSet.has(b.chatId);

      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;

      // Use precomputed _ts — avoids Date parsing on every comparison
      const timeA = lastMessages[a.chatId]?._ts ?? 0;
      const timeB = lastMessages[b.chatId]?._ts ?? 0;

      return timeB - timeA;
    });

    return filtered;
  }, [chatNames, searchQuery, lastMessages, activeTab, count, pinnedSet]);

  const tabCounts = useMemo(() => {
    // walkthroughCompleted is a stable useMemo at component level — no localStorage read here
    const guideBonus = !walkthroughCompleted ? 1 : 0;

    return {
      All: chatNames.filter(c => c.type !== 'room' && !messageStore.isVolatile(c.chatId)).length + guideBonus,
      Unread: chatNames.filter(c => resolveTotalCount(count[c.chatId]) > 0 && c.type !== 'room' && !messageStore.isVolatile(c.chatId)).length,
      Groups: chatNames.filter(c => c.type === 'group' && !messageStore.isVolatile(c.chatId)).length,
      Classroom: chatNames.filter(c => (c.type === 'classroom' || c.type === 'subject') && !messageStore.isVolatile(c.chatId)).length,
    };
  }, [chatNames, count]);



  function formatChatTime(timestamp) {
    if (!timestamp) return "-- / --";

    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    // 1. < 60 seconds
    if (diffInSeconds < 60) {
      return "Just now";
    }

    // 2. < 60 minutes
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      return `${mins} min ago`;
    }

    // 3. < 24 hours
    if (diffInSeconds < 86400) {
      return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    // 4. < 7 days
    if (diffInSeconds < 604800) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }

    // 5. < 30 days
    if (diffInSeconds < 2592000) {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });
    }

    // 6. >= 30 days
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  const renderPeopleYouMayKnow = () => {
    if (discoveredUsers.length === 0) return null;
    const randomUsers = userDiscoveryStore.getRandomUsers(20);
    if (randomUsers.length === 0) return null;

    return (
      <div style={{
        margin: '16px',
        padding: '16px',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(59, 130, 246, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Users size={16} color="#60a5fa" />
            People you may know
          </h3>
          <button
            onClick={() => userDiscoveryStore.fetchUsers(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Refresh recommendations"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '12px',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          {randomUsers.map(user => (
            <div
              key={user.userId}
              onClick={() => navigate('/discover')} // Assuming navigation to discover for chat
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                minWidth: '56px',
                cursor: 'pointer'
              }}
            >
              <Avatar
                chat={user}
                size={40}
              />
              <span style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user.userName}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };


  const update = useCallback((chatid, timestamp = Date.now()) => {
    setVisited(prev => {
      const updated = { ...prev, [chatid]: timestamp };
      // Debounced write — visited updates on every chat click, must not block
      scheduleLocalStorageWrite('visited', updated);
      return updated;
    });
  }, [scheduleLocalStorageWrite]);

  const togglePin = useCallback((e, chatId) => {
    e.stopPropagation();
    setPinnedChats(prev => {
      const updated = prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId];
      // togglePin is user-initiated (rare), direct write is fine here
      localStorage.setItem('pinnedChats', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleChatClick = useCallback(async (chat, shouldNavigate = true) => {
    if (chat.type === 'classroom') {
      const spaces = [
        { id: 0, name: "Announcements", icon: "📢" },
        { id: 1, name: "Assignments", icon: "📝" },
        { id: 2, name: "Q&A Discussion", icon: "💬" }
      ];
      setSelectedChatForSpaces({ ...chat, spaces });
    } else {
      // Show from cache immediately if exists, else default Main
      let initialSpaces = spacesCache[chat.chatId] || [{ id: 0, name: "Main", icon: "💬" }];
      setSelectedChatForSpaces({ ...chat, spaces: initialSpaces });

      try {
        const res = await fetch(`${API}/user/get-space/${chat.chatId}`, {
          headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" }
        });
        if (res.ok) {
          const data = await res.json();
          // API returns list of { chatId, spaceId, spaceName }
          if (data) {
            let fetchedSpaces = data.map(s => ({
              id: s.spaceId,
              name: s.spaceName,
              icon: s.spaceId === 0 ? "💬" : "📌"
            }));

            if (!fetchedSpaces.some(s => s.id === 0)) {
              fetchedSpaces = [{ id: 0, name: "Main", icon: "💬" }, ...fetchedSpaces];
            }

            // update cache
            setSpacesCache(prev => ({ ...prev, [chat.chatId]: fetchedSpaces }));

            // update currently selected chat if it's still the same
            setSelectedChatForSpaces(prev => {
              if (prev && prev.chatId === chat.chatId) {
                return { ...prev, spaces: fetchedSpaces };
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch spaces:", err);
      }
    }

    // Auto-navigate to space 0 on desktop
    if (isDesktop && shouldNavigate) {
      navigate(`/chat/${chat.chatId}?space=0`);
    }
  }, [spacesCache, isDesktop, navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    let targetChatId = location.state?.showSpacesForChat || searchParams.get('showSpacesForChat');
    
    // If not in state, try to get it from the active route on initial load/refresh
    if (!targetChatId && activeChatRoute?.startsWith('/chat/') && !hasAutoOpenedRef.current) {
      const parts = activeChatRoute.split('/');
      if (parts.length >= 3) {
        targetChatId = parts[2].split('?')[0]; // Strip any query params
      }
      hasAutoOpenedRef.current = true;
    }

    if (targetChatId && chatNames.length > 0) {
      if (!selectedChatForSpaces || String(selectedChatForSpaces.chatId) !== String(targetChatId)) {
        const chat = chatNames.find(c => String(c.chatId) === String(targetChatId));
        if (chat) {
          // Use handleChatClick to ensure dynamic spaces are fetched correctly
          // Pass false to avoid redundant navigation if we're already there
          handleChatClick(chat, false);
        }
      }
      
      // Clear state to avoid sticky behavior if it came from location.state or query param
      if (location.state?.showSpacesForChat || searchParams.get('showSpacesForChat')) {
        navigate('/chats', { replace: true });
      }
    } else if (!targetChatId && selectedChatForSpaces && !activeChatRoute?.startsWith('/chat/')) {
      // Clear the space selection when navigating back to the main chat list ONLY IF we actually navigated back from a chat route
      if (prevRouteRef.current?.startsWith('/chat/')) {
        setSelectedChatForSpaces(null);
      }
    }
    
    // Update ref for next render
    prevRouteRef.current = activeChatRoute;
  }, [location.state, activeChatRoute, chatNames, handleChatClick, selectedChatForSpaces]);

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim() || !selectedChatForSpaces) {
      setIsCreatingSpace(false);
      return;
    }
    setIsAddingSpace(true);

    const spaces = selectedChatForSpaces.spaces || [];
    const highestId = spaces.reduce((max, s) => Math.max(max, s.id), 0);
    const newSpaceId = highestId + 1;

    try {
      const res = await fetch(`${API}/user/add-space`, {
        method: 'POST',
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({
          chatId: selectedChatForSpaces.chatId,
          spaceId: newSpaceId,
          spaceName: newSpaceName.trim()
        })
      });
      if (res.ok) {
        const newSpace = { id: newSpaceId, name: newSpaceName.trim(), icon: "📌" };
        const updatedSpaces = [...spaces, newSpace];

        setSpacesCache(prev => ({ ...prev, [selectedChatForSpaces.chatId]: updatedSpaces }));
        setSelectedChatForSpaces(prev => ({ ...prev, spaces: updatedSpaces }));
      } else {
        alert("Failed to create space");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setIsAddingSpace(false);
      setIsCreatingSpace(false);
      setNewSpaceName("");
    }
  };

  const handleSpaceClick = useCallback((chat, space) => {
    navigate(`/chat/${chat.chatId}?space=${space.id}`);
    update(chat.chatId);
    messageStore.setActivechatbox(chat.chatId);
    localStorage.setItem(chat.chatId, JSON.stringify(chat));
    // Zero only the specific space count
    messageStore.setCount(chat.chatId, space.id);
    setCount(messageStore.getCount());
  }, [navigate, update]);

  // ProfileAvatar is defined outside this component (see top of file) — handleAvatarClick is stable via useCallback

  return (
    <div className="hide-scrollbar" style={{
      width: '100%',
      padding: isDesktop ? "0" : "8px 0",
      paddingTop: isDesktop ? "0" : "26px",
      paddingBottom: isDesktop ? "0" : "80px",
      minHeight: isDesktop ? "100%" : "100vh",
      height: isDesktop ? "100%" : "auto",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflowX: 'hidden',
      backgroundColor: isDesktop ? 'var(--bg-card)' : 'var(--bg-gradient)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {isDesktop && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          height: '60px',
          boxSizing: 'border-box'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: '800',
            letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, var(--accent-color) 0%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>LetsChat</h3>
          <div style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)' }}>
            <button
              onClick={() => {
                // Dispatch a custom event to open the navbar menu
                window.dispatchEvent(new CustomEvent('open-navbar-menu'));
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className="hover-bg"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
      )}

      <div style={{
        maxWidth: isDesktop ? "100%" : "1200px",
        width: '100%',
        margin: "0 auto",
        boxSizing: 'border-box',
        padding: isDesktop ? '12px' : '0 12px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Search Container */}
        <div style={{
          marginBottom: isDesktop ? "12px" : "12px",
          position: "relative",
          width: "100%",
        }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isDesktop ? 'var(--bg-secondary)' : '#1a1a1a',
            borderRadius: '8px',
            padding: '0 12px'
          }}>
            <svg
              style={{
                width: "20px",
                height: "20px",
                pointerEvents: "none",
                color: '#808080'
              }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder={isDesktop ? "Search or start new chat" : "Search chats by name or ID..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                backgroundColor: 'transparent',
                border: "none",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* PWA Install Button (for checking) */}
        {deferredPrompt && !isInstalled && (
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={installApp}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>📲</span>
              <span>Install LetsChat App</span>
            </button>
          </div>
        )}

        {/* Tabs — shown on both desktop and mobile */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: isDesktop ? '16px' : '12px', overflowX: 'auto', paddingBottom: '4px' }} className="hide-scrollbar">
          {['All', 'Unread', 'Groups', 'Classroom'].map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '16px',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                  color: isActive ? '#60a5fa' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid var(--border-color)',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{
            padding: "12px 16px",
            backgroundColor: "#2d1515",
            color: "#ff6b6b",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #4a2020"
          }}>
            {error}
          </div>
        )}

        {selectedChatForSpaces ? (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, overflowY: 'auto' }}>
            <div style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '8px'
            }}>
              <button
                onClick={() => setSelectedChatForSpaces(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-color)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ← Back
              </button>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedChatForSpaces.type === 'private') {
                    navigate('/profileupdate', { state: { user: selectedChatForSpaces } });
                  } else {
                    navigate(`/chat/${selectedChatForSpaces.chatId}`, { state: { openInfo: true } });
                  }
                }}
              >
                <Avatar chat={selectedChatForSpaces} size={36} />
                <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>
                  {selectedChatForSpaces.chatName}
                </span>
              </div>
            </div>
            {selectedChatForSpaces.spaces.map((space) => {
              const memoryMsg = messageStore.getSpaceLastMessage(selectedChatForSpaces.chatId, space.id);
              let spaceLastMsg = memoryMsg || spaceLastMessages[`${selectedChatForSpaces.chatId}_${space.id}`];
              
              if (!spaceLastMsg && space.id === 0) {
                 const lMsg = lastMessages[selectedChatForSpaces.chatId];
                 spaceLastMsg = lMsg ? (lMsg.msgid || lMsg.tempmsgid || lMsg.timestamp ? lMsg : lMsg[0]) : null;
              }

              const spaceCount = messageStore.getSpaceCount(selectedChatForSpaces.chatId, space.id);

              const spaceChat = {
                ...selectedChatForSpaces,
                chatName: space.name,
                chatId: `${selectedChatForSpaces.chatId}_${space.id}`,
                icon: space.icon,
                isSpace: true
              };

              return (
                <ChatRow
                  key={space.id}
                  chat={spaceChat}
                  msg={spaceLastMsg}
                  chatCount={spaceCount}
                  isPinned={false}
                  isActive={activeChatRoute?.includes(`/chat/${selectedChatForSpaces.chatId}`) && activeChatRoute?.includes(`space=${space.id}`)}
                  isDesktop={isDesktop}
                  isOnline={false}
                  userId={userIdRef.current}
                  onChatClick={() => handleSpaceClick(selectedChatForSpaces, space)}
                  onTogglePin={() => { }}
                  onAvatarClick={() => { }}
                  formatTime={formatChatTime}
                  hideAvatar={true}
                />
              );
            })}

            {/* Create Space Row - Hidden for Classrooms */}
            {selectedChatForSpaces.type !== 'classroom' && (
              isCreatingSpace ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 16px',
                  marginTop: '4px'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-color)'
                  }}>
                    <Plus size={20} />
                  </div>
                  <input
                    type="text"
                    value={newSpaceName}
                    onChange={(e) => setNewSpaceName(e.target.value)}
                    placeholder="Enter space name..."
                    autoFocus
                    disabled={isAddingSpace}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSpace();
                      if (e.key === 'Escape') {
                        setIsCreatingSpace(false);
                        setNewSpaceName("");
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={handleCreateSpace}
                    disabled={isAddingSpace || !newSpaceName.trim()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: newSpaceName.trim() ? '#10b981' : 'var(--text-secondary)',
                      cursor: newSpaceName.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px'
                    }}
                  >
                    <Check size={20} />
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingSpace(false);
                      setNewSpaceName("");
                    }}
                    disabled={isAddingSpace}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px'
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    marginTop: '4px'
                  }}
                  onClick={() => setIsCreatingSpace(true)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-color)'
                  }}>
                    <Plus size={20} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-color)' }}>
                    Create a new space
                  </span>
                </div>
              )
            )}

            {/* Upcoming Events Section */}
            {(() => {
              const chatEvents = [];
              const now = new Date();
              Object.values(allEvents).forEach(dateGroup => {
                dateGroup.forEach(evt => {
                  if (String(evt.chatid) === String(selectedChatForSpaces.chatId)) {
                    const evtDate = new Date(evt.date);
                    if (evtDate >= now) chatEvents.push(evt);
                  }
                });
              });

              if (chatEvents.length === 0) return null;

              return (
                <div style={{ marginTop: '24px', padding: '0 16px' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    Upcoming Events
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {chatEvents.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3).map(evt => (
                      <div
                        key={evt.id}
                        onClick={() => navigate('/calendar', { state: { selectedEventDate: evt.date } })}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '10px',
                          borderLeft: `3px solid ${evt.color || 'var(--accent-color)'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, background-color 0.2s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {evt.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {new Date(evt.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {evt.startTime}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : sortedAndFilteredChats.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#808080",
            fontSize: "15px"
          }}>
            {searchQuery ? "No chats found matching your search" : "No chats available"}
          </div>
        ) : (
          <div className="hide-scrollbar" style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            boxSizing: 'border-box',
            flex: 1,
            overflowY: 'auto'
          }}>
            {sortedAndFilteredChats.map((chat) => {
              const storeMsg = chat.type === 'classroom'
                ? messageStore.getSpaceLastMessage(chat.chatId, 0)
                : messageStore.getChatLastMessage(chat.chatId);
              
              const lMsg = lastMessages[chat.chatId];
              const fallbackMsg = lMsg ? (lMsg.msgid || lMsg.tempmsgid || lMsg.timestamp ? lMsg : lMsg[0]) : null;
              const msg = storeMsg || fallbackMsg;

              const chatCount = resolveTotalCount(count[chat.chatId]);
              const isPinned = pinnedSet.has(chat.chatId);
              const isActive = isDesktop && activeChatRoute?.includes(`/chat/${chat.chatId}`);
              const isOnline = !!onlineStatuses[chat.id || chat.userId || chat.userIds?.[0]];

              return (
                <ChatRow
                  key={chat.chatId}
                  chat={chat}
                  msg={msg}
                  chatCount={chatCount}
                  isPinned={isPinned}
                  isActive={isActive}
                  isDesktop={isDesktop}
                  isOnline={isOnline}
                  userId={userIdRef.current}
                  onChatClick={() => handleChatClick(chat)}
                  onTogglePin={togglePin}
                  onAvatarClick={handleAvatarClick}
                  formatTime={formatChatTime}
                  hideMessage={false}
                />
              );
            })}
          </div>
        )}

        {(chatNames.length === 0 || sortedAndFilteredChats.length === 0) && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
            padding: "20px"
          }}>
            <div style={{
              backgroundColor: "#1a1a1a",
              borderRadius: "16px",
              padding: "12px",
              maxWidth: "600px",
              width: "100%",
              border: "2px solid #2a2a2a",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
            }}>
              <div style={{
                textAlign: "center",
                marginBottom: "24px"
              }}>
                <h3 style={{
                  fontSize: "24px",
                  fontWeight: "600",
                  color: "#ffffff",
                  marginBottom: "8px"
                }}>
                  Welcome to LetsChat!
                </h3>
                <p style={{
                  fontSize: "15px",
                  color: "#808080"
                }}>
                  Checkout these features
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{
                  display: "flex",
                  gap: "16px",
                  padding: "10px",
                  backgroundColor: "#0f0f0f",
                  borderRadius: "12px",
                  border: "1px solid #2a2a2a"
                }}>
                  <div style={{
                    minWidth: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "#1a3a4a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px"
                  }}>
                    💬
                  </div>
                  <div>
                    <h4 style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#e0e0e0",
                      marginBottom: "6px"
                    }}>
                      Multiple Chat Spaces
                    </h4>
                    <p style={{
                      fontSize: "14px",
                      color: "#a0a0a0",
                      lineHeight: "1.5"
                    }}>
                      No more messy chats - keep multiple conversations with the same person neatly separated. keep your discussions separate and focused
                    </p>
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  gap: "16px",
                  padding: "10px",
                  backgroundColor: "#0f0f0f",
                  borderRadius: "12px",
                  border: "1px solid #2a2a2a"
                }}>
                  <div style={{
                    minWidth: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "#3a1a4a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px"
                  }}>
                    🔄
                  </div>
                  <div>
                    <h4 style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#e0e0e0",
                      marginBottom: "6px"
                    }}>
                      Message Revival After Deletion
                    </h4>
                    <p style={{
                      fontSize: "14px",
                      color: "#a0a0a0",
                      lineHeight: "1.5"
                    }}>
                      Never lose important messages. Recover deleted messages and maintain complete conversation history
                    </p>
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  gap: "16px",
                  padding: "10px",
                  backgroundColor: "#0f0f0f",
                  borderRadius: "12px",
                  border: "1px solid #2a2a2a"
                }}>
                  <div style={{
                    minWidth: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "#1a4a3a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px"
                  }}>
                    🎯
                  </div>
                  <div>
                    <h4 style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#e0e0e0",
                      marginBottom: "6px"
                    }}>
                      Event Detection for Chat Messages
                    </h4>
                    <p style={{
                      fontSize: "14px",
                      color: "#a0a0a0",
                      lineHeight: "1.5"
                    }}>
                      Smart detection of time based events in your conversations and storing them in calendar for you
                    </p>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: "12px",
                textAlign: "center",
                paddingTop: "12px",
                borderTop: "1px solid #2a2a2a"
              }}>
                <button
                  onClick={() => navigate('/search')}
                  style={{
                    padding: "12px 32px",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#ffffff",
                    backgroundColor: "#2563eb",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#1d4ed8";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#2563eb";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.3)";
                  }}
                >
                  Find friends
                </button>

              </div>
            </div>
          </div>
        )}
      </div>

      {viewingMedia && (
        <MediaViewer
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
        />
      )}
    </div>
  );
}

export default ChatNames;