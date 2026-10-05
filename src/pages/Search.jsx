import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { getchat } from './ChatNames';
import { API } from '../service/UserAuth';
import { Search, MessageCircle, Users, RefreshCcw, Share2, Sparkles, X, History } from 'lucide-react';
import userDiscoveryStore from '../service/UserDiscoveryStore';
import Avatar from '../components/chat/Avatar';
import StreakBadge from '../components/pulse/StreakBadge';
import { syncChatsMapToDB, getGroupMembersFromDB } from '../service/db';

const SearchComponent = () => {
  const navigate = useNavigate();
  const [userid, setUserid] = useState('');
  const [userData, setUserData] = useState(null);
  const [userDataCommonGroups, setUserDataCommonGroups] = useState([]);
  const [message, setMessage] = useState('');
  const [userlist, setuserlist] = useState(userDiscoveryStore.users);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(!userDiscoveryStore.isLoaded && userDiscoveryStore.users.length === 0);
  const userId = localStorage.getItem("userid");

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch (e) {
      return [];
    }
  });

  const addRecentSearch = (term) => {
    if (!term || !term.trim()) return;
    const cleaned = term.trim();
    setRecentSearches(prev => {
      const updated = [cleaned, ...prev.filter(item => item !== cleaned)].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  useEffect(() => {
    const id = localStorage.getItem("userid");
    if (!id) {
      navigate("/login");
    }
  }, []);

  const handleSearch = async (overrideQuery = null) => {
    const rawQuery = typeof overrideQuery === 'string' ? overrideQuery : userid;
    const queryToUse = rawQuery.trim();
    if (!queryToUse || queryToUse === localStorage.getItem("userid")) return;
    addRecentSearch(queryToUse);
    setIsLoading(true);
    setUserData(null);
    try {
      // Search in the local userlist first (by userName, userId, or email)
      const foundUser = userlist.find(
        user => (user.userName && user.userName.toLowerCase() === queryToUse.toLowerCase()) || 
                String(user.userId) === queryToUse ||
                (user.email && user.email.toLowerCase() === queryToUse.toLowerCase())
      );
      
      if (foundUser) {
        setUserData(foundUser);
        setMessage('');
        setIsLoading(false);
        return;
      }
      
      // Try API search endpoints (/api/user/search or /api/user/getme)
      let response = await fetch(`${API}/user/search/${encodeURIComponent(queryToUse)}`);
      if (!response.ok) {
        response = await fetch(`${API}/user/search?query=${encodeURIComponent(queryToUse)}`);
      }
      if (!response.ok && queryToUse.includes('@')) {
        response = await fetch(`${API}/user/getme`, {
          headers: { 'User-Id': queryToUse }
        });
      }

      if (response && response.ok) {
        const data = await response.json();
        setUserData(data);
        setMessage('');
      } else {
        setUserData(null);
        setMessage('User not found');
      }
    } catch (error) {
      setUserData(null);
      setMessage('Error searching user');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!userData || !userData.userId) {
      setUserDataCommonGroups([]);
      return;
    }
    const computeCommon = async () => {
      try {
        const rawMap = localStorage.getItem("chatsMap");
        if (!rawMap) return;
        const chatsMap = JSON.parse(rawMap);
        const groupChats = Object.values(chatsMap).filter(c => c.isGroupChat || c.isSpace || c.isClassroom);
        const shared = [];
        for (const grp of groupChats) {
          const members = await getGroupMembersFromDB(grp.chatId);
          if (members && members.length > 0) {
            if (members.some(m => String(m.userId) === String(userData.userId))) {
              shared.push(grp);
            }
          }
        }
        setUserDataCommonGroups(shared);
      } catch (err) {
        console.error("Failed to compute common groups in Search:", err);
      }
    };
    computeCommon();
  }, [userData]);

  const handleChat = async (targetUserId) => {
    try {
      const response = await fetch(`${API}/user/addtochat/${targetUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': localStorage.getItem("userid"),
        },
      });

      if (response.ok) {
        const data = await response.text();
        setMessage('Chat started!');
        getchat(data);
        
        try {
          const res = await fetch(`${API}/user/chatbox/${userId}`);
          if (!res.ok) throw new Error("Failed to fetch chats");
          const chatData = await res.json();

          let chatsMap = {};
          chatData.forEach(chat => {
            chatsMap[chat.chatId] = chat;
          });

          localStorage.setItem("chatsMap", JSON.stringify(chatsMap));
          syncChatsMapToDB(chatsMap);
          navigate(`/chat/${data}`);
        } catch (err) {
          console.error(err);
          setMessage("Failed to load chat names");
        }
      } else {
        setMessage('Failed to start chat');
      }
    } catch (error) {
      setMessage('Error while starting chat');
    }
  };

  useEffect(() => {
    const unsubscribe = userDiscoveryStore.subscribe((users) => {
      setuserlist(users);
      setIsDiscoveryLoading(false);
    });
    
    // Initial fetch if not loaded
    if (!userDiscoveryStore.isLoaded) {
      setIsDiscoveryLoading(true);
      userDiscoveryStore.fetchUsers().finally(() => {
        setIsDiscoveryLoading(false);
      });
    } else {
      setIsDiscoveryLoading(false);
    }
    
    return unsubscribe;
  }, []);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setUserid(value);
    
    if (value.trim()) {
      const filtered = userDiscoveryStore.users.filter(user => 
        user.userName?.toLowerCase().includes(value.toLowerCase()) ||
        user.userId?.includes(value)
      );
      setFilteredUsers(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredUsers([]);
      setShowSuggestions(false);
    }
  };

  const selectUser = (user) => {
    setUserid(user.userName);
    setUserData(user);
    setShowSuggestions(false);
    setMessage('');
  };

  const handleInvite = async () => {
    const inviteUrl = window.location.origin + "/LetsChat/";
    const baseMsg = `I’d like to invite you to join LetsChat! 👀\n\nIt’s a modern real-time chat app with:\n• Spaces for organized conversations\n• Public discussion rooms\n• Structured classrooms with live chat\n• Built-in calendar & event tracking\n• Separate nicknames for public rooms\n\nWould be fun to try it together 🚀`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join LetsChat',
          text: baseMsg,
          url: inviteUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyAndShareWhatsApp(`${baseMsg}\n${inviteUrl}`);
        }
      }
    } else {
      copyAndShareWhatsApp(`${baseMsg}\n${inviteUrl}`);
    }
  };

  const copyAndShareWhatsApp = (msg) => {
    navigator.clipboard.writeText(msg).then(() => {
      alert("Invite message copied to clipboard!");
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }).catch(err => {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    });
  };

  return (
    <div style={{
      height: '100%',
      backgroundColor: 'var(--bg-primary)',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      <style>{`
        .search-container {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .search-btn {
          width: auto;
        }
        @media (max-width: 500px) {
          .search-container {
            flex-direction: column;
          }
          .search-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '24px 16px'
      }}>
        {/* Top Header & Invite Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '40px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
        }}>
          <div style={{ flex: '1 1 300px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="var(--accent-color)" />
              Invite Friends to LetsChat
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              The best conversations happen together. Invite your friends to explore spaces, public rooms, and more!
            </p>
          </div>
          <button 
            onClick={handleInvite}
            style={{
              padding: '12px 24px',
              background: 'var(--accent-gradient)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            }}
          >
            <Share2 size={18} />
            Share Invite Link
          </button>
        </div>

        {/* Hero Search Section */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>Find & Connect</h1>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Search for users by UserId or Email to start a direct conversation</p>
          
          <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
            <div className="search-container">
              <div style={{ flex: 1, position: 'relative', width: '100%' }}>
                <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by UserId or Email"
                  value={userid}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent-color)';
                    e.target.style.boxShadow = '0 0 0 3px var(--nav-active-bg)';
                    if (userid.trim()) setShowSuggestions(true);
                  }}
                  onBlur={(e) => {
                    setTimeout(() => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                      setShowSuggestions(false);
                    }, 200);
                  }}
                  style={{
                    width: '100%',
                    padding: userid ? '16px 44px 16px 48px' : '16px 16px 16px 48px',
                    border: '2px solid var(--border-color)',
                    borderRadius: '16px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
                {userid && (
                  <button
                    onClick={() => { setUserid(''); setUserData(null); setMessage(''); }}
                    style={{
                      position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                      padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <X size={18} />
                  </button>
                )}
                
                {/* Suggestions Dropdown */}
                {showSuggestions && filteredUsers.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                    backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px',
                    maxHeight: '250px', overflowY: 'auto', zIndex: 1000,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                    textAlign: 'left'
                  }}>
                    {filteredUsers.slice(0, 5).map((user) => (
                      <div
                        key={user.userId}
                        onClick={() => selectUser(user)}
                        style={{
                          padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                          borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nav-active-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Avatar chat={user} size={36} />
                        <span style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {user.userName}
                          {(user.pulseStreak || user.streak) > 0 && (
                            <StreakBadge streak={user.pulseStreak || user.streak} size="sm" />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button 
                className="search-btn"
                onClick={handleSearch} disabled={isLoading}
                style={{
                  padding: '16px 24px', backgroundColor: 'var(--accent-color)', color: '#fff',
                  border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '700',
                  cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '8px', opacity: isLoading ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
                onMouseEnter={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Recent Searches Tags */}
            {recentSearches.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '16px',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <History size={14} /> Recents:
                </span>
                {recentSearches.map((term, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setUserid(term);
                      handleSearch(term);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--accent-color)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nav-active-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
                  >
                    {term}
                  </button>
                ))}
                <button
                  onClick={clearRecentSearches}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--danger-color)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    opacity: 0.8
                  }}
                >
                  Clear
                </button>
              </div>
            )}

            {message && (
              <div style={{
                marginTop: '16px', padding: '12px 16px',
                backgroundColor: message.includes('not found') || message.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: message.includes('not found') || message.includes('Error') ? '#fca5a5' : '#6ee7b7',
                borderRadius: '12px', fontSize: '14px', fontWeight: '500',
                border: `1px solid ${message.includes('not found') || message.includes('Error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
              }}>
                {message}
              </div>
            )}

            {userData && (
              <div style={{
                marginTop: '24px', padding: '24px', backgroundColor: 'var(--bg-card)',
                borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px',
                border: '1px solid var(--border-color)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Avatar chat={userData} size={64} />
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {userData.userName || userData.publicName || userData.name}
                        {(userData.pulseStreak || userData.streak) > 0 && (
                          <StreakBadge streak={userData.pulseStreak || userData.streak} size="md" />
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>User ID: {userData.userId}</div>
                      {userData.email && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Email: {userData.email}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => navigate(`/profile/${userData.userId}`)}
                      style={{
                        padding: '12px 18px', backgroundColor: 'var(--nav-active-bg)',
                        color: 'var(--accent-color)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '14px', fontWeight: '700',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      View Profile
                    </button>
                    <button 
                      onClick={() => handleChat(userData.userId || userid)}
                      style={{
                        padding: '12px 24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <MessageCircle size={18} />
                      Start Chat
                    </button>
                  </div>
                </div>

                {userDataCommonGroups.length > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Groups in Common ({userDataCommonGroups.length})
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {userDataCommonGroups.map(grp => (
                        <span key={grp.chatId} style={{
                          fontSize: '12px', padding: '4px 10px', borderRadius: '8px',
                          backgroundColor: 'var(--nav-active-bg)', color: 'var(--accent-color)', fontWeight: '600'
                        }}>
                          {grp.chatName || grp.chatId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Explore Community Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users size={28} color="var(--accent-color)" />
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Explore Community</h2>
            </div>
            <button 
              onClick={() => {
                setIsDiscoveryLoading(true);
                userDiscoveryStore.fetchUsers(true).finally(() => setIsDiscoveryLoading(false));
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nav-active-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
            >
              <RefreshCcw size={16} />
              Refresh List
            </button>
          </div>

          {isDiscoveryLoading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '20px'
            }}>
              <style>{`
                @keyframes searchSkeletonPulse {
                  0% { opacity: 0.3; }
                  50% { opacity: 0.8; }
                  100% { opacity: 0.3; }
                }
              `}</style>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div
                  key={i}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '24px 16px', borderRadius: '16px', backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)', textAlign: 'center'
                  }}
                >
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--border-color)', marginBottom: '16px', animation: 'searchSkeletonPulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: '60%', height: '16px', borderRadius: '6px', backgroundColor: 'var(--border-color)', marginBottom: '8px', animation: 'searchSkeletonPulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: '40%', height: '12px', borderRadius: '4px', backgroundColor: 'var(--border-color)', animation: 'searchSkeletonPulse 1.5s ease-in-out infinite' }} />
                </div>
              ))}
            </div>
          ) : userlist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
              <Users size={48} color="var(--text-secondary)" style={{ marginBottom: '16px', opacity: 0.5 }} />
              <div style={{ fontSize: '16px', fontWeight: '500' }}>No users found in discovery</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '20px'
            }}>
              {userlist.filter(user => user.userId !== localStorage.getItem("userid")).map((user) => (
                <div
                  key={user.userId}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '24px 16px', borderRadius: '16px', backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)', transition: 'all 0.2s', textAlign: 'center',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.2)';
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <Avatar chat={user} size={80} />
                  </div>
                  <h3 style={{ 
                    color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', 
                    margin: '0 0 4px 0', width: '100%', overflow: 'hidden', 
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                  }}>
                    {user.userName}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 20px 0', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ID: {user.userId}
                  </p>
                  
                  <button
                    onClick={() => handleChat(user.userId)}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                      backgroundColor: 'var(--nav-active-bg)', color: 'var(--accent-color)',
                      cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--accent-color)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--nav-active-bg)';
                      e.currentTarget.style.color = 'var(--accent-color)';
                    }}
                  >
                    <MessageCircle size={16} />
                    Start Chat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchComponent;