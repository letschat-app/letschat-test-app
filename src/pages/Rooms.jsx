import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users, Hash, ArrowLeft, Loader2, Sparkles, Pin, PinOff, RefreshCcw, CheckCircle2, AlertCircle } from 'lucide-react';
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

export default function Rooms({ isSidebar = false }) {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userid');

  const [allRooms, setAllRooms] = useState([]);
  const [userRooms, setUserRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('roomNickname'));
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
  const [pinnedRoomIds, setPinnedRoomIds] = useState(() => {
    const saved = localStorage.getItem('pinnedRoomIds');
    return saved ? JSON.parse(saved) : [];
  });

  // New Room Form State
  const [newRoom, setNewRoom] = useState({ name: '', motto: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [counts, setCounts] = useState(() => messageStore.getRoomCounts() || {});

  // Virtual Room Soft Duplicate Check (Debounced ~300ms)
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

    setRoomNameCheck(prev => ({ ...prev, isChecking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/room/check-name?roomName=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setRoomNameCheck({
            isChecking: false,
            available: Boolean(data?.available),
            message: data?.message || (data?.available ? 'Room name is available' : 'Room name already exists'),
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
        setRoomNameCheck({
          isChecking: false,
          available: null,
          message: '',
          normalized: trimmed
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [newRoom.name, isCreateModalOpen]);

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
            // Update if different or first time
            if (serverName !== localName) {
              setNickname(serverName);
              localStorage.setItem('roomNickname', serverName);
            }
            localStorage.setItem('roomOnboardingSeen', 'true');
            setShowOnboarding(false);
          } else if (!localName) {
            // Only show onboarding if we have nothing locally either
            setShowOnboarding(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch room nickname:', err);
        // If fetch fails and we have no local name, show onboarding as fallback
        if (!localStorage.getItem('roomNickname')) {
          setShowOnboarding(true);
        }
      }
    };

    fetchData();
    checkNickname();

    const unsubscribe = messageStore.addListener(() => {
      setCounts(messageStore.getRoomCounts() || {});
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('pinnedRoomIds', JSON.stringify(pinnedRoomIds));
  }, [pinnedRoomIds]);

  const togglePinRoom = (e, roomId) => {
    e.stopPropagation();
    setPinnedRoomIds(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleSetNickname = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    if (roomNicknameCheck.isBlocked) {
      setError(roomNicknameCheck.message || 'Please choose an available nickname');
      return;
    }
    if (roomNicknameCheck.isChecking) {
      setError('Validating nickname availability, please wait...');
      return;
    }
    setIsSettingNickname(true);
    try {
      const res = await fetch(`${API}/room/set/name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId
        },
        body: JSON.stringify({ name: nickname.trim() })
      });
      if (res.ok) {
        localStorage.setItem('roomOnboardingSeen', 'true');
        localStorage.setItem('roomNickname', nickname.trim());
        setShowOnboarding(false);
      } else {
        const err = await res.text();
        setError(err || 'Failed to set nickname');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsSettingNickname(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allRes, userRes] = await Promise.all([
        fetch(`${API}/room/load`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
        fetch(`${API}/room/load/${userId}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      ]);

      if (allRes.ok && userRes.ok) {
        const allData = await allRes.json();
        const userData = await userRes.json();

        setAllRooms(Array.isArray(allData) ? allData : []);
        setUserRooms(Array.isArray(userData) ? userData : []);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const cleanRoomName = (newRoom.name || '').trim();
    if (!cleanRoomName) return;

    if (roomNameCheck.available === false) {
      setError(roomNameCheck.message || "Room name is already taken. Please choose another name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API}/room/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          roomName: cleanRoomName,
          motto: (newRoom.motto || '').trim(),
          roomId: newRoom.roomId || undefined
        })
      });

      if (res.status === 409) {
        setError("Room name is already taken. Please choose another name.");
        setRoomNameCheck(prev => ({ ...prev, available: false, message: "Room name already exists" }));
        return;
      }

      if (res.ok || res.status === 201) {
        const createdRoom = await res.json();
        setIsCreateModalOpen(false);
        setNewRoom({ name: '', motto: '' });
        setRoomNameCheck({ isChecking: false, available: null, message: '', normalized: '' });
        fetchData(); // Refresh list
        handleJoinRoom(createdRoom);
      } else {
        const errText = await res.text();
        setError(errText || 'Failed to create room');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async (room) => {
    // Determine the roomId using robust property mapping
    const roomId = room.Id || room.id || room.roomId;
    if (!roomId) {
      console.error('No roomId found for room:', room);
      return;
    }

    try {
      // New spec: Join via query param roomId and header User-Id
      const res = await fetch(`${API}/room/join?roomId=${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId
        }
      });

      if (res.ok) {
        // The server returns the chatId as a plain string (e.g. "AAA118")
        const chatId = await res.text();

        if (!chatId) {
          console.error('Server returned empty chatId');
          return;
        }

        if (room) {
          const finalChatId = room.ChatId || room.chatId || chatId;

          // CRITICAL: Mark as volatile BEFORE loading messages to ensure 30-min TTL
          messageStore.markAsVolatile(finalChatId);

          const isCreator = (room.creator && room.creator === userId) || room.Role === 'admin';
          // Creators unmuted by default; room members/viewers muted by default
          const defaultMuted = !isCreator;
          const currentMuted = room.isMuted !== undefined && isCreator ? room.isMuted : defaultMuted;

          const chatsMap = JSON.parse(localStorage.getItem("chatsMap") || "{}");
          chatsMap[finalChatId] = {
            ...room,
            chatId: finalChatId,
            chatName: room.ChatName || room.chatName || room.roomName,
            id: roomId,
            type: 'room',
            status: 'allowed',
            isMuted: currentMuted
          };
          localStorage.setItem("chatsMap", JSON.stringify(chatsMap));
          syncChatsMapToDB(chatsMap);

          // Full Initialization Sync (load / check-in)
          const visited = JSON.parse(localStorage.getItem("visited") || "{}");
          visited[finalChatId] = Date.now();
          localStorage.setItem("visited", JSON.stringify(visited));
          localStorage.setItem(finalChatId, JSON.stringify(chatsMap[finalChatId]));

          messageStore.setActivechatbox(finalChatId);
          getchat(finalChatId);
          messageStore.setCount(finalChatId);
        }

        navigate('/chats', { state: { showSpacesForChat: chatId }, replace: true });
      }
    } catch (err) {
      console.error('Failed to join room:', err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinRoomId = params.get('joinRoom');
    if (joinRoomId) {
      setSearchQuery(joinRoomId);
    }
  }, []);

  const filteredAllRooms = useMemo(() => {
    const userRoomIds = new Set(userRooms.map(r => r.ChatId || r.chatId));
    return allRooms
      .filter(r => !userRoomIds.has(r.ChatId || r.chatId))
      .filter(r => {
        const nameMatch = (r.ChatName || r.chatName || '').toLowerCase().includes(searchQuery.toLowerCase());
        const idMatch = (r.ChatId || r.chatId) === searchQuery;
        return nameMatch || idMatch;
      });
  }, [allRooms, userRooms, searchQuery]);

  const filteredUserRooms = useMemo(() => {
    return userRooms.filter(r => (r.ChatName || r.chatName || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [userRooms, searchQuery]);

  const pinnedRooms = useMemo(() => {
    const visited = JSON.parse(localStorage.getItem('visited') || '{}');
    const all = [...userRooms, ...allRooms];

    // Deduplicate all rooms first
    const seenIds = new Set();
    const uniqueAll = all.filter(r => {
      const id = r.ChatId || r.chatId || r.roomId || r.Id;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    const pinned = uniqueAll.filter(r => pinnedRoomIds.includes(r.ChatId || r.chatId || r.roomId || r.Id));

    // Sort by last visit time
    return pinned.sort((a, b) => {
      const timeA = visited[a.ChatId || a.chatId || a.roomId || a.Id] || 0;
      const timeB = visited[b.ChatId || b.chatId || b.roomId || b.Id] || 0;
      return timeB - timeA;
    });
  }, [userRooms, allRooms, pinnedRoomIds]);

  const userCreatedRooms = useMemo(() => {
    return filteredUserRooms;
  }, [filteredUserRooms]);

  const discoveryRooms = useMemo(() => {
    const userIds = new Set(userRooms.map(r => r.ChatId || r.chatId || r.roomId || r.Id));
    const pinnedIds = new Set(pinnedRoomIds);

    return allRooms
      .filter(r => {
        const id = r.ChatId || r.chatId || r.roomId || r.Id;
        return !userIds.has(id) && !pinnedIds.has(id) && (r.ChatName || r.chatName || '').toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        const countA = a.noOfMembers || a.NoOfMembers || a.noofmembers || 0;
        const countB = b.noOfMembers || b.NoOfMembers || b.noofmembers || 0;
        return countB - countA;
      });
  }, [allRooms, userRooms, pinnedRoomIds, searchQuery]);



  return (
    <div style={{ ...containerStyle, padding: isSidebar ? '0' : containerStyle.padding }}>
      {/* Sticky Header */}
      {!isSidebar && (
        <div className="res-header" style={headerStyle}>
          <div style={headerTopStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h1 className="res-title" style={titleStyle}>Rooms</h1>
              {nickname && (
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  paddingLeft: '2px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }}></span>
                  Acting as: <span style={{ color: 'var(--accent-text)', fontWeight: '600' }}>{nickname}</span>
                  <button
                    onClick={() => setShowOnboarding(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-text)',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      fontSize: '11px',
                      textDecoration: 'underline'
                    }}
                    title="Change room nickname"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
            <div className="res-header-actions" style={headerActionsStyle}>
              <div className="res-search" style={searchContainerStyle}>
                <Search size={18} color="var(--text-secondary)" />
                <input
                  type="text"
                  placeholder="Search topics..."
                  style={searchInputStyle}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="create-btn" onClick={() => setIsCreateModalOpen(true)} style={createButtonStyle}>
                <Plus size={36} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="res-content" style={{ ...contentStyle, padding: isSidebar ? '12px' : contentStyle.padding }}>
        {isLoading ? (
          <div style={{ padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <Loader2 className="animate-spin" size={48} color="var(--accent-color)" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Loading spaces...</p>
          </div>
        ) : (
          <>
            {/* User Created Rooms Section */}
            {userCreatedRooms.length > 0 && (
              <section className="res-section" style={sectionStyle}>
                <div style={sectionHeaderStyle}>
                  <Sparkles size={18} color="var(--warning-color)" />
                  <h2 style={sectionTitleStyle}>Your Rooms</h2>
                </div>
                <div className="res-grid" style={{ ...gridStyle, gridTemplateColumns: isSidebar ? '1fr' : gridStyle.gridTemplateColumns }}>
                  {userCreatedRooms.map(room => {
                    const id = room.ChatId || room.chatId || room.roomId || room.Id;
                    return (
                      <RoomCard
                        key={id}
                        room={room}
                        isPinned={pinnedRoomIds.includes(id)}
                        onTogglePin={(e) => togglePinRoom(e, id)}
                        badgeText="Joined"
                        badgeColor="var(--success-color)"
                        chatCount={counts[room.ChatId || room.chatId]}
                        onClick={() => handleJoinRoom(room)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Pinned Rooms Section */}
            {pinnedRooms.length > 0 && (
              <section className="res-section" style={sectionStyle}>
                <div style={sectionHeaderStyle}>
                  <Pin size={18} color="var(--danger-color)" />
                  <h2 style={sectionTitleStyle}>Pinned Rooms</h2>
                </div>
                <div className="res-grid" style={gridStyle}>
                  {pinnedRooms.map(room => {
                    const id = room.ChatId || room.chatId || room.roomId || room.Id;
                    // Check if already shown in User Created section to avoid visible duplicates if logic changes
                    return (
                      <RoomCard
                        key={id}
                        room={room}
                        isPinned={true}
                        onTogglePin={(e) => togglePinRoom(e, id)}
                        badgeText="Pinned"
                        badgeColor="var(--danger-color)"
                        chatCount={counts[room.ChatId || room.chatId]}
                        onClick={() => handleJoinRoom(room)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Global Rooms Section */}
            <section className="res-section" style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <Users size={18} color="var(--accent-text)" />
                <h2 style={sectionTitleStyle}>Global Discovery</h2>
              </div>
              {discoveryRooms.length > 0 ? (
                <div className="res-grid" style={{ ...gridStyle, gridTemplateColumns: isSidebar ? '1fr' : gridStyle.gridTemplateColumns }}>
                  {discoveryRooms.map(room => {
                    const roomId = room.ChatId || room.chatId || room.roomId || room.Id;
                    const isPinned = pinnedRoomIds.includes(roomId);
                    return (
                      <RoomCard
                        key={roomId}
                        room={room}
                        isPinned={isPinned}
                        onTogglePin={(e) => togglePinRoom(e, roomId)}
                        badgeText="Discovery"
                        badgeColor="var(--accent-text)"
                        chatCount={counts[room.ChatId || room.chatId]}
                        onClick={() => handleJoinRoom(room)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div style={emptyStateStyle}>
                  <Hash size={48} color="var(--border-color)" />
                  <p>No other rooms found. Be the first to start a conversation!</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Onboarding Overlay */}
      {showOnboarding && !isSidebar && (
        <div className="res-modal-overlay" style={{ ...modalOverlayStyle, zIndex: 1000, backdropFilter: 'blur(16px)' }}>
          <div className="res-modal" style={{
            ...modalContentStyle,
            maxWidth: '460px',
            textAlign: 'center',
            padding: '36px 28px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-tint) 0%, rgba(167, 139, 250, 0.2) 100%)',
              border: '1px solid var(--accent-tint-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Sparkles size={28} color="var(--accent-text)" />
            </div>

            <h2 style={{
              fontSize: '22px',
              fontWeight: '800',
              marginBottom: '8px',
              background: 'var(--accent-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Welcome to Public Rooms
            </h2>

            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '22px', fontSize: '14px' }}>
              Public rooms are completely anonymous — nicknames are recommended to protect your privacy.
            </p>

            <form onSubmit={handleSetNickname} style={formStyle}>
              <div style={{ ...inputGroupStyle, marginBottom: '6px', position: 'relative' }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Enter your nickname..."
                  required
                  className="premium-input"
                  value={nickname}
                  onChange={e => {
                    setNickname(e.target.value);
                    setError(null);
                  }}
                  style={{
                    textAlign: 'center',
                    fontSize: '16px',
                    fontWeight: '600',
                    letterSpacing: '0.3px',
                    paddingRight: '36px',
                    borderColor: roomNicknameCheck.status === 'block' ? 'var(--danger-color)' : roomNicknameCheck.status === 'warn' ? 'var(--warning-color)' : roomNicknameCheck.status === 'allow' ? 'var(--success-color)' : undefined
                  }}
                />
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                  <UsernameStatusIndicator checkResult={roomNicknameCheck} showInlineIcon={true} />
                </div>
              </div>

              <UsernameStatusIndicator checkResult={roomNicknameCheck} containerStyle={{ justifyContent: 'center', marginBottom: '14px' }} />

              {/* Random Nickname Suggestions */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  padding: '0 4px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Suggested Handles
                  </span>
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
                    style={{
                      background: 'var(--accent-tint)',
                      border: '1px solid var(--accent-tint-border)',
                      color: 'var(--accent-text)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    title={showAllSuggestions ? "Show fewer suggestions" : "Show all suggested handles"}
                  >
                    {showAllSuggestions ? "Show Less" : "+ More"}
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                  maxHeight: showAllSuggestions ? '180px' : 'none',
                  overflowY: showAllSuggestions ? 'auto' : 'visible',
                  padding: '2px'
                }} className="hide-scrollbar">
                  {(showAllSuggestions ? suggestedNames : suggestedNames.slice(0, 4)).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNickname(item);
                        setError(null);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        background: nickname === item ? 'var(--accent-tint)' : 'var(--bg-hover)',
                        border: nickname === item ? '1px solid var(--accent-tint-border)' : '1px solid var(--border-color)',
                        color: nickname === item ? 'var(--accent-text)' : '#d1d5db',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (nickname !== item) {
                          e.currentTarget.style.background = 'var(--border-color)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (nickname !== item) {
                          e.currentTarget.style.background = 'var(--bg-hover)';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                        }
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p style={{ ...errorStyle, marginBottom: '12px' }}>{error}</p>}

              <button
                type="submit"
                disabled={isSettingNickname || roomNicknameCheck.isBlocked || roomNicknameCheck.isChecking}
                className="submit-btn"
                style={{
                  ...submitButtonStyle,
                  width: '100%',
                  marginTop: '4px',
                  opacity: (isSettingNickname || roomNicknameCheck.isBlocked || roomNicknameCheck.isChecking) ? 0.6 : 1,
                  cursor: (isSettingNickname || roomNicknameCheck.isBlocked || roomNicknameCheck.isChecking) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSettingNickname ? 'Saving...' : roomNicknameCheck.isChecking ? 'Checking...' : 'Start Exploring'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div className="res-modal-overlay" style={modalOverlayStyle}>
          <div className="res-modal" style={modalContentStyle}>
            <div className="res-modal-header" style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Create a Room</h2>
              <button className="close-btn" onClick={() => setIsCreateModalOpen(false)} style={closeButtonStyle}>×</button>
            </div>
            <form onSubmit={handleCreateRoom} style={formStyle}>
              <div style={inputGroupStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Room Name</label>
                  {roomNameCheck.isChecking && (
                    <span style={{ fontSize: '11px', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 size={12} className="animate-spin" /> Checking...
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="e.g. JavaScript Enthusiasts"
                    required
                    className="premium-input"
                    style={{
                      borderColor: roomNameCheck.available === false ? 'var(--danger-color)' : roomNameCheck.available === true ? 'var(--success-color)' : undefined,
                      paddingRight: '36px'
                    }}
                    value={newRoom.name}
                    onChange={e => {
                      setNewRoom({ ...newRoom, name: e.target.value });
                      setError(null);
                    }}
                  />
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                    {roomNameCheck.available === true && !roomNameCheck.isChecking && (
                      <CheckCircle2 size={18} color="var(--success-color)" />
                    )}
                    {roomNameCheck.available === false && !roomNameCheck.isChecking && (
                      <AlertCircle size={18} color="var(--danger-color)" />
                    )}
                  </div>
                </div>
                {roomNameCheck.message && !roomNameCheck.isChecking && (
                  <span style={{
                    fontSize: '12px',
                    color: roomNameCheck.available ? 'var(--success-color)' : 'var(--danger-color)',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {roomNameCheck.message}
                  </span>
                )}
              </div>
              <div style={inputGroupStyle}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Motto / Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Discussing the future of web dev"
                  className="premium-input"
                  value={newRoom.motto}
                  onChange={e => setNewRoom({ ...newRoom, motto: e.target.value })}
                />
              </div>
              {error && <p style={errorStyle}>{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting || roomNameCheck.available === false || roomNameCheck.isChecking || !newRoom.name.trim()}
                className="submit-btn"
                style={{
                  ...submitButtonStyle,
                  opacity: (isSubmitting || roomNameCheck.available === false || roomNameCheck.isChecking || !newRoom.name.trim()) ? 0.6 : 1,
                  cursor: (isSubmitting || roomNameCheck.available === false || roomNameCheck.isChecking || !newRoom.name.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? 'Creating...' : roomNameCheck.isChecking ? 'Checking availability...' : 'Launch Room'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .room-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .room-card:hover { transform: translateY(-4px); background: #252525 !important; border-color: var(--border-color) !important; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .create-btn:hover { background-color: var(--accent-tint) !important; transform: scale(1.05); }
        .create-btn:active { transform: scale(0.95); }
        
        .close-btn { transition: all 0.3s ease; }
        .close-btn:hover { color: white !important; transform: rotate(90deg); }
        
        .premium-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.2) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 12px;
          padding: 16px 20px;
          color: white;
          font-size: 15px;
          transition: all 0.2s ease;
          box-sizing: border-box;
          outline: none;
        }
        .premium-input:focus {
          border-color: var(--accent-color) !important;
          background: rgba(0, 0, 0, 0.4) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-solid) 45%, transparent);
        }
        .premium-input::placeholder { color: var(--text-muted); }
        
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px color-mix(in srgb, var(--accent-solid) 45%, transparent) !important; }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .res-header { padding: 16px 12px !important; }
          .res-title { font-size: 24px !important; }
          .res-content { padding: 0 12px !important; }
          .res-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .res-modal { padding: 24px !important; width: 90% !important; margin: 0 auto !important; }
          .res-modal-overlay { padding: 0 !important; }
          .res-modal-header h2 { font-size: 20px !important; }
          .res-header-actions { gap: 8px !important; }
          .create-btn { width: 40px !important; height: 40px !important; }
          .res-search { max-width: 100% !important; height: 40px !important; padding: 0 12px !important; font-size: 13px !important; }
          .res-section { margin-top: 24px !important; }
        }
      `}</style>
    </div>
  );
}

function RoomCard({ room, badgeText, badgeColor, onClick, isPinned, onTogglePin, chatCount }) {
  return (
    <div
      className="room-card"
      onClick={onClick}
      style={{ ...cardStyle, position: 'relative' }}
    >
      {chatCount > 0 && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          backgroundColor: 'var(--danger-color)',
          color: 'white',
          fontSize: '11px',
          fontWeight: '800',
          minWidth: '20px',
          height: '20px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 6px',
          boxShadow: '0 4px 12px var(--danger-tint)',
          border: '2px solid var(--bg-secondary)',
          zIndex: 10,
          animation: 'scaleIn 0.2s ease-out'
        }}>
          {chatCount > 99 ? '99+' : chatCount}
        </div>
      )}
      <button
        onClick={onTogglePin}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 5,
          color: isPinned ? 'var(--danger-color)' : 'var(--text-secondary)',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(4px)'
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)'}
        title={isPinned ? "Unpin Room" : "Pin Room"}
      >
        {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
      </button>

      <div style={cardHeaderStyle}>
        <Avatar chat={room} size={48} />
        <span style={{ ...badgeStyle, backgroundColor: `${badgeColor}20`, color: badgeColor, border: `1px solid ${badgeColor}40` }}>
          {badgeText}
        </span>
      </div>
      <div style={cardBodyStyle}>
        <h3 style={cardTitleStyle}>{room.ChatName || room.chatName || "Unnamed Room"}</h3>
        <p style={cardMottoStyle}>{room.status || "Explore topics and connect with others"}</p>
      </div>
      <div style={cardFooterStyle}>
        <Users size={14} />
        <span>{room.noOfMembers || 0} active members</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styled CSS Modules (JS Objects)
// ─────────────────────────────────────────────────────────────────────────────

const containerStyle = {
  flex: 1,
  backgroundColor: 'var(--bg-primary)',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflowY: 'auto',
  position: 'relative',
  paddingBottom: '24px'
};

const headerStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backgroundColor: 'rgba(18, 18, 18, 0.8)',
  backdropFilter: 'blur(20px)',
  borderBottom: '1px solid var(--bg-hover)',
  padding: '24px',
};

const headerTopStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  maxWidth: '1200px',
  margin: '0 auto',
  width: '100%',
  gap: '24px'
};

const titleStyle = {
  margin: 0,
  fontSize: '28px',
  fontWeight: '800',
  color: 'white',
  letterSpacing: '-1px'
};

const headerActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flex: 1,
  justifyContent: 'flex-end'
};

const searchContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: 'var(--bg-card)',
  borderRadius: '12px',
  padding: '0 16px',
  maxWidth: '400px',
  width: '100%',
  border: '1px solid var(--border-color)',
  height: '44px'
};

const searchInputStyle = {
  backgroundColor: 'transparent',
  border: 'none',
  color: 'white',
  padding: '12px',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
};

const createButtonStyle = {
  backgroundColor: 'transparent',
  color: 'var(--accent-color)',
  border: 'none',
  borderRadius: '12px',
  width: '44px',
  height: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const contentStyle = {
  maxWidth: '1200px',
  width: '100%',
  margin: '0 auto',
  padding: '0 24px',
  boxSizing: 'border-box'
};

const sectionStyle = {
  marginTop: '40px',
  animation: 'fadeIn 0.5s ease-out'
};

const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '20px'
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: '18px',
  fontWeight: '700',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '20px'
};

const cardStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderRadius: '20px',
  padding: '24px',
  border: '1px solid var(--bg-hover)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const cardHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start'
};

const badgeStyle = {
  padding: '4px 10px',
  borderRadius: '8px',
  fontSize: '11px',
  fontWeight: '700',
  textTransform: 'uppercase',
};

const cardBodyStyle = {
  flex: 1
};

const cardTitleStyle = {
  margin: '0 0 8px 0',
  fontSize: '18px',
  fontWeight: '700',
  color: 'white'
};

const cardMottoStyle = {
  margin: 0,
  fontSize: '13px',
  lineHeight: '1.5',
  color: 'var(--text-secondary)',
  display: '-webkit-box',
  WebkitLineClamp: '2',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
};

const cardFooterStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: '#4B5563',
  fontSize: '12px',
  fontWeight: '500'
};

const emptyStateStyle = {
  padding: '60px 0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  color: '#4B5563',
  textAlign: 'center'
};

const modalOverlayStyle = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'rgba(10, 10, 12, 0.65)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px'
};

const modalContentStyle = {
  background: 'linear-gradient(145deg, rgba(30, 30, 34, 0.95) 0%, rgba(20, 20, 24, 0.95) 100%)',
  borderRadius: '28px',
  width: '100%',
  maxWidth: '440px',
  padding: '40px',
  boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 var(--border-color)',
  border: '1px solid var(--bg-hover)',
  animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px'
};

const closeButtonStyle = {
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  fontSize: '32px',
  cursor: 'pointer',
  lineHeight: '1'
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
};

const inputGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  position: 'relative'
};

const errorStyle = {
  color: 'var(--danger-color)',
  fontSize: '13px',
  margin: '0'
};

const submitButtonStyle = {
  marginTop: '10px',
  backgroundColor: 'var(--accent-color)',
  color: 'white',
  border: 'none',
  padding: '14px',
  borderRadius: '12px',
  fontWeight: '600',
  fontSize: '16px',
  cursor: 'pointer',
  transition: 'opacity 0.2s',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
};
