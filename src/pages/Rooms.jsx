import useBackClose from '../hooks/useBackClose';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Users,
  Hash,
  Loader2,
  Sparkles,
  Pin,
  PinOff,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { API } from '../service/UserAuth';
import messageStore from './MessageStore';
import { getchat } from './ChatNames';
import Avatar from '../components/chat/Avatar';
import { syncChatsMapToDB } from '../service/db';
import { useUsernameCheck } from '../hooks/useUsernameCheck';
import { UsernameStatusIndicator } from '../components/common/UsernameStatusIndicator';

const BASE_NICKNAMES = [
  "Thalapathy",
  "Vaathi",
  "AKVerse",
  "Thala",
  "Billa",
  "Master",
  "Ghilli",
  "Rolex",
  "Leo",
  "Vikram",
  "Jailer",
  "Baasha",
  "MarkAntony",
  "Captain",
  "TonyStark",
  "BruceWayne",
  "PeterParker",
  "ClarkKent",
  "Deadpool",
  "Logan",
  "Thor",
  "Aniyan",
  "MasterJD",
  "Suriya"
];

const generateShuffledSuggestions = () => {
  const shuffled = [...BASE_NICKNAMES].sort(() => 0.5 - Math.random());
  return shuffled.map(name => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${name}${num}`;
  });
};

const safeJsonParse = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Failed to parse localStorage key: ${key}`, err);
    return fallback;
  }
};

// Normalization helpers for backend properties
const getChatId = (r) => (r ? (r.ChatId || r.chatId || r.roomId || r.Id || r.id || '') : '');
const getName = (r) => (r ? (r.ChatName || r.chatName || r.roomName || r.name || 'Unnamed room') : 'Unnamed room');
const getMembers = (r) => (r ? Number(r.noOfMembers || r.NoOfMembers || r.noofmembers || r.membersCount || 0) : 0);
const getMotto = (r) => (r ? (r.motto || r.Motto || r.status || r.Status || 'Explore topics and connect with others') : 'Explore topics and connect with others');

// User rooms cache key (only caches pinned, created, and joined rooms)
const USER_ROOMS_CACHE_KEY = 'letschat_user_rooms_cache';

const getCachedUserRooms = () => {
  try {
    const raw = localStorage.getItem(USER_ROOMS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveUserRoomsToCache = (userRoomsList, allRoomsList, pinnedIds = []) => {
  try {
    const pinnedSet = new Set((pinnedIds || []).map(String));
    const targetMap = new Map();

    // 1. User created / joined rooms
    (Array.isArray(userRoomsList) ? userRoomsList : []).forEach(r => {
      const id = String(getChatId(r));
      if (id) targetMap.set(id, r);
    });

    // 2. User pinned rooms (from allRooms if not already in userRooms)
    (Array.isArray(allRoomsList) ? allRoomsList : []).forEach(r => {
      const id = String(getChatId(r));
      if (id && pinnedSet.has(id)) {
        targetMap.set(id, r);
      }
    });

    const filteredRooms = Array.from(targetMap.values());
    localStorage.setItem(USER_ROOMS_CACHE_KEY, JSON.stringify(filteredRooms));
  } catch (e) {
    console.warn('[Rooms] Failed to update user rooms cache:', e);
  }
};

export default function Rooms({ isSidebar = false }) {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userid');

  const [cachedInitial] = useState(() => getCachedUserRooms());
  const [allRooms, setAllRooms] = useState([]);
  const [userRooms, setUserRooms] = useState(cachedInitial);
  const [isLoading, setIsLoading] = useState(() => cachedInitial.length === 0);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'joined' | 'pinned'
  const [joiningRoomId, setJoiningRoomId] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('roomNickname'));
  useBackClose(showOnboarding, () => setShowOnboarding(false));
  useBackClose(isCreateModalOpen, () => setIsCreateModalOpen(false));
  const [nickname, setNickname] = useState(() => localStorage.getItem('roomNickname') || '');

  const roomNicknameCheck = useUsernameCheck({
    username: nickname,
    originalName: localStorage.getItem('roomNickname') || '',
    excludeUserId: userId,
    debounceMs: 400
  });

  const [suggestedNames, setSuggestedNames] = useState(generateShuffledSuggestions);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [isSettingNickname, setIsSettingNickname] = useState(false);
  const [pinnedRoomIds, setPinnedRoomIds] = useState(() => safeJsonParse('pinnedRoomIds', []));

  // Create Room Form State
  const [newRoom, setNewRoom] = useState({ name: '', motto: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [counts, setCounts] = useState(() => messageStore.getRoomCounts() || {});

  // Abortable Room Name Availability Check
  const [roomNameCheck, setRoomNameCheck] = useState({
    isChecking: false,
    available: null,
    message: '',
    normalized: ''
  });

  useEffect(() => {
    if (!isCreateModalOpen) {
      setRoomNameCheck({ isChecking: false, available: null, message: '', normalized: '' });
      return;
    }

    const trimmed = (newRoom.name || '').trim();
    if (!trimmed) {
      setRoomNameCheck({ isChecking: false, available: null, message: '', normalized: '' });
      return;
    }

    const controller = new AbortController();
    setRoomNameCheck(prev => ({ ...prev, isChecking: true }));

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/room/check-name?roomName=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal
        });
        if (res.ok) {
          const data = await res.json();
          setRoomNameCheck({
            isChecking: false,
            available: Boolean(data?.available),
            message: data?.message || (data?.available ? 'Room name is available' : 'Room name already taken'),
            normalized: data?.normalized || trimmed
          });
        } else {
          setRoomNameCheck({
            isChecking: false,
            available: false,
            message: 'Unable to verify room name availability',
            normalized: trimmed
          });
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          setRoomNameCheck({
            isChecking: false,
            available: null,
            message: '',
            normalized: trimmed
          });
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [newRoom.name, isCreateModalOpen]);

  // Escape key handler for Create modal
  useEffect(() => {
    if (!isCreateModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen]);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setFetchError(null);
    try {
      const [allRes, userRes] = await Promise.all([
        fetch(`${API}/room/load`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
        fetch(`${API}/room/load/${userId}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      ]);

      if (!allRes.ok || !userRes.ok) {
        throw new Error('Failed to load rooms');
      }

      const allData = await allRes.json();
      const userData = await userRes.json();

      const freshAll = Array.isArray(allData) ? allData : [];
      const freshUser = Array.isArray(userData) ? userData : [];

      setAllRooms(freshAll);
      setUserRooms(freshUser);

      // Continuously update cache over network: only cache user pinned, created, or joined rooms
      saveUserRoomsToCache(freshUser, freshAll, pinnedRoomIds);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      if (!isSilent) {
        setFetchError('Could not load rooms. Check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, pinnedRoomIds]);

  useEffect(() => {
    const checkNickname = async () => {
      try {
        const res = await fetch(`${API}/room/get/name`, {
          headers: { 'User-Id': userId }
        });
        if (res.ok) {
          const serverName = (await res.text()).trim();
          const localName = localStorage.getItem('roomNickname');

          if (serverName) {
            if (serverName !== localName) {
              setNickname(serverName);
              localStorage.setItem('roomNickname', serverName);
            }
            localStorage.setItem('roomOnboardingSeen', 'true');
            setShowOnboarding(false);
          } else if (!localName) {
            setShowOnboarding(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch room nickname:', err);
        if (!localStorage.getItem('roomNickname')) {
          setShowOnboarding(true);
        }
      }
    };

    // If cached rooms exist, fetch silently in background (Stale-While-Revalidate)
    const hasCache = cachedInitial.length > 0;
    fetchData(hasCache);
    checkNickname();

    const unsubscribe = messageStore.addListener(() => {
      setCounts(messageStore.getRoomCounts() || {});
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [fetchData, userId, cachedInitial.length]);

  useEffect(() => {
    try {
      localStorage.setItem('pinnedRoomIds', JSON.stringify(pinnedRoomIds));
      // Keep cache updated when user pins/unpins a room
      saveUserRoomsToCache(userRooms, allRooms, pinnedRoomIds);
    } catch (e) {
      console.error('Failed to persist pinnedRoomIds:', e);
    }
  }, [pinnedRoomIds, userRooms, allRooms]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinRoomId = params.get('joinRoom');
    if (joinRoomId) {
      setSearchQuery(joinRoomId);
    }
  }, []);

  const togglePinRoom = useCallback((e, roomId) => {
    e.stopPropagation();
    setPinnedRoomIds(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  }, []);

  const handleSetNickname = async (e) => {
    e.preventDefault();
    const cleanNick = nickname.trim();
    if (!cleanNick) return;

    if (roomNicknameCheck.isBlocked) {
      setFormError(roomNicknameCheck.message || 'Choose an available nickname');
      return;
    }
    if (roomNicknameCheck.isChecking) {
      setFormError('Checking availability, wait a moment...');
      return;
    }

    setIsSettingNickname(true);
    setFormError(null);
    try {
      const res = await fetch(`${API}/room/set/name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId
        },
        body: JSON.stringify({ name: cleanNick })
      });
      if (res.ok) {
        localStorage.setItem('roomOnboardingSeen', 'true');
        localStorage.setItem('roomNickname', cleanNick);
        setShowOnboarding(false);
      } else {
        const err = await res.text();
        setFormError(err || 'Could not set nickname. Try again.');
      }
    } catch (err) {
      setFormError('Network error. Check your connection.');
    } finally {
      setIsSettingNickname(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const cleanRoomName = (newRoom.name || '').trim();
    if (!cleanRoomName) return;

    if (roomNameCheck.available === false) {
      setFormError(roomNameCheck.message || 'Room name already taken. Choose another name.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`${API}/room/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          roomName: cleanRoomName,
          motto: (newRoom.motto || '').trim()
        })
      });

      if (res.status === 409) {
        setFormError('Room name already taken. Choose another name.');
        setRoomNameCheck(prev => ({ ...prev, available: false, message: 'Room name already exists' }));
        return;
      }

      if (res.ok || res.status === 201) {
        const createdRoom = await res.json();
        setIsCreateModalOpen(false);
        setNewRoom({ name: '', motto: '' });
        setRoomNameCheck({ isChecking: false, available: null, message: '', normalized: '' });
        fetchData();
        handleJoinRoom(createdRoom);
      } else {
        const errText = await res.text();
        setFormError(errText || 'Could not create room. Try again.');
      }
    } catch (err) {
      setFormError('Network error. Check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async (room) => {
    if (!room) return;
    const roomId = room.Id || room.id || room.roomId || room.ChatId || room.chatId;
    if (!roomId) {
      console.error('No roomId found for room:', room);
      return;
    }

    if (joiningRoomId) return;
    setJoiningRoomId(roomId);

    try {
      const res = await fetch(`${API}/room/join?roomId=${encodeURIComponent(roomId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId
        }
      });

      if (res.ok) {
        const chatId = await res.text();
        if (!chatId) {
          console.error('Server returned empty chatId');
          return;
        }

        const finalChatId = room.ChatId || room.chatId || chatId;

        // CRITICAL: Mark as volatile BEFORE loading messages to ensure 30-min TTL
        messageStore.markAsVolatile(finalChatId);

        const isCreator = (room.creator && room.creator === userId) || room.Role === 'admin';
        const defaultMuted = !isCreator;
        const currentMuted = room.isMuted !== undefined && isCreator ? room.isMuted : defaultMuted;

        const chatsMap = safeJsonParse('chatsMap', {});
        chatsMap[finalChatId] = {
          ...room,
          chatId: finalChatId,
          chatName: getName(room),
          id: roomId,
          type: 'room',
          status: 'allowed',
          isMuted: currentMuted
        };

        try {
          localStorage.setItem('chatsMap', JSON.stringify(chatsMap));
        } catch (e) {
          console.error('Failed to save chatsMap', e);
        }
        syncChatsMapToDB(chatsMap);

        // Full Initialization Sync (load / check-in)
        const visited = safeJsonParse('visited', {});
        visited[finalChatId] = Date.now();
        try {
          localStorage.setItem('visited', JSON.stringify(visited));
          localStorage.setItem(finalChatId, JSON.stringify(chatsMap[finalChatId]));
        } catch (e) {
          console.error('Failed to save visited or room item', e);
        }

        messageStore.setActivechatbox(finalChatId);
        getchat(finalChatId);
        messageStore.setCount(finalChatId);

        navigate('/chats', { state: { showSpacesForChat: chatId }, replace: true });
      } else {
        const errText = await res.text();
        setFetchError(errText || 'Could not join room. Try again.');
      }
    } catch (err) {
      console.error('Failed to join room:', err);
      setFetchError('Network error joining room. Check your connection.');
    } finally {
      setJoiningRoomId(null);
    }
  };

  // Match search filter
  const matchesSearch = useCallback((room) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    const name = getName(room).toLowerCase();
    const id = getChatId(room).toLowerCase();
    return name.includes(query) || id.includes(query);
  }, [searchQuery]);

  // Deduplicate master list of rooms
  const allUniqueRooms = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const r of [...userRooms, ...allRooms]) {
      const id = getChatId(r);
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push(r);
      }
    }
    return list;
  }, [userRooms, allRooms]);

  // User joined room IDs set
  const userRoomIdSet = useMemo(() => {
    return new Set(userRooms.map(r => getChatId(r)).filter(Boolean));
  }, [userRooms]);

  const pinnedRoomIdSet = useMemo(() => {
    return new Set(pinnedRoomIds);
  }, [pinnedRoomIds]);

  // Section 1: Pinned Rooms (All pinned rooms, ordered by last visit)
  const pinnedSectionRooms = useMemo(() => {
    const visited = safeJsonParse('visited', {});
    const list = allUniqueRooms.filter(r => {
      const id = getChatId(r);
      return pinnedRoomIdSet.has(id) && matchesSearch(r);
    });

    return list.sort((a, b) => {
      const timeA = visited[getChatId(a)] || 0;
      const timeB = visited[getChatId(b)] || 0;
      return timeB - timeA;
    });
  }, [allUniqueRooms, pinnedRoomIdSet, matchesSearch]);

  // Section 2: Your Rooms (Joined rooms, excluding rooms already displayed in Pinned)
  const joinedSectionRooms = useMemo(() => {
    return allUniqueRooms.filter(r => {
      const id = getChatId(r);
      return userRoomIdSet.has(id) && !pinnedRoomIdSet.has(id) && matchesSearch(r);
    });
  }, [allUniqueRooms, userRoomIdSet, pinnedRoomIdSet, matchesSearch]);

  // Section 3: Discover Rooms (Unjoined and unpinned rooms, sorted by member count descending)
  const discoverSectionRooms = useMemo(() => {
    return allUniqueRooms
      .filter(r => {
        const id = getChatId(r);
        return !userRoomIdSet.has(id) && !pinnedRoomIdSet.has(id) && matchesSearch(r);
      })
      .sort((a, b) => getMembers(b) - getMembers(a));
  }, [allUniqueRooms, userRoomIdSet, pinnedRoomIdSet, matchesSearch]);

  // Compute counts for filter chip tabs
  const totalPinnedMatching = pinnedSectionRooms.length;
  const totalJoinedMatching = useMemo(() => {
    return allUniqueRooms.filter(r => userRoomIdSet.has(getChatId(r)) && matchesSearch(r)).length;
  }, [allUniqueRooms, userRoomIdSet, matchesSearch]);

  const totalVisibleRooms = useMemo(() => {
    if (filterTab === 'pinned') return pinnedSectionRooms.length;
    if (filterTab === 'joined') return totalJoinedMatching;
    return pinnedSectionRooms.length + joinedSectionRooms.length + discoverSectionRooms.length;
  }, [filterTab, pinnedSectionRooms.length, joinedSectionRooms.length, discoverSectionRooms.length, totalJoinedMatching]);

  const hasExistingNickname = Boolean(localStorage.getItem('roomNickname'));

  return (
    <div className={`rm-container ${isSidebar ? 'rm-sidebar-mode' : ''}`}>
      {/* Sticky Header */}
      {!isSidebar && (
        <header className="rm-header">
          <div className="rm-header-inner">
            <div className="rm-header-left">
              <h1 className="rm-title">Rooms</h1>
              {nickname && (
                <div className="rm-nickname-row">
                  <span className="rm-nickname-dot" aria-hidden="true" />
                  <span>Acting as:</span>
                  <strong className="rm-nickname-name">{nickname}</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setFormError(null);
                      setShowOnboarding(true);
                    }}
                    className="rm-link-btn"
                    title="Change nickname"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            <div className="rm-header-right">
              <div className="rm-search-box">
                <Search size={16} className="rm-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search by name or room ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rm-search-input"
                  aria-label="Search rooms by name or ID"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="rm-search-clear"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className="rm-create-btn"
                onClick={() => {
                  setFormError(null);
                  setIsCreateModalOpen(true);
                }}
                aria-label="Create a new room"
              >
                <Plus size={18} />
                <span className="rm-btn-text">New room</span>
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="rm-filter-bar" role="tablist" aria-label="Room filter options">
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === 'all'}
              className={`rm-chip ${filterTab === 'all' ? 'rm-chip-active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === 'joined'}
              className={`rm-chip ${filterTab === 'joined' ? 'rm-chip-active' : ''}`}
              onClick={() => setFilterTab('joined')}
            >
              Joined
              {totalJoinedMatching > 0 && <span className="rm-chip-count">{totalJoinedMatching}</span>}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === 'pinned'}
              className={`rm-chip ${filterTab === 'pinned' ? 'rm-chip-active' : ''}`}
              onClick={() => setFilterTab('pinned')}
            >
              Pinned
              {totalPinnedMatching > 0 && <span className="rm-chip-count">{totalPinnedMatching}</span>}
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="rm-content">
        {isLoading ? (
          <div className="rm-grid" aria-busy="true" aria-label="Loading rooms">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="rm-skeleton-card">
                <div className="rm-skeleton-header">
                  <div className="rm-skeleton-avatar" />
                  <div className="rm-skeleton-pill" />
                </div>
                <div className="rm-skeleton-line rm-skeleton-title" />
                <div className="rm-skeleton-line rm-skeleton-text" />
                <div className="rm-skeleton-line rm-skeleton-text-short" />
                <div className="rm-skeleton-footer">
                  <div className="rm-skeleton-members" />
                  <div className="rm-skeleton-btn" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="rm-error-state" role="alert">
            <AlertCircle size={36} color="var(--danger-color)" aria-hidden="true" />
            <p className="rm-error-text">{fetchError}</p>
            <button type="button" onClick={fetchData} className="rm-retry-btn">
              <RefreshCcw size={15} aria-hidden="true" />
              <span>Try again</span>
            </button>
          </div>
        ) : totalVisibleRooms === 0 ? (
          <div className="rm-empty-state">
            <Hash size={44} className="rm-empty-icon" aria-hidden="true" />
            <h3 className="rm-empty-title">
              {searchQuery ? 'No matching rooms' : filterTab === 'pinned' ? 'No pinned rooms yet' : filterTab === 'joined' ? 'You have not joined any rooms yet' : 'No rooms found'}
            </h3>
            <p className="rm-empty-desc">
              {searchQuery
                ? `No room matches "${searchQuery}". Clear your search or start a new room.`
                : filterTab === 'pinned'
                ? 'Pin rooms you visit often for quick access.'
                : 'Be the first to create a public space and start a discussion.'}
            </p>
            {!isSidebar && (
              <button
                type="button"
                className="rm-empty-action"
                onClick={() => {
                  if (searchQuery) setSearchQuery('');
                  else setIsCreateModalOpen(true);
                }}
              >
                {searchQuery ? 'Clear search' : 'Create room'}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Pinned Section */}
            {(filterTab === 'all' || filterTab === 'pinned') && pinnedSectionRooms.length > 0 && (
              <section className="rm-section" aria-labelledby="rm-pinned-heading">
                <div className="rm-section-header">
                  <Pin size={17} color="var(--danger-color)" aria-hidden="true" />
                  <h2 id="rm-pinned-heading" className="rm-section-title">Pinned</h2>
                  <span className="rm-section-count">({pinnedSectionRooms.length})</span>
                </div>
                <div className="rm-grid">
                  {pinnedSectionRooms.map(room => {
                    const id = getChatId(room);
                    return (
                      <RoomCard
                        key={id}
                        room={room}
                        isPinned={true}
                        isJoined={userRoomIdSet.has(id)}
                        onTogglePin={togglePinRoom}
                        chatCount={counts[id] || 0}
                        onClick={() => handleJoinRoom(room)}
                        isJoining={joiningRoomId === id}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Your Rooms Section (Joined Rooms) */}
            {filterTab === 'all' && joinedSectionRooms.length > 0 && (
              <section className="rm-section" aria-labelledby="rm-your-rooms-heading">
                <div className="rm-section-header">
                  <Sparkles size={17} color="var(--warning-color)" aria-hidden="true" />
                  <h2 id="rm-your-rooms-heading" className="rm-section-title">Your rooms</h2>
                  <span className="rm-section-count">({joinedSectionRooms.length})</span>
                </div>
                <div className="rm-grid">
                  {joinedSectionRooms.map(room => {
                    const id = getChatId(room);
                    return (
                      <RoomCard
                        key={id}
                        room={room}
                        isPinned={false}
                        isJoined={true}
                        onTogglePin={togglePinRoom}
                        chatCount={counts[id] || 0}
                        onClick={() => handleJoinRoom(room)}
                        isJoining={joiningRoomId === id}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* When "Joined" tab is selected, show both joined-pinned and unpinned in Your Rooms */}
            {filterTab === 'joined' && (
              <section className="rm-section" aria-labelledby="rm-joined-heading">
                <div className="rm-section-header">
                  <Sparkles size={17} color="var(--success-color)" aria-hidden="true" />
                  <h2 id="rm-joined-heading" className="rm-section-title">Joined rooms</h2>
                  <span className="rm-section-count">({totalJoinedMatching})</span>
                </div>
                <div className="rm-grid">
                  {allUniqueRooms
                    .filter(r => userRoomIdSet.has(getChatId(r)) && matchesSearch(r))
                    .map(room => {
                      const id = getChatId(room);
                      return (
                        <RoomCard
                          key={id}
                          room={room}
                          isPinned={pinnedRoomIdSet.has(id)}
                          isJoined={true}
                          onTogglePin={togglePinRoom}
                          chatCount={counts[id] || 0}
                          onClick={() => handleJoinRoom(room)}
                          isJoining={joiningRoomId === id}
                        />
                      );
                    })}
                </div>
              </section>
            )}

            {/* Discover Section */}
            {filterTab === 'all' && discoverSectionRooms.length > 0 && (
              <section className="rm-section" aria-labelledby="rm-discover-heading">
                <div className="rm-section-header">
                  <Users size={17} color="var(--accent-text)" aria-hidden="true" />
                  <h2 id="rm-discover-heading" className="rm-section-title">Discover</h2>
                  <span className="rm-section-count">({discoverSectionRooms.length})</span>
                </div>
                <div className="rm-grid">
                  {discoverSectionRooms.map(room => {
                    const id = getChatId(room);
                    return (
                      <RoomCard
                        key={id}
                        room={room}
                        isPinned={false}
                        isJoined={false}
                        onTogglePin={togglePinRoom}
                        chatCount={counts[id] || 0}
                        onClick={() => handleJoinRoom(room)}
                        isJoining={joiningRoomId === id}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Nickname Onboarding / Edit Modal */}
      {showOnboarding && !isSidebar && (
        <div
          className="rm-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rm-onboarding-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && hasExistingNickname) {
              setShowOnboarding(false);
            }
          }}
        >
          <div className="rm-modal">
            {hasExistingNickname && (
              <button
                type="button"
                className="rm-modal-close"
                onClick={() => setShowOnboarding(false)}
                aria-label="Close nickname settings"
              >
                <X size={20} />
              </button>
            )}

            <div className="rm-modal-icon">
              <Sparkles size={24} color="var(--accent-text)" />
            </div>

            <h2 id="rm-onboarding-title" className="rm-modal-title">
              {hasExistingNickname ? 'Change your nickname' : 'Welcome to Rooms'}
            </h2>

            <p className="rm-modal-desc">
              Public rooms are anonymous. Nicknames keep conversations friendly while protecting your privacy.
            </p>

            <form onSubmit={handleSetNickname} className="rm-form">
              <div className="rm-input-wrap">
                <input
                  autoFocus
                  type="text"
                  placeholder="Enter a nickname..."
                  required
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setFormError(null);
                  }}
                  className="rm-input"
                  style={{
                    textAlign: 'center',
                    fontWeight: 600,
                    borderColor:
                      roomNicknameCheck.status === 'block'
                        ? 'var(--danger-color)'
                        : roomNicknameCheck.status === 'warn'
                        ? 'var(--warning-color)'
                        : roomNicknameCheck.status === 'allow'
                        ? 'var(--success-color)'
                        : undefined
                  }}
                />
                <div className="rm-input-status-icon">
                  <UsernameStatusIndicator checkResult={roomNicknameCheck} showInlineIcon={true} />
                </div>
              </div>

              <UsernameStatusIndicator
                checkResult={roomNicknameCheck}
                containerStyle={{ justifyContent: 'center' }}
              />

              {/* Suggestions */}
              <div className="rm-chip-group">
                <div className="rm-chip-group-header">
                  <span className="rm-chip-group-title">Suggested handles</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!showAllSuggestions) {
                        setSuggestedNames(generateShuffledSuggestions());
                        setShowAllSuggestions(true);
                      } else {
                        setShowAllSuggestions(false);
                      }
                    }}
                    className="rm-chip-group-toggle"
                  >
                    {showAllSuggestions ? 'Show less' : '+ More'}
                  </button>
                </div>

                <div className={`rm-suggestions-grid ${showAllSuggestions ? 'rm-suggestions-expanded' : ''}`}>
                  {(showAllSuggestions ? suggestedNames : suggestedNames.slice(0, 4)).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNickname(item);
                        setFormError(null);
                      }}
                      className={`rm-suggestion-chip ${nickname === item ? 'rm-suggestion-chip-active' : ''}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {formError && <p className="rm-status-text rm-status-text-danger">{formError}</p>}

              <button
                type="submit"
                disabled={isSettingNickname || roomNicknameCheck.isBlocked || roomNicknameCheck.isChecking || !nickname.trim()}
                className="rm-submit-btn"
              >
                {isSettingNickname ? 'Saving...' : roomNicknameCheck.isChecking ? 'Checking...' : hasExistingNickname ? 'Save nickname' : 'Start exploring'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div
          className="rm-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rm-create-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCreateModalOpen(false);
            }
          }}
        >
          <div className="rm-modal">
            <div className="rm-modal-header">
              <h2 id="rm-create-title" className="rm-modal-title">Create a room</h2>
              <button
                type="button"
                className="rm-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="rm-form">
              <div className="rm-form-group">
                <div className="rm-label-row">
                  <label htmlFor="rm-input-name" className="rm-label">Room name</label>
                  {roomNameCheck.isChecking && (
                    <span className="rm-check-status">
                      <Loader2 size={12} className="rm-spin" /> Checking...
                    </span>
                  )}
                </div>
                <div className="rm-input-wrap">
                  <input
                    id="rm-input-name"
                    autoFocus
                    type="text"
                    placeholder="e.g. JavaScript Enthusiasts"
                    required
                    value={newRoom.name}
                    onChange={(e) => {
                      setNewRoom({ ...newRoom, name: e.target.value });
                      setFormError(null);
                    }}
                    className="rm-input"
                    style={{
                      borderColor:
                        roomNameCheck.available === false
                          ? 'var(--danger-color)'
                          : roomNameCheck.available === true
                          ? 'var(--success-color)'
                          : undefined
                    }}
                  />
                  <div className="rm-input-status-icon">
                    {roomNameCheck.available === true && !roomNameCheck.isChecking && (
                      <CheckCircle2 size={17} color="var(--success-color)" />
                    )}
                    {roomNameCheck.available === false && !roomNameCheck.isChecking && (
                      <AlertCircle size={17} color="var(--danger-color)" />
                    )}
                  </div>
                </div>
                {roomNameCheck.message && !roomNameCheck.isChecking && (
                  <p
                    className={`rm-status-text ${
                      roomNameCheck.available ? 'rm-status-text-success' : 'rm-status-text-danger'
                    }`}
                  >
                    {roomNameCheck.message}
                  </p>
                )}
              </div>

              <div className="rm-form-group">
                <label htmlFor="rm-input-motto" className="rm-label">Motto or topic</label>
                <input
                  id="rm-input-motto"
                  type="text"
                  placeholder="e.g. Discussing web dev and modern tooling"
                  value={newRoom.motto}
                  onChange={(e) => setNewRoom({ ...newRoom, motto: e.target.value })}
                  className="rm-input"
                />
              </div>

              {formError && <p className="rm-status-text rm-status-text-danger">{formError}</p>}

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  roomNameCheck.available === false ||
                  roomNameCheck.isChecking ||
                  !newRoom.name.trim()
                }
                className="rm-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="rm-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  'Launch room'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scoped CSS Block */}
      <style>{`
        .rm-container {
          flex: 1;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow-y: auto;
          position: relative;
          padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
        }

        .rm-sidebar-mode {
          padding: 0;
          background-color: transparent;
        }

        .rm-header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: color-mix(in srgb, var(--bg-primary) 85%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border-color);
          padding: 20px 24px 12px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .rm-header-inner {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .rm-header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 160px;
        }

        .rm-title {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.5px;
          line-height: 1.2;
        }

        .rm-nickname-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .rm-nickname-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--success-color);
          display: inline-block;
        }

        .rm-nickname-name {
          color: var(--accent-text);
          font-weight: 600;
        }

        .rm-link-btn {
          background: none;
          border: none;
          color: var(--accent-text);
          cursor: pointer;
          padding: 0 4px;
          font-size: 11px;
          text-decoration: underline;
          line-height: 1;
        }

        .rm-link-btn:hover {
          color: var(--text-primary);
        }

        .rm-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          justify-content: flex-end;
        }

        .rm-search-box {
          position: relative;
          display: flex;
          align-items: center;
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          height: 40px;
          padding: 0 12px;
          max-width: 360px;
          width: 100%;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .rm-search-box:focus-within {
          border-color: var(--accent-solid);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-solid) 20%, transparent);
        }

        .rm-search-icon {
          color: var(--text-muted);
          flex-shrink: 0;
          margin-right: 8px;
        }

        .rm-search-input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 13px;
          width: 100%;
          padding: 0;
        }

        .rm-search-input::placeholder {
          color: var(--text-muted);
        }

        .rm-search-clear {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin-left: 4px;
        }

        .rm-search-clear:hover {
          color: var(--text-primary);
          background-color: var(--bg-hover);
        }

        .rm-create-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: var(--accent-solid);
          color: var(--text-on-accent);
          border: 1px solid var(--accent-solid);
          border-radius: 10px;
          height: 40px;
          padding: 0 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
        }

        .rm-create-btn:hover {
          background-color: var(--accent-color);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-solid) 35%, transparent);
        }

        .rm-create-btn:active {
          transform: translateY(0);
        }

        .rm-filter-bar {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rm-chip {
          background-color: var(--bg-card);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }

        .rm-chip:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .rm-chip-active {
          background-color: var(--accent-tint);
          color: var(--accent-text);
          border-color: var(--accent-tint-border);
          font-weight: 600;
        }

        .rm-chip-count {
          font-size: 11px;
          padding: 1px 6px;
          border-radius: 9999px;
          background-color: color-mix(in srgb, var(--border-color) 60%, transparent);
          color: inherit;
        }

        .rm-content {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 24px;
          box-sizing: border-box;
          flex: 1;
        }

        .rm-sidebar-mode .rm-content {
          padding: 12px;
        }

        .rm-section {
          margin-bottom: 32px;
        }

        .rm-section:last-child {
          margin-bottom: 12px;
        }

        .rm-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .rm-section-title {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .rm-section-count {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .rm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .rm-sidebar-mode .rm-grid {
          grid-template-columns: 1fr;
          gap: 10px;
        }

        /* Room Card */
        .rm-card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
          position: relative;
          outline: none;
        }

        .rm-card:hover {
          border-color: color-mix(in srgb, var(--border-color) 60%, var(--accent-solid));
          transform: translateY(-2px);
          box-shadow: 0 6px 18px color-mix(in srgb, var(--bg-primary) 50%, black);
        }

        .rm-card:focus-visible {
          border-color: var(--accent-solid);
          box-shadow: 0 0 0 2px var(--accent-solid);
        }

        .rm-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .rm-card-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .rm-card-header-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rm-unread-pill {
          background-color: var(--danger-tint);
          color: var(--danger-color);
          border: 1px solid color-mix(in srgb, var(--danger-color) 35%, transparent);
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 9999px;
          line-height: 1.2;
        }

        .rm-pin-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background-color: var(--bg-hover);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .rm-pin-btn:hover {
          color: var(--text-primary);
          background-color: color-mix(in srgb, var(--bg-card) 70%, var(--border-color));
        }

        .rm-pin-active {
          color: var(--danger-color);
          background-color: var(--danger-tint);
          border-color: color-mix(in srgb, var(--danger-color) 30%, transparent);
        }

        .rm-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .rm-card-title {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.3;
        }

        .rm-card-motto {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 36px;
        }

        .rm-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);
          gap: 12px;
        }

        .rm-card-members {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 500;
        }

        .rm-action-btn {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          line-height: 1.2;
          transition: all 0.15s ease;
        }

        .rm-action-open {
          background-color: var(--accent-tint);
          color: var(--accent-text);
          border: 1px solid var(--accent-tint-border);
        }

        .rm-action-open:hover {
          background-color: color-mix(in srgb, var(--accent-solid) 24%, transparent);
        }

        .rm-action-join {
          background-color: var(--accent-solid);
          color: var(--text-on-accent);
          border: 1px solid var(--accent-solid);
        }

        .rm-action-join:hover {
          background-color: var(--accent-color);
        }

        .rm-action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Empty & Error States */
        .rm-empty-state, .rm-error-state {
          padding: 56px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 12px;
          color: var(--text-secondary);
          max-width: 440px;
          margin: 40px auto;
        }

        .rm-empty-icon {
          color: var(--border-color);
        }

        .rm-empty-title {
          margin: 0;
          font-size: 17px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .rm-empty-desc, .rm-error-text {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .rm-empty-action, .rm-retry-btn {
          margin-top: 6px;
          padding: 8px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: var(--accent-solid);
          color: var(--text-on-accent);
          border: 1px solid var(--accent-solid);
          transition: all 0.15s ease;
        }

        .rm-empty-action:hover, .rm-retry-btn:hover {
          background-color: var(--accent-color);
        }

        /* Skeleton Cards */
        .rm-skeleton-card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: rmPulse 1.6s ease-in-out infinite;
        }

        .rm-skeleton-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .rm-skeleton-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background-color: var(--bg-hover);
        }

        .rm-skeleton-pill {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background-color: var(--bg-hover);
        }

        .rm-skeleton-line {
          border-radius: 6px;
          background-color: var(--bg-hover);
        }

        .rm-skeleton-title {
          height: 16px;
          width: 70%;
        }

        .rm-skeleton-text {
          height: 12px;
          width: 90%;
        }

        .rm-skeleton-text-short {
          height: 12px;
          width: 55%;
        }

        .rm-skeleton-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 10px;
          border-top: 1px solid color-mix(in srgb, var(--border-color) 40%, transparent);
        }

        .rm-skeleton-members {
          height: 12px;
          width: 80px;
          border-radius: 6px;
          background-color: var(--bg-hover);
        }

        .rm-skeleton-btn {
          height: 26px;
          width: 60px;
          border-radius: 8px;
          background-color: var(--bg-hover);
        }

        /* Modal Overlays & Centering */
        .rm-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: color-mix(in srgb, var(--bg-primary) 70%, transparent);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
        }

        .rm-modal {
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          width: 100%;
          max-width: 460px;
          padding: 28px;
          box-shadow: 0 20px 40px color-mix(in srgb, var(--bg-primary) 50%, black);
          display: flex;
          flex-direction: column;
          position: relative;
          box-sizing: border-box;
          max-height: 90vh;
          overflow-y: auto;
        }

        .rm-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .rm-modal-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background-color: var(--accent-tint);
          border: 1px solid var(--accent-tint-border);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px auto;
        }

        .rm-modal-title {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          text-align: center;
          letter-spacing: -0.3px;
        }

        .rm-modal-header .rm-modal-title {
          text-align: left;
        }

        .rm-modal-desc {
          margin: 8px 0 20px 0;
          font-size: 13px;
          color: var(--text-secondary);
          text-align: center;
          line-height: 1.5;
        }

        .rm-modal-close {
          position: absolute;
          top: 18px;
          right: 18px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rm-modal-close:hover {
          color: var(--text-primary);
          background-color: var(--bg-hover);
        }

        .rm-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .rm-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rm-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .rm-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .rm-check-status {
          font-size: 11px;
          color: var(--accent-text);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .rm-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .rm-input {
          width: 100%;
          background-color: color-mix(in srgb, var(--bg-primary) 70%, transparent);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 12px 14px;
          padding-right: 38px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .rm-input:focus {
          border-color: var(--accent-solid);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-solid) 20%, transparent);
        }

        .rm-input::placeholder {
          color: var(--text-muted);
        }

        .rm-input-status-icon {
          position: absolute;
          right: 12px;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .rm-status-text {
          margin: 4px 0 0 0;
          font-size: 12px;
          line-height: 1.4;
        }

        .rm-status-text-success {
          color: var(--success-color);
        }

        .rm-status-text-danger {
          color: var(--danger-color);
        }

        /* Suggestions in Onboarding */
        .rm-chip-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rm-chip-group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .rm-chip-group-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .rm-chip-group-toggle {
          background: none;
          border: 1px solid var(--accent-tint-border);
          background-color: var(--accent-tint);
          color: var(--accent-text);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .rm-chip-group-toggle:hover {
          color: var(--text-primary);
        }

        .rm-suggestions-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: center;
          max-height: 100px;
          overflow-y: auto;
          padding: 2px;
        }

        .rm-suggestions-expanded {
          max-height: 180px;
        }

        .rm-suggestion-chip {
          padding: 5px 12px;
          border-radius: 16px;
          background-color: var(--bg-hover);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .rm-suggestion-chip:hover {
          background-color: color-mix(in srgb, var(--border-color) 60%, transparent);
          color: var(--text-primary);
        }

        .rm-suggestion-chip-active {
          background-color: var(--accent-tint);
          color: var(--accent-text);
          border-color: var(--accent-tint-border);
          font-weight: 600;
        }

        .rm-submit-btn {
          width: 100%;
          background-color: var(--accent-solid);
          color: var(--text-on-accent);
          border: 1px solid var(--accent-solid);
          padding: 12px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
          margin-top: 4px;
        }

        .rm-submit-btn:hover:not(:disabled) {
          background-color: var(--accent-color);
          box-shadow: 0 4px 14px color-mix(in srgb, var(--accent-solid) 35%, transparent);
        }

        .rm-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .rm-spin {
          animation: rmSpin 1s linear infinite;
        }

        @keyframes rmSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rmPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .rm-header {
            padding: 14px 16px 10px 16px;
            gap: 10px;
          }

          .rm-title {
            font-size: 22px;
          }

          .rm-btn-text {
            display: none;
          }

          .rm-create-btn {
            width: 40px;
            padding: 0;
            justify-content: center;
          }

          .rm-search-box {
            max-width: 100%;
          }

          .rm-content {
            padding: 16px;
          }

          .rm-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .rm-modal {
            padding: 20px;
            border-radius: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rm-card,
          .rm-create-btn,
          .rm-submit-btn,
          .rm-chip,
          .rm-skeleton-card,
          .rm-spin {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function RoomCard({
  room,
  isPinned,
  isJoined,
  onTogglePin,
  chatCount,
  onClick,
  isJoining
}) {
  const name = getName(room);
  const motto = getMotto(room);
  const members = getMembers(room);
  const id = getChatId(room);

  return (
    <article
      className="rm-card"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${name}, ${members} ${members === 1 ? 'member' : 'members'}`}
    >
      <div className="rm-card-header">
        <div className="rm-card-header-left">
          <Avatar chat={room} size={42} />
          {chatCount > 0 && (
            <span className="rm-unread-pill" aria-label={`${chatCount} unread messages`}>
              {chatCount > 99 ? '99+ new' : `${chatCount} new`}
            </span>
          )}
        </div>

        <div className="rm-card-header-right">
          <button
            type="button"
            className={`rm-pin-btn ${isPinned ? 'rm-pin-active' : ''}`}
            onClick={(e) => onTogglePin(e, id)}
            aria-label={isPinned ? `Unpin ${name}` : `Pin ${name}`}
            aria-pressed={isPinned}
          >
            {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
          </button>
        </div>
      </div>

      <div className="rm-card-body">
        <h3 className="rm-card-title" title={name}>
          {name}
        </h3>
        <p className="rm-card-motto" title={motto}>
          {motto}
        </p>
      </div>

      <div className="rm-card-footer">
        <span className="rm-card-members">
          <Users size={14} aria-hidden="true" />
          <span>{members} {members === 1 ? 'member' : 'members'}</span>
        </span>

        <button
          type="button"
          className={`rm-action-btn ${isJoined ? 'rm-action-open' : 'rm-action-join'}`}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          disabled={isJoining}
          aria-label={isJoining ? 'Joining room' : isJoined ? `Open ${name}` : `Join ${name}`}
        >
          {isJoining ? (
            <>
              <Loader2 size={12} className="rm-spin" />
              <span>Joining</span>
            </>
          ) : isJoined ? (
            'Open'
          ) : (
            'Join'
          )}
        </button>
      </div>
    </article>
  );
}
