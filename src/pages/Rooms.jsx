import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users, Hash, ArrowLeft, Loader2, Sparkles, Pin, PinOff } from 'lucide-react';
import { API } from '../service/UserAuth';
import messageStore from './MessageStore';
import { getchat } from './ChatNames';
import Avatar from '../components/chat/Avatar';
import { syncChatsMapToDB } from '../service/db';

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
    if (!newRoom.name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API}/room/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          roomName: newRoom.name,
          motto: newRoom.motto,
          // If we had a roomId here, it would be an update
          roomId: newRoom.roomId || undefined
        })
      });

      if (res.ok) {
        const createdRoom = await res.json();
        setIsCreateModalOpen(false);
        setNewRoom({ name: '', motto: '' });
        fetchData(); // Refresh list
        // In handleCreateRoom, we might not have the full room object yet
        // but the server returns the room info
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
    const roomId = room.Id || room.id;
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

          const chatsMap = JSON.parse(localStorage.getItem("chatsMap") || "{}");
          chatsMap[finalChatId] = {
            ...room,
            chatId: finalChatId,
            chatName: room.ChatName || room.chatName,
            id: room.Id || room.id,
            type: 'room',
            status: 'allowed'
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
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  paddingLeft: '2px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                  Acting as: <span style={{ color: '#60a5fa', fontWeight: '600' }}>{nickname}</span>
                </div>
              )}
            </div>
            <div className="res-header-actions" style={headerActionsStyle}>
              <div className="res-search" style={searchContainerStyle}>
                <Search size={18} color="#9ca3af" />
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
                  <Sparkles size={18} color="#fbbf24" />
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
                        badgeColor="#10b981"
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
                  <Pin size={18} color="#f87171" />
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
                        badgeColor="#f87171"
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
                <Users size={18} color="#60a5fa" />
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
                        badgeColor="#60a5fa"
                        chatCount={counts[room.ChatId || room.chatId]}
                        onClick={() => handleJoinRoom(room)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div style={emptyStateStyle}>
                  <Hash size={48} color="#374151" />
                  <p>No other rooms found. Be the first to start a conversation!</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Onboarding Overlay */}
      {showOnboarding && !isSidebar && (
        <div className="res-modal-overlay" style={{ ...modalOverlayStyle, zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div className="res-modal" style={{ ...modalContentStyle, maxWidth: '500px', textAlign: 'center', padding: '40px' }}>
            <Sparkles size={48} color="#fbbf24" style={{ marginBottom: '20px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Welcome to Social Discovery!
            </h2>
            <p style={{ color: '#9ca3af', lineHeight: '1.6', marginBottom: '24px', fontSize: '15px' }}>
              This is a social discovery page where anyone can chat in any rooms they like **without revealing your identity**.
              <br /><br />
              To keep things safe:
              <br />
              • Do not share any personal info.
              <br />
              • Set a nickname to use in these rooms (don't use your real name).
            </p>
            <form onSubmit={handleSetNickname} style={formStyle}>
              <div style={inputGroupStyle}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Enter your nickname..."
                  required
                  className="premium-input"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  style={{ textAlign: 'center', fontSize: '18px' }}
                />
              </div>
              {error && <p style={errorStyle}>{error}</p>}
              <button type="submit" disabled={isSettingNickname} className="submit-btn" style={{ ...submitButtonStyle, marginTop: '10px' }}>
                {isSettingNickname ? 'Saving...' : 'Start Exploring'}
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
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Create a Room</h2>
              <button className="close-btn" onClick={() => setIsCreateModalOpen(false)} style={closeButtonStyle}>×</button>
            </div>
            <form onSubmit={handleCreateRoom} style={formStyle}>
              <div style={inputGroupStyle}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Room Name</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. JavaScript Enthusiasts"
                  required
                  className="premium-input"
                  value={newRoom.name}
                  onChange={e => setNewRoom({ ...newRoom, name: e.target.value })}
                />
              </div>
              <div style={inputGroupStyle}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Motto / Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Discussing the future of web dev"
                  className="premium-input"
                  value={newRoom.motto}
                  onChange={e => setNewRoom({ ...newRoom, motto: e.target.value })}
                />
              </div>
              {error && <p style={errorStyle}>{error}</p>}
              <button type="submit" disabled={isSubmitting} className="submit-btn" style={submitButtonStyle}>
                {isSubmitting ? 'Creating...' : 'Launch Room'}
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
        .room-card:hover { transform: translateY(-4px); background: #252525 !important; border-color: rgba(255, 255, 255, 0.15) !important; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .create-btn:hover { background-color: rgba(96, 165, 250, 0.1) !important; transform: scale(1.05); }
        .create-btn:active { transform: scale(0.95); }
        
        .close-btn { transition: all 0.3s ease; }
        .close-btn:hover { color: white !important; transform: rotate(90deg); }
        
        .premium-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.2) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
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
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
        }
        .premium-input::placeholder { color: #6B7280; }
        
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(96, 165, 250, 0.4) !important; }
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
          backgroundColor: '#ef4444',
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
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
          border: '2px solid #1a1a1a',
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
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 5,
          color: isPinned ? '#f87171' : '#9ca3af',
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
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
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
  backgroundColor: '#1E1E1E',
  borderRadius: '12px',
  padding: '0 16px',
  maxWidth: '400px',
  width: '100%',
  border: '1px solid rgba(255, 255, 255, 0.1)',
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
  backgroundColor: '#1A1A1A',
  borderRadius: '20px',
  padding: '24px',
  border: '1px solid rgba(255, 255, 255, 0.05)',
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
  color: '#9CA3AF',
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
  boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
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
  color: '#9CA3AF',
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
  color: '#EF4444',
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
