import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { getchat } from './ChatNames';
import { API } from '../service/UserAuth';
import { Search, MessageCircle, Users, RefreshCcw, Share2, Sparkles } from 'lucide-react';
import userDiscoveryStore from '../service/UserDiscoveryStore';
import Avatar from '../components/chat/Avatar';
import { syncChatsMapToDB } from '../service/db';

const SearchComponent = () => {
  const navigate = useNavigate();
  const [userid, setUserid] = useState('');
  const [userData, setUserData] = useState(null);
  const [message, setMessage] = useState('');
  const [userlist, setuserlist] = useState(userDiscoveryStore.users);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const userId = localStorage.getItem("userid");

  useEffect(() => {
    const id = localStorage.getItem("userid");
    if (!id) {
      navigate("/login");
    }
  }, []);

  const handleSearch = async () => {
    if (!userid.trim() || userid===localStorage.getItem("userid")) return;
    setIsLoading(true);
    setUserData(null);
    try {
      // Search in the userlist first
      const foundUser = userlist.find(
        user => user.userName.toLowerCase() === userid.toLowerCase() || 
                user.userId === userid
      );
      
      if (foundUser) {
        setUserData(foundUser);
        setMessage('');
        setIsLoading(false);
        return;
      }
      
      // If not found in list, try API search
      const response = await fetch(`${API}/user/search/${userid}`);
      //const response = await fetch(`https://insistent-zaniyah-prefraternal.ngrok-free.dev/api/user/search/${userid}`);
      if (response.ok) {
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
    const unsubscribe = userDiscoveryStore.subscribe(setuserlist);
    
    // Initial fetch if not loaded
    if (!userDiscoveryStore.isLoaded) {
      userDiscoveryStore.fetchUsers();
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
          border: '1px solid rgba(59, 130, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.1)'
        }}>
          <div style={{ flex: '1 1 300px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#60a5fa" />
              Invite Friends to LetsChat
            </h3>
            <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>
              The best conversations happen together. Invite your friends to explore spaces, public rooms, and more!
            </p>
          </div>
          <button 
            onClick={handleInvite}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
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
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#f8fafc', marginBottom: '12px' }}>Find & Connect</h1>
          <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px' }}>Search for users by name or ID to start a direct conversation</p>
          
          <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
            <div className="search-container">
              <div style={{ flex: 1, position: 'relative', width: '100%' }}>
                <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Enter User ID or Name"
                  value={userid}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                    if (userid.trim()) setShowSuggestions(true);
                  }}
                  onBlur={(e) => {
                    setTimeout(() => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.boxShadow = 'none';
                      setShowSuggestions(false);
                    }, 200);
                  }}
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 48px',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    color: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && filteredUsers.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                    backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
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
                          borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Avatar chat={user} size={36} />
                        <span style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: '500' }}>{user.userName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button 
                className="search-btn"
                onClick={handleSearch} disabled={isLoading}
                style={{
                  padding: '16px 24px', backgroundColor: '#3b82f6', color: '#fff',
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
                marginTop: '24px', padding: '24px', backgroundColor: '#1e293b',
                borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '16px', border: '1px solid #334155', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Avatar chat={userData} size={64} />
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>{userData.userName}</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>User ID: {userData.userId}</div>
                  </div>
                </div>
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
            )}
          </div>
        </div>

        {/* Explore Community Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users size={28} color="#3b82f6" />
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>Explore Community</h2>
            </div>
            <button 
              onClick={() => userDiscoveryStore.fetchUsers(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                backgroundColor: 'rgba(51, 65, 85, 0.5)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.5)'}
            >
              <RefreshCcw size={16} />
              Refresh List
            </button>
          </div>

          {userlist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px dashed #334155' }}>
              <Users size={48} color="#475569" style={{ marginBottom: '16px', opacity: 0.5 }} />
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
                    padding: '24px 16px', borderRadius: '16px', backgroundColor: '#1e293b',
                    border: '1px solid #334155', transition: 'all 0.2s', textAlign: 'center',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.2)';
                    e.currentTarget.style.borderColor = '#475569';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#334155';
                  }}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <Avatar chat={user} size={80} />
                  </div>
                  <h3 style={{ 
                    color: '#f8fafc', fontSize: '18px', fontWeight: '700', 
                    margin: '0 0 4px 0', width: '100%', overflow: 'hidden', 
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                  }}>
                    {user.userName}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 20px 0', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ID: {user.userId}
                  </p>
                  
                  <button
                    onClick={() => handleChat(user.userId)}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa',
                      cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                      e.currentTarget.style.color = '#60a5fa';
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