import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getsocket, isSocketOpen, sendSafe } from "../service/Websocket";
import { API } from "../service/UserAuth";
import messageStore from "./MessageStore";
import { getMessagesFromDB, syncChatsMapToDB, getTotalMessageCountFromDB } from "../service/db";
import { getMediaInfo, getMediaBlob, memoryThumbCache } from "../service/MediaCache";
import { getChatIcon, getChatColor } from "../service/ChatUtils";
import MediaViewer from "../components/chat/MediaViewer";
import InfoModal from "../components/modals/InfoModal";
import Avatar from "../components/chat/Avatar";
import StreakBadge from "../components/pulse/StreakBadge";
import userDiscoveryStore from "../service/UserDiscoveryStore";
import { MoreVertical, Pin, Plus, Users, RefreshCcw, Check, X, Pencil } from "lucide-react";
import { SIMULATION_ID } from "../service/SimulationScript";
import simulationService from "../service/SimulationService";
import { usePWA } from "../context/PWAContext";
import { useEventMediator } from "../service/EventStorage";
import spaceStore from "../service/SpaceStore";

export const getchat = (chatid, spaceId = 0, timestampOverride = null, type = null) => {
  if (!chatid) return;
  console.log(`[getchat] ▶ Always load on check-in: chatid=${chatid} spaceId=${spaceId}`);
  const json = {
    purpose: "load",
    userchatId: chatid,
    usermsgId: spaceId
  };
  sendSafe(json);
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

// ── Utility: Official Verified Badge & Check ─────────────────────────────────
export function isVerifiedChat(chat, chatId) {
  if (!chat && !chatId) return false;
  const id = chatId || chat?.chatId || chat?.id;
  const name = chat?.chatName || '';
  return Boolean(
    id === "BROADCAST_SYSTEM" ||
    id === SIMULATION_ID ||
    chat?.isSimulation ||
    chat?.isSystem ||
    chat?.verified ||
    /letschat/i.test(name)
  );
}

export function VerifiedBadge({ size = 16, style = {} }) {
  const iconSize = Math.max(9, Math.round(size * 0.625));
  return (
    <span
      title="Official Verified Channel"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: 'var(--accent-solid)',
        color: '#ffffff',
        flexShrink: 0,
        ...style
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
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
    const isPoll = msg.type === 'poll' || Boolean(msg.poll) || (typeof msg.content === 'string' && msg.content.trim().startsWith('{"poll_id"'));
    if (isPoll) {
      text = '📊 Poll';
    } else {
      switch (msg.type) {
        case 'image': text = '📷 Photo'; break;
        case 'video': text = '🎥 Video'; break;
        case 'audio': text = '🎤 Audio'; break;
        case 'file': text = '📄 Document'; break;
        case 'assignment': text = '📚 Assignment'; break;
        case 'poll': text = '📊 Poll'; break;
        default: {
          text = msg.content || '';
          // Strip mentions from preview
          text = text.replace(/<@\w+:([^>]+)>/g, '@$1');
          break;
        }
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
            {isVerifiedChat(chat) && (
              <VerifiedBadge size={16} style={{ marginLeft: '3px' }} />
            )}
            {chat?.pulseStreak > 0 && (
              <StreakBadge streak={chat.pulseStreak} size="sm" />
            )}
            {spaceName && (
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: 'var(--accent-tint)',
                color: 'var(--accent-text)',
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
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("chatsMap") || '{}');
      return Object.keys(cached).length === 0;
    } catch {
      return true;
    }
  });
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
  const [infoModalChat, setInfoModalChat] = useState(null);
  const [spaceGroupEvents, setSpaceGroupEvents] = useState([]);
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
  const userClosedSpacesRef = useRef(null);
  const selectedChatForSpacesRef = useRef(selectedChatForSpaces);
  useEffect(() => {
    selectedChatForSpacesRef.current = selectedChatForSpaces;
  }, [selectedChatForSpaces]);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [isAddingSpace, setIsAddingSpace] = useState(false);
  const isCreatingSpaceRef = useRef(false);
  const [spaceLastMessages, setSpaceLastMessages] = useState({});

  useEffect(() => {
    if (!selectedChatForSpaces?.chatId) {
      setSpaceGroupEvents([]);
      return;
    }
    const currentChatId = selectedChatForSpaces.chatId;
    const fetchEvents = async () => {
      try {
        const userId = localStorage.getItem('userid');
        const res = await fetch(`${API}/user/event/group/${currentChatId}`, {
          headers: { 'User-Id': userId }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setSpaceGroupEvents(data);
          }
        }
      } catch (e) {
        console.error('Failed to fetch group events for spaces:', e);
      }
    };
    fetchEvents();

    const handleSync = () => fetchEvents();
    window.addEventListener('letschat_event_sync', handleSync);
    window.addEventListener('letschat_refresh_events', handleSync);
    return () => {
      window.removeEventListener('letschat_event_sync', handleSync);
      window.removeEventListener('letschat_refresh_events', handleSync);
    };
  }, [selectedChatForSpaces?.chatId]);

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

  useEffect(() => {
    const handleSpacesUpdate = (e) => {
      const { chatId, spaces } = e.detail || {};
      if (chatId && spaces) {
        setSpacesCache(prev => ({ ...prev, [chatId]: spaces }));
        setSelectedChatForSpaces(prev => {
          if (prev && String(prev.chatId) === String(chatId)) {
            return { ...prev, spaces };
          }
          return prev;
        });
      }
    };
    window.addEventListener('spaces_cache_updated', handleSpacesUpdate);
    return () => window.removeEventListener('spaces_cache_updated', handleSpacesUpdate);
  }, []);

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
  const walkthroughCompleted = useMemo(() => {
    try {
      if (localStorage.getItem("walkthrough_completed") === "true") return true;
      const sim = JSON.parse(localStorage.getItem('simulation_progress') || '{}');
      return !!sim?.completed;
    } catch {
      return false;
    }
  }, []);

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
    const profileTarget = chat?.profile || chat?.profilePic || chat?.Profile;
    const title = chat?.chatName || chat?.displayName || 'Profile Picture';

    // 1. Direct URL or local image
    if (typeof profileTarget === 'string' && (
      profileTarget.startsWith('http') || 
      profileTarget.startsWith('/') || 
      profileTarget.startsWith('data:')
    )) {
      if (isMounted.current) {
        setViewingMedia({
          fileUrl: profileTarget,
          fileName: title,
          fileType: 'image'
        });
      }
      return;
    }

    // 2. If it's a media ID or hash
    if (profileTarget) {
      // Check memory cache first for instant preview
      const cachedUrl = memoryThumbCache.get(profileTarget + '_full') || memoryThumbCache.get(profileTarget + '_thumb');
      if (cachedUrl && isMounted.current) {
        setViewingMedia({
          fileUrl: cachedUrl,
          fileName: title,
          fileType: 'image'
        });
      }

      try {
        const info = await getMediaInfo(profileTarget);
        const fullUrl = await getMediaBlob(
          profileTarget + '_full', 
          info.fileKey || info.thumbnailKey, 
          'mainCache'
        );
        if (isMounted.current) {
          setViewingMedia({
            fileUrl: fullUrl || info.fileKey || info.thumbnailKey || cachedUrl,
            fileName: title,
            fileType: 'image'
          });
        }
      } catch (err) {
        console.warn('[ChatNames] Failed to fetch full profile media:', err);
        if (!cachedUrl && isMounted.current) {
          setViewingMedia({
            fileUrl: `${API}/files/get-url/${profileTarget}`,
            fileName: title,
            fileType: 'image'
          });
        }
      }
      return;
    }

    // 3. System broadcast / guide chat fallback
    if (chat?.chatId === 'BROADCAST_SYSTEM' || chat?.id === 'BROADCAST_SYSTEM' || chat?.chatId === SIMULATION_ID || chat?.id === SIMULATION_ID || chat?.isSimulation || chat?.isSystem || chat?.type === 'broadcast' || chat?.type === 'guide') {
      const systemLogo = `${import.meta.env.BASE_URL}icon.png`;
      if (isMounted.current) {
        setViewingMedia({
          fileUrl: systemLogo,
          fileName: title,
          fileType: 'image'
        });
      }
      return;
    }
  }, []);

  // Mark unmounted so async callbacks don't setState after cleanup
  useEffect(() => () => { isMounted.current = false; }, []);

  const handleRefreshChatNames = useCallback(() => {
    const userId = userIdRef.current || localStorage.getItem('userid');
    if (!userId) return;
    fetch(`${API}/user/chatbox/${userId}`, {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      }
    })
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        if (!isMounted.current || !Array.isArray(data)) return;
        const uniqueData = Array.from(new Map(data.map(item => [item.chatId, item])).values());
        setChatNames(uniqueData);
        localStorage.setItem('chatNames', JSON.stringify(uniqueData));
      })
      .catch(err => console.warn('Failed to refresh chat names:', err));
  }, []);

  useEffect(() => {
    window.addEventListener('letschat_refresh_chatnames', handleRefreshChatNames);
    return () => window.removeEventListener('letschat_refresh_chatnames', handleRefreshChatNames);
  }, [handleRefreshChatNames]);

  // ── Guard: redirect if not logged in — runs ONCE on mount ────────────────
  useEffect(() => {
    if (!userIdRef.current) navigate("/login");
  }, []);
  useEffect(() => {
    // ── Helper: safe localStorage read ───────────────────────────────────
    const readLS = (key) => {
      try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
    };

    // Ensure initial simulation welcome greeting is present
    simulationService.ensureInitialWelcome();

    // ── Hydrate state from messageStore + localStorage on mount ───────────
    const storeLastMsgs = messageStore.getLastMessage() || {};
    const storedLastMsgs = readLS('lastMessages');
    const initialLastMsgs = { ...storedLastMsgs };
    Object.keys(storeLastMsgs).forEach(chatId => {
      if (storeLastMsgs[chatId] && storeLastMsgs[chatId] !== 0)
        initialLastMsgs[chatId] = storeLastMsgs[chatId];
    });
    // Ensure every last message has numeric _ts for sorting
    Object.keys(initialLastMsgs).forEach(chatId => {
      const m = initialLastMsgs[chatId];
      if (m && m._ts == null) {
        initialLastMsgs[chatId] = { ...m, _ts: resolveTimestamp(m) };
      }
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
    const unsubscribe = messageStore.addListener((update) => {
      if (!isMounted.current) return;

      if (update && (update.type === 'username_change' || update.msgtype === 'username_change' || (update.content && typeof update.content === 'string' && update.content.includes('changed display name')))) {
        handleRefreshChatNames();
      }

      const lastMsgs = messageStore.getLastMessage() || {};
      const counts = messageStore.getCount() || {};

      // Merge with current state — always favor newer incoming messages
      setLastMessages(prev => {
        const merged = { ...prev };

        // 1. If update is an individual message (incoming/outgoing/reaction)
        if (update && update.chatid && (update.content !== undefined || update.type)) {
          const incomingTs = resolveTimestamp(update);
          const currentTs = merged[update.chatid] ? resolveTimestamp(merged[update.chatid]) : 0;
          if (incomingTs >= currentTs) {
            merged[update.chatid] = { ...update, _ts: incomingTs };
          }
        }

        // 2. Also check if update was a batch_loaded event
        if (update && update.type === 'batch_loaded' && update.chatid) {
          const storeLatest = messageStore.getChatLastMessage(update.chatid);
          if (storeLatest) {
            const storeTs = resolveTimestamp(storeLatest);
            const currentTs = merged[update.chatid] ? resolveTimestamp(merged[update.chatid]) : 0;
            if (storeTs >= currentTs) {
              merged[update.chatid] = { ...storeLatest, _ts: storeTs };
            }
          }
        }

        // 3. Merge from lastMsgs
        Object.keys(lastMsgs).forEach(chatId => {
          if (lastMsgs[chatId] && lastMsgs[chatId] !== 0) {
            const m = lastMsgs[chatId];
            const mLatest = (m && !m.msgid && !m.tempmsgid && typeof m === 'object')
              ? Object.values(m).reduce((a, b) => resolveTimestamp(b) >= resolveTimestamp(a) ? b : a, Object.values(m)[0])
              : m;
            if (mLatest) {
              const mTs = resolveTimestamp(mLatest);
              const currentTs = merged[chatId] ? resolveTimestamp(merged[chatId]) : 0;
              if (mTs >= currentTs) {
                merged[chatId] = { ...mLatest, _ts: mTs };
              }
            }
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
      const chatsToScan = [...chats];
      if (!chatsToScan.some(c => c.chatId === SIMULATION_ID)) {
        chatsToScan.push({ chatId: SIMULATION_ID });
      }
      for (let i = 0; i < chatsToScan.length; i += BATCH_SIZE) {
        if (signal?.aborted || !isMounted.current) return;
        const batch = chatsToScan.slice(i, i + BATCH_SIZE);
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

        // Pre-populate last messages from API to show in chat preview immediately without waiting
        setLastMessages(prev => {
          const merged = { ...prev };
          uniqueData.forEach(chat => {
            if (chat.lastMessage && !merged[chat.chatId]) {
              const ts = chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp).getTime() : (chat.timestamp ? new Date(chat.timestamp).getTime() : Date.now());
              merged[chat.chatId] = {
                content: chat.lastMessage,
                type: chat.lastMessageType || 'text',
                sendername: chat.lastMessageSender,
                userid: chat.lastMessageSenderId,
                timestamp: chat.lastMessageTimestamp,
                msgid: chat.lastMessageId,
                _ts: ts
              };
            }
          });
          scheduleLocalStorageWrite('lastMessages', merged);
          return merged;
        });

        // Conditionally fetch recent messages via HTTP API ONLY if user has chats AND IndexedDB has 0 messages
        if (uniqueData.length > 0) {
          getTotalMessageCountFromDB().then(totalMsgCount => {
            if (!isMounted.current) return;
            if (totalMsgCount === 0) {
              if (import.meta.env.DEV) console.log("[ChatNames] Fresh device/login: IndexedDB has 0 messages. Fetching last 20 msgs via recent-messages API...");
              fetch(`${API}/user/chatbox/${userId}/recent-messages?limit=20`, {
                signal: controller.signal,
                headers: {
                  "Content-Type": "application/json",
                  "ngrok-skip-browser-warning": "true"
                }
              })
                .then(res => res.json())
                .then(batches => {
                  if (!isMounted.current) return;
                  if (Array.isArray(batches)) {
                    batches.forEach(batch => {
                      messageStore.handleBatch(batch);
                    });
                  }
                })
                .catch(err => {
                  if (err.name !== 'AbortError' && import.meta.env.DEV) {
                    console.warn("[ChatNames] Recent messages API error:", err);
                  }
                });
            } else {
              if (import.meta.env.DEV) console.log(`[ChatNames] IndexedDB already has ${totalMsgCount} messages. Syncing recent messages for active chats with timestamp...`);
              uniqueData.slice(0, 15).forEach(chat => {
                const cId = chat.chatId;
                if (!cId) return;
                const latestMsg = messageStore.getChatLastMessage(cId);
                const lastTs = latestMsg?.timestamp || null;
                let syncUrl = `${API}/user/chatbox/${encodeURIComponent(cId)}/sync-messages?spaceId=0`;
                if (lastTs) syncUrl += `&lastTimestamp=${encodeURIComponent(lastTs)}`;
                fetch(syncUrl, {
                  signal: controller.signal,
                  headers: {
                    "Content-Type": "application/json",
                    "User-Id": userId,
                    "ngrok-skip-browser-warning": "true"
                  }
                })
                  .then(r => (r.ok ? r.json() : null))
                  .then(batch => {
                    if (batch && batch.msgs) {
                      messageStore.handleBatch(batch);
                    }
                  })
                  .catch(() => {});
              });
            }
          }).catch(err => {
            if (import.meta.env.DEV) console.error("[ChatNames] Error querying DB message count:", err);
          });
        }

        // Refresh with latest items
        loadIDBMsgs(uniqueData, controller.signal);

        const existingMap = (() => {
          try { return JSON.parse(localStorage.getItem("chatsMap") || '{}'); } catch { return {}; }
        })();
        const chatsMap = {};
        if (existingMap["BROADCAST_SYSTEM"]) {
          delete existingMap["BROADCAST_SYSTEM"];
        }
        if (existingMap[SIMULATION_ID]) {
          chatsMap[SIMULATION_ID] = {
            ...existingMap[SIMULATION_ID],
            chatName: "LetsChat",
            profile: `${import.meta.env.BASE_URL}icon.png`,
            isSystem: true,
            verified: true
          };
        } else {
          chatsMap[SIMULATION_ID] = {
            chatId: SIMULATION_ID,
            id: SIMULATION_ID,
            chatName: "LetsChat",
            type: "guide",
            isSimulation: true,
            isSystem: true,
            verified: true,
            profile: `${import.meta.env.BASE_URL}icon.png`
          };
        }

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

    // Inject Walkthrough Guide (Permanently available, ordered by timestamp)
    if (!searchQuery || "letschat".includes(lowerSearch) || SIMULATION_ID.toLowerCase().includes(lowerSearch)) {
      const guideChat = {
        chatId: SIMULATION_ID,
        id: SIMULATION_ID,
        chatName: "LetsChat",
        type: "guide",
        isSimulation: true,
        isSystem: true,
        verified: true,
        profile: `${import.meta.env.BASE_URL}icon.png`
      };
      if (!filtered.some(c => c.chatId === SIMULATION_ID)) {
        filtered.push(guideChat);
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

      const storeMsgA = a.type === 'classroom'
        ? messageStore.getSpaceLastMessage(a.chatId, 0)
        : messageStore.getChatLastMessage(a.chatId);
      const storeMsgB = b.type === 'classroom'
        ? messageStore.getSpaceLastMessage(b.chatId, 0)
        : messageStore.getChatLastMessage(b.chatId);

      const msgA = [storeMsgA, lastMessages[a.chatId], a.lastMessage ? { timestamp: a.lastMessageTimestamp } : null, a.timestamp ? { timestamp: a.timestamp } : null].filter(Boolean);
      const msgB = [storeMsgB, lastMessages[b.chatId], b.lastMessage ? { timestamp: b.lastMessageTimestamp } : null, b.timestamp ? { timestamp: b.timestamp } : null].filter(Boolean);

      const timeA = Math.max(0, ...msgA.map(m => resolveTimestamp(m)));
      const timeB = Math.max(0, ...msgB.map(m => resolveTimestamp(m)));

      return timeB - timeA;
    });

    return filtered;
  }, [chatNames, searchQuery, lastMessages, activeTab, count, pinnedSet]);

  const tabCounts = useMemo(() => {
    const regularChats = chatNames.filter(c => c.type !== 'room' && !messageStore.isVolatile(c.chatId));
    let systemBonus = 0;
    if (!regularChats.some(c => c.chatId === SIMULATION_ID)) systemBonus++;

    return {
      All: regularChats.length + systemBonus,
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
        backgroundColor: 'var(--accent-tint)',
        borderRadius: '16px',
        border: '1px solid var(--accent-tint)',
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
            <Users size={16} color="var(--accent-text)" />
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
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
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
    userClosedSpacesRef.current = null;

    if (chat.chatId === SIMULATION_ID || chat.isSimulation) {
      messageStore.setCount(SIMULATION_ID, 0);
      setCount(messageStore.getCount());
      if (isDesktop && shouldNavigate) {
        navigate(`/chat/${chat.chatId}?space=0`);
      }
      let simSpaces = spacesCache[chat.chatId];
      if (!simSpaces) {
        try {
          const storedCache = JSON.parse(localStorage.getItem('spacesCache') || '{}');
          simSpaces = storedCache[chat.chatId];
        } catch {}
      }
      if (!simSpaces || simSpaces.length === 0) {
        simSpaces = [{ id: 0, name: "Main", icon: "💬" }];
      }
      setSelectedChatForSpaces({ ...chat, spaces: simSpaces });
      return;
    }

    // Auto-navigate to space 0 on desktop immediately (synchronously)
    if (isDesktop && shouldNavigate) {
      navigate(`/chat/${chat.chatId}?space=0`);
    }

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
              if (prev && String(prev.chatId) === String(chat.chatId)) {
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
  }, [spacesCache, isDesktop, navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    let targetChatId = location.state?.showSpacesForChat || searchParams.get('showSpacesForChat');
    
    // Extract targetChatId from active route when on a chat route
    if (!targetChatId && activeChatRoute?.startsWith('/chat/')) {
      const parts = activeChatRoute.split('/chat/')[1];
      if (parts) {
        targetChatId = parts.split('?')[0]; // Strip any query params
      }
    }

    if (targetChatId) {
      // If user hasn't explicitly closed space view for this specific chat, sync space list
      if (userClosedSpacesRef.current !== String(targetChatId)) {
        if (!selectedChatForSpacesRef.current || String(selectedChatForSpacesRef.current.chatId) !== String(targetChatId)) {
          let chat = chatNames.find(c => String(c.chatId) === String(targetChatId));
          if (!chat && (targetChatId === SIMULATION_ID || targetChatId === "simulation_guide" || targetChatId === "BROADCAST_SYSTEM")) {
            chat = {
              chatId: SIMULATION_ID,
              id: SIMULATION_ID,
              chatName: "LetsChat",
              type: "guide",
              isSimulation: true,
              isSystem: true,
              verified: true,
              profile: `${import.meta.env.BASE_URL}icon.png`
            };
          }
          if (chat) {
            handleChatClick(chat, false);
          }
        }
      }
      
      // Clear state to avoid sticky behavior if it came from location.state or query param
      if (location.state?.showSpacesForChat) {
        navigate(location.pathname + location.search, { replace: true, state: { ...location.state, showSpacesForChat: undefined } });
      } else if (searchParams.get('showSpacesForChat')) {
        navigate(location.pathname, { replace: true });
      }
    } else if (prevRouteRef.current?.startsWith('/chat/') && !activeChatRoute?.startsWith('/chat/')) {
      // Only clear space selection when route actually transitioned away from a chat route
      setSelectedChatForSpaces(null);
      userClosedSpacesRef.current = null;
    }
    
    // Update ref for next render
    prevRouteRef.current = activeChatRoute;
  }, [location.state, activeChatRoute, chatNames, handleChatClick]);

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim() || !selectedChatForSpaces) {
      setIsCreatingSpace(false);
      return;
    }
    if (isCreatingSpaceRef.current) return;
    isCreatingSpaceRef.current = true;
    setIsAddingSpace(true);

    const spaces = selectedChatForSpaces.spaces || [];
    const highestId = spaces.reduce((max, s) => Math.max(max, s.id), 0);
    const newSpaceId = highestId + 1;
    const myId = localStorage.getItem('userid');
    const myName = localStorage.getItem('username') || localStorage.getItem('name');

    try {
      const res = await fetch(`${API}/user/add-space`, {
        method: 'POST',
        headers: { 
          "Content-Type": "application/json", 
          "ngrok-skip-browser-warning": "true",
          ...(myId ? { "User-Id": myId } : {}),
          ...(myName ? { "User-Name": myName } : {})
        },
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
        // Fallback: check if the space was indeed created on the backend
        try {
          const checkRes = await fetch(`${API}/user/get-space/${selectedChatForSpaces.chatId}`, {
            headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" }
          });
          if (checkRes.ok) {
            const data = await checkRes.json();
            if (Array.isArray(data) && data.some(s => s.spaceId === newSpaceId)) {
              const fetchedSpaces = data.map(s => ({
                id: s.spaceId,
                name: s.spaceName,
                icon: s.spaceId === 0 ? "💬" : "📌"
              }));
              setSpacesCache(prev => ({ ...prev, [selectedChatForSpaces.chatId]: fetchedSpaces }));
              setSelectedChatForSpaces(prev => ({ ...prev, spaces: fetchedSpaces }));
              return;
            }
          }
        } catch (e) {}
        alert("Failed to create space");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      isCreatingSpaceRef.current = false;
      setIsAddingSpace(false);
      setIsCreatingSpace(false);
      setNewSpaceName("");
    }
  };

  const handleSpaceClick = useCallback((chat, space) => {
    navigate(`/chat/${chat.chatId}?space=${space.id}`);
    update(chat.chatId);
    messageStore.setActivechatbox(chat.chatId);
    messageStore.setActiveSpace(space.id);
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
              onClick={() => navigate('/batch-message')}
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
              title="Batch Message"
              aria-label="Batch Message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
                <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
              </svg>
            </button>
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
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '0 12px'
          }}>
            <svg
              style={{
                width: "20px",
                height: "20px",
                pointerEvents: "none",
                color: 'var(--text-secondary)'
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
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                }}
              >
                <X size={16} />
              </button>
            )}
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
                background: 'linear-gradient(135deg, var(--success-color) 0%, var(--success-color) 100%)',
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
                  backgroundColor: isActive ? 'var(--accent-tint)' : 'transparent',
                  color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: isActive ? '1px solid var(--accent-tint)' : '1px solid var(--border-color)',
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
            backgroundColor: "var(--danger-tint)",
            color: "var(--danger-color)",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid var(--danger-tint-border)"
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
                onClick={() => {
                  if (selectedChatForSpaces) {
                    userClosedSpacesRef.current = String(selectedChatForSpaces.chatId);
                  }
                  setSelectedChatForSpaces(null);
                }}
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
                  setInfoModalChat(selectedChatForSpaces);
                }}
              >
                <Avatar
                  chat={selectedChatForSpaces}
                  size={36}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setInfoModalChat(selectedChatForSpaces);
                  }}
                />
                <span
                  style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setInfoModalChat(selectedChatForSpaces);
                  }}
                >
                  {selectedChatForSpaces.chatName}
                  {isVerifiedChat(selectedChatForSpaces) && (
                    <VerifiedBadge size={16} />
                  )}
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

              const spaceCount = (count[selectedChatForSpaces.chatId] && typeof count[selectedChatForSpaces.chatId] === 'object')
                ? (count[selectedChatForSpaces.chatId][space.id] || 0)
                : messageStore.getSpaceCount(selectedChatForSpaces.chatId, space.id);

              const spaceChat = {
                ...selectedChatForSpaces,
                chatName: space.name,
                chatId: `${selectedChatForSpaces.chatId}_${space.id}`,
                icon: space.icon,
                isSpace: true
              };

              return (
                <div key={space.id} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <ChatRow
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
                  </div>
                  {space.id !== 0 && selectedChatForSpaces.type !== 'classroom' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const currentName = space.name;
                        const newName = prompt("Enter new name for this space:", currentName);
                        if (newName && newName.trim() && newName !== currentName) {
                          await spaceStore.setSpaceName(selectedChatForSpaces.chatId, space.id, newName.trim());
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        transition: 'color 0.2s ease'
                      }}
                      title="Rename Space"
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-color)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Create Space Row - Hidden for Classrooms and Simulation */}
            {selectedChatForSpaces.type !== 'classroom' && selectedChatForSpaces.chatId !== SIMULATION_ID && !selectedChatForSpaces.isSimulation && (
              isCreatingSpace ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 16px',
                  marginTop: '4px',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-tint)',
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
                      color: newSpaceName.trim() ? 'var(--success-color)' : 'var(--text-secondary)',
                      cursor: (isAddingSpace || !newSpaceName.trim()) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px'
                    }}
                  >
                    {isAddingSpace ? (
                      <div style={{
                        width: '18px',
                        height: '18px',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderTopColor: 'var(--accent-color)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                    ) : (
                      <Check size={20} />
                    )}
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
                      color: 'var(--danger-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px'
                    }}
                  >
                    <X size={20} />
                  </button>
                  {isAddingSpace && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '16px',
                      right: '16px',
                      height: '2px',
                      backgroundColor: 'var(--border-color)',
                      overflow: 'hidden',
                      borderRadius: '2px'
                    }}>
                      <div style={{
                        width: '40%',
                        height: '100%',
                        backgroundColor: 'var(--accent-color)',
                        animation: 'loadingProgress 1s infinite ease-in-out'
                      }} />
                    </div>
                  )}
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
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-tint)',
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
              const currentChatId = String(selectedChatForSpaces.chatId);

              // 1. From group events endpoint (visible to all members!)
              if (Array.isArray(spaceGroupEvents)) {
                spaceGroupEvents.forEach(ev => {
                  const sTime = ev.startTime ? new Date(ev.startTime) : null;
                  if (sTime && sTime >= now && ev.action !== 'cancelled') {
                    chatEvents.push({
                      id: ev.eventId || ev.groupEventId,
                      chatid: currentChatId,
                      title: ev.eventTitle,
                      date: ev.startTime,
                      startTime: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(sTime),
                      color: ev.eventColor || 'var(--accent-color)'
                    });
                  }
                });
              }

              // 2. From personal calendar mediator
              Object.values(allEvents).forEach(dateGroup => {
                dateGroup.forEach(evt => {
                  if (String(evt.chatid) === currentChatId) {
                    const evtDate = new Date(evt.date);
                    if (evtDate >= now && !chatEvents.some(e => e.id === evt.id || (e.title === evt.title && Math.abs(new Date(e.date) - evtDate) < 60000))) {
                      chatEvents.push(evt);
                    }
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
                          backgroundColor: 'var(--bg-hover)',
                          borderRadius: '10px',
                          borderLeft: `3px solid ${evt.color || 'var(--accent-color)'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, background-color 0.2s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {evt.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' }).format(new Date(evt.date))} • {evt.startTime}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div style={{
              textAlign: 'center',
              padding: '20px 0 24px 0',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: '600',
              letterSpacing: '0.05em',
              opacity: 0.7
            }}>
              — End of spaces —
            </div>
          </div>
        ) : isLoading && sortedAndFilteredChats.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
            <style>{`
              @keyframes chatSkeletonPulse {
                0% { opacity: 0.3; }
                50% { opacity: 0.8; }
                100% { opacity: 0.3; }
              }
            `}</style>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'var(--bg-hover)', flexShrink: 0, animation: 'chatSkeletonPulse 1.5s ease-in-out infinite' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ width: '45%', height: '14px', borderRadius: '6px', backgroundColor: 'var(--border-color)', animation: 'chatSkeletonPulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: '75%', height: '11px', borderRadius: '4px', backgroundColor: 'var(--bg-hover)', animation: 'chatSkeletonPulse 1.5s ease-in-out infinite' }} />
                </div>
              </div>
            ))}
          </div>
        ) : sortedAndFilteredChats.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-muted)",
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
              const apiLastMsg = chat.lastMessage ? {
                content: chat.lastMessage,
                type: chat.lastMessageType || 'text',
                sendername: chat.lastMessageSender,
                userid: chat.lastMessageSenderId,
                timestamp: chat.lastMessageTimestamp,
                _ts: chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp).getTime() : 0,
                msgid: chat.lastMessageId
              } : null;
              // Pick the strictly latest message among storeMsg, fallbackMsg, and apiLastMsg
              const candidates = [storeMsg, fallbackMsg, apiLastMsg].filter(Boolean);
              let msg = null;
              if (candidates.length > 0) {
                msg = candidates.reduce((latest, current) => {
                  const latestTs = resolveTimestamp(latest);
                  const currentTs = resolveTimestamp(current);
                  return currentTs >= latestTs ? current : latest;
                }, candidates[0]);
              }

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
            
            <div style={{
              textAlign: 'center',
              padding: '24px 0 36px 0',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: '600',
              letterSpacing: '0.05em',
              opacity: 0.7
            }}>
              — Chat Messages are encrypted —
            </div>
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
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "16px",
              padding: "12px",
              maxWidth: "600px",
              width: "100%",
              border: "2px solid var(--bg-card)",
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
                  color: "var(--text-muted)"
                }}>
                  Checkout these features
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{
                  display: "flex",
                  gap: "16px",
                  padding: "10px",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "12px",
                  border: "1px solid var(--bg-card)"
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
                      color: "var(--text-primary)",
                      marginBottom: "6px"
                    }}>
                      Multiple Chat Spaces
                    </h4>
                    <p style={{
                      fontSize: "14px",
                      color: "var(--text-muted)",
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
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "12px",
                  border: "1px solid var(--bg-card)"
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
                      color: "var(--text-primary)",
                      marginBottom: "6px"
                    }}>
                      Message Revival After Deletion
                    </h4>
                    <p style={{
                      fontSize: "14px",
                      color: "var(--text-muted)",
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
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "12px",
                  border: "1px solid var(--bg-card)"
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
                      color: "var(--text-primary)",
                      marginBottom: "6px"
                    }}>
                      Event Detection for Chat Messages
                    </h4>
                    <p style={{
                      fontSize: "14px",
                      color: "var(--text-muted)",
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
                borderTop: "1px solid var(--bg-card)"
              }}>
                <button
                  onClick={() => navigate('/search')}
                  style={{
                    padding: "12px 32px",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#ffffff",
                    backgroundColor: "var(--accent-solid)",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 12px color-mix(in srgb, var(--accent-solid) 45%, transparent)"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "var(--accent-text)";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 6px 16px color-mix(in srgb, var(--accent-solid) 45%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "var(--accent-text)";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px color-mix(in srgb, var(--accent-solid) 45%, transparent)";
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

      {infoModalChat && (
        <InfoModal
          chat={infoModalChat}
          onClose={() => setInfoModalChat(null)}
          API={API}
          navigate={navigate}
          getchat={getchat}
        />
      )}

      {/* Batch Message Floating Action Button (FAB) */}
      {(location.pathname === '/chats' || location.pathname === '/') && (
        <button
          type="button"
          onClick={() => navigate('/batch-message')}
          aria-label="Batch Message"
          title="Batch Message"
          style={{
            position: 'fixed',
            bottom: isDesktop ? '28px' : 'calc(76px + env(safe-area-inset-bottom, 0px))',
            right: isDesktop ? '32px' : '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-color)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 6px 18px color-mix(in srgb, var(--accent-solid) 45%, transparent), 0 2px 6px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9999,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            outline: 'none',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 24px color-mix(in srgb, var(--accent-solid) 45%, transparent), 0 4px 8px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 18px color-mix(in srgb, var(--accent-solid) 45%, transparent), 0 2px 6px rgba(0, 0, 0, 0.25)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
        >
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
            <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ChatNames;